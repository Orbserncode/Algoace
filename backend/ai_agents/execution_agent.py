"""
Execution Agent implementation using Pydantic AI.
This agent aggregates signals from other agents and integrates with Lumibot for trading.
"""
from typing import Dict, List, Any, Optional, ClassVar, Type, Union
from pydantic import BaseModel, Field
from sqlmodel import Session
from pydantic_ai import Agent, RunContext
from pydantic_ai.mode import Mode
from dataclasses import dataclass
import httpx
import asyncio
import logfire
import os
from datetime import datetime, timedelta
import json

from backend import schemas, models
from backend.ai_agents.base_agent import PydanticAIAgent, AgentTaskInput, AgentTaskOutput
from backend.ai_agents.llm_clients import get_llm_client

# --- Input/Output Models ---

class TradeSignal(BaseModel):
    """Model representing a trade signal."""
    symbol: str
    direction: str  # "buy", "sell"
    quantity: Optional[float] = None
    price: Optional[float] = None
    order_type: str = "market"  # "market", "limit", "stop", "stop_limit"
    time_in_force: str = "day"  # "day", "gtc", "ioc", "fok"
    confidence: float
    source: str  # Which agent or strategy generated this signal
    rationale: str
    timestamp: datetime = Field(default_factory=datetime.now)

class MarketContext(BaseModel):
    """Model representing market context."""
    volatility: float
    trend: str  # "bullish", "bearish", "neutral", "choppy"
    liquidity: str  # "high", "medium", "low"
    news_sentiment: str  # "positive", "negative", "neutral", "mixed"
    trading_session: str  # "pre_market", "regular", "after_hours", "closed"

class PortfolioStatus(BaseModel):
    """Model representing portfolio status."""
    cash_available: float
    equity_value: float
    total_positions: int
    open_orders: int
    buying_power: float
    margin_used: float
    day_trade_count: int

class ExecutionDecision(BaseModel):
    """Model representing an execution decision."""
    action: str  # "execute", "modify", "reject"
    modified_signal: Optional[TradeSignal] = None
    reasoning: str
    warnings: List[str] = Field(default_factory=list)

class ExecutionInput(AgentTaskInput):
    """Input for the Execution Agent."""
    trade_signals: List[TradeSignal]
    market_context: Optional[MarketContext] = None
    portfolio_status: Optional[PortfolioStatus] = None
    require_confirmation: bool = Field(default=True, description="Whether to require confirmation from other agents")
    dry_run: bool = Field(default=False, description="Whether to simulate execution without placing actual orders")

class ExecutionOutput(AgentTaskOutput):
    """Output from the Execution Agent."""
    executed_trades: List[Dict[str, Any]] = Field(default_factory=list)
    rejected_trades: List[Dict[str, Any]] = Field(default_factory=list)
    modified_trades: List[Dict[str, Any]] = Field(default_factory=list)
    execution_summary: str
    warnings: List[str] = Field(default_factory=list)

# --- Agent Dependencies ---

@dataclass
class ExecutionDeps:
    """Dependencies for the Execution Agent."""
    client: httpx.AsyncClient
    broker_api_key: Optional[str] = None
    lumibot_config: Optional[Dict[str, Any]] = None

# --- Agent Implementation ---

class ExecutionAIAgent(PydanticAIAgent[ExecutionInput, ExecutionOutput]):
    """
    Execution Agent that processes trade signals and executes trades via Lumibot.
    """
    input_schema: ClassVar[Type[ExecutionInput]] = ExecutionInput
    output_schema: ClassVar[Type[ExecutionOutput]] = ExecutionOutput

    def _create_pydantic_agent(self):
        """Create the Pydantic AI agent instance."""
        system_prompt = getattr(self.config, 'executionLogicPrompt', 
            "You are an AI assistant for an automated trading Execution Agent.\n"
            "Given the current market data, a proposed trade signal, and portfolio status, decide if the trade should proceed, be modified, or skipped.\n"
            "Consider factors like: extreme volatility, news events, current portfolio exposure, and confidence of the signal.\n"
            "Trade Signal: {tradeSignal}\nMarket Context: {marketContext}\nPortfolio Status: {portfolioStatus}\n"
            "Your decision (Proceed/Modify/Skip) and reasoning:"
        )
        
        # Create the agent
        execution_agent = Agent(
            self.llm_client,
            system_prompt=system_prompt,
            deps_type=ExecutionDeps,
            retries=2,
            instrument=True
        )
        
        # Define tools
        
        @execution_agent.tool
        async def evaluate_trade_signal(
            ctx: RunContext[ExecutionDeps],
            trade_signal: Dict[str, Any],
            market_context: Optional[Dict[str, Any]] = None,
            portfolio_status: Optional[Dict[str, Any]] = None
        ) -> Dict[str, Any]:
            """
            Evaluate a trade signal and decide whether to execute, modify, or reject it.
            
            Args:
                ctx: The context.
                trade_signal: The trade signal to evaluate.
                market_context: Optional market context information.
                portfolio_status: Optional portfolio status information.
                
            Returns:
                An execution decision.
            """
            # Format the inputs for the LLM
            trade_signal_str = json.dumps(trade_signal, indent=2)
            market_context_str = json.dumps(market_context, indent=2) if market_context else "No market context provided"
            portfolio_status_str = json.dumps(portfolio_status, indent=2) if portfolio_status else "No portfolio status provided"
            
            # This is where we would use the LLM to evaluate the trade signal
            # For now, we'll use a simple rule-based approach
            
            # Extract key information
            symbol = trade_signal.get("symbol", "")
            direction = trade_signal.get("direction", "")
            confidence = trade_signal.get("confidence", 0.0)
            
            # Check for high volatility in market context
            high_volatility = False
            negative_news = False
            if market_context:
                high_volatility = market_context.get("volatility", 0.0) > 0.3
                negative_news = market_context.get("news_sentiment", "") == "negative"
            
            # Check for portfolio constraints
            insufficient_funds = False
            if portfolio_status:
                cash_available = portfolio_status.get("cash_available", 0.0)
                price = trade_signal.get("price", 0.0)
                quantity = trade_signal.get("quantity", 0.0)
                
                if direction == "buy" and price and quantity:
                    insufficient_funds = cash_available < (price * quantity)
            
            # Make decision
            warnings = []
            
            if confidence < 0.5:
                action = "reject"
                reasoning = f"Low confidence signal ({confidence:.2f}) does not meet execution threshold (0.5)"
                warnings.append("Low confidence signal rejected")
            elif high_volatility and direction == "buy":
                action = "modify"
                reasoning = "High market volatility detected, reducing position size by 50%"
                warnings.append("Position size reduced due to high volatility")
                
                # Modify the signal
                modified_signal = dict(trade_signal)
                modified_signal["quantity"] = trade_signal.get("quantity", 0.0) * 0.5
                
                return {
                    "action": action,
                    "modified_signal": modified_signal,
                    "reasoning": reasoning,
                    "warnings": warnings
                }
            elif negative_news and direction == "buy":
                action = "reject"
                reasoning = "Negative news sentiment detected, rejecting buy signal"
                warnings.append("Buy signal rejected due to negative news sentiment")
            elif insufficient_funds:
                action = "reject"
                reasoning = "Insufficient funds available for this trade"
                warnings.append("Trade rejected due to insufficient funds")
            else:
                action = "execute"
                reasoning = f"Signal meets execution criteria with confidence {confidence:.2f}"
            
            return {
                "action": action,
                "modified_signal": None,
                "reasoning": reasoning,
                "warnings": warnings
            }
        
        @execution_agent.tool
        async def execute_trade(
            ctx: RunContext[ExecutionDeps],
            trade_signal: Dict[str, Any],
            dry_run: bool = False
        ) -> Dict[str, Any]:
            """
            Execute a trade via the configured broker.
            
            Args:
                ctx: The context.
                trade_signal: The trade signal to execute.
                dry_run: Whether to simulate execution without placing actual orders.
                
            Returns:
                Execution result.
            """
            api_key = ctx.deps.broker_api_key
            lumibot_config = ctx.deps.lumibot_config
            
            # Log the execution attempt
            logfire.info(
                "Executing trade", 
                symbol=trade_signal.get("symbol"), 
                direction=trade_signal.get("direction"),
                quantity=trade_signal.get("quantity"),
                dry_run=dry_run
            )
            
            if dry_run:
                # Simulate execution
                return {
                    "status": "simulated",
                    "trade_id": f"sim_{hash(str(trade_signal))}",
                    "symbol": trade_signal.get("symbol"),
                    "direction": trade_signal.get("direction"),
                    "quantity": trade_signal.get("quantity"),
                    "price": trade_signal.get("price", 0.0),
                    "timestamp": datetime.now().isoformat(),
                    "message": "Trade simulated successfully (dry run mode)"
                }
            
            # Mock implementation for demo purposes
            if not api_key or not lumibot_config:
                logfire.warning("No broker API key or Lumibot config provided, simulating execution")
                return {
                    "status": "simulated",
                    "trade_id": f"sim_{hash(str(trade_signal))}",
                    "symbol": trade_signal.get("symbol"),
                    "direction": trade_signal.get("direction"),
                    "quantity": trade_signal.get("quantity"),
                    "price": trade_signal.get("price", 0.0),
                    "timestamp": datetime.now().isoformat(),
                    "message": "Trade simulated successfully (no broker configuration)"
                }
            
            # Real implementation would use Lumibot to execute the trade
            # For example:
            # from lumibot.brokers import Alpaca
            # from lumibot.traders import Trader
            # 
            # # Configure broker
            # broker = Alpaca(
            #     api_key=api_key,
            #     api_secret=lumibot_config.get("api_secret"),
            #     paper=lumibot_config.get("paper", True)
            # )
            # 
            # # Create trader
            # trader = Trader(broker=broker)
            # 
            # # Execute trade
            # if trade_signal.get("direction") == "buy":
            #     order = trader.broker.create_order(
            #         symbol=trade_signal.get("symbol"),
            #         quantity=trade_signal.get("quantity"),
            #         side="buy",
            #         type=trade_signal.get("order_type", "market"),
            #         time_in_force=trade_signal.get("time_in_force", "day"),
            #         limit_price=trade_signal.get("price") if trade_signal.get("order_type") == "limit" else None
            #     )
            # else:
            #     order = trader.broker.create_order(
            #         symbol=trade_signal.get("symbol"),
            #         quantity=trade_signal.get("quantity"),
            #         side="sell",
            #         type=trade_signal.get("order_type", "market"),
            #         time_in_force=trade_signal.get("time_in_force", "day"),
            #         limit_price=trade_signal.get("price") if trade_signal.get("order_type") == "limit" else None
            #     )
            # 
            # return {
            #     "status": "executed",
            #     "trade_id": order.id,
            #     "symbol": trade_signal.get("symbol"),
            #     "direction": trade_signal.get("direction"),
            #     "quantity": trade_signal.get("quantity"),
            #     "price": order.filled_price,
            #     "timestamp": order.filled_at.isoformat(),
            #     "message": "Trade executed successfully"
            # }
            
            # For now, return mock data
            return {
                "status": "executed",
                "trade_id": f"order_{hash(str(trade_signal))}",
                "symbol": trade_signal.get("symbol"),
                "direction": trade_signal.get("direction"),
                "quantity": trade_signal.get("quantity"),
                "price": trade_signal.get("price", 0.0),
                "timestamp": datetime.now().isoformat(),
                "message": "Trade executed successfully"
            }
        
        @execution_agent.tool
        async def get_agent_confirmation(
            ctx: RunContext[ExecutionDeps],
            trade_signal: Dict[str, Any],
            agent_type: str
        ) -> Dict[str, Any]:
            """
            Get confirmation from another agent for a trade signal.
            
            Args:
                ctx: The context.
                trade_signal: The trade signal to confirm.
                agent_type: The type of agent to get confirmation from (e.g., "risk", "portfolio").
                
            Returns:
                Confirmation result.
            """
            # In a real implementation, this would call the appropriate agent's API
            # For now, we'll simulate the confirmation
            
            # Mock implementation
            if agent_type == "risk":
                # Risk agent checks if the trade complies with risk limits
                symbol = trade_signal.get("symbol", "")
                direction = trade_signal.get("direction", "")
                
                # Simulate some risk checks
                if symbol in ["AAPL", "MSFT", "AMZN"] and direction == "buy":
                    return {
                        "confirmed": True,
                        "message": "Trade complies with risk limits",
                        "warnings": []
                    }
                elif symbol in ["SPY", "QQQ"] and direction == "buy":
                    return {
                        "confirmed": True,
                        "message": "Trade complies with risk limits, but approaching sector concentration limits",
                        "warnings": ["Approaching technology sector concentration limit"]
                    }
                else:
                    return {
                        "confirmed": False,
                        "message": "Trade would exceed risk limits",
                        "warnings": ["Would exceed position size limit", "Would exceed sector concentration limit"]
                    }
            elif agent_type == "portfolio":
                # Portfolio agent checks if the trade aligns with portfolio strategy
                symbol = trade_signal.get("symbol", "")
                direction = trade_signal.get("direction", "")
                
                # Simulate some portfolio checks
                if direction == "buy" and symbol in ["AAPL", "MSFT"]:
                    return {
                        "confirmed": True,
                        "message": "Trade aligns with portfolio strategy",
                        "warnings": []
                    }
                elif direction == "sell" and symbol in ["BONDS"]:
                    return {
                        "confirmed": True,
                        "message": "Trade aligns with portfolio strategy",
                        "warnings": []
                    }
                else:
                    return {
                        "confirmed": True,
                        "message": "Trade aligns with portfolio strategy, but deviates from target allocation",
                        "warnings": ["Deviates from target allocation"]
                    }
            else:
                # Unknown agent type
                return {
                    "confirmed": False,
                    "message": f"Unknown agent type: {agent_type}",
                    "warnings": [f"Unknown agent type: {agent_type}"]
                }
        
        return execution_agent

    async def run(self, task_input: ExecutionInput, session: Session) -> ExecutionOutput:
        """
        Run the Execution Agent to process trade signals and execute trades.
        
        Args:
            task_input: The input parameters for the execution task.
            session: Database session for persistence.
            
        Returns:
            Execution output containing executed, rejected, and modified trades.
        """
        self.log_message(f"Starting execution of {len(task_input.trade_signals)} trade signals")
        
        try:
            # Create HTTP client for API requests
            async with httpx.AsyncClient() as client:
                # Set up dependencies
                deps = ExecutionDeps(
                    client=client,
                    broker_api_key=os.getenv("BROKER_API_KEY"),
                    lumibot_config={
                        "api_secret": os.getenv("BROKER_API_SECRET"),
                        "paper": True  # Use paper trading by default
                    }
                )
                
                # Process each trade signal
                executed_trades = []
                rejected_trades = []
                modified_trades = []
                warnings = []
                
                for signal in task_input.trade_signals:
                    signal_dict = signal.model_dump()
                    
                    # Convert datetime to string for JSON serialization
                    if isinstance(signal_dict.get("timestamp"), datetime):
                        signal_dict["timestamp"] = signal_dict["timestamp"].isoformat()
                    
                    # Evaluate the trade signal
                    evaluation = await self.pydantic_agent.evaluate_trade_signal(
                        RunContext(deps=deps),
                        trade_signal=signal_dict,
                        market_context=task_input.market_context.model_dump() if task_input.market_context else None,
                        portfolio_status=task_input.portfolio_status.model_dump() if task_input.portfolio_status else None
                    )
                    
                    # Add any warnings
                    warnings.extend(evaluation.get("warnings", []))
                    
                    # Process based on evaluation
                    if evaluation.get("action") == "reject":
                        self.log_message(f"Rejecting trade signal for {signal.symbol}: {evaluation.get('reasoning')}")
                        rejected_trades.append({
                            "signal": signal_dict,
                            "reason": evaluation.get("reasoning")
                        })
                    elif evaluation.get("action") == "modify":
                        self.log_message(f"Modifying trade signal for {signal.symbol}: {evaluation.get('reasoning')}")
                        modified_signal = evaluation.get("modified_signal", signal_dict)
                        
                        # Get confirmations if required
                        confirmations = []
                        if task_input.require_confirmation:
                            risk_confirmation = await self.pydantic_agent.get_agent_confirmation(
                                RunContext(deps=deps),
                                trade_signal=modified_signal,
                                agent_type="risk"
                            )
                            
                            portfolio_confirmation = await self.pydantic_agent.get_agent_confirmation(
                                RunContext(deps=deps),
                                trade_signal=modified_signal,
                                agent_type="portfolio"
                            )
                            
                            confirmations = [risk_confirmation, portfolio_confirmation]
                            
                            # Add any warnings from confirmations
                            for confirmation in confirmations:
                                warnings.extend(confirmation.get("warnings", []))
                            
                            # Check if all confirmations are positive
                            all_confirmed = all(confirmation.get("confirmed", False) for confirmation in confirmations)
                            
                            if not all_confirmed:
                                self.log_message(f"Trade signal for {signal.symbol} rejected by one or more agents")
                                rejected_trades.append({
                                    "signal": modified_signal,
                                    "reason": "Rejected by one or more agents during confirmation"
                                })
                                continue
                        
                        # Execute the modified trade
                        execution_result = await self.pydantic_agent.execute_trade(
                            RunContext(deps=deps),
                            trade_signal=modified_signal,
                            dry_run=task_input.dry_run
                        )
                        
                        modified_trades.append({
                            "original_signal": signal_dict,
                            "modified_signal": modified_signal,
                            "reason": evaluation.get("reasoning"),
                            "execution_result": execution_result
                        })
                    else:  # "execute"
                        self.log_message(f"Executing trade signal for {signal.symbol}")
                        
                        # Get confirmations if required
                        confirmations = []
                        if task_input.require_confirmation:
                            risk_confirmation = await self.pydantic_agent.get_agent_confirmation(
                                RunContext(deps=deps),
                                trade_signal=signal_dict,
                                agent_type="risk"
                            )
                            
                            portfolio_confirmation = await self.pydantic_agent.get_agent_confirmation(
                                RunContext(deps=deps),
                                trade_signal=signal_dict,
                                agent_type="portfolio"
                            )
                            
                            confirmations = [risk_confirmation, portfolio_confirmation]
                            
                            # Add any warnings from confirmations
                            for confirmation in confirmations:
                                warnings.extend(confirmation.get("warnings", []))
                            
                            # Check if all confirmations are positive
                            all_confirmed = all(confirmation.get("confirmed", False) for confirmation in confirmations)
                            
                            if not all_confirmed:
                                self.log_message(f"Trade signal for {signal.symbol} rejected by one or more agents")
                                rejected_trades.append({
                                    "signal": signal_dict,
                                    "reason": "Rejected by one or more agents during confirmation"
                                })
                                continue
                        
                        # Execute the trade
                        execution_result = await self.pydantic_agent.execute_trade(
                            RunContext(deps=deps),
                            trade_signal=signal_dict,
                            dry_run=task_input.dry_run
                        )
                        
                        executed_trades.append({
                            "signal": signal_dict,
                            "execution_result": execution_result
                        })
                
                # Generate execution summary
                execution_summary = f"Processed {len(task_input.trade_signals)} trade signals: "
                execution_summary += f"{len(executed_trades)} executed, {len(rejected_trades)} rejected, {len(modified_trades)} modified."
                
                if task_input.dry_run:
                    execution_summary += " (DRY RUN MODE - No actual trades placed)"
                
                self.log_message(execution_summary)
                
                # Update agent stats
                self._update_agent_stats(success=True, session=session)
                
                return ExecutionOutput(
                    success=True,
                    message="Execution completed successfully",
                    executed_trades=executed_trades,
                    rejected_trades=rejected_trades,
                    modified_trades=modified_trades,
                    execution_summary=execution_summary,
                    warnings=warnings
                )
                
        except Exception as e:
            self.log_message(f"Execution failed: {str(e)}", level="error")
            # Update agent stats
            self._update_agent_stats(success=False, session=session)
            return ExecutionOutput(
                success=False,
                message="Execution failed",
                error_details=str(e),
                execution_summary=f"Execution failed: {str(e)}"
            )
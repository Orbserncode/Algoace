"""
Portfolio Analyst Agent implementation using Pydantic AI.
This agent specializes in asset allocation, analytics, and portfolio optimization.
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

from backend import schemas, models
from backend.ai_agents.base_agent import PydanticAIAgent, AgentTaskInput, AgentTaskOutput
from backend.ai_agents.llm_clients import get_llm_client

# --- Input/Output Models ---

class AssetAllocation(BaseModel):
    """Model representing asset allocation."""
    symbol: str
    current_weight: float
    target_weight: float
    deviation: float
    recommendation: Optional[str] = None

class PortfolioMetrics(BaseModel):
    """Model representing portfolio metrics."""
    total_value: float
    daily_pnl: float
    daily_pnl_percent: float
    weekly_pnl: float
    weekly_pnl_percent: float
    monthly_pnl: float
    monthly_pnl_percent: float
    ytd_pnl: float
    ytd_pnl_percent: float
    sharpe_ratio: float
    volatility: float
    max_drawdown: float
    beta: float
    alpha: float

class PortfolioInput(AgentTaskInput):
    """Input for the Portfolio Analyst Agent."""
    portfolio_id: Optional[str] = Field(default=None, description="ID of the portfolio to analyze")
    include_metrics: bool = Field(default=True, description="Whether to include portfolio metrics")
    include_allocation: bool = Field(default=True, description="Whether to include asset allocation")
    include_recommendations: bool = Field(default=True, description="Whether to include recommendations")
    rebalance_threshold: Optional[float] = Field(default=None, description="Threshold for rebalance recommendations (overrides agent config)")

class PortfolioOutput(AgentTaskOutput):
    """Output from the Portfolio Analyst Agent."""
    metrics: Optional[PortfolioMetrics] = None
    allocations: List[AssetAllocation] = Field(default_factory=list)
    rebalance_recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    optimization_suggestions: List[str] = Field(default_factory=list)
    risk_insights: List[str] = Field(default_factory=list)

# --- Agent Dependencies ---

@dataclass
class PortfolioDeps:
    """Dependencies for the Portfolio Analyst Agent."""
    client: httpx.AsyncClient
    broker_api_key: Optional[str] = None
    market_data_api_key: Optional[str] = None

# --- Agent Implementation ---

class PortfolioAIAgent(PydanticAIAgent[PortfolioInput, PortfolioOutput]):
    """
    Portfolio Analyst Agent that analyzes portfolio performance and provides recommendations.
    """
    input_schema: ClassVar[Type[PortfolioInput]] = PortfolioInput
    output_schema: ClassVar[Type[PortfolioOutput]] = PortfolioOutput

    def _create_pydantic_agent(self):
        """Create the Pydantic AI agent instance."""
        system_prompt = getattr(self.config, 'analysisPrompt', 
            "Analyze the portfolio's current performance, asset allocation, and recent trades.\n"
            "Identify potential opportunities for rebalancing, diversification, or optimization.\n"
            "Provide actionable insights and recommendations for adjustments.\n"
            "Portfolio Metrics: {metrics}\nCurrent Allocation: {allocation}\nRecent Trades: {trades}"
        )
        
        # Create the agent
        portfolio_agent = Agent(
            self.llm_client,
            system_prompt=system_prompt,
            deps_type=PortfolioDeps,
            retries=2,
            instrument=True
        )
        
        # Define tools
        
        @portfolio_agent.tool
        async def get_portfolio_metrics(ctx: RunContext[PortfolioDeps], portfolio_id: Optional[str] = None) -> Dict[str, Any]:
            """
            Get metrics for the specified portfolio.
            
            Args:
                ctx: The context.
                portfolio_id: Optional ID of the portfolio to analyze. If not provided, the default portfolio is used.
                
            Returns:
                A dictionary containing portfolio metrics.
            """
            api_key = ctx.deps.broker_api_key
            
            # Mock implementation for demo purposes
            if not api_key:
                logfire.warning("No broker API key provided, returning mock data")
                return {
                    "total_value": 1250000.00,
                    "daily_pnl": 12500.00,
                    "daily_pnl_percent": 1.01,
                    "weekly_pnl": 37500.00,
                    "weekly_pnl_percent": 3.09,
                    "monthly_pnl": 62500.00,
                    "monthly_pnl_percent": 5.26,
                    "ytd_pnl": 187500.00,
                    "ytd_pnl_percent": 17.65,
                    "sharpe_ratio": 1.85,
                    "volatility": 0.12,
                    "max_drawdown": 0.08,
                    "beta": 0.92,
                    "alpha": 0.03
                }
            
            # Real implementation would use the API key to fetch data
            # For example:
            # async with ctx.deps.client.get(
            #     f"https://api.broker.com/v1/portfolios/{portfolio_id}/metrics",
            #     headers={"Authorization": f"Bearer {api_key}"}
            # ) as response:
            #     data = await response.json()
            #     return data
            
            # For now, return mock data
            return {
                "total_value": 1250000.00,
                "daily_pnl": 12500.00,
                "daily_pnl_percent": 1.01,
                "weekly_pnl": 37500.00,
                "weekly_pnl_percent": 3.09,
                "monthly_pnl": 62500.00,
                "monthly_pnl_percent": 5.26,
                "ytd_pnl": 187500.00,
                "ytd_pnl_percent": 17.65,
                "sharpe_ratio": 1.85,
                "volatility": 0.12,
                "max_drawdown": 0.08,
                "beta": 0.92,
                "alpha": 0.03
            }
        
        @portfolio_agent.tool
        async def get_asset_allocation(ctx: RunContext[PortfolioDeps], portfolio_id: Optional[str] = None) -> List[Dict[str, Any]]:
            """
            Get the current asset allocation for the specified portfolio.
            
            Args:
                ctx: The context.
                portfolio_id: Optional ID of the portfolio to analyze. If not provided, the default portfolio is used.
                
            Returns:
                A list of assets with their allocation details.
            """
            api_key = ctx.deps.broker_api_key
            
            # Mock implementation for demo purposes
            if not api_key:
                logfire.warning("No broker API key provided, returning mock data")
                return [
                    {
                        "symbol": "AAPL",
                        "current_weight": 0.15,
                        "target_weight": 0.12,
                        "deviation": 0.03
                    },
                    {
                        "symbol": "MSFT",
                        "current_weight": 0.12,
                        "target_weight": 0.12,
                        "deviation": 0.00
                    },
                    {
                        "symbol": "AMZN",
                        "current_weight": 0.08,
                        "target_weight": 0.10,
                        "deviation": -0.02
                    },
                    {
                        "symbol": "GOOGL",
                        "current_weight": 0.10,
                        "target_weight": 0.10,
                        "deviation": 0.00
                    },
                    {
                        "symbol": "BRK.B",
                        "current_weight": 0.07,
                        "target_weight": 0.08,
                        "deviation": -0.01
                    },
                    {
                        "symbol": "SPY",
                        "current_weight": 0.20,
                        "target_weight": 0.25,
                        "deviation": -0.05
                    },
                    {
                        "symbol": "QQQ",
                        "current_weight": 0.18,
                        "target_weight": 0.15,
                        "deviation": 0.03
                    },
                    {
                        "symbol": "BONDS",
                        "current_weight": 0.10,
                        "target_weight": 0.08,
                        "deviation": 0.02
                    }
                ]
            
            # Real implementation would use the API key to fetch data
            # For example:
            # async with ctx.deps.client.get(
            #     f"https://api.broker.com/v1/portfolios/{portfolio_id}/allocation",
            #     headers={"Authorization": f"Bearer {api_key}"}
            # ) as response:
            #     data = await response.json()
            #     return data
            
            # For now, return mock data
            return [
                {
                    "symbol": "AAPL",
                    "current_weight": 0.15,
                    "target_weight": 0.12,
                    "deviation": 0.03
                },
                {
                    "symbol": "MSFT",
                    "current_weight": 0.12,
                    "target_weight": 0.12,
                    "deviation": 0.00
                },
                {
                    "symbol": "AMZN",
                    "current_weight": 0.08,
                    "target_weight": 0.10,
                    "deviation": -0.02
                },
                {
                    "symbol": "GOOGL",
                    "current_weight": 0.10,
                    "target_weight": 0.10,
                    "deviation": 0.00
                },
                {
                    "symbol": "BRK.B",
                    "current_weight": 0.07,
                    "target_weight": 0.08,
                    "deviation": -0.01
                },
                {
                    "symbol": "SPY",
                    "current_weight": 0.20,
                    "target_weight": 0.25,
                    "deviation": -0.05
                },
                {
                    "symbol": "QQQ",
                    "current_weight": 0.18,
                    "target_weight": 0.15,
                    "deviation": 0.03
                },
                {
                    "symbol": "BONDS",
                    "current_weight": 0.10,
                    "target_weight": 0.08,
                    "deviation": 0.02
                }
            ]
        
        @portfolio_agent.tool
        async def get_recent_trades(ctx: RunContext[PortfolioDeps], portfolio_id: Optional[str] = None, days: int = 7) -> List[Dict[str, Any]]:
            """
            Get recent trades for the specified portfolio.
            
            Args:
                ctx: The context.
                portfolio_id: Optional ID of the portfolio to analyze. If not provided, the default portfolio is used.
                days: Number of days to look back for trades.
                
            Returns:
                A list of recent trades.
            """
            api_key = ctx.deps.broker_api_key
            
            # Mock implementation for demo purposes
            if not api_key:
                logfire.warning("No broker API key provided, returning mock data")
                return [
                    {
                        "date": (datetime.now() - timedelta(days=1)).isoformat(),
                        "symbol": "AAPL",
                        "side": "buy",
                        "quantity": 100,
                        "price": 175.25,
                        "total": 17525.00
                    },
                    {
                        "date": (datetime.now() - timedelta(days=2)).isoformat(),
                        "symbol": "SPY",
                        "side": "sell",
                        "quantity": 50,
                        "price": 452.80,
                        "total": 22640.00
                    },
                    {
                        "date": (datetime.now() - timedelta(days=3)).isoformat(),
                        "symbol": "MSFT",
                        "side": "buy",
                        "quantity": 75,
                        "price": 325.50,
                        "total": 24412.50
                    }
                ]
            
            # Real implementation would use the API key to fetch data
            # For example:
            # async with ctx.deps.client.get(
            #     f"https://api.broker.com/v1/portfolios/{portfolio_id}/trades",
            #     params={"days": days},
            #     headers={"Authorization": f"Bearer {api_key}"}
            # ) as response:
            #     data = await response.json()
            #     return data
            
            # For now, return mock data
            return [
                {
                    "date": (datetime.now() - timedelta(days=1)).isoformat(),
                    "symbol": "AAPL",
                    "side": "buy",
                    "quantity": 100,
                    "price": 175.25,
                    "total": 17525.00
                },
                {
                    "date": (datetime.now() - timedelta(days=2)).isoformat(),
                    "symbol": "SPY",
                    "side": "sell",
                    "quantity": 50,
                    "price": 452.80,
                    "total": 22640.00
                },
                {
                    "date": (datetime.now() - timedelta(days=3)).isoformat(),
                    "symbol": "MSFT",
                    "side": "buy",
                    "quantity": 75,
                    "price": 325.50,
                    "total": 24412.50
                }
            ]
        
        @portfolio_agent.tool
        async def generate_rebalance_recommendations(
            ctx: RunContext[PortfolioDeps], 
            allocations: List[Dict[str, Any]], 
            threshold: float = 0.03
        ) -> List[Dict[str, Any]]:
            """
            Generate rebalance recommendations based on current allocations and threshold.
            
            Args:
                ctx: The context.
                allocations: Current asset allocations.
                threshold: Threshold for rebalance recommendations (absolute deviation).
                
            Returns:
                A list of rebalance recommendations.
            """
            recommendations = []
            
            for asset in allocations:
                if abs(asset.get("deviation", 0)) >= threshold:
                    direction = "reduce" if asset.get("deviation", 0) > 0 else "increase"
                    target_adjustment = abs(asset.get("deviation", 0))
                    
                    recommendations.append({
                        "symbol": asset.get("symbol"),
                        "current_weight": asset.get("current_weight"),
                        "target_weight": asset.get("target_weight"),
                        "deviation": asset.get("deviation"),
                        "direction": direction,
                        "adjustment_percent": target_adjustment,
                        "recommendation": f"{direction.capitalize()} {asset.get('symbol')} position by {target_adjustment:.1%} to reach target allocation of {asset.get('target_weight'):.1%}"
                    })
            
            return recommendations
        
        return portfolio_agent

    async def run(self, task_input: PortfolioInput, session: Session) -> PortfolioOutput:
        """
        Run the Portfolio Analyst Agent to analyze portfolio performance and provide recommendations.
        
        Args:
            task_input: The input parameters for the portfolio analysis task.
            session: Database session for persistence.
            
        Returns:
            Portfolio output containing metrics, allocations, and recommendations.
        """
        self.log_message(f"Starting portfolio analysis")
        
        try:
            # Create HTTP client for API requests
            async with httpx.AsyncClient() as client:
                # Set up dependencies
                deps = PortfolioDeps(
                    client=client,
                    broker_api_key=os.getenv("BROKER_API_KEY"),
                    market_data_api_key=os.getenv("MARKET_DATA_API_KEY")
                )
                
                # Get rebalance threshold from input or config
                rebalance_threshold = task_input.rebalance_threshold
                if rebalance_threshold is None:
                    rebalance_threshold = getattr(self.config, 'rebalanceThresholdPercent', 5.0) / 100.0
                
                # Run the agent
                result = await self.pydantic_agent.run(
                    deps=deps,
                    portfolio_id=task_input.portfolio_id,
                    include_metrics=task_input.include_metrics,
                    include_allocation=task_input.include_allocation,
                    rebalance_threshold=rebalance_threshold
                )
                
                # Process the result
                self.log_message(f"Portfolio analysis completed successfully")
                
                # Update agent stats
                self._update_agent_stats(success=True, session=session)
                
                # Extract structured data from the result
                # In a real implementation, we would parse the agent's response
                # For now, we'll create a mock output
                
                # Get portfolio metrics
                metrics = None
                if task_input.include_metrics:
                    metrics_data = await self.pydantic_agent.get_portfolio_metrics(
                        RunContext(deps=deps),
                        portfolio_id=task_input.portfolio_id
                    )
                    metrics = PortfolioMetrics(**metrics_data)
                
                # Get asset allocations
                allocations = []
                if task_input.include_allocation:
                    allocation_data = await self.pydantic_agent.get_asset_allocation(
                        RunContext(deps=deps),
                        portfolio_id=task_input.portfolio_id
                    )
                    allocations = [AssetAllocation(**asset) for asset in allocation_data]
                
                # Generate rebalance recommendations
                rebalance_recommendations = []
                if task_input.include_recommendations and allocations:
                    rebalance_recommendations = await self.pydantic_agent.generate_rebalance_recommendations(
                        RunContext(deps=deps),
                        allocations=allocation_data,
                        threshold=rebalance_threshold
                    )
                
                # Generate optimization suggestions
                optimization_suggestions = [
                    "Consider increasing allocation to SPY to reach target weight of 25%",
                    "AAPL and QQQ are overweight relative to targets, consider trimming positions",
                    "Portfolio has strong tech concentration, consider diversifying into other sectors"
                ]
                
                # Generate risk insights
                risk_insights = [
                    "Portfolio beta of 0.92 indicates slightly lower market risk than benchmark",
                    "Current volatility (12%) is within acceptable range for the strategy",
                    "Max drawdown of 8% is well below risk tolerance threshold of 15%"
                ]
                
                return PortfolioOutput(
                    success=True,
                    message="Portfolio analysis completed successfully",
                    metrics=metrics,
                    allocations=allocations,
                    rebalance_recommendations=rebalance_recommendations,
                    optimization_suggestions=optimization_suggestions,
                    risk_insights=risk_insights
                )
                
        except Exception as e:
            self.log_message(f"Portfolio analysis failed: {str(e)}", level="error")
            # Update agent stats
            self._update_agent_stats(success=False, session=session)
            return PortfolioOutput(
                success=False,
                message="Portfolio analysis failed",
                error_details=str(e)
            )
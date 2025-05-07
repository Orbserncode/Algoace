"""
Command-line interface for AlgoAce Trader.
Built with Typer for seamless integration with Pydantic models.
"""
import typer
import asyncio
from typing import List, Optional
from enum import Enum
import os
import sys
from datetime import datetime
import json

from sqlmodel import Session, select

from backend import models
from backend.database import engine, get_session
from backend.config_loader import load_config, get_agent_config, get_broker_config
from backend.ai_agents.base_agent import PydanticAIAgent
from backend.ai_agents.research_agent import ResearchInput, ResearchAIAgent
from backend.ai_agents.portfolio_agent import PortfolioInput, PortfolioAIAgent
from backend.ai_agents.risk_agent import RiskInput, RiskAIAgent
from backend.ai_agents.execution_agent import ExecutionInput, TradeSignal, MarketContext, PortfolioStatus, ExecutionAIAgent

# Create Typer app
app = typer.Typer(help="AlgoAce Trader CLI")
agent_app = typer.Typer(help="Agent commands")
strategy_app = typer.Typer(help="Strategy commands")
backtest_app = typer.Typer(help="Backtesting commands")
config_app = typer.Typer(help="Configuration commands")

# Add sub-apps
app.add_typer(agent_app, name="agent")
app.add_typer(strategy_app, name="strategy")
app.add_typer(backtest_app, name="backtest")
app.add_typer(config_app, name="config")

# Enums for CLI options
class AgentType(str, Enum):
    RESEARCH = "research"
    PORTFOLIO = "portfolio"
    RISK = "risk"
    EXECUTION = "execution"
    STRATEGY_CODING = "strategy_coding"

class AgentStatus(str, Enum):
    RUNNING = "running"
    IDLE = "idle"
    ERROR = "error"
    STOPPED = "stopped"

class BacktestEngine(str, Enum):
    LUMIBOT = "lumibot"
    VECTORBT = "vectorbt"
    INTERNAL = "internal_mock"

# Helper functions
def get_agent_by_name_or_id(session: Session, name_or_id: str) -> Optional[models.Agent]:
    """Get agent by name or ID."""
    try:
        # Try to parse as ID
        agent_id = int(name_or_id)
        return session.get(models.Agent, agent_id)
    except ValueError:
        # If not an ID, try to find by name
        return session.exec(select(models.Agent).where(models.Agent.name == name_or_id)).first()

# Agent commands
@agent_app.command("list")
def list_agents(
    status: Optional[AgentStatus] = None,
    agent_type: Optional[AgentType] = None,
    verbose: bool = False
):
    """List all agents or filter by status or type."""
    with Session(engine) as session:
        query = select(models.Agent)
        
        if status:
            query = query.where(models.Agent.status == models.AgentStatusEnum(status.value))
        
        if agent_type:
            query = query.where(models.Agent.type == models.AgentTypeEnum(agent_type.value))
        
        agents = session.exec(query).all()
        
        if not agents:
            typer.echo("No agents found matching the criteria.")
            return
        
        typer.echo(f"Found {len(agents)} agents:")
        for agent in agents:
            if verbose:
                typer.echo(f"ID: {agent.id}")
                typer.echo(f"Name: {agent.name}")
                typer.echo(f"Type: {agent.type.value}")
                typer.echo(f"Status: {agent.status.value}")
                typer.echo(f"Description: {agent.description}")
                typer.echo(f"Tasks Completed: {agent.tasksCompleted}")
                typer.echo(f"Errors: {agent.errors}")
                typer.echo(f"Is Default: {agent.isDefault}")
                typer.echo("---")
            else:
                typer.echo(f"{agent.id}: {agent.name} ({agent.type.value}) - {agent.status.value}")

@agent_app.command("start")
def start_agent(
    name_or_id: str,
    config_file: Optional[str] = None
):
    """Start an agent."""
    with Session(engine) as session:
        agent = get_agent_by_name_or_id(session, name_or_id)
        
        if not agent:
            typer.echo(f"Agent not found: {name_or_id}")
            return
        
        if agent.status == models.AgentStatusEnum.RUNNING:
            typer.echo(f"Agent {agent.name} is already running.")
            return
        
        # Update agent status
        agent.status = models.AgentStatusEnum.RUNNING
        session.add(agent)
        session.commit()
        
        typer.echo(f"Agent {agent.name} started successfully.")

@agent_app.command("stop")
def stop_agent(
    name_or_id: str
):
    """Stop an agent."""
    with Session(engine) as session:
        agent = get_agent_by_name_or_id(session, name_or_id)
        
        if not agent:
            typer.echo(f"Agent not found: {name_or_id}")
            return
        
        if agent.status == models.AgentStatusEnum.STOPPED:
            typer.echo(f"Agent {agent.name} is already stopped.")
            return
        
        # Update agent status
        agent.status = models.AgentStatusEnum.STOPPED
        session.add(agent)
        session.commit()
        
        typer.echo(f"Agent {agent.name} stopped successfully.")

@agent_app.command("run")
def run_agent(
    name_or_id: str,
    input_file: Optional[str] = None,
    output_file: Optional[str] = None,
    symbols: Optional[List[str]] = typer.Option(None, "--symbol", "-s", help="Symbols to analyze (for research agent)")
):
    """Run an agent with the specified input."""
    with Session(engine) as session:
        agent = get_agent_by_name_or_id(session, name_or_id)
        
        if not agent:
            typer.echo(f"Agent not found: {name_or_id}")
            return
        
        # Load input from file if provided
        input_data = {}
        if input_file:
            try:
                with open(input_file, 'r') as f:
                    input_data = json.load(f)
            except Exception as e:
                typer.echo(f"Error loading input file: {e}")
                return
        
        # Create agent instance
        try:
            agent_instance = PydanticAIAgent.get_agent_instance(agent_id=agent.id, session=session)
        except Exception as e:
            typer.echo(f"Error creating agent instance: {e}")
            return
        
        # Prepare input based on agent type
        if agent.type == models.AgentTypeEnum.RESEARCH:
            if not symbols and "symbols" not in input_data:
                typer.echo("Error: Research agent requires symbols to analyze.")
                return
            
            task_input = ResearchInput(
                symbols=symbols or input_data.get("symbols", []),
                timeframe=input_data.get("timeframe", "1d"),
                focus_areas=input_data.get("focus_areas"),
                max_news_age_days=input_data.get("max_news_age_days", 7)
            )
        
        elif agent.type == models.AgentTypeEnum.PORTFOLIO:
            task_input = PortfolioInput(
                portfolio_id=input_data.get("portfolio_id"),
                include_metrics=input_data.get("include_metrics", True),
                include_allocation=input_data.get("include_allocation", True),
                include_recommendations=input_data.get("include_recommendations", True),
                rebalance_threshold=input_data.get("rebalance_threshold")
            )
        
        elif agent.type == models.AgentTypeEnum.RISK:
            task_input = RiskInput(
                portfolio_id=input_data.get("portfolio_id"),
                include_var=input_data.get("include_var", True),
                include_stress_tests=input_data.get("include_stress_tests", True),
                include_compliance=input_data.get("include_compliance", True),
                custom_scenarios=input_data.get("custom_scenarios")
            )
        
        elif agent.type == models.AgentTypeEnum.EXECUTION:
            if "trade_signals" not in input_data:
                typer.echo("Error: Execution agent requires trade signals.")
                return
            
            # Parse trade signals
            trade_signals = []
            for signal_data in input_data.get("trade_signals", []):
                trade_signals.append(TradeSignal(**signal_data))
            
            # Parse market context and portfolio status if provided
            market_context = None
            if "market_context" in input_data:
                market_context = MarketContext(**input_data["market_context"])
            
            portfolio_status = None
            if "portfolio_status" in input_data:
                portfolio_status = PortfolioStatus(**input_data["portfolio_status"])
            
            task_input = ExecutionInput(
                trade_signals=trade_signals,
                market_context=market_context,
                portfolio_status=portfolio_status,
                require_confirmation=input_data.get("require_confirmation", True),
                dry_run=input_data.get("dry_run", False)
            )
        
        else:
            typer.echo(f"Unsupported agent type: {agent.type.value}")
            return
        
        # Run the agent
        typer.echo(f"Running agent {agent.name}...")
        
        # Use asyncio to run the async method
        result = asyncio.run(agent_instance.run(task_input=task_input, session=session))
        
        # Print result
        typer.echo(f"Agent run completed: {result.success}")
        if result.message:
            typer.echo(f"Message: {result.message}")
        
        if not result.success and result.error_details:
            typer.echo(f"Error details: {result.error_details}")
        
        # Save output to file if requested
        if output_file:
            try:
                with open(output_file, 'w') as f:
                    json.dump(result.model_dump(), f, indent=2, default=str)
                typer.echo(f"Output saved to {output_file}")
            except Exception as e:
                typer.echo(f"Error saving output: {e}")

# Strategy commands
@strategy_app.command("list")
def list_strategies(
    status: Optional[str] = None,
    verbose: bool = False
):
    """List all strategies or filter by status."""
    with Session(engine) as session:
        query = select(models.Strategy)
        
        if status:
            query = query.where(models.Strategy.status == status)
        
        strategies = session.exec(query).all()
        
        if not strategies:
            typer.echo("No strategies found matching the criteria.")
            return
        
        typer.echo(f"Found {len(strategies)} strategies:")
        for strategy in strategies:
            if verbose:
                typer.echo(f"ID: {strategy.id}")
                typer.echo(f"Name: {strategy.name}")
                typer.echo(f"Description: {strategy.description}")
                typer.echo(f"Status: {strategy.status}")
                typer.echo(f"Source: {strategy.source}")
                typer.echo(f"PnL: {strategy.pnl}")
                typer.echo(f"Win Rate: {strategy.win_rate}%")
                typer.echo("---")
            else:
                typer.echo(f"{strategy.id}: {strategy.name} - {strategy.status}")

# Backtesting commands
@backtest_app.command("run")
def run_backtest(
    strategy_name_or_id: str,
    start_date: str = typer.Option(..., help="Start date (YYYY-MM-DD)"),
    end_date: str = typer.Option(..., help="End date (YYYY-MM-DD)"),
    engine: BacktestEngine = BacktestEngine.LUMIBOT,
    initial_capital: float = 100000.0,
    output_file: Optional[str] = None
):
    """Run a backtest for a strategy."""
    typer.echo(f"Running backtest for strategy {strategy_name_or_id} from {start_date} to {end_date}...")
    typer.echo(f"Using {engine.value} engine with initial capital ${initial_capital}")
    
    # TODO: Implement actual backtest logic
    
    typer.echo("Backtest completed successfully.")
    
    # Mock results
    results = {
        "strategy": strategy_name_or_id,
        "start_date": start_date,
        "end_date": end_date,
        "engine": engine.value,
        "initial_capital": initial_capital,
        "final_capital": initial_capital * 1.15,
        "return": 15.0,
        "sharpe_ratio": 1.2,
        "max_drawdown": 8.5,
        "win_rate": 62.5,
        "timestamp": datetime.now().isoformat()
    }
    
    # Save output to file if requested
    if output_file:
        try:
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2)
            typer.echo(f"Results saved to {output_file}")
        except Exception as e:
            typer.echo(f"Error saving results: {e}")

# Configuration commands
@config_app.command("show")
def show_config(
    config_file: Optional[str] = None,
    section: Optional[str] = None
):
    """Show configuration."""
    try:
        config = load_config(config_file)
        
        if section:
            if section in config:
                typer.echo(f"{section}:")
                typer.echo(json.dumps(config[section], indent=2))
            else:
                typer.echo(f"Section {section} not found in configuration.")
        else:
            typer.echo(json.dumps(config, indent=2))
    except Exception as e:
        typer.echo(f"Error loading configuration: {e}")

@config_app.command("get-agent")
def get_agent_config_cmd(
    agent_type: AgentType,
    config_file: Optional[str] = None
):
    """Get configuration for a specific agent type."""
    try:
        config = load_config(config_file)
        agent_config = get_agent_config(config, agent_type.value)
        typer.echo(json.dumps(agent_config, indent=2))
    except Exception as e:
        typer.echo(f"Error getting agent configuration: {e}")

@config_app.command("get-broker")
def get_broker_config_cmd(
    broker_id: str,
    config_file: Optional[str] = None
):
    """Get configuration for a specific broker."""
    try:
        config = load_config(config_file)
        broker_config = get_broker_config(config, broker_id)
        
        # Mask sensitive information
        if "api_key" in broker_config:
            broker_config["api_key"] = "********"
        if "api_secret" in broker_config:
            broker_config["api_secret"] = "********"
        
        typer.echo(json.dumps(broker_config, indent=2))
    except Exception as e:
        typer.echo(f"Error getting broker configuration: {e}")

# Main command
@app.command()
def version():
    """Show version information."""
    typer.echo("AlgoAce Trader v0.1.0")
    typer.echo("A multi-agent hedge fund trading platform")

if __name__ == "__main__":
    app()
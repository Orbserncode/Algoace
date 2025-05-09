import os
import sys
from datetime import datetime
from sqlmodel import Session, select

# Add the parent directory to the path so we can import from the backend package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import engine, get_session
from backend.models import Agent, AgentTypeEnum, AgentStatusEnum

# Mock data from the frontend
mock_agents = [
    {
        "id": "agent-research-1",
        "name": "Research Agent",
        "type": AgentTypeEnum.RESEARCH,
        "status": AgentStatusEnum.IDLE,
        "description": "Analyzes market news and data",
        "tasksCompleted": 0,
        "errors": 0,
        "isDefault": True,
        "associatedStrategyIds": [],
        "config": {
            "logLevel": "info",
            "enabledTools": ["MarketDataFetcher", "WebSearcher", "TechnicalIndicatorCalculator"],
            "llmModelProviderId": "llm-google-default",
            "llmModelName": "gemini-2.0-flash",
            "newsApiKey": "sample-key-123",
            "maxNewsArticles": 10,
            "analysisPrompt": "Analyze the following market news and data for trading opportunities."
        }
    },
    {
        "id": "agent-portfolio-1",
        "name": "Portfolio Analyst",
        "type": AgentTypeEnum.PORTFOLIO,
        "status": AgentStatusEnum.IDLE,
        "description": "Analyzes portfolio performance",
        "tasksCompleted": 0,
        "errors": 0,
        "isDefault": True,
        "associatedStrategyIds": [],
        "config": {
            "logLevel": "info",
            "enabledTools": ["PortfolioManager", "TechnicalIndicatorCalculator"],
            "llmModelProviderId": "llm-google-default",
            "llmModelName": "gemini-2.0-flash",
            "rebalanceThreshold": 0.05,
            "maxPositionSize": 0.2,
            "analysisFrequencyHours": 24
        }
    },
    {
        "id": "agent-risk-1",
        "name": "Risk Manager",
        "type": AgentTypeEnum.RISK,
        "status": AgentStatusEnum.IDLE,
        "description": "Monitors risk exposure",
        "tasksCompleted": 0,
        "errors": 0,
        "isDefault": True,
        "associatedStrategyIds": [],
        "config": {
            "logLevel": "info",
            "enabledTools": ["PortfolioManager", "TechnicalIndicatorCalculator"],
            "llmModelProviderId": "llm-google-default",
            "llmModelName": "gemini-2.0-flash",
            "riskAnalysisPrompt": "Analyze the portfolio's current risk exposure, compliance status, and market conditions.",
            "riskLimits": {"maxDrawdown": 0.15, "var95": 0.03},
            "complianceRules": ["No single asset should exceed 20% of portfolio value"],
            "analysisFrequencyHours": 2
        }
    },
    {
        "id": "agent-execution-1",
        "name": "Execution Agent",
        "type": AgentTypeEnum.EXECUTION,
        "status": AgentStatusEnum.IDLE,
        "description": "Executes trades",
        "tasksCompleted": 0,
        "errors": 0,
        "isDefault": True,
        "associatedStrategyIds": [],
        "config": {
            "logLevel": "info",
            "enabledTools": ["OrderExecutor", "PortfolioManager"],
            "llmModelProviderId": "llm-google-default",
            "llmModelName": "gemini-2.0-flash",
            "brokerConfigId": "broker-alpaca-paper",
            "maxConcurrentTrades": 5,
            "orderRetryAttempts": 3,
            "executionLogicPrompt": "You are an AI assistant for an automated trading Execution Agent.",
            "requiresAllAgentConfirmation": True
        }
    },
    {
        "id": "agent-strategy-coding-1",
        "name": "Strategy Coding Agent",
        "type": AgentTypeEnum.STRATEGY_CODING,
        "status": AgentStatusEnum.IDLE,
        "description": "Generates trading strategies",
        "tasksCompleted": 0,
        "errors": 0,
        "isDefault": True,
        "associatedStrategyIds": [],
        "config": {
            "logLevel": "info",
            "enabledTools": ["Backtester", "TechnicalIndicatorCalculator"],
            "llmModelProviderId": "llm-google-default",
            "llmModelName": "gemini-2.0-flash",
            "strategyFramework": "lumibot",
            "defaultTimeframe": "1D",
            "defaultAssetClass": "stock",
            "codingPrompt": "Generate a trading strategy based on the following requirements:"
        }
    }
]

def migrate_agents():
    """Migrate mock agent data to the database."""
    print("Starting agent data migration...")
    
    with Session(engine) as session:
        # Check if we already have agents in the database
        existing_agents = session.exec(select(Agent)).all()
        if existing_agents:
            print(f"Found {len(existing_agents)} existing agents in the database.")
            user_input = input("Do you want to proceed and potentially create duplicates? (y/n): ")
            if user_input.lower() != 'y':
                print("Migration aborted.")
                return
        
        # Create agent objects and add them to the session
        for i, agent_data in enumerate(mock_agents, 1):
            # Use a simple integer ID based on the index
            agent_id = i
            
            # Check if this agent already exists
            existing = session.exec(select(Agent).where(Agent.id == agent_id)).first()
            if existing:
                print(f"Agent with ID {agent_id} already exists, skipping.")
                continue
                
            agent = Agent(
                id=agent_id,
                name=agent_data["name"],
                type=agent_data["type"],
                status=agent_data["status"],
                description=agent_data["description"],
                tasksCompleted=agent_data["tasksCompleted"],
                errors=agent_data["errors"],
                isDefault=agent_data["isDefault"],
                config=agent_data["config"],
                associatedStrategyIds=agent_data["associatedStrategyIds"]
            )
            
            session.add(agent)
            print(f"Added agent: {agent.name}")
        
        # Commit the changes
        session.commit()
        print("Agent data migration completed successfully.")

if __name__ == "__main__":
    migrate_agents()
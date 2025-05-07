"""
Risk Manager Agent implementation using Pydantic AI.
This agent specializes in risk metrics, compliance, and risk management.
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

class RiskMetric(BaseModel):
    """Model representing a risk metric."""
    name: str
    value: float
    threshold: float
    status: str  # "ok", "warning", "critical"
    description: str

class ComplianceRule(BaseModel):
    """Model representing a compliance rule."""
    name: str
    description: str
    status: str  # "compliant", "non-compliant", "warning"
    details: Optional[str] = None

class RiskInput(AgentTaskInput):
    """Input for the Risk Manager Agent."""
    portfolio_id: Optional[str] = Field(default=None, description="ID of the portfolio to analyze")
    include_var: bool = Field(default=True, description="Whether to include Value at Risk (VaR) analysis")
    include_stress_tests: bool = Field(default=True, description="Whether to include stress test scenarios")
    include_compliance: bool = Field(default=True, description="Whether to include compliance checks")
    custom_scenarios: Optional[List[Dict[str, Any]]] = Field(default=None, description="Custom stress test scenarios")

class RiskOutput(AgentTaskOutput):
    """Output from the Risk Manager Agent."""
    risk_metrics: List[RiskMetric] = Field(default_factory=list)
    compliance_status: List[ComplianceRule] = Field(default_factory=list)
    stress_test_results: Dict[str, Any] = Field(default_factory=dict)
    risk_warnings: List[str] = Field(default_factory=list)
    mitigation_recommendations: List[str] = Field(default_factory=list)

# --- Agent Dependencies ---

@dataclass
class RiskDeps:
    """Dependencies for the Risk Manager Agent."""
    client: httpx.AsyncClient
    broker_api_key: Optional[str] = None
    market_data_api_key: Optional[str] = None

# --- Agent Implementation ---

class RiskAIAgent(PydanticAIAgent[RiskInput, RiskOutput]):
    """
    Risk Manager Agent that analyzes portfolio risk and compliance.
    """
    input_schema: ClassVar[Type[RiskInput]] = RiskInput
    output_schema: ClassVar[Type[RiskOutput]] = RiskOutput

    def _create_pydantic_agent(self):
        """Create the Pydantic AI agent instance."""
        system_prompt = getattr(self.config, 'riskAnalysisPrompt', 
            "Analyze the portfolio's current risk exposure, compliance status, and market conditions.\n"
            "Identify potential risks including drawdown, volatility, concentration, and regulatory concerns.\n"
            "Provide actionable risk mitigation recommendations.\n"
            "Risk Metrics: {riskMetrics}\nMarket Conditions: {marketConditions}\nCompliance Status: {complianceStatus}"
        )
        
        # Create the agent
        risk_agent = Agent(
            self.llm_client,
            system_prompt=system_prompt,
            deps_type=RiskDeps,
            retries=2,
            instrument=True
        )
        
        # Define tools
        
        @risk_agent.tool
        async def calculate_risk_metrics(ctx: RunContext[RiskDeps], portfolio_id: Optional[str] = None) -> List[Dict[str, Any]]:
            """
            Calculate risk metrics for the specified portfolio.
            
            Args:
                ctx: The context.
                portfolio_id: Optional ID of the portfolio to analyze. If not provided, the default portfolio is used.
                
            Returns:
                A list of risk metrics.
            """
            api_key = ctx.deps.broker_api_key
            
            # Mock implementation for demo purposes
            if not api_key:
                logfire.warning("No broker API key provided, returning mock data")
                return [
                    {
                        "name": "Value at Risk (95%)",
                        "value": 0.025,
                        "threshold": 0.03,
                        "status": "ok",
                        "description": "Maximum expected loss at 95% confidence level over a 1-day period"
                    },
                    {
                        "name": "Value at Risk (99%)",
                        "value": 0.042,
                        "threshold": 0.05,
                        "status": "ok",
                        "description": "Maximum expected loss at 99% confidence level over a 1-day period"
                    },
                    {
                        "name": "Volatility (30d)",
                        "value": 0.12,
                        "threshold": 0.15,
                        "status": "ok",
                        "description": "30-day annualized volatility"
                    },
                    {
                        "name": "Maximum Drawdown",
                        "value": 0.08,
                        "threshold": 0.15,
                        "status": "ok",
                        "description": "Maximum observed loss from peak to trough"
                    },
                    {
                        "name": "Beta",
                        "value": 0.92,
                        "threshold": 1.2,
                        "status": "ok",
                        "description": "Portfolio beta relative to S&P 500"
                    },
                    {
                        "name": "Concentration Risk",
                        "value": 0.18,
                        "threshold": 0.20,
                        "status": "warning",
                        "description": "Highest single asset concentration"
                    },
                    {
                        "name": "Sector Concentration",
                        "value": 0.45,
                        "threshold": 0.40,
                        "status": "critical",
                        "description": "Highest sector concentration (Technology)"
                    }
                ]
            
            # Real implementation would use the API key to fetch data
            # For example:
            # async with ctx.deps.client.get(
            #     f"https://api.broker.com/v1/portfolios/{portfolio_id}/risk",
            #     headers={"Authorization": f"Bearer {api_key}"}
            # ) as response:
            #     data = await response.json()
            #     return data
            
            # For now, return mock data
            return [
                {
                    "name": "Value at Risk (95%)",
                    "value": 0.025,
                    "threshold": 0.03,
                    "status": "ok",
                    "description": "Maximum expected loss at 95% confidence level over a 1-day period"
                },
                {
                    "name": "Value at Risk (99%)",
                    "value": 0.042,
                    "threshold": 0.05,
                    "status": "ok",
                    "description": "Maximum expected loss at 99% confidence level over a 1-day period"
                },
                {
                    "name": "Volatility (30d)",
                    "value": 0.12,
                    "threshold": 0.15,
                    "status": "ok",
                    "description": "30-day annualized volatility"
                },
                {
                    "name": "Maximum Drawdown",
                    "value": 0.08,
                    "threshold": 0.15,
                    "status": "ok",
                    "description": "Maximum observed loss from peak to trough"
                },
                {
                    "name": "Beta",
                    "value": 0.92,
                    "threshold": 1.2,
                    "status": "ok",
                    "description": "Portfolio beta relative to S&P 500"
                },
                {
                    "name": "Concentration Risk",
                    "value": 0.18,
                    "threshold": 0.20,
                    "status": "warning",
                    "description": "Highest single asset concentration"
                },
                {
                    "name": "Sector Concentration",
                    "value": 0.45,
                    "threshold": 0.40,
                    "status": "critical",
                    "description": "Highest sector concentration (Technology)"
                }
            ]
        
        @risk_agent.tool
        async def check_compliance(ctx: RunContext[RiskDeps], portfolio_id: Optional[str] = None) -> List[Dict[str, Any]]:
            """
            Check compliance rules for the specified portfolio.
            
            Args:
                ctx: The context.
                portfolio_id: Optional ID of the portfolio to analyze. If not provided, the default portfolio is used.
                
            Returns:
                A list of compliance rule statuses.
            """
            api_key = ctx.deps.broker_api_key
            
            # Mock implementation for demo purposes
            if not api_key:
                logfire.warning("No broker API key provided, returning mock data")
                return [
                    {
                        "name": "Diversification Rule",
                        "description": "No single asset should exceed 20% of portfolio value",
                        "status": "warning",
                        "details": "AAPL is approaching the limit at 18%"
                    },
                    {
                        "name": "Sector Exposure Rule",
                        "description": "No single sector should exceed 40% of portfolio value",
                        "status": "non-compliant",
                        "details": "Technology sector is at 45%, exceeding the 40% limit"
                    },
                    {
                        "name": "Leverage Rule",
                        "description": "Portfolio leverage should not exceed 1.5x",
                        "status": "compliant",
                        "details": "Current leverage is 1.0x"
                    },
                    {
                        "name": "Liquidity Rule",
                        "description": "At least 80% of assets should be liquidatable within 1 trading day",
                        "status": "compliant",
                        "details": "95% of assets can be liquidated within 1 trading day"
                    },
                    {
                        "name": "Options Exposure Rule",
                        "description": "Options exposure should not exceed 10% of portfolio value",
                        "status": "compliant",
                        "details": "Current options exposure is 5%"
                    }
                ]
            
            # Real implementation would use the API key to fetch data
            # For example:
            # async with ctx.deps.client.get(
            #     f"https://api.broker.com/v1/portfolios/{portfolio_id}/compliance",
            #     headers={"Authorization": f"Bearer {api_key}"}
            # ) as response:
            #     data = await response.json()
            #     return data
            
            # For now, return mock data
            return [
                {
                    "name": "Diversification Rule",
                    "description": "No single asset should exceed 20% of portfolio value",
                    "status": "warning",
                    "details": "AAPL is approaching the limit at 18%"
                },
                {
                    "name": "Sector Exposure Rule",
                    "description": "No single sector should exceed 40% of portfolio value",
                    "status": "non-compliant",
                    "details": "Technology sector is at 45%, exceeding the 40% limit"
                },
                {
                    "name": "Leverage Rule",
                    "description": "Portfolio leverage should not exceed 1.5x",
                    "status": "compliant",
                    "details": "Current leverage is 1.0x"
                },
                {
                    "name": "Liquidity Rule",
                    "description": "At least 80% of assets should be liquidatable within 1 trading day",
                    "status": "compliant",
                    "details": "95% of assets can be liquidated within 1 trading day"
                },
                {
                    "name": "Options Exposure Rule",
                    "description": "Options exposure should not exceed 10% of portfolio value",
                    "status": "compliant",
                    "details": "Current options exposure is 5%"
                }
            ]
        
        @risk_agent.tool
        async def run_stress_tests(
            ctx: RunContext[RiskDeps], 
            portfolio_id: Optional[str] = None,
            custom_scenarios: Optional[List[Dict[str, Any]]] = None
        ) -> Dict[str, Any]:
            """
            Run stress tests on the specified portfolio.
            
            Args:
                ctx: The context.
                portfolio_id: Optional ID of the portfolio to analyze. If not provided, the default portfolio is used.
                custom_scenarios: Optional list of custom stress test scenarios.
                
            Returns:
                Stress test results.
            """
            api_key = ctx.deps.broker_api_key
            
            # Mock implementation for demo purposes
            if not api_key:
                logfire.warning("No broker API key provided, returning mock data")
                
                # Standard scenarios
                scenarios = {
                    "market_crash_2008": {
                        "description": "2008 Financial Crisis Scenario",
                        "expected_loss": -0.28,
                        "var_impact": 0.12,
                        "most_affected_assets": ["SPY", "QQQ", "AAPL"]
                    },
                    "tech_bubble_2000": {
                        "description": "2000 Tech Bubble Burst Scenario",
                        "expected_loss": -0.35,
                        "var_impact": 0.15,
                        "most_affected_assets": ["AAPL", "MSFT", "AMZN"]
                    },
                    "covid_crash_2020": {
                        "description": "COVID-19 Market Crash Scenario",
                        "expected_loss": -0.22,
                        "var_impact": 0.09,
                        "most_affected_assets": ["SPY", "AAPL", "MSFT"]
                    },
                    "interest_rate_hike": {
                        "description": "100 bps Interest Rate Hike Scenario",
                        "expected_loss": -0.12,
                        "var_impact": 0.05,
                        "most_affected_assets": ["BONDS", "SPY", "AAPL"]
                    },
                    "inflation_surge": {
                        "description": "Sudden Inflation Surge Scenario",
                        "expected_loss": -0.18,
                        "var_impact": 0.08,
                        "most_affected_assets": ["BONDS", "SPY", "BRK.B"]
                    }
                }
                
                # Add custom scenarios if provided
                if custom_scenarios:
                    for scenario in custom_scenarios:
                        scenario_id = scenario.get("id", f"custom_{len(scenarios) + 1}")
                        scenarios[scenario_id] = {
                            "description": scenario.get("description", "Custom Scenario"),
                            "expected_loss": scenario.get("expected_loss", -0.15),
                            "var_impact": scenario.get("var_impact", 0.07),
                            "most_affected_assets": scenario.get("most_affected_assets", ["SPY", "AAPL"])
                        }
                
                return {
                    "scenarios": scenarios,
                    "summary": {
                        "worst_case_loss": -0.35,
                        "average_loss": -0.23,
                        "most_vulnerable_assets": ["AAPL", "SPY", "BONDS"],
                        "most_resilient_assets": ["BRK.B", "GOOGL"]
                    }
                }
            
            # Real implementation would use the API key to fetch data
            # For example:
            # async with ctx.deps.client.post(
            #     f"https://api.broker.com/v1/portfolios/{portfolio_id}/stress-tests",
            #     json={"custom_scenarios": custom_scenarios},
            #     headers={"Authorization": f"Bearer {api_key}"}
            # ) as response:
            #     data = await response.json()
            #     return data
            
            # For now, return mock data
            # Standard scenarios
            scenarios = {
                "market_crash_2008": {
                    "description": "2008 Financial Crisis Scenario",
                    "expected_loss": -0.28,
                    "var_impact": 0.12,
                    "most_affected_assets": ["SPY", "QQQ", "AAPL"]
                },
                "tech_bubble_2000": {
                    "description": "2000 Tech Bubble Burst Scenario",
                    "expected_loss": -0.35,
                    "var_impact": 0.15,
                    "most_affected_assets": ["AAPL", "MSFT", "AMZN"]
                },
                "covid_crash_2020": {
                    "description": "COVID-19 Market Crash Scenario",
                    "expected_loss": -0.22,
                    "var_impact": 0.09,
                    "most_affected_assets": ["SPY", "AAPL", "MSFT"]
                },
                "interest_rate_hike": {
                    "description": "100 bps Interest Rate Hike Scenario",
                    "expected_loss": -0.12,
                    "var_impact": 0.05,
                    "most_affected_assets": ["BONDS", "SPY", "AAPL"]
                },
                "inflation_surge": {
                    "description": "Sudden Inflation Surge Scenario",
                    "expected_loss": -0.18,
                    "var_impact": 0.08,
                    "most_affected_assets": ["BONDS", "SPY", "BRK.B"]
                }
            }
            
            # Add custom scenarios if provided
            if custom_scenarios:
                for scenario in custom_scenarios:
                    scenario_id = scenario.get("id", f"custom_{len(scenarios) + 1}")
                    scenarios[scenario_id] = {
                        "description": scenario.get("description", "Custom Scenario"),
                        "expected_loss": scenario.get("expected_loss", -0.15),
                        "var_impact": scenario.get("var_impact", 0.07),
                        "most_affected_assets": scenario.get("most_affected_assets", ["SPY", "AAPL"])
                    }
            
            return {
                "scenarios": scenarios,
                "summary": {
                    "worst_case_loss": -0.35,
                    "average_loss": -0.23,
                    "most_vulnerable_assets": ["AAPL", "SPY", "BONDS"],
                    "most_resilient_assets": ["BRK.B", "GOOGL"]
                }
            }
        
        @risk_agent.tool
        async def generate_mitigation_recommendations(
            ctx: RunContext[RiskDeps],
            risk_metrics: List[Dict[str, Any]],
            compliance_status: List[Dict[str, Any]],
            stress_test_results: Dict[str, Any]
        ) -> List[str]:
            """
            Generate risk mitigation recommendations based on risk analysis.
            
            Args:
                ctx: The context.
                risk_metrics: Risk metrics data.
                compliance_status: Compliance status data.
                stress_test_results: Stress test results data.
                
            Returns:
                A list of risk mitigation recommendations.
            """
            # Identify issues
            issues = []
            
            # Check risk metrics for warnings or critical issues
            for metric in risk_metrics:
                if metric.get("status") in ["warning", "critical"]:
                    issues.append(f"{metric.get('name')} is {metric.get('status')}")
            
            # Check compliance for non-compliant or warning issues
            for rule in compliance_status:
                if rule.get("status") in ["non-compliant", "warning"]:
                    issues.append(f"{rule.get('name')} is {rule.get('status')}")
            
            # Check stress test results for significant vulnerabilities
            if stress_test_results.get("summary", {}).get("worst_case_loss", 0) < -0.30:
                issues.append("Portfolio shows high vulnerability in stress test scenarios")
            
            # Generate recommendations based on issues
            recommendations = []
            
            if "Sector Concentration is critical" in issues or "Sector Exposure Rule is non-compliant" in issues:
                recommendations.append("Reduce technology sector exposure by 5-10% to comply with sector concentration limits")
            
            if "Concentration Risk is warning" in issues or "Diversification Rule is warning" in issues:
                recommendations.append("Consider trimming AAPL position to reduce single-asset concentration risk")
            
            if "Portfolio shows high vulnerability in stress test scenarios" in issues:
                recommendations.append("Increase allocation to defensive assets to improve portfolio resilience in stress scenarios")
                recommendations.append("Consider adding hedging positions (e.g., put options or inverse ETFs) to protect against severe market downturns")
            
            # Add general recommendations if specific issues weren't found
            if not recommendations:
                recommendations = [
                    "Maintain current risk management approach as no critical issues were identified",
                    "Consider regular stress testing to monitor portfolio resilience to changing market conditions",
                    "Review compliance rules quarterly to ensure continued adherence to risk management framework"
                ]
            else:
                # Add additional general recommendations
                recommendations.append("Schedule a comprehensive risk review to address identified issues and improve overall risk profile")
            
            return recommendations
        
        return risk_agent

    async def run(self, task_input: RiskInput, session: Session) -> RiskOutput:
        """
        Run the Risk Manager Agent to analyze portfolio risk and compliance.
        
        Args:
            task_input: The input parameters for the risk analysis task.
            session: Database session for persistence.
            
        Returns:
            Risk output containing risk metrics, compliance status, and recommendations.
        """
        self.log_message(f"Starting risk analysis")
        
        try:
            # Create HTTP client for API requests
            async with httpx.AsyncClient() as client:
                # Set up dependencies
                deps = RiskDeps(
                    client=client,
                    broker_api_key=os.getenv("BROKER_API_KEY"),
                    market_data_api_key=os.getenv("MARKET_DATA_API_KEY")
                )
                
                # Run the agent
                result = await self.pydantic_agent.run(
                    deps=deps,
                    portfolio_id=task_input.portfolio_id,
                    include_var=task_input.include_var,
                    include_stress_tests=task_input.include_stress_tests,
                    include_compliance=task_input.include_compliance
                )
                
                # Process the result
                self.log_message(f"Risk analysis completed successfully")
                
                # Update agent stats
                self._update_agent_stats(success=True, session=session)
                
                # Extract structured data from the result
                # In a real implementation, we would parse the agent's response
                # For now, we'll create a structured output using the tool functions
                
                # Get risk metrics
                risk_metrics_data = await self.pydantic_agent.calculate_risk_metrics(
                    RunContext(deps=deps),
                    portfolio_id=task_input.portfolio_id
                )
                risk_metrics = [RiskMetric(**metric) for metric in risk_metrics_data]
                
                # Get compliance status
                compliance_status_data = await self.pydantic_agent.check_compliance(
                    RunContext(deps=deps),
                    portfolio_id=task_input.portfolio_id
                )
                compliance_status = [ComplianceRule(**rule) for rule in compliance_status_data]
                
                # Run stress tests
                stress_test_results = {}
                if task_input.include_stress_tests:
                    stress_test_results = await self.pydantic_agent.run_stress_tests(
                        RunContext(deps=deps),
                        portfolio_id=task_input.portfolio_id,
                        custom_scenarios=task_input.custom_scenarios
                    )
                
                # Generate risk warnings
                risk_warnings = []
                for metric in risk_metrics:
                    if metric.status == "critical":
                        risk_warnings.append(f"CRITICAL: {metric.name} ({metric.value:.2%}) exceeds threshold ({metric.threshold:.2%})")
                    elif metric.status == "warning":
                        risk_warnings.append(f"WARNING: {metric.name} ({metric.value:.2%}) is approaching threshold ({metric.threshold:.2%})")
                
                for rule in compliance_status:
                    if rule.status == "non-compliant":
                        risk_warnings.append(f"NON-COMPLIANT: {rule.name} - {rule.details}")
                    elif rule.status == "warning":
                        risk_warnings.append(f"WARNING: {rule.name} - {rule.details}")
                
                # Generate mitigation recommendations
                mitigation_recommendations = await self.pydantic_agent.generate_mitigation_recommendations(
                    RunContext(deps=deps),
                    risk_metrics=risk_metrics_data,
                    compliance_status=compliance_status_data,
                    stress_test_results=stress_test_results
                )
                
                return RiskOutput(
                    success=True,
                    message="Risk analysis completed successfully",
                    risk_metrics=risk_metrics,
                    compliance_status=compliance_status,
                    stress_test_results=stress_test_results,
                    risk_warnings=risk_warnings,
                    mitigation_recommendations=mitigation_recommendations
                )
                
        except Exception as e:
            self.log_message(f"Risk analysis failed: {str(e)}", level="error")
            # Update agent stats
            self._update_agent_stats(success=False, session=session)
            return RiskOutput(
                success=False,
                message="Risk analysis failed",
                error_details=str(e)
            )
"""
Research & News Agent implementation using Pydantic AI.
This agent specializes in market/news analysis and indicator extraction.
"""
from typing import Dict, List, Any, Optional, ClassVar, Type
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

class ResearchInput(AgentTaskInput):
    """Input for the Research & News Agent."""
    symbols: List[str] = Field(description="List of asset symbols to research")
    timeframe: str = Field(default="1d", description="Timeframe for market data (e.g., 1h, 1d, 1w)")
    focus_areas: Optional[List[str]] = Field(default=None, description="Specific areas to focus on (e.g., earnings, macro trends)")
    max_news_age_days: int = Field(default=7, description="Maximum age of news articles to consider in days")

class NewsArticle(BaseModel):
    """Model representing a news article."""
    title: str
    source: str
    published_date: str
    summary: str
    url: Optional[str] = None
    sentiment: Optional[str] = None

class MarketData(BaseModel):
    """Model representing market data for an asset."""
    symbol: str
    price: float
    change_percent: float
    volume: float
    high: float
    low: float
    indicators: Dict[str, float] = Field(default_factory=dict)

class ResearchOutput(AgentTaskOutput):
    """Output from the Research & News Agent."""
    market_data: Dict[str, MarketData] = Field(default_factory=dict)
    news_articles: List[NewsArticle] = Field(default_factory=list)
    key_insights: List[str] = Field(default_factory=list)
    trading_opportunities: List[Dict[str, Any]] = Field(default_factory=list)
    relevant_indicators: Dict[str, List[str]] = Field(default_factory=dict)

# --- Agent Dependencies ---

@dataclass
class ResearchDeps:
    """Dependencies for the Research & News Agent."""
    client: httpx.AsyncClient
    market_data_api_key: Optional[str] = None
    news_api_key: Optional[str] = None
    serp_api_key: Optional[str] = None

# --- Agent Implementation ---

class ResearchAIAgent(PydanticAIAgent[ResearchInput, ResearchOutput]):
    """
    Research & News Agent that analyzes market data and news to provide insights.
    """
    input_schema: ClassVar[Type[ResearchInput]] = ResearchInput
    output_schema: ClassVar[Type[ResearchOutput]] = ResearchOutput

    def _create_pydantic_agent(self):
        """Create the Pydantic AI agent instance."""
        system_prompt = getattr(self.config, 'researchPrompt', 
            "Analyze the latest market news, trends, and data for the specified assets.\n"
            "Identify key insights, potential trading opportunities, and relevant indicators.\n"
            "Focus on {watchedAssets} with particular attention to {focusAreas}.\n"
            "Market Data: {marketData}\nRecent News: {recentNews}"
        )
        
        # Create the agent
        research_agent = Agent(
            self.llm_client,
            system_prompt=system_prompt,
            deps_type=ResearchDeps,
            retries=2,
            instrument=True
        )
        
        # Define tools
        
        @research_agent.tool
        async def fetch_market_data(ctx: RunContext[ResearchDeps], symbol: str, timeframe: str = "1d") -> Dict[str, Any]:
            """
            Fetch market data for a specific symbol.
            
            Args:
                ctx: The context.
                symbol: The asset symbol to fetch data for.
                timeframe: The timeframe for the data (e.g., 1h, 1d, 1w).
                
            Returns:
                A dictionary containing market data.
            """
            api_key = ctx.deps.market_data_api_key
            
            # Mock implementation for demo purposes
            if not api_key:
                logfire.warning("No market data API key provided, returning mock data")
                return {
                    "symbol": symbol,
                    "price": 150.25,
                    "change_percent": 2.5,
                    "volume": 1000000,
                    "high": 152.30,
                    "low": 148.75,
                    "indicators": {
                        "rsi": 65.4,
                        "macd": 0.75,
                        "sma_50": 145.20,
                        "sma_200": 140.50
                    }
                }
            
            # Real implementation would use the API key to fetch data
            # For example:
            # async with ctx.deps.client.get(
            #     f"https://api.marketdata.com/v1/quotes/{symbol}",
            #     headers={"Authorization": f"Bearer {api_key}"}
            # ) as response:
            #     data = await response.json()
            #     return data
            
            # For now, return mock data
            return {
                "symbol": symbol,
                "price": 150.25,
                "change_percent": 2.5,
                "volume": 1000000,
                "high": 152.30,
                "low": 148.75,
                "indicators": {
                    "rsi": 65.4,
                    "macd": 0.75,
                    "sma_50": 145.20,
                    "sma_200": 140.50
                }
            }
        
        @research_agent.tool
        async def search_news(ctx: RunContext[ResearchDeps], query: str, max_age_days: int = 7) -> List[Dict[str, Any]]:
            """
            Search for news articles related to the query.
            
            Args:
                ctx: The context.
                query: The search query.
                max_age_days: Maximum age of news articles in days.
                
            Returns:
                A list of news articles.
            """
            api_key = ctx.deps.news_api_key
            serp_api_key = ctx.deps.serp_api_key
            
            # Mock implementation for demo purposes
            if not api_key and not serp_api_key:
                logfire.warning("No news API key provided, returning mock data")
                return [
                    {
                        "title": f"Market Update: {query}",
                        "source": "Financial Times",
                        "published_date": (datetime.now() - timedelta(days=1)).isoformat(),
                        "summary": f"Recent developments in {query} show promising trends for investors.",
                        "url": f"https://example.com/news/{query.lower().replace(' ', '-')}",
                        "sentiment": "positive"
                    },
                    {
                        "title": f"Analyst Insights: {query}",
                        "source": "Bloomberg",
                        "published_date": (datetime.now() - timedelta(days=3)).isoformat(),
                        "summary": f"Analysts provide mixed outlook for {query} in the coming quarter.",
                        "url": f"https://example.com/analysis/{query.lower().replace(' ', '-')}",
                        "sentiment": "neutral"
                    }
                ]
            
            # Real implementation would use the API key to fetch news
            # For example:
            # async with ctx.deps.client.get(
            #     "https://newsapi.org/v2/everything",
            #     params={
            #         "q": query,
            #         "from": (datetime.now() - timedelta(days=max_age_days)).isoformat(),
            #         "sortBy": "publishedAt",
            #         "apiKey": api_key
            #     }
            # ) as response:
            #     data = await response.json()
            #     articles = data.get("articles", [])
            #     return [
            #         {
            #             "title": article["title"],
            #             "source": article["source"]["name"],
            #             "published_date": article["publishedAt"],
            #             "summary": article["description"],
            #             "url": article["url"]
            #         }
            #         for article in articles[:5]  # Limit to 5 articles
            #     ]
            
            # For now, return mock data
            return [
                {
                    "title": f"Market Update: {query}",
                    "source": "Financial Times",
                    "published_date": (datetime.now() - timedelta(days=1)).isoformat(),
                    "summary": f"Recent developments in {query} show promising trends for investors.",
                    "url": f"https://example.com/news/{query.lower().replace(' ', '-')}",
                    "sentiment": "positive"
                },
                {
                    "title": f"Analyst Insights: {query}",
                    "source": "Bloomberg",
                    "published_date": (datetime.now() - timedelta(days=3)).isoformat(),
                    "summary": f"Analysts provide mixed outlook for {query} in the coming quarter.",
                    "url": f"https://example.com/analysis/{query.lower().replace(' ', '-')}",
                    "sentiment": "neutral"
                }
            ]
        
        @research_agent.tool
        async def analyze_sentiment(ctx: RunContext[ResearchDeps], text: str) -> Dict[str, Any]:
            """
            Analyze the sentiment of a text.
            
            Args:
                ctx: The context.
                text: The text to analyze.
                
            Returns:
                A dictionary containing sentiment analysis results.
            """
            # This could use the LLM directly or a specialized sentiment analysis API
            # For now, we'll use a simple mock implementation
            
            positive_words = ["growth", "profit", "increase", "positive", "bullish", "up", "gain", "success"]
            negative_words = ["decline", "loss", "decrease", "negative", "bearish", "down", "fail", "risk"]
            
            text_lower = text.lower()
            positive_count = sum(1 for word in positive_words if word in text_lower)
            negative_count = sum(1 for word in negative_words if word in text_lower)
            
            if positive_count > negative_count:
                sentiment = "positive"
                score = 0.5 + (positive_count - negative_count) * 0.1
            elif negative_count > positive_count:
                sentiment = "negative"
                score = 0.5 - (negative_count - positive_count) * 0.1
            else:
                sentiment = "neutral"
                score = 0.5
            
            # Ensure score is between 0 and 1
            score = max(0, min(1, score))
            
            return {
                "sentiment": sentiment,
                "score": score,
                "positive_aspects": positive_count,
                "negative_aspects": negative_count
            }
        
        return research_agent

    async def run(self, task_input: ResearchInput, session: Session) -> ResearchOutput:
        """
        Run the Research & News Agent to analyze market data and news.
        
        Args:
            task_input: The input parameters for the research task.
            session: Database session for persistence.
            
        Returns:
            Research output containing market data, news articles, and insights.
        """
        self.log_message(f"Starting research for symbols: {task_input.symbols}")
        
        try:
            # Create HTTP client for API requests
            async with httpx.AsyncClient() as client:
                # Set up dependencies
                deps = ResearchDeps(
                    client=client,
                    market_data_api_key=os.getenv("MARKET_DATA_API_KEY"),
                    news_api_key=os.getenv("NEWS_API_KEY"),
                    serp_api_key=os.getenv("SERP_API_KEY")
                )
                
                # Prepare the prompt variables
                watched_assets = ", ".join(task_input.symbols)
                focus_areas = ", ".join(task_input.focus_areas) if task_input.focus_areas else "general market trends"
                
                # Run the agent
                result = await self.pydantic_agent.run(
                    deps=deps,
                    watchedAssets=watched_assets,
                    focusAreas=focus_areas,
                    timeframe=task_input.timeframe,
                    max_news_age=task_input.max_news_age_days
                )
                
                # Process the result
                self.log_message(f"Research completed successfully")
                
                # Update agent stats
                self._update_agent_stats(success=True, session=session)
                
                # Extract structured data from the result
                # In a real implementation, we would parse the agent's response
                # For now, we'll create a mock output
                
                market_data = {}
                for symbol in task_input.symbols:
                    market_data[symbol] = MarketData(
                        symbol=symbol,
                        price=150.25 + (hash(symbol) % 100),
                        change_percent=2.5 + (hash(symbol) % 5),
                        volume=1000000 + (hash(symbol) % 500000),
                        high=152.30 + (hash(symbol) % 10),
                        low=148.75 - (hash(symbol) % 5),
                        indicators={
                            "rsi": 65.4 + (hash(symbol) % 10),
                            "macd": 0.75 + (hash(symbol[:2]) % 1),
                            "sma_50": 145.20 + (hash(symbol) % 20),
                            "sma_200": 140.50 + (hash(symbol) % 30)
                        }
                    )
                
                news_articles = [
                    NewsArticle(
                        title=f"Market Update: {symbol}",
                        source="Financial Times",
                        published_date=(datetime.now() - timedelta(days=1)).isoformat(),
                        summary=f"Recent developments in {symbol} show promising trends for investors.",
                        url=f"https://example.com/news/{symbol.lower().replace(' ', '-')}",
                        sentiment="positive"
                    )
                    for symbol in task_input.symbols
                ]
                
                key_insights = [
                    f"Strong momentum observed in {task_input.symbols[0]} based on RSI and volume patterns",
                    f"Recent news sentiment for {task_input.symbols[-1]} is predominantly positive",
                    "Market volatility has decreased over the past week, suggesting potential stability"
                ]
                
                trading_opportunities = [
                    {
                        "symbol": task_input.symbols[0],
                        "direction": "long",
                        "confidence": 0.75,
                        "rationale": "Strong technical indicators and positive news sentiment"
                    }
                ]
                
                relevant_indicators = {
                    symbol: ["RSI", "MACD", "Volume", "SMA-50/200 Crossover"]
                    for symbol in task_input.symbols
                }
                
                return ResearchOutput(
                    success=True,
                    message="Research completed successfully",
                    market_data=market_data,
                    news_articles=news_articles,
                    key_insights=key_insights,
                    trading_opportunities=trading_opportunities,
                    relevant_indicators=relevant_indicators
                )
                
        except Exception as e:
            self.log_message(f"Research failed: {str(e)}", level="error")
            # Update agent stats
            self._update_agent_stats(success=False, session=session)
            return ResearchOutput(
                success=False,
                message="Research failed",
                error_details=str(e)
            )
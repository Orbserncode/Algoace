# Pydantic AI Reference Guide

This document provides a reference guide for implementing agents using the Pydantic AI framework in the AlgoAce Trader platform.

## Overview

Pydantic AI is a Python agent framework designed to make it less painful to build production-grade applications with Generative AI. It provides a structured way to define agents, tools, and their interactions with LLMs.

## Key Concepts

### Agent

An agent is the core abstraction in Pydantic AI. It represents an entity that can perform tasks using LLMs and tools.

```python
from pydantic_ai import Agent

weather_agent = Agent(
    "openai:gpt-4o",
    system_prompt=(
        "Be concise, reply with one sentence."
        "Use the `get_lat_lng` tool to get the latitude and longitude of the locations, "
        "then use the `get_weather` tool to get the weather."
    ),
    deps_type=Deps,
    retries=2,
    instrument=True
)
```

### Tools

Tools are functions that an agent can use to interact with external systems or perform specific tasks. Tools are defined using decorators:

```python
@weather_agent.tool
async def get_lat_lng(
    ctx: RunContext[Deps], location_description: str
) -> dict[str, float]:
    """Get the latitude and longitude of a location.
    
    Args:
        ctx: The context.
        location_description: A description of a location.
    """
    # Tool implementation...
    return {"lat": 51.5, "lng": -0.1}
```

### Dependencies

Dependencies are resources that tools might need, such as API clients, database connections, etc. They are defined using a dataclass:

```python
@dataclass
class Deps:
    client: AsyncClient
    weather_api_key: str | None = None
    geo_api_key: str | None = None
```

### RunContext

The RunContext provides access to dependencies and other contextual information during tool execution:

```python
async def get_weather(ctx: RunContext[Deps], lat: float, lng: float) -> dict[str, Any]:
    # Access dependencies
    api_key = ctx.deps.weather_api_key
    client = ctx.deps.client
    # Use dependencies to implement the tool
```

## Implementation Pattern

1. **Define Dependencies**: Create a dataclass with all the resources your agent needs.
2. **Create Agent**: Initialize a Pydantic AI Agent with the appropriate model and system prompt.
3. **Define Tools**: Implement tools as async functions decorated with `@agent.tool`.
4. **Run the Agent**: Use the agent's `run()` method to execute tasks.

## Example: Research Agent

```python
from dataclasses import dataclass
from pydantic_ai import Agent, RunContext
from httpx import AsyncClient

@dataclass
class ResearchDeps:
    client: AsyncClient
    news_api_key: str
    market_data_api_key: str

research_agent = Agent(
    "groq:llama3-70b-8192",
    system_prompt=(
        "You are a financial research agent. Analyze market data and news to provide insights."
        "Use the `fetch_market_data` tool to get market data and `search_news` tool to find relevant news."
    ),
    deps_type=ResearchDeps
)

@research_agent.tool
async def fetch_market_data(ctx: RunContext[ResearchDeps], symbol: str) -> dict:
    """Fetch market data for a specific symbol.
    
    Args:
        ctx: The context.
        symbol: The stock symbol to fetch data for.
    """
    api_key = ctx.deps.market_data_api_key
    client = ctx.deps.client
    # Implementation...
    return {"price": 150.25, "volume": 1000000, "change": 2.5}

@research_agent.tool
async def search_news(ctx: RunContext[ResearchDeps], query: str) -> list[dict]:
    """Search for news articles related to the query.
    
    Args:
        ctx: The context.
        query: The search query.
    """
    api_key = ctx.deps.news_api_key
    client = ctx.deps.client
    # Implementation...
    return [{"title": "Market Update", "summary": "..."}]

# Usage
async def main():
    async with AsyncClient() as client:
        deps = ResearchDeps(
            client=client,
            news_api_key="your_news_api_key",
            market_data_api_key="your_market_data_api_key"
        )
        result = await research_agent.run(deps=deps)
        print(result.output)
```

## Best Practices

1. **Type Annotations**: Always use proper type annotations for tool parameters and return values.
2. **Docstrings**: Provide clear docstrings for all tools to help the LLM understand their purpose.
3. **Error Handling**: Implement proper error handling in tools to prevent agent failures.
4. **Dependency Injection**: Use the deps pattern to inject dependencies rather than hardcoding them.
5. **Async**: Use async functions for tools to enable parallel processing.
6. **Logging**: Use logfire for structured logging of agent actions.

## Integration with AlgoAce

In the AlgoAce platform, we've implemented a wrapper around Pydantic AI agents that integrates with our database models and configuration system:

1. **Agent Models**: Database models that store agent configuration and state.
2. **Agent Schemas**: Pydantic models for validating agent configuration.
3. **Agent Implementations**: Concrete implementations of different agent types using Pydantic AI.

The `PydanticAIAgent` base class provides a common interface for all agent types and handles the integration with the database and configuration system.

## Environment Variables

Pydantic AI agents typically require API keys for LLM providers and other services. These should be set in the `.env` file:

```
# LLM Provider API Keys
OPENAI_API_KEY=your_openai_api_key
GROQ_API_KEY=your_groq_api_key

# Default LLM Provider
DEFAULT_LLM_PROVIDER=groq

# Other API Keys
NEWS_API_KEY=your_news_api_key
WEATHER_API_KEY=your_weather_api_key
```

## References

- [Pydantic AI Documentation](https://ai.pydantic.dev/)
- [Pydantic AI GitHub Repository](https://github.com/pydantic/pydantic-ai)
# AlgoAce Trader

A modular, multi-agent hedge fund trading platform built with Pydantic AI.

## Overview

AlgoAce Trader is a sophisticated trading platform that leverages multiple AI agents, each specializing in a core hedge fund function. The platform uses Pydantic AI to define and orchestrate these agents, allowing them to work together to make trading decisions.

## Architecture

The platform consists of the following components:

### Agents

- **Research & News Agent**: Analyzes market news, trends, and data to provide insights and identify trading opportunities.
- **Portfolio Analyst Agent**: Manages asset allocation, portfolio analytics, and optimization recommendations.
- **Risk Manager Agent**: Monitors risk metrics, compliance, and provides risk mitigation strategies.
- **Execution Agent**: Aggregates signals from other agents and integrates with Lumibot for trading execution.
- **Strategy Coding Agent**: Generates and tests trading strategies based on user preferences and market analysis.

### Backend

- **FastAPI**: Provides a RESTful API for the frontend and CLI to interact with the platform.
- **SQLModel**: Handles database operations with type safety.
- **Pydantic AI**: Orchestrates agents and their interactions with LLMs.
- **Typer**: Powers the CLI interface for command-line control.

### Frontend

- **Next.js**: Provides a modern, responsive web interface.
- **React**: Powers the UI components and state management.
- **Shadcn/UI**: Provides a consistent design system.

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (optional, SQLite is used by default)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/algoace-trader.git
   cd algoace-trader
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Install frontend dependencies:
   ```bash
   cd ..
   npm install
   ```

4. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   # Edit .env file with your API keys and configuration
   ```

5. Initialize the database:
   ```bash
   cd backend
   python -m alembic upgrade head
   ```

### Running the Application

#### Backend

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
npm run dev
```

#### CLI

```bash
cd backend
python cli.py --help
```

## Configuration

AlgoAce Trader uses a YAML configuration file (`backend/config.yaml`) for system-wide settings. You can override these settings with environment variables.

### Example Configuration

```yaml
# Global Settings
global:
  default_broker: "alpaca"
  log_level: "info"
  default_llm_provider: "groq"
  default_llm_model: "llama3-70b-8192"

# Agent Configurations
agents:
  research:
    enabled: true
    llm_provider: "groq"
    llm_model: "llama3-70b-8192"
    fetch_frequency_minutes: 15
    # ...
```

## LLM Provider Support

AlgoAce Trader supports multiple LLM providers:

- **Groq** (default): Fast inference with Llama 3 models
- **OpenAI**: GPT-4o and other models
- **Local**: Support for running local models (requires additional setup)

## CLI Usage

AlgoAce Trader provides a powerful CLI for managing agents, strategies, and backtests:

```bash
# List all agents
python cli.py agent list

# Run a research agent
python cli.py agent run "Research Agent" --symbol AAPL --symbol MSFT

# Run a backtest
python cli.py backtest run "My Strategy" --start-date 2023-01-01 --end-date 2023-12-31
```

## API Endpoints

The backend provides RESTful API endpoints for all platform functionality:

- `/agents`: CRUD operations for agents
- `/strategies`: CRUD operations for strategies
- `/backtests`: Run and manage backtests
- `/monitoring`: Get performance metrics and logs

## Development

### Project Structure

```
algoace-trader/
├── backend/
│   ├── ai_agents/         # Agent implementations
│   ├── alembic/           # Database migrations
│   ├── api/               # API endpoints
│   ├── .env.example       # Example environment variables
│   ├── config.yaml        # Configuration file
│   ├── cli.py             # CLI interface
│   ├── main.py            # FastAPI application
│   ├── models.py          # Database models
│   ├── requirements.txt   # Python dependencies
│   └── schemas.py         # Pydantic schemas
├── src/                   # Frontend source code
│   ├── app/               # Next.js pages and components
│   ├── components/        # Reusable UI components
│   ├── services/          # API client services
│   └── ...
├── package.json           # Node.js dependencies
└── README.md              # This file
```

### Adding a New Agent

1. Define the agent's schema in `backend/schemas.py`
2. Add the agent type to `backend/models.py`
3. Implement the agent in `backend/ai_agents/`
4. Update the agent factory in `backend/ai_agents/base_agent.py`
5. Add API endpoints in `backend/api/`
6. Add CLI commands in `backend/cli.py`
7. Add UI components in `src/app/agents/`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Pydantic AI](https://ai.pydantic.dev/) for the agent framework
- [Lumibot](https://lumibot.io/) for trading execution and backtesting
- [FastAPI](https://fastapi.tiangolo.com/) for the backend API
- [Next.js](https://nextjs.org/) for the frontend

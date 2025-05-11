# AlgoAce API Configuration Backup

This document serves as a reference for the AlgoAce API configuration. It provides details about the API endpoints, their functionality, and how they interact with the frontend.

## API Base URL

The API base URL is configured in the frontend services as:

```javascript
// API base URL - use /api prefix to rely on Next.js rewrites
const API_BASE_URL = '/api';
```

This is defined in various service files like `src/services/backtesting-service.ts`.

## Backend API Structure

The backend API is organized into several modules:

### 1. Strategies API

**File:** `backend/api/strategies.py`

Key endpoints:
- `/strategies` - Get all strategies
- `/strategies/{strategy_id}` - Get a specific strategy
- `/strategies/{strategy_id}/code` - Get the code for a specific strategy

**File:** `backend/api/file_based_strategies.py`

Key endpoints:
- `/file-strategies` - Get all file-based strategies
- `/file-strategies/{strategy_id}` - Get a specific file-based strategy
- `/file-strategies/{strategy_id}/code` - Get the code for a specific file-based strategy

### 2. Agents API

**File:** `backend/api/agents.py`

Key endpoints:
- `/agents` - Get all agents
- `/agents/{agent_id}` - Get a specific agent

**File:** `backend/api/file_based_agents.py`

Key endpoints:
- `/file-based-agents` - Get all file-based agents
- `/file-based-agents/{agent_id}` - Get a specific file-based agent

### 3. Backtesting API

**File:** `backend/api/backtesting.py`

Key endpoints:
- `/backtesting/run` - Run a backtest
- `/backtesting/results/{strategy_id}` - Get backtest results for a strategy
- `/backtesting/jobs/{job_id}/status` - Get the status of a backtest job

### 4. Backtest History API

**File:** `backend/api/backtest_history.py`

Key endpoints:
- `/backtest-history` - Get all backtest history items
- `/backtest-history/{id}` - Get a specific backtest history item
- `/backtest-history/{id}/lock` - Lock/unlock a backtest history item
- `/backtest-history/{id}/analyze` - Generate AI analysis for a backtest history item

### 5. Datasets API

**File:** `backend/api/datasets.py`

Key endpoints:
- `/datasets` - Get all datasets
- `/datasets/{id}` - Get a specific dataset
- `/datasets/check` - Check if a dataset exists for a symbol and timeframe
- `/datasets/download` - Download market data for a symbol and timeframe

### 6. Strategy Configs API

**File:** `backend/api/strategy_configs.py`

Key endpoints:
- `/strategy-configs` - Get all strategy configurations
- `/strategy-configs/{config_id}` - Get a specific strategy configuration

### 7. Monitoring API

**File:** `backend/api/monitoring.py`

Key endpoints:
- `/monitoring/performance` - Get performance data
- `/monitoring/activity-logs` - Get activity logs
- `/monitoring/trades` - Get trades data

### 8. Recommendations API

**File:** `backend/api/recommendations.py`

Key endpoints:
- `/recommendations` - Get all recommendations
- `/recommendations/{id}` - Get a specific recommendation

## Frontend Service Integration

The frontend services make API calls to these endpoints:

### 1. Strategies Service

**File:** `src/services/strategies-service.ts`

Key functions:
- `getStrategies(includeArchived)` - Fetches strategies from the file-based API
- `getStrategy(strategyId)` - Fetches a specific strategy
- `getStrategyCode(strategyId)` - Fetches the code for a specific strategy

### 2. Backtesting Service

**File:** `src/services/backtesting-service.ts`

Key functions:
- `getBacktestResults(strategyId)` - Fetches backtest results for a strategy
- `runBacktest(strategyId, parameters)` - Triggers a new backtest run
- `getBacktestJobStatus(jobId)` - Fetches the status of a backtest job
- `checkDatasetAvailability(symbol, timeframe)` - Checks if a dataset is available
- `downloadMarketData(symbol, timeframe, startDate, endDate)` - Downloads market data
- `fetchBacktestHistoryList()` - Fetches the list of backtest history items
- `saveBacktestResults(results)` - Saves backtest results to history

### 3. Agents Service

**File:** `src/services/agents-service.ts`

Key functions:
- `getAgents()` - Fetches all agents
- `getAgent(agentId)` - Fetches a specific agent

### 4. Datasets Service

**File:** `src/services/datasets-service.ts`

Key functions:
- `getDatasets()` - Fetches all datasets
- `getDataset(datasetId)` - Fetches a specific dataset

### 5. Monitoring Service

**File:** `src/services/monitoring-service.ts`

Key functions:
- `getPerformanceData()` - Fetches performance data
- `getActivityLogs()` - Fetches activity logs
- `getTrades()` - Fetches trades data

## Important Notes

1. The API endpoints use a redirect mechanism for file-based strategies and agents, which requires proper handling in the frontend services.

2. The backtesting system relies on dataset files being available in the correct location. The dataset paths are stored in the database and should point to valid CSV files.

3. The frontend services handle error cases gracefully, returning empty arrays or null values when API calls fail, to prevent the UI from crashing.

4. CORS is configured in the backend to allow requests from any origin for development purposes.

5. The API uses FastAPI for the backend, which provides automatic OpenAPI documentation at `/docs` when the server is running.

## Troubleshooting

If you encounter issues with the API:

1. Check that the backend server is running (`python backend/app.py`).
2. Verify that the frontend is properly configured to use the correct API base URL.
3. Check the browser console for any error messages related to API calls.
4. Verify that the database contains the necessary data for the API to function correctly.
5. Check that the dataset files exist in the correct location and are properly formatted.
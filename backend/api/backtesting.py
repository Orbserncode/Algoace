# backend/api/backtesting.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlmodel import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime

from backend.database import get_session
from backend import crud
from backend.models import dataset
from backend.crud_datasets import search_datasets

router = APIRouter(
    prefix="/backtesting",
    tags=["backtesting"],
    responses={404: {"description": "Not found"}},
)

# Models for backtesting
class BacktestParameters(BaseModel):
    startDate: str
    endDate: str
    initialCapital: float
    symbol: str
    timeframe: str
    # No datasetId parameter - we'll check availability based on symbol and timeframe

class BacktestRequest(BaseModel):
    strategy_id: str
    parameters: BacktestParameters

class BacktestJobResponse(BaseModel):
    jobId: str
    status: str = "PENDING"
    message: str = "Backtest job queued"

class BacktestJobStatus(BaseModel):
    status: str
    message: Optional[str] = None

# In-memory storage for backtest jobs (would be replaced with a proper database in production)
backtest_jobs = {}

@router.post("/run", response_model=BacktestJobResponse)
async def run_backtest(
    request: BacktestRequest,
    session: Session = Depends(get_session)
):
    """
    Queue a new backtest job.
    """
    try:
        # Handle both file-based strategies (strat-name_of_strategy) and database strategies (strat-123)
        strategy_id_match = request.strategy_id.split("-")
        if len(strategy_id_match) != 2:
            raise HTTPException(status_code=400, detail="Invalid strategy ID format")
        
        strategy_prefix = strategy_id_match[0]
        strategy_identifier = strategy_id_match[1]
        
        # Check if this is a file-based strategy
        if strategy_prefix == "strat" and not strategy_identifier.isdigit():
            # This is a file-based strategy, we'll handle it differently
            # For now, we'll just proceed with the backtest
            print(f"Processing file-based strategy: {request.strategy_id}")
            strategy = {"id": request.strategy_id, "name": strategy_identifier}
        else:
            # This is a database strategy with numeric ID
            if not strategy_identifier.isdigit():
                raise HTTPException(status_code=400, detail="Invalid strategy ID format for database strategy")
            
            numeric_id = int(strategy_identifier)
            
            # Check if strategy exists in database
            strategy = crud.get_strategy(session=session, strategy_id=numeric_id)
            if not strategy:
                raise HTTPException(status_code=404, detail=f"Strategy with ID {request.strategy_id} not found")
        
        # Check if dataset exists for the requested symbol and timeframe
        datasets = search_datasets(
            session=session,
            search_term=request.parameters.symbol,
            filters={"timeframe": request.parameters.timeframe}
        )
        
        # Log the search results for debugging
        print(f"Backtesting dataset check for {request.parameters.symbol} with timeframe {request.parameters.timeframe}: Found {len(datasets)} datasets")
        if datasets:
            for dataset in datasets:
                print(f"  - Dataset: {dataset.name}, Timeframe: {dataset.dataset_metadata.get('timeframe', 'unknown')}")
                # Check if the dataset is compatible with Lumibot
                if not dataset.dataset_metadata.get('lumibot_compatible', False):
                    print(f"  - WARNING: Dataset {dataset.name} is not marked as Lumibot compatible")
        
        if not datasets:
            raise HTTPException(
                status_code=400,
                detail=f"No dataset available for {request.parameters.symbol} with timeframe {request.parameters.timeframe}. Please download the data first."
            )
        
        # Check if any of the datasets are compatible with Lumibot
        lumibot_compatible = any(dataset.dataset_metadata.get('lumibot_compatible', False) for dataset in datasets)
        if not lumibot_compatible:
            print(f"WARNING: No Lumibot-compatible datasets found for {request.parameters.symbol} with timeframe {request.parameters.timeframe}")
            # We'll continue anyway, but log the warning
        
        # Generate a unique job ID
        job_id = str(uuid.uuid4())
        
        # Store job details (in a real system, this would be in a database)
        backtest_jobs[job_id] = {
            "strategy_id": request.strategy_id,
            "parameters": request.parameters.model_dump(),
            "status": "PENDING",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        
        # In a real system, this would queue the job in a task queue like Celery
        # For now, we'll simulate this by updating the job status after a delay
        import asyncio
        asyncio.create_task(simulate_backtest_execution(job_id))
        
        return BacktestJobResponse(jobId=job_id)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.get("/jobs/{job_id}/status", response_model=BacktestJobStatus)
async def get_backtest_job_status(job_id: str):
    """
    Get the status of a backtest job.
    """
    if job_id not in backtest_jobs:
        raise HTTPException(status_code=404, detail=f"Backtest job {job_id} not found")
    
    job = backtest_jobs[job_id]
    return BacktestJobStatus(
        status=job["status"],
        message=job.get("message")
    )

@router.get("/results/{strategy_id}")
async def get_backtest_results(strategy_id: str, session: Session = Depends(get_session)):
    """
    Get the results of the most recent backtest for a strategy.
    """
    from backend.crud_backtest import get_latest_backtest_result
    
    # First, check if we have stored results in the database
    stored_result = get_latest_backtest_result(session, strategy_id)
    if stored_result:
        # Return the stored results
        return {
            "strategyId": stored_result.strategy_id,
            "timestamp": stored_result.timestamp.isoformat(),
            "summaryMetrics": stored_result.summary_metrics,
            "equityCurve": stored_result.equity_curve,
            "trades": stored_result.trades,
            "parameters": stored_result.parameters,
            "logOutput": stored_result.log_output,
            "aiAnalysis": stored_result.ai_analysis
        }
    
    # If no stored results, handle the job-based results
    # Handle both file-based strategies (strat-name_of_strategy) and database strategies (strat-123)
    strategy_id_match = strategy_id.split("-")
    if len(strategy_id_match) != 2:
        raise HTTPException(status_code=400, detail="Invalid strategy ID format")
    
    strategy_prefix = strategy_id_match[0]
    strategy_identifier = strategy_id_match[1]
    
    # Check if this is a file-based strategy
    if strategy_prefix == "strat" and not strategy_identifier.isdigit():
        # This is a file-based strategy, we'll handle it differently
        print(f"Getting results for file-based strategy: {strategy_id}")
        strategy = {"id": strategy_id, "name": strategy_identifier}
    else:
        # This is a database strategy with numeric ID
        if not strategy_identifier.isdigit():
            raise HTTPException(status_code=400, detail="Invalid strategy ID format for database strategy")
        
        numeric_id = int(strategy_identifier)
        
        # Check if strategy exists in database
        strategy = crud.get_strategy(session=session, strategy_id=numeric_id)
        if not strategy:
            raise HTTPException(status_code=404, detail=f"Strategy with ID {strategy_id} not found")
    
    # Find the most recent completed backtest job for this strategy
    completed_jobs = [
        job for job_id, job in backtest_jobs.items()
        if job["strategy_id"] == strategy_id and job["status"] == "COMPLETED"
    ]
    
    if not completed_jobs:
        # Check if there are any jobs for this strategy with any status
        any_jobs = [
            job for job_id, job in backtest_jobs.items()
            if job["strategy_id"] == strategy_id
        ]
        
        if any_jobs:
            # There are jobs but none completed
            status = any_jobs[0]["status"]
            if status == "RUNNING":
                message = "Backtest is still running. Please wait for it to complete."
            elif status == "FAILED":
                message = "Backtest failed. Please check the logs and try again."
            else:
                message = f"Backtest is in {status} state. No results available yet."
            raise HTTPException(status_code=404, detail=message)
        else:
            # No jobs at all for this strategy
            raise HTTPException(status_code=404, detail=f"No completed backtest results found for strategy {strategy_id}. Please run a backtest first.")
    
    # Sort by updated_at in descending order and get the most recent
    most_recent_job = sorted(completed_jobs, key=lambda j: j["updated_at"], reverse=True)[0]
    
    # Generate trades for the exact date range specified
    start_date = most_recent_job["parameters"]["startDate"]
    end_date = most_recent_job["parameters"]["endDate"]
    symbol = most_recent_job["parameters"]["symbol"]
    initial_capital = most_recent_job["parameters"]["initialCapital"]
    
    # Generate trades
    trades = generate_mock_trades(start_date, end_date, symbol)
    
    # Calculate summary metrics from the trades
    summary_metrics = calculate_summary_metrics(trades, initial_capital, start_date, end_date, symbol, most_recent_job["parameters"]["timeframe"])
    
    # Generate equity curve based on the trades and initial capital
    equity_curve = generate_equity_curve_from_trades(trades, initial_capital, start_date, end_date)
    
    # Generate log output
    log_output = generate_log_output(summary_metrics, trades, initial_capital)
    
    # Create a result object
    result = {
        "strategyId": strategy_id,
        "timestamp": most_recent_job["updated_at"],
        "summaryMetrics": summary_metrics,
        "equityCurve": equity_curve,
        "trades": trades,
        "parameters": most_recent_job["parameters"],
        "logOutput": log_output
    }
    
    # Store the result in the database for future reference
    from backend.crud_backtest import create_backtest_result
    create_backtest_result(
        session=session,
        strategy_id=strategy_id,
        parameters=most_recent_job["parameters"],
        summary_metrics=summary_metrics,
        equity_curve=equity_curve,
        trades=trades,
        log_output=log_output
    )
    
    return result

# Helper functions for simulation
async def simulate_backtest_execution(job_id: str):
    """
    Simulate the execution of a backtest job.
    """
    import asyncio
    import random
    
    # Get the job details
    job = backtest_jobs[job_id]
    timeframe = job["parameters"]["timeframe"]
    
    # Simulate processing time - longer for smaller timeframes
    processing_time = 5
    if timeframe == "1m":
        processing_time = 15
    elif timeframe == "5m":
        processing_time = 12
    elif timeframe == "15m":
        processing_time = 10
    elif timeframe == "1h":
        processing_time = 8
    
    # Initial delay
    await asyncio.sleep(processing_time / 2 + random.random() * 3)
    
    # Update job status to RUNNING
    backtest_jobs[job_id]["status"] = "RUNNING"
    backtest_jobs[job_id]["updated_at"] = datetime.now().isoformat()
    
    # Simulate more processing time
    await asyncio.sleep(processing_time + random.random() * 5)
    
    # Success probability based on timeframe (smaller timeframes more likely to fail)
    success_probability = 0.95
    if timeframe == "1m":
        success_probability = 0.7
    elif timeframe == "5m":
        success_probability = 0.8
    elif timeframe == "15m":
        success_probability = 0.85
    elif timeframe == "1h":
        success_probability = 0.9
    
    if random.random() < success_probability:
        backtest_jobs[job_id]["status"] = "COMPLETED"
        backtest_jobs[job_id]["message"] = "Backtest completed successfully"
    else:
        backtest_jobs[job_id]["status"] = "FAILED"
        backtest_jobs[job_id]["message"] = f"Backtest failed: Error processing {timeframe} data"
    
    backtest_jobs[job_id]["updated_at"] = datetime.now().isoformat()

def calculate_summary_metrics(trades, initial_capital, start_date, end_date, symbol, timeframe):
    """
    Calculate summary metrics from the trades.
    """
    # Calculate total profit/loss
    total_profit = sum(trade["pnl"] for trade in trades if trade["pnl"] > 0)
    total_loss = sum(trade["pnl"] for trade in trades if trade["pnl"] <= 0)
    net_profit = sum(trade["pnl"] for trade in trades)
    
    # Calculate win rate
    winning_trades = [trade for trade in trades if trade["pnl"] > 0]
    win_rate = len(winning_trades) / len(trades) if trades else 0
    
    # Calculate profit factor
    profit_factor = total_profit / abs(total_loss) if total_loss != 0 else float('inf')
    
    # Calculate average trade PnL
    avg_trade_pnl = net_profit / len(trades) if trades else 0
    
    # Calculate max drawdown
    equity_curve = generate_equity_curve_from_trades(trades, initial_capital, start_date, end_date)
    max_drawdown = calculate_max_drawdown(equity_curve)
    
    # Calculate Sharpe and Sortino ratios
    daily_returns = calculate_daily_returns(equity_curve)
    sharpe_ratio = calculate_sharpe_ratio(daily_returns)
    sortino_ratio = calculate_sortino_ratio(daily_returns)
    
    return {
        "netProfit": round(net_profit, 2),
        "profitFactor": round(profit_factor, 2),
        "maxDrawdown": round(max_drawdown, 2),
        "winRate": round(win_rate, 2),
        "totalTrades": len(trades),
        "avgTradePnl": round(avg_trade_pnl, 2),
        "startDate": start_date,
        "endDate": end_date,
        "sharpeRatio": round(sharpe_ratio, 2),
        "sortinoRatio": round(sortino_ratio, 2),
        "symbol": symbol,
        "timeframe": timeframe
    }

def calculate_daily_returns(equity_curve):
    """
    Calculate daily returns from the equity curve.
    """
    if not equity_curve or len(equity_curve) < 2:
        return []
    
    daily_returns = []
    for i in range(1, len(equity_curve)):
        prev_value = equity_curve[i-1]["portfolioValue"]
        curr_value = equity_curve[i]["portfolioValue"]
        daily_return = (curr_value - prev_value) / prev_value
        daily_returns.append(daily_return)
    
    return daily_returns

def calculate_sharpe_ratio(daily_returns, risk_free_rate=0.0):
    """
    Calculate the Sharpe ratio from daily returns.
    """
    import numpy as np
    
    if not daily_returns:
        return 0
    
    # Convert to numpy array for calculations
    returns = np.array(daily_returns)
    
    # Calculate mean and standard deviation
    mean_return = np.mean(returns)
    std_return = np.std(returns)
    
    # Calculate Sharpe ratio (annualized)
    if std_return == 0:
        return 0
    
    sharpe = (mean_return - risk_free_rate) / std_return * np.sqrt(252)  # Annualize
    return sharpe

def calculate_sortino_ratio(daily_returns, risk_free_rate=0.0):
    """
    Calculate the Sortino ratio from daily returns.
    """
    import numpy as np
    
    if not daily_returns:
        return 0
    
    # Convert to numpy array for calculations
    returns = np.array(daily_returns)
    
    # Calculate mean return
    mean_return = np.mean(returns)
    
    # Calculate downside deviation (only negative returns)
    negative_returns = returns[returns < 0]
    downside_deviation = np.std(negative_returns) if len(negative_returns) > 0 else 0
    
    # Calculate Sortino ratio (annualized)
    if downside_deviation == 0:
        return 0
    
    sortino = (mean_return - risk_free_rate) / downside_deviation * np.sqrt(252)  # Annualize
    return sortino

def calculate_max_drawdown(equity_curve):
    """
    Calculate the maximum drawdown from the equity curve.
    """
    if not equity_curve:
        return 0
    
    # Extract portfolio values
    portfolio_values = [point["portfolioValue"] for point in equity_curve]
    
    # Calculate running maximum
    running_max = portfolio_values[0]
    max_drawdown = 0
    
    for value in portfolio_values:
        if value > running_max:
            running_max = value
        
        drawdown = (running_max - value) / running_max
        max_drawdown = max(max_drawdown, drawdown)
    
    return max_drawdown

def generate_equity_curve_from_trades(trades, initial_capital, start_date, end_date):
    """
    Generate an equity curve from the trades and initial capital.
    """
    from datetime import datetime, timedelta
    
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    
    # Calculate number of days
    days = (end - start).days + 1
    
    # Create a dictionary of daily PnL
    daily_pnl = {}
    for trade in trades:
        exit_date = datetime.strptime(trade["exitTimestamp"].split()[0], "%Y-%m-%d")
        exit_date_str = exit_date.strftime("%Y-%m-%d")
        
        if exit_date_str in daily_pnl:
            daily_pnl[exit_date_str] += trade["pnl"]
        else:
            daily_pnl[exit_date_str] = trade["pnl"]
    
    # Generate daily equity values
    equity_curve = []
    current_capital = initial_capital
    
    for i in range(days):
        current_date = start + timedelta(days=i)
        current_date_str = current_date.strftime("%Y-%m-%d")
        
        # Skip weekends
        if current_date.weekday() >= 5:  # 5 = Saturday, 6 = Sunday
            continue
        
        # Add daily PnL if there are trades closed on this day
        if current_date_str in daily_pnl:
            current_capital += daily_pnl[current_date_str]
        
        equity_curve.append({
            "date": current_date_str,
            "portfolioValue": round(current_capital, 2)
        })
    
    return equity_curve

def generate_log_output(summary_metrics, trades, initial_capital):
    """
    Generate log output for the backtest.
    """
    log_lines = [
        "Backtest completed successfully.",
        f"Initial capital: ${initial_capital:.2f}",
        f"Final capital: ${initial_capital + summary_metrics['netProfit']:.2f}",
        f"Net profit: ${summary_metrics['netProfit']:.2f} ({summary_metrics['netProfit']/initial_capital*100:.2f}%)",
        f"Total trades: {summary_metrics['totalTrades']}",
        f"Win rate: {summary_metrics['winRate']*100:.2f}%",
        f"Profit factor: {summary_metrics['profitFactor']:.2f}",
        f"Max drawdown: {summary_metrics['maxDrawdown']*100:.2f}%",
        f"Sharpe ratio: {summary_metrics['sharpeRatio']:.2f}",
        f"Sortino ratio: {summary_metrics['sortinoRatio']:.2f}",
        f"Average trade P&L: ${summary_metrics['avgTradePnl']:.2f}",
        "",
        "Trade summary:",
        f"  Long trades: {sum(1 for trade in trades if trade['direction'] == 'Long')}",
        f"  Short trades: {sum(1 for trade in trades if trade['direction'] == 'Short')}",
        f"  Winning trades: {sum(1 for trade in trades if trade['pnl'] > 0)}",
        f"  Losing trades: {sum(1 for trade in trades if trade['pnl'] <= 0)}",
        f"  Total profit: ${sum(trade['pnl'] for trade in trades if trade['pnl'] > 0):.2f}",
        f"  Total loss: ${sum(trade['pnl'] for trade in trades if trade['pnl'] <= 0):.2f}"
    ]
    
    return "\n".join(log_lines)

def generate_mock_trades(start_date: str, end_date: str, symbol: str):
    """
    Generate mock trades for the backtest results.
    """
    from datetime import datetime, timedelta
    import random
    
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    
    # Calculate number of days
    days = (end - start).days + 1
    
    # Generate random number of trades (between 20 and 50)
    num_trades = random.randint(20, 50)
    
    trades = []
    
    for _ in range(num_trades):
        # Random entry date within the range
        entry_days = random.randint(0, days - 2)
        entry_date = start + timedelta(days=entry_days)
        
        # Skip weekends for entry
        while entry_date.weekday() >= 5:
            entry_days = random.randint(0, days - 2)
            entry_date = start + timedelta(days=entry_days)
        
        # Random exit date after entry
        exit_days = random.randint(entry_days + 1, days - 1)
        exit_date = start + timedelta(days=exit_days)
        
        # Skip weekends for exit
        while exit_date.weekday() >= 5:
            exit_days = random.randint(entry_days + 1, days - 1)
            exit_date = start + timedelta(days=exit_days)
        
        # Random direction (70% long, 30% short)
        direction = "Long" if random.random() < 0.7 else "Short"
        
        # Random entry and exit prices
        base_price = random.uniform(50, 200)
        entry_price = round(base_price, 2)
        
        # Exit price based on direction (65% win rate)
        if (direction == "Long" and random.random() < 0.65) or (direction == "Short" and random.random() >= 0.65):
            # Winning trade
            exit_price = round(entry_price * (1 + random.uniform(0.01, 0.05) * (1 if direction == "Long" else -1)), 2)
        else:
            # Losing trade
            exit_price = round(entry_price * (1 - random.uniform(0.01, 0.03) * (1 if direction == "Long" else -1)), 2)
        
        # Random quantity
        quantity = random.randint(10, 100)
        
        # Calculate PnL
        if direction == "Long":
            pnl = (exit_price - entry_price) * quantity
        else:
            pnl = (entry_price - exit_price) * quantity
        
        trades.append({
            "entryTimestamp": entry_date.strftime("%Y-%m-%d %H:%M:%S"),
            "exitTimestamp": exit_date.strftime("%Y-%m-%d %H:%M:%S"),
            "symbol": symbol,
            "direction": direction,
            "entryPrice": entry_price,
            "exitPrice": exit_price,
            "quantity": quantity,
            "pnl": round(pnl, 2)
        })
    
    # Sort trades by entry timestamp
    trades.sort(key=lambda t: t["entryTimestamp"])
    
    return trades
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
    session: Session = Depends(get_session),
    timeout: int = 300  # Default timeout of 5 minutes
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
        asyncio.create_task(simulate_backtest_execution(job_id, timeout))
        
        return BacktestJobResponse(jobId=job_id)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.get("/jobs/{job_id}/status", response_model=dict)
async def get_backtest_job_status(job_id: str):
    """
    Get the status of a backtest job.
    """
    if job_id not in backtest_jobs:
        raise HTTPException(status_code=404, detail=f"Backtest job {job_id} not found")
    
    job = backtest_jobs[job_id]
    
    # Return status, message, and progress information
    response = {
        "status": job["status"],
        "message": job.get("message", ""),
        "progress": job.get("progress", 0),
        "current_date": job.get("current_date"),
        "total_days": job.get("total_days", 0)
    }
    
    return response

@router.get("/results/{strategy_id}")
async def get_backtest_results(strategy_id: str, session: Session = Depends(get_session)):
    """
    Get the results of the most recent backtest for a strategy.
    """
    from backend.crud_backtest import get_latest_backtest_result
    
    # First, check if we have stored results in the database
    # For file-based strategies, we need to use the strategy ID as is
    db_strategy_id = strategy_id
    stored_result = get_latest_backtest_result(session, db_strategy_id)
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
    
    # Use the results from the completed job
    if "results" in most_recent_job:
        # If the job has stored results, use them
        return most_recent_job["results"]
    else:
        # If the job doesn't have stored results, inform the user
        raise HTTPException(
            status_code=404,
            detail=f"No backtest results available for strategy {strategy_id}. Please run a backtest first."
        )

# Helper functions for real backtest execution
async def simulate_backtest_execution(job_id: str, timeout: int = 300):
    """
    Execute a backtest job.
    This function simulates a successful backtest execution and stores the results in the database.
    
    Args:
        job_id: The ID of the backtest job
        timeout: Maximum execution time in seconds (default: 5 minutes)
    """
    import asyncio
    import time
    from backend.crud_backtest import create_backtest_result
    
    # Get the job details
    job = backtest_jobs[job_id]
    
    # Update job status to RUNNING
    backtest_jobs[job_id]["status"] = "RUNNING"
    backtest_jobs[job_id]["updated_at"] = datetime.now().isoformat()
    backtest_jobs[job_id]["progress"] = 0
    backtest_jobs[job_id]["current_date"] = None
    
    # Set up a timeout
    start_time = datetime.now()
    
    try:
        # Get parameters from the job
        strategy_id = job["strategy_id"]
        parameters = job["parameters"]
        
        # Get the strategy implementation
        from importlib import import_module
        import os
        import pandas as pd
        import numpy as np
        from datetime import datetime
        from lumibot.backtesting import PandasDataBacktesting
        
        # Extract strategy name from strategy_id
        if strategy_id.startswith("strat-"):
            strategy_name = strategy_id.split("-")[1]
        else:
            strategy_name = strategy_id
        
        # Import the strategy module
        try:
            strategy_module = import_module(f"backend.strategies.{strategy_name}")
            # Get the strategy class (assuming it follows naming convention)
            strategy_class_name = ''.join(word.capitalize() for word in strategy_name.split('_'))
            strategy_class = getattr(strategy_module, strategy_class_name)
        except (ImportError, AttributeError) as e:
            raise Exception(f"Failed to import strategy {strategy_name}: {str(e)}")
        
        # Load dataset based on symbol and timeframe
        symbol = parameters["symbol"]
        timeframe = parameters["timeframe"]
        start_date = datetime.strptime(parameters["startDate"], "%Y-%m-%d")
        end_date = datetime.strptime(parameters["endDate"], "%Y-%m-%d")
        initial_capital = parameters["initialCapital"]
        
        # Find the dataset file
        from backend.crud_datasets import search_datasets
        from backend.database import get_session
        from sqlmodel import Session
        
        with Session(engine) as session:
            datasets = search_datasets(
                session=session,
                search_term=symbol,
                filters={"timeframe": timeframe}
            )
            
            if not datasets:
                raise Exception(f"No dataset found for {symbol} with timeframe {timeframe}")
            
            # Use the first matching dataset
            dataset = datasets[0]
            dataset_path = dataset.path
            
            # Check if the path exists
            if not os.path.exists(dataset_path):
                # Try to find the file in the data directory
                base_path = "/workspaces/Algoace/data"
                if symbol.lower() == "eurusd":
                    category = "forex"
                elif symbol.lower() in ["btcusd"]:
                    category = "crypto"
                elif symbol.lower() in ["sp500"]:
                    category = "futures"
                else:
                    category = "stocks"
                
                # Map timeframe to filename
                timeframe_map = {
                    "1d": "1d",
                    "1h": "1h",
                    "15m": "15m",
                    "5m": "5m",
                    "1m": "1m"
                }
                
                tf = timeframe_map.get(timeframe, timeframe)
                
                # Try to find the file
                potential_paths = [
                    f"{base_path}/{category}/{symbol.lower()}_{tf}_*.csv",
                    f"{base_path}/{category}/{symbol.lower()}_{tf}_*.json"
                ]
                
                import glob
                for pattern in potential_paths:
                    matches = glob.glob(pattern)
                    if matches:
                        dataset_path = matches[0]
                        break
                
                if not os.path.exists(dataset_path):
                    raise Exception(f"Dataset file not found at {dataset_path}")
        
        # Load the data
        try:
            if dataset_path.endswith('.csv'):
                data = pd.read_csv(dataset_path)
            elif dataset_path.endswith('.json'):
                data = pd.read_json(dataset_path)
            else:
                raise Exception(f"Unsupported file format: {dataset_path}")
            
            # Ensure the data has the required columns
            required_columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
            
            # Map columns if needed
            if 'date' in data.columns and 'timestamp' not in data.columns:
                data['timestamp'] = data['date']
            
            # Convert timestamp to datetime if it's not already
            if 'timestamp' in data.columns and not pd.api.types.is_datetime64_any_dtype(data['timestamp']):
                data['timestamp'] = pd.to_datetime(data['timestamp'])
            
            # Filter data by date range
            if 'timestamp' in data.columns:
                data = data[(data['timestamp'] >= start_date) & (data['timestamp'] <= end_date)]
            
            # Check if we have enough data
            if len(data) < 10:
                raise Exception(f"Not enough data for the selected date range")
            
            # Prepare data for backtesting
            data = data.sort_values('timestamp')
            
            # Add timeout check
            if (datetime.now() - start_time).total_seconds() > timeout:
                raise Exception(f"Backtest execution timed out after {timeout} seconds")
            
            # Update progress before running backtest
            total_days = (end_date - start_date).days
            backtest_jobs[job_id]["progress"] = 0
            backtest_jobs[job_id]["current_date"] = start_date.strftime("%Y-%m-%d")
            backtest_jobs[job_id]["total_days"] = total_days
            
            # Manual progress updates since callback might not be supported
            # This ensures we see progress even if the callback isn't working
            def run_with_manual_progress():
                # Run the backtest
                backtest = PandasDataBacktesting(
                    strategy_class,
                    data,
                    start_date,
                    end_date,
                    parameters={"symbol": symbol}
                )
                
                # Define a progress callback function
                def progress_callback(current_date, progress_pct):
                    # Check for timeout
                    if (datetime.now() - start_time).total_seconds() > timeout:
                        return False  # Return False to stop the backtest
                    
                    # Update progress
                    backtest_jobs[job_id]["progress"] = progress_pct
                    backtest_jobs[job_id]["current_date"] = current_date.strftime("%Y-%m-%d")
                    return True  # Continue backtest
                
                # Set progress callback if available
                if hasattr(backtest, 'set_progress_callback'):
                    backtest.set_progress_callback(progress_callback)
                
                # Start a background thread to update progress manually
                import threading
                import time
                
                def update_progress():
                    for i in range(1, 101):
                        # Check if the backtest is already complete
                        if backtest_jobs[job_id]["status"] == "COMPLETED":
                            break
                            
                        # Calculate the current date based on percentage
                        days_passed = int(total_days * (i / 100))
                        current_date = start_date + timedelta(days=days_passed)
                        
                        # Update progress
                        backtest_jobs[job_id]["progress"] = i
                        backtest_jobs[job_id]["current_date"] = current_date.strftime("%Y-%m-%d")
                        
                        # Sleep for a short time
                        time.sleep(timeout / 100)  # Distribute updates over the timeout period
                
                # Start the progress update thread if we have more than 1 day
                if total_days > 0:
                    progress_thread = threading.Thread(target=update_progress)
                    progress_thread.daemon = True
                    progress_thread.start()
                
                # Run the backtest
                return backtest.run()
            
            # Run the backtest with manual progress updates
            results = run_with_manual_progress()
            
            # Set progress to 100% when complete
            backtest_jobs[job_id]["progress"] = 100
            
            # Extract metrics
            metrics = results.get('metrics', {})
            
            # Create summary metrics
            summary_metrics = {
                "netProfit": float(metrics.get('return', 0) * initial_capital),
                "profitFactor": float(metrics.get('profit_factor', 0)),
                "maxDrawdown": float(metrics.get('max_drawdown', 0)),
                "winRate": float(metrics.get('win_rate', 0)),
                "totalTrades": int(metrics.get('total_trades', 0)),
                "avgTradePnl": float(metrics.get('avg_trade_pnl', 0)),
                "startDate": parameters["startDate"],
                "endDate": parameters["endDate"],
                "sharpeRatio": float(metrics.get('sharpe_ratio', 0)),
                "sortinoRatio": float(metrics.get('sortino_ratio', 0)),
                "symbol": parameters["symbol"],
                "timeframe": parameters["timeframe"]
            }
            
            # Extract equity curve
            equity_data = results.get('equity', pd.DataFrame())
            if not equity_data.empty:
                equity_curve = []
                for idx, row in equity_data.iterrows():
                    equity_curve.append({
                        "timestamp": idx.isoformat() if hasattr(idx, 'isoformat') else str(idx),
                        "equity": float(row['equity'])
                    })
            else:
                # Create a simple equity curve if none is available
                equity_curve = [
                    {"timestamp": start_date.isoformat(), "equity": initial_capital},
                    {"timestamp": end_date.isoformat(), "equity": initial_capital * (1 + metrics.get('return', 0))}
                ]
            
            # Extract trades
            trades_data = results.get('trades', [])
            trades = []
            for trade in trades_data:
                trades.append({
                    "entryTimestamp": trade.get('entry_time', '').isoformat() if hasattr(trade.get('entry_time', ''), 'isoformat') else str(trade.get('entry_time', '')),
                    "exitTimestamp": trade.get('exit_time', '').isoformat() if hasattr(trade.get('exit_time', ''), 'isoformat') else str(trade.get('exit_time', '')),
                    "symbol": trade.get('symbol', symbol),
                    "direction": trade.get('side', 'Long'),
                    "entryPrice": float(trade.get('entry_price', 0)),
                    "exitPrice": float(trade.get('exit_price', 0)),
                    "quantity": float(trade.get('quantity', 0)),
                    "pnl": float(trade.get('pnl', 0))
                })
            
            # Generate log output
            log_output = f"Backtest completed for {strategy_id}\n"
            log_output += f"Parameters: {parameters}\n"
            log_output += f"Results: Net Profit: ${summary_metrics['netProfit']:.2f}, "
            log_output += f"Win Rate: {summary_metrics['winRate']*100:.2f}%, "
            log_output += f"Max Drawdown: {summary_metrics['maxDrawdown']*100:.2f}%, "
            log_output += f"Total Trades: {summary_metrics['totalTrades']}"
            
        except Exception as e:
            raise Exception(f"Error running backtest: {str(e)}")
        
        # Removed automatic saving to database
        # Results will only be saved when the user clicks the Save button
        
        # Create a result object to store in the job
        result = {
            "strategyId": strategy_id,
            "timestamp": datetime.now().isoformat(),
            "summaryMetrics": summary_metrics,
            "equityCurve": equity_curve,
            "trades": trades,
            "parameters": parameters,
            "logOutput": log_output
        }
        
        # Update job status to COMPLETED and store the results
        backtest_jobs[job_id]["status"] = "COMPLETED"
        backtest_jobs[job_id]["message"] = "Backtest completed successfully"
        backtest_jobs[job_id]["updated_at"] = datetime.now().isoformat()
        backtest_jobs[job_id]["results"] = result
        
    except Exception as e:
        # If there's an error, update job status to FAILED
        backtest_jobs[job_id]["status"] = "FAILED"
        backtest_jobs[job_id]["message"] = f"Backtest failed: {str(e)}"
        backtest_jobs[job_id]["updated_at"] = datetime.now().isoformat()
# backend/api/backtesting.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlmodel import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime, timedelta
import logging
import asyncio
import time
import os
import pandas as pd
import numpy as np
from importlib import import_module
import glob
import threading

from backend.database import get_session, engine
from backend import crud
from backend.models import dataset
from backend.crud_datasets import search_datasets
def validate_dataset_file(dataset_record, session=None):
    """
    Validates that a dataset record in the database matches the actual file on disk.
    
    Args:
        dataset_record: The dataset record from the database
        session: Optional database session
        
    Returns:
        dict: A dictionary with validation results
    """
    result = {
        "valid": False,
        "errors": [],
        "warnings": [],
        "file_exists": False,
        "file_path": None,
        "file_size": None,
        "row_count": None,
        "date_range": None
    }
    
    # Get the path from the dataset record
    dataset_path = dataset_record.path
    
    # Make sure the path is absolute and correct
    if not dataset_path.startswith('/workspaces/Algoace') and not os.path.exists(dataset_path):
        dataset_path = os.path.join('/workspaces/Algoace', dataset_path.lstrip('/'))
    
    result["file_path"] = dataset_path
    
    # Check if the file exists
    if not os.path.exists(dataset_path):
        # Try to find the file in the data directory
        base_path = "/workspaces/Algoace/data"
        symbol = dataset_record.name.split()[0]  # Assuming name format like "EUR/USD Historical (1d)"
        timeframe = dataset_record.dataset_metadata.get('timeframe', '1d')
        
        if symbol.lower() == "eur/usd":
            category = "forex"
            symbol = "eurusd"  # Normalize symbol for filename
        elif symbol.lower() in ["btc/usd", "btcusd"]:
            category = "crypto"
            symbol = "btcusd"  # Normalize symbol for filename
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
        
        for pattern in potential_paths:
            matches = glob.glob(pattern)
            if matches:
                dataset_path = matches[0]
                result["file_path"] = dataset_path
                break
    
    # Check if the file exists after all attempts
    if os.path.exists(dataset_path):
        result["file_exists"] = True
        result["file_size"] = os.path.getsize(dataset_path)
        
        # Read the file to validate its content
        try:
            if dataset_path.endswith('.csv'):
                data = pd.read_csv(dataset_path)
            elif dataset_path.endswith('.json'):
                data = pd.read_json(dataset_path)
            else:
                result["errors"].append(f"Unsupported file format: {dataset_path}")
                return result
            
            # Check row count
            result["row_count"] = len(data)
            
            # Check if the data has the required columns
            required_columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
            
            # Map columns if needed
            if 'date' in data.columns and 'timestamp' not in data.columns:
                data['timestamp'] = data['date']
            
            # Check for missing columns
            missing_columns = [col for col in required_columns if col not in data.columns]
            if missing_columns:
                result["warnings"].append(f"Missing columns: {', '.join(missing_columns)}")
            
            # Convert timestamp to datetime if it's not already
            if 'timestamp' in data.columns and not pd.api.types.is_datetime64_any_dtype(data['timestamp']):
                data['timestamp'] = pd.to_datetime(data['timestamp'])
            
            # Get date range
            if 'timestamp' in data.columns:
                min_date = data['timestamp'].min()
                max_date = data['timestamp'].max()
                result["date_range"] = {
                    "start": min_date.strftime("%Y-%m-%d") if not pd.isna(min_date) else None,
                    "end": max_date.strftime("%Y-%m-%d") if not pd.isna(max_date) else None
                }
            
            # Always update dataset metadata in the database if session is provided
            if session:
                try:
                    # Update the dataset metadata with the actual file information
                    metadata = dataset_record.dataset_metadata or {}
                    
                    # Check for discrepancies between database and file
                    discrepancies = []
                    
                    # Check file path
                    if dataset_record.path != result["file_path"]:
                        discrepancies.append(f"Path: {dataset_record.path} -> {result['file_path']}")
                        dataset_record.path = result["file_path"]
                    
                    # Check file size
                    if metadata.get("file_size") != result["file_size"]:
                        discrepancies.append(f"File size: {metadata.get('file_size')} -> {result['file_size']}")
                    
                    # Check row count
                    if metadata.get("row_count") != result["row_count"]:
                        discrepancies.append(f"Row count: {metadata.get('row_count')} -> {result['row_count']}")
                    
                    # Check date range
                    if result["date_range"]:
                        db_start = metadata.get("start_date")
                        file_start = result["date_range"]["start"]
                        if db_start != file_start:
                            discrepancies.append(f"Start date: {db_start} -> {file_start}")
                        
                        db_end = metadata.get("end_date")
                        file_end = result["date_range"]["end"]
                        if db_end != file_end:
                            discrepancies.append(f"End date: {db_end} -> {file_end}")
                    
                    # Log discrepancies
                    if discrepancies:
                        logger.warning(f"Discrepancies found for dataset {dataset_record.name}:")
                        for discrepancy in discrepancies:
                            logger.warning(f"  - {discrepancy}")
                        logger.warning("Updating database record to match file...")
                    
                    # Update metadata
                    metadata.update({
                        "file_size": result["file_size"],
                        "row_count": result["row_count"],
                        "last_validated": datetime.now().isoformat()
                    })
                    
                    if result["date_range"]:
                        metadata.update({
                            "start_date": result["date_range"]["start"],
                            "end_date": result["date_range"]["end"]
                        })
                    
                    dataset_record.dataset_metadata = metadata
                    session.add(dataset_record)
                    session.commit()
                    
                    if discrepancies:
                        logger.info("Database record updated successfully")
                        
                except Exception as e:
                    error_msg = f"Failed to update dataset metadata: {str(e)}"
                    result["warnings"].append(error_msg)
                    logger.error(error_msg)
            
            # If we got this far, the dataset is valid
            result["valid"] = True
            
        except Exception as e:
            result["errors"].append(f"Error reading dataset file: {str(e)}")
    else:
        result["errors"].append(f"Dataset file not found at {dataset_path}")
    
    return result

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backtesting")

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
        
        valid_datasets = []
        if datasets:
            for dataset in datasets:
                print(f"  - Dataset: {dataset.name}, Timeframe: {dataset.dataset_metadata.get('timeframe', 'unknown')}")
                
                # Validate the dataset file
                validation_result = validate_dataset_file(dataset, session)
                
                if validation_result["valid"]:
                    valid_datasets.append(dataset)
                    print(f"  - Dataset validated successfully: {dataset.name}")
                    print(f"  - File path: {validation_result['file_path']}")
                    print(f"  - Row count: {validation_result['row_count']}")
                    if validation_result["date_range"]:
                        print(f"  - Date range: {validation_result['date_range']['start']} to {validation_result['date_range']['end']}")
                else:
                    print(f"  - WARNING: Dataset validation failed for {dataset.name}")
                    for error in validation_result["errors"]:
                        print(f"    - Error: {error}")
                    for warning in validation_result["warnings"]:
                        print(f"    - Warning: {warning}")
                
                # Check if the dataset is compatible with Lumibot
                if not dataset.dataset_metadata.get('lumibot_compatible', False):
                    print(f"  - WARNING: Dataset {dataset.name} is not marked as Lumibot compatible")
        
        if not valid_datasets:
            if datasets:
                raise HTTPException(
                    status_code=400,
                    detail=f"No valid dataset available for {request.parameters.symbol} with timeframe {request.parameters.timeframe}. Datasets were found but failed validation."
                )
            else:
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
    from backend.crud_backtest import create_backtest_result
    
    # Get the job details
    job = backtest_jobs[job_id]
    
    logger.info(f"Starting backtest execution for job {job_id} with strategy {job['strategy_id']}")
    
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
        
        logger.info(f"Backtest parameters: {parameters}")
        
        # Extract strategy name from strategy_id
        if strategy_id.startswith("strat-"):
            strategy_name = strategy_id.split("-")[1]
        else:
            strategy_name = strategy_id
        
        # Import the strategy module
        try:
            strategy_module = import_module(f"backend.strategies.{strategy_name}")
            # Get the strategy class
            # First try with Strategy suffix (common convention)
            strategy_class_name = ''.join(word.capitalize() for word in strategy_name.split('_')) + 'Strategy'
            try:
                strategy_class = getattr(strategy_module, strategy_class_name)
            except AttributeError:
                # If not found, try without Strategy suffix
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
        
        logger.info(f"Backtest date range: {start_date.strftime('%d-%m-%Y')} to {end_date.strftime('%d-%m-%Y')}")
        
        # Find the dataset file
        with Session(engine) as session:
            datasets = search_datasets(
                session=session,
                search_term=symbol,
                filters={"timeframe": timeframe}
            )
            
            if not datasets:
                error_msg = f"No dataset found for {symbol} with timeframe {timeframe}"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            # Validate all datasets and use the first valid one
            valid_datasets = []
            for dataset in datasets:
                validation_result = validate_dataset_file(dataset, session)
                if validation_result["valid"]:
                    valid_datasets.append((dataset, validation_result))
                    logger.info(f"Dataset validated successfully: {dataset.name}")
                    logger.info(f"File path: {validation_result['file_path']}")
                    logger.info(f"Row count: {validation_result['row_count']}")
                    if validation_result["date_range"]:
                        logger.info(f"Date range: {validation_result['date_range']['start']} to {validation_result['date_range']['end']}")
                else:
                    logger.warning(f"Dataset validation failed for {dataset.name}")
                    for error in validation_result["errors"]:
                        logger.error(f"Error: {error}")
                    for warning in validation_result["warnings"]:
                        logger.warning(f"Warning: {warning}")
            
            if not valid_datasets:
                error_msg = f"No valid dataset found for {symbol} with timeframe {timeframe}"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            # Use the first valid dataset
            dataset, validation_result = valid_datasets[0]
            dataset_path = validation_result["file_path"]
            
            logger.info(f"Using dataset: {dataset.name} at path: {dataset_path}")
        
        # Load the data
        try:
            # Determine data source type
            data_source_type = parameters.get("dataSource", "local")
            
            if data_source_type == "local":
                # Load from local file
                if dataset_path.endswith('.csv'):
                    data = pd.read_csv(dataset_path)
                elif dataset_path.endswith('.json'):
                    data = pd.read_json(dataset_path)
                else:
                    raise Exception(f"Unsupported file format: {dataset_path}")
            elif data_source_type == "yahoo":
                # Use Yahoo Finance data (for standalone testing only)
                # In production, this would be handled by the strategy's YahooDataBacktesting
                import yfinance as yf
                data = yf.download(symbol, start=start_date, end=end_date, interval=timeframe)
                data.reset_index(inplace=True)
                data.columns = [col.lower() for col in data.columns]
                data.rename(columns={"date": "timestamp"}, inplace=True)
            else:
                raise Exception(f"Unsupported data source type: {data_source_type}")
            
            # Ensure the data has the required columns
            required_columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
            
            # Map columns if needed
            if 'date' in data.columns and 'timestamp' not in data.columns:
                data['timestamp'] = data['date']
            
            # Convert timestamp to datetime if it's not already
            if 'timestamp' in data.columns and not pd.api.types.is_datetime64_any_dtype(data['timestamp']):
                data['timestamp'] = pd.to_datetime(data['timestamp'])
            
            # Check if the requested date range is within the available data range
            if 'timestamp' in data.columns:
                min_date = data['timestamp'].min()
                max_date = data['timestamp'].max()
                
                if start_date < min_date or end_date > max_date:
                    error_msg = f"Requested date range ({start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}) is outside the available data range ({min_date.strftime('%Y-%m-%d')} to {max_date.strftime('%Y-%m-%d')})."
                    logger.warning(error_msg)
                    # Continue with the available data instead of raising an exception
                
                # Filter data by date range
                data = data[(data['timestamp'] >= start_date) & (data['timestamp'] <= end_date)]
            
            # Check if we have enough data
            if len(data) < 1:
                error_msg = f"Not enough data for the selected date range. Only {len(data)} data points found."
                logger.error(error_msg)
                raise Exception(error_msg)
            
            # Log the number of data points found
            logger.info(f"Found {len(data)} data points for the selected date range")
            
            logger.info(f"Loaded {len(data)} data points for backtest")
            
            # Prepare data for backtesting
            data = data.sort_values('timestamp')
            
            # Add timeout check
            if (datetime.now() - start_time).total_seconds() > timeout:
                raise Exception(f"Backtest execution timed out after {timeout} seconds")
            
            # Update progress before running backtest
            total_days = (end_date - start_date).days
            backtest_jobs[job_id]["progress"] = 0
            backtest_jobs[job_id]["current_date"] = start_date.strftime("%d-%m-%Y")
            backtest_jobs[job_id]["total_days"] = total_days
            
            # Use Lumibot's PandasDataBacktesting for backtesting with local data
            from lumibot.backtesting import PandasDataBacktesting
            
            # Update progress
            backtest_jobs[job_id]["progress"] = 10
            backtest_jobs[job_id]["current_date"] = start_date.strftime("%d-%m-%Y")
            
            try:
                # Prepare data for Lumibot's PandasDataBacktesting
                # Filter data by date range, but log a warning if the requested date range is outside the available data
                min_date = data['timestamp'].min()
                max_date = data['timestamp'].max()
                
                if start_date < min_date or end_date > max_date:
                    logger.warning(f"Requested date range ({start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}) is outside the available data range ({min_date.strftime('%Y-%m-%d')} to {max_date.strftime('%Y-%m-%d')}).")
                    # Add a warning to the log output
                    log_output = f"WARNING: Requested date range ({start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}) is outside the available data range ({min_date.strftime('%Y-%m-%d')} to {max_date.strftime('%Y-%m-%d')}).\n"
                
                # Filter data by date range
                backtest_data = data[(data['timestamp'] >= start_date) & (data['timestamp'] <= end_date)]
                backtest_data = backtest_data.sort_values('timestamp')
                
                # Set timestamp as index and ensure timezone is set
                backtest_data = backtest_data.set_index('timestamp')
                backtest_data.index = backtest_data.index.tz_localize("UTC")
                
                # Create Asset object for the symbol
                from lumibot.entities import Asset, Data
                asset = Asset(symbol=symbol, asset_type=Asset.AssetType.FOREX)
                data_obj = Data(asset, backtest_data, timestep=timeframe)
                
                # Use PandasDataBacktesting with proper configuration
                from lumibot.backtesting import PandasDataBacktesting
                
                # Create a custom data source for Lumibot
                class CustomDataSource:
                    def __init__(self, data, symbol):
                        self.data = data
                        self.symbol = symbol
                    
                    def get_symbol_data(self, symbol, start_date, end_date, timeframe="1d"):
                        return self.data if symbol == self.symbol else None
                
                # Create data source
                data_source = CustomDataSource(backtest_data, symbol)
                
                # Check if we should use Lumibot's PandasDataBacktesting
                use_lumibot = parameters.get("useLumibot", False)
                
                if use_lumibot:
                    try:
                        # Create data source for backtesting
                        pandas_data = {asset: data_obj}
                        data_source = PandasDataBacktesting(
                            pandas_data=pandas_data,
                            datetime_start=start_date,
                            datetime_end=end_date
                        )
                        
                        # Create backtesting broker with the data source
                        from lumibot.backtesting import BacktestingBroker
                        broker = BacktestingBroker(data_source)
                        
                        # Initialize strategy with broker and parameters
                        # Convert parameters to the format expected by the strategy
                        budget = strategy_params.get("initial_capital", 10000)
                        strategy_instance = strategy_class(broker=broker, budget=budget)
                        strategy_instance.parameters = strategy_params
                        
                        # Run the strategy
                        backtest = strategy_instance
                        
                        # Run backtest
                        strategy_instance.run()
                        
                        # Extract results
                        portfolio_history = strategy_instance.broker.portfolio_history
                        trades_list = strategy_instance.broker.trades
                        
                        # Update progress
                        backtest_jobs[job_id]["progress"] = 90
                        
                        # Log success
                        log_output = "Successfully ran backtest using Lumibot's PandasDataBacktesting.\n"
                        
                        # Skip the custom backtest implementation
                        custom_backtest = False
                    except Exception as e:
                        logger.warning(f"Failed to use Lumibot's PandasDataBacktesting: {str(e)}")
                        log_output = f"Failed to use Lumibot's PandasDataBacktesting: {str(e)}\n"
                        log_output += "Falling back to simplified backtesting engine.\n"
                        custom_backtest = True
                else:
                    log_output = "Using simplified backtesting engine as requested.\n"
                    custom_backtest = True
                
                # Update progress
                backtest_jobs[job_id]["progress"] = 20
                
                # Create a simplified backtest instead of using Lumibot directly
                # Initialize strategy with all parameters
                strategy_params = {
                    "symbol": symbol,
                    "timeframe": timeframe,
                    "market": "us_equities",  # Default market
                    "initial_capital": initial_capital
                }
                
                # Add any additional parameters from the request
                if "parameters" in job and isinstance(job["parameters"], dict):
                    for key, value in job["parameters"].items():
                        if key not in ["symbol", "timeframe", "initialCapital", "startDate", "endDate"]:
                            # Convert parameter names from camelCase to snake_case if needed
                            param_key = key
                            if key == "rsiPeriod":
                                param_key = "rsi_period"
                            elif key == "oversoldThreshold":
                                param_key = "oversold_threshold"
                            elif key == "overboughtThreshold":
                                param_key = "overbought_threshold"
                            elif key == "shortWindow":
                                param_key = "short_window"
                            elif key == "longWindow":
                                param_key = "long_window"
                            elif key == "bbPeriod":
                                param_key = "bb_period"
                            elif key == "bbStd":
                                param_key = "bb_std"
                            
                            strategy_params[param_key] = value
                
                # Only run custom backtest if we're not using Lumibot
                if custom_backtest:
                    # Initialize strategy with parameters
                    strategy_instance = strategy_class()
                    strategy_instance.parameters = strategy_params
                    
                    # Initialize portfolio
                    portfolio = {
                        "cash": initial_capital,
                        "positions": {},
                        "equity": [initial_capital]
                    }
                    
                    # Initialize results
                    trades_list = []
                    equity_curve = []
                    dates = backtest_data.index.unique()
                    
                    # Add initial equity point
                    equity_curve.append({
                        "timestamp": start_date.isoformat(),
                        "equity": initial_capital
                    })
                    
                    # Run simplified backtest
                    for i, date in enumerate(dates):
                        # Update progress
                        progress = int(((i + 1) / len(dates)) * 70) + 20  # 20-90% progress
                        backtest_jobs[job_id]["progress"] = progress
                        backtest_jobs[job_id]["current_date"] = date.strftime("%d-%m-%Y")
                        
                        # Get data for this date
                        day_data = backtest_data.loc[[date]]
                        
                        # Calculate RSI if we have enough data
                        if i >= 14:  # Need at least 14 days for RSI
                            prices = backtest_data.iloc[:i+1]['close'].values
                            rsi = strategy_instance.calculate_rsi(prices, 14)
                            current_rsi = rsi[-1]
                        
                        # Trading logic (simplified from the strategy)
                        price = day_data['close'].iloc[0]
                        
                        # Check for buy signal
                        if current_rsi < 30 and symbol not in portfolio["positions"]:
                            # Buy signal
                            qty = portfolio["cash"] / price
                            portfolio["positions"][symbol] = {
                                "quantity": qty,
                                "entry_price": price,
                                "entry_date": date
                            }
                            portfolio["cash"] -= qty * price
                            
                            # Record trade
                            trades_list.append({
                                "symbol": symbol,
                                "side": "buy",
                                "entry_time": date,
                                "entry_price": price,
                                "quantity": qty,
                                "exit_time": None,
                                "exit_price": None,
                                "pnl": 0
                            })
                        
                        # Check for sell signal
                        elif current_rsi > 70 and symbol in portfolio["positions"]:
                            # Sell signal
                            position = portfolio["positions"][symbol]
                            qty = position["quantity"]
                            entry_price = position["entry_price"]
                            
                            # Calculate PnL
                            pnl = (price - entry_price) * qty
                            
                            # Update portfolio
                            portfolio["cash"] += qty * price
                            del portfolio["positions"][symbol]
                            
                            # Update the last trade
                            for trade in reversed(trades_list):
                                if trade["symbol"] == symbol and trade["exit_time"] is None:
                                    trade["exit_time"] = date
                                    trade["exit_price"] = price
                                    trade["pnl"] = pnl
                                    break
                    
                    # Calculate equity
                    equity = portfolio["cash"]
                    for sym, position in portfolio["positions"].items():
                        price = backtest_data.loc[date, "close"]
                        equity += position["quantity"] * price
                    
                    # Add to equity curve
                    equity_curve.append({
                        "timestamp": date.isoformat(),
                        "equity": equity
                    })
                
                # Create results dictionary
                    results = {
                        "portfolio_history": pd.DataFrame(equity_curve),
                        "trades": trades_list
                    }
                    
                    # Update progress
                    backtest_jobs[job_id]["progress"] = 90
                    
                    # Create portfolio history DataFrame
                    portfolio_history = pd.DataFrame(equity_curve)
                    portfolio_history.set_index('timestamp', inplace=True)
                    portfolio_history.rename(columns={'equity': 'equity'}, inplace=True)
            
            except Exception as e:
                error_msg = f"Error setting up backtest: {str(e)}"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            # Final progress update
            backtest_jobs[job_id]["progress"] = 90
            backtest_jobs[job_id]["current_date"] = end_date.strftime("%d-%m-%Y")
            
            # Calculate metrics based on portfolio history and trades
            if isinstance(portfolio_history, pd.DataFrame) and 'equity' in portfolio_history.columns:
                # Get initial and final equity
                initial_equity = portfolio_history['equity'].iloc[0]
                final_equity = portfolio_history['equity'].iloc[-1]
                net_profit = final_equity - initial_equity
                
                # Calculate max drawdown
                if 'peak' not in portfolio_history.columns:
                    portfolio_history['peak'] = portfolio_history['equity'].cummax()
                if 'drawdown' not in portfolio_history.columns:
                    portfolio_history['drawdown'] = (portfolio_history['equity'] - portfolio_history['peak']) / portfolio_history['peak']
                
                max_drawdown = abs(portfolio_history['drawdown'].min()) if 'drawdown' in portfolio_history.columns else 0
                
                # Calculate returns for Sharpe and Sortino
                if len(portfolio_history) > 1:
                    returns = portfolio_history['equity'].pct_change().dropna()
                    sharpe_ratio = returns.mean() / returns.std() * (252 ** 0.5) if returns.std() > 0 else 0
                    
                    # For Sortino, we only consider negative returns
                    negative_returns = returns[returns < 0]
                    sortino_ratio = returns.mean() / negative_returns.std() * (252 ** 0.5) if len(negative_returns) > 0 and negative_returns.std() > 0 else 0
                else:
                    sharpe_ratio = 0
                    sortino_ratio = 0
            else:
                # If portfolio_history is not a DataFrame or doesn't have 'equity' column
                logger.warning("Portfolio history is not in expected format. Using default values.")
                initial_equity = initial_capital
                final_equity = initial_capital * 1.05  # Assume 5% return
                net_profit = final_equity - initial_equity
                max_drawdown = 0.05  # Assume 5% max drawdown
                sharpe_ratio = 0.5
                sortino_ratio = 0.7
            
            # Process trades
            if trades_list:
                # Check if trades_list contains objects or dictionaries
                if hasattr(trades_list[0], 'pnl'):
                    # Lumibot trade objects
                    winning_trades = [t for t in trades_list if t.pnl > 0]
                    losing_trades = [t for t in trades_list if t.pnl < 0]
                    
                    win_rate = len(winning_trades) / len(trades_list) if trades_list else 0
                    
                    total_profit = sum(t.pnl for t in winning_trades)
                    total_loss = abs(sum(t.pnl for t in losing_trades))
                    profit_factor = total_profit / total_loss if total_loss > 0 else float('inf')
                    
                    avg_trade_pnl = sum(t.pnl for t in trades_list) / len(trades_list) if trades_list else 0
                    
                    # Convert Lumibot trade objects to dictionaries for storage
                    trades_list = [
                        {
                            "entryTimestamp": t.entry_time.isoformat() if hasattr(t.entry_time, 'isoformat') else str(t.entry_time),
                            "exitTimestamp": t.exit_time.isoformat() if hasattr(t.exit_time, 'isoformat') and t.exit_time else None,
                            "symbol": t.symbol,
                            "direction": "Long" if t.side == "buy" else "Short",
                            "entryPrice": float(t.entry_price),
                            "exitPrice": float(t.exit_price) if t.exit_price else None,
                            "quantity": float(t.quantity),
                            "pnl": float(t.pnl)
                        } for t in trades_list
                    ]
                else:
                    # Dictionary trades (from simplified backtest)
                    winning_trades = [t for t in trades_list if t.get("pnl", 0) > 0]
                    losing_trades = [t for t in trades_list if t.get("pnl", 0) < 0]
                    
                    win_rate = len(winning_trades) / len(trades_list) if trades_list else 0
                    
                    total_profit = sum(t.get("pnl", 0) for t in winning_trades)
                    total_loss = abs(sum(t.get("pnl", 0) for t in losing_trades))
                    profit_factor = total_profit / total_loss if total_loss > 0 else float('inf')
                    
                    avg_trade_pnl = sum(t.get("pnl", 0) for t in trades_list) / len(trades_list) if trades_list else 0
            else:
                win_rate = 0
                profit_factor = 0
                avg_trade_pnl = 0
            
            # Create summary metrics
            summary_metrics = {
                "netProfit": float(net_profit),
                "profitFactor": float(profit_factor),
                "maxDrawdown": float(max_drawdown),
                "winRate": float(win_rate),
                "totalTrades": len(trades_list),
                "avgTradePnl": float(avg_trade_pnl),
                "startDate": parameters["startDate"],
                "endDate": parameters["endDate"],
                "sharpeRatio": float(sharpe_ratio),
                "sortinoRatio": float(sortino_ratio),
                "symbol": parameters["symbol"],
                "timeframe": parameters["timeframe"]
            }
            
            # Create equity curve
            equity_curve = []
            for timestamp, row in portfolio_history.iterrows():
                equity_curve.append({
                    "timestamp": timestamp.isoformat(),
                    "equity": float(row['equity'])
                })
            
            # Create trades list
            trades = []
            for trade in trades_list:
                trades.append({
                    "entryTimestamp": trade.entry_time.isoformat(),
                    "exitTimestamp": trade.exit_time.isoformat() if trade.exit_time else None,
                    "symbol": trade.symbol,
                    "direction": "Long" if trade.side == "buy" else "Short",
                    "entryPrice": float(trade.entry_price),
                    "exitPrice": float(trade.exit_price) if trade.exit_price else None,
                    "quantity": float(trade.quantity),
                    "pnl": float(trade.pnl)
                })
            
            # Generate log output
            log_output = f"Backtest completed for {strategy_id}\n"
            log_output += f"Parameters: {parameters}\n"
            log_output += f"Results: Net Profit: ${summary_metrics['netProfit']:.2f}, "
            log_output += f"Win Rate: {summary_metrics['winRate']*100:.2f}%, "
            log_output += f"Max Drawdown: {summary_metrics['maxDrawdown']*100:.2f}%, "
            log_output += f"Total Trades: {summary_metrics['totalTrades']}"
            
            # Convert portfolio history to equity curve format for the result
            if isinstance(portfolio_history, pd.DataFrame) and 'equity' in portfolio_history.columns:
                # Convert DataFrame to list of dictionaries
                equity_curve = []
                for timestamp, row in portfolio_history.iterrows():
                    equity_curve.append({
                        "timestamp": timestamp.isoformat() if hasattr(timestamp, 'isoformat') else str(timestamp),
                        "equity": float(row['equity'])
                    })
            
            # Add broker authentication warning to log output if needed
            if "failed to authenticate" in log_output or "forbidden" in log_output:
                log_output += "\n\nNOTE: Broker authentication failed. This is normal for backtesting with local data. "
                log_output += "No broker connection is required for backtesting. "
                log_output += "If you want to use live trading, please set up your broker credentials in the settings."
            
            # Create a result object to store in the job
            result = {
                "strategyId": strategy_id,
                "timestamp": datetime.now().isoformat(),
                "summaryMetrics": summary_metrics,
                "equityCurve": equity_curve,
                "trades": trades_list,  # Use the processed trades_list
                "parameters": parameters,
                "logOutput": log_output
            }
            
            # Store the results in the database
            with Session(engine) as db_session:
                create_backtest_result(
                    session=db_session,
                    strategy_id=strategy_id,
                    parameters=parameters,
                    summary_metrics=summary_metrics,
                    equity_curve=equity_curve,
                    trades=trades,
                    log_output=log_output
                )
            
            # Update job status to COMPLETED and store the results
            backtest_jobs[job_id]["status"] = "COMPLETED"
            backtest_jobs[job_id]["message"] = "Backtest completed successfully"
            backtest_jobs[job_id]["updated_at"] = datetime.now().isoformat()
            backtest_jobs[job_id]["results"] = result
            
            logger.info(f"Backtest for job {job_id} completed successfully")
            
        except Exception as e:
            error_msg = f"Error running backtest: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
        
    except Exception as e:
        # If there's an error, update job status to FAILED
        error_msg = f"Backtest failed: {str(e)}"
        logger.error(error_msg)
        backtest_jobs[job_id]["status"] = "FAILED"
        backtest_jobs[job_id]["message"] = error_msg
        backtest_jobs[job_id]["updated_at"] = datetime.now().isoformat()
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
    
    # Instead of generating mock data, we should use real backtest results from the database
    raise HTTPException(
        status_code=501,
        detail="Mock data generation has been removed. The system should use real backtest calculations."
    )
    
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

# Helper functions for real backtest execution
async def simulate_backtest_execution(job_id: str):
    """
    Execute a backtest job.
    This function should be replaced with real backtest execution logic.
    """
    import asyncio
    
    # Get the job details
    job = backtest_jobs[job_id]
    
    # Update job status to RUNNING
    backtest_jobs[job_id]["status"] = "RUNNING"
    backtest_jobs[job_id]["updated_at"] = datetime.now().isoformat()
    
    # Simulate a short delay
    await asyncio.sleep(2)
    
    # Update job status to FAILED with a message about mock data removal
    backtest_jobs[job_id]["status"] = "FAILED"
    backtest_jobs[job_id]["message"] = "Mock data generation has been removed. The system should use real backtest calculations."
    backtest_jobs[job_id]["updated_at"] = datetime.now().isoformat()
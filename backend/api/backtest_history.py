"""
API endpoints for managing backtest history.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session
from typing import List, Optional
import json

from backend.database import get_session
from backend.models.backtest import BacktestResult
from backend.crud_backtest import (
    get_backtest_result,
    get_backtest_results_by_strategy,
    delete_backtest_result,
    delete_old_backtest_results,
    update_backtest_result_analysis
)

router = APIRouter(
    prefix="/backtest-history",
    tags=["backtest-history"],
    responses={404: {"description": "Not found"}},
)

# Import the create_backtest_result function
from backend.crud_backtest import (
    get_backtest_result,
    get_backtest_results_by_strategy,
    delete_backtest_result,
    delete_old_backtest_results,
    update_backtest_result_analysis,
    create_backtest_result
)

@router.get("/", response_model=List[dict])
async def list_backtest_results(
    strategy_id: Optional[str] = None,
    limit: int = Query(10, ge=1, le=100),
    session: Session = Depends(get_session)
):
    """
    List backtest results, optionally filtered by strategy ID.
    """
    if strategy_id:
        results = get_backtest_results_by_strategy(session, strategy_id, limit)
    else:
        # Get all results, limited by the limit parameter
        from sqlmodel import select
        statement = select(BacktestResult).order_by(BacktestResult.timestamp.desc()).limit(limit)
        results = session.exec(statement).all()
    
    # Convert SQLModel objects to dictionaries
    return [
        {
            "id": result.id,
            "strategy_id": result.strategy_id,
            "timestamp": result.timestamp.isoformat(),
            "parameters": result.parameters,
            "summary_metrics": result.summary_metrics,
            "has_ai_analysis": result.ai_analysis is not None,
            "locked": result.locked
        }
        for result in results
    ]

@router.get("/{backtest_id}", response_model=dict)
async def get_backtest_result_by_id(
    backtest_id: int,
    session: Session = Depends(get_session)
):
    """
    Get a specific backtest result by ID.
    """
    result = get_backtest_result(session, backtest_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Backtest result with ID {backtest_id} not found")
    
    return {
        "id": result.id,
        "strategy_id": result.strategy_id,
        "timestamp": result.timestamp.isoformat(),
        "parameters": result.parameters,
        "summary_metrics": result.summary_metrics,
        "equity_curve": result.equity_curve,
        "trades": result.trades,
        "log_output": result.log_output,
        "ai_analysis": result.ai_analysis,
        "locked": result.locked
    }

@router.delete("/{backtest_id}", response_model=dict)
async def delete_backtest_result_by_id(
    backtest_id: int,
    session: Session = Depends(get_session)
):
    """
    Delete a specific backtest result by ID.
    Returns 403 if the backtest is locked.
    """
    # First check if the backtest exists and if it's locked
    result = get_backtest_result(session, backtest_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Backtest result with ID {backtest_id} not found")
    
    if result.locked:
        raise HTTPException(status_code=403, detail=f"Backtest result with ID {backtest_id} is locked and cannot be deleted")
    
    # Now delete the backtest
    success = delete_backtest_result(session, backtest_id)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to delete backtest result with ID {backtest_id}")
    
    return {"message": f"Backtest result with ID {backtest_id} deleted successfully"}

@router.delete("/strategy/{strategy_id}", response_model=dict)
async def delete_old_results_for_strategy(
    strategy_id: str,
    keep_count: int = Query(5, ge=1, le=100),
    session: Session = Depends(get_session)
):
    """
    Delete old backtest results for a strategy, keeping only the most recent ones.
    """
    deleted_count = delete_old_backtest_results(session, strategy_id, keep_count)
    
    return {
        "message": f"Deleted {deleted_count} old backtest results for strategy {strategy_id}",
        "deleted_count": deleted_count
    }

@router.post("/{backtest_id}/analyze", response_model=dict)
async def generate_ai_analysis(
    backtest_id: int,
    session: Session = Depends(get_session)
):
    """
    Generate AI analysis for a backtest result.
    """
    # Get the backtest result
    result = get_backtest_result(session, backtest_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Backtest result with ID {backtest_id} not found")
    
    # If analysis already exists, return it
    if result.ai_analysis:
        return {"analysis": result.ai_analysis, "message": "Analysis already exists"}
    
    # Generate AI analysis
    try:
        from backend.ai_agents.backtest_analyzer import analyze_backtest_results
        
        # Prepare the input for the AI analysis
        analysis_input = {
            "strategy_id": result.strategy_id,
            "summary_metrics": result.summary_metrics,
            "trades": result.trades[:20],  # Limit to first 20 trades to avoid token limits
            "parameters": result.parameters
        }
        
        # Generate analysis
        analysis = analyze_backtest_results(analysis_input)
        
        # Update the backtest result with the analysis
        success = update_backtest_result_analysis(session, backtest_id, analysis)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update backtest result with analysis")
        
        return {"analysis": analysis, "message": "Analysis generated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate analysis: {str(e)}")

@router.get("/{backtest_id}/pdf", response_model=dict)
async def generate_pdf_report(
    backtest_id: int,
    session: Session = Depends(get_session)
):
    """
    Generate a PDF report for a backtest result.
    """
    # Get the backtest result
    result = get_backtest_result(session, backtest_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Backtest result with ID {backtest_id} not found")
    
    # This would be implemented with a PDF generation library
    # For now, we'll just return a message
    return {
        "message": "PDF report generation is not implemented yet",
        "backtest_id": backtest_id
    }

@router.post("/", response_model=dict)
async def save_backtest_result(
    backtest_data: dict,
    session: Session = Depends(get_session)
):
    """
    Save a backtest result to the database.
    """
    try:
        # Extract data from the request
        strategy_id = backtest_data.get("strategy_id")
        parameters = backtest_data.get("parameters", {})
        summary_metrics = backtest_data.get("summary_metrics", {})
        equity_curve = backtest_data.get("equity_curve", [])
        trades = backtest_data.get("trades", [])
        log_output = backtest_data.get("log_output", "")
        
        # Validate required fields
        if not strategy_id:
            raise HTTPException(status_code=400, detail="strategy_id is required")
        
        # Create the backtest result
        result = create_backtest_result(
            session=session,
            strategy_id=strategy_id,
            parameters=parameters,
            summary_metrics=summary_metrics,
            equity_curve=equity_curve,
            trades=trades,
            log_output=log_output
        )
        
        # Return the created backtest result
        return {
            "id": result.id,
            "strategy_id": result.strategy_id,
            "timestamp": result.timestamp.isoformat(),
            "parameters": result.parameters,
            "summary_metrics": result.summary_metrics,
            "has_ai_analysis": result.ai_analysis is not None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save backtest result: {str(e)}")

@router.post("/{backtest_id}/lock", response_model=dict)
async def update_backtest_lock_status(
    backtest_id: int,
    lock_data: dict,
    session: Session = Depends(get_session)
):
    """
    Update the lock status of a backtest result.
    """
    try:
        # Get the backtest result
        result = get_backtest_result(session, backtest_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"Backtest result with ID {backtest_id} not found")
        
        # Update the lock status
        locked = lock_data.get("locked", False)
        
        # Update the locked field in the database
        result.locked = locked
        session.add(result)
        session.commit()
        
        return {
            "id": result.id,
            "strategy_id": result.strategy_id,
            "timestamp": result.timestamp.isoformat(),
            "locked": result.locked
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update lock status: {str(e)}")
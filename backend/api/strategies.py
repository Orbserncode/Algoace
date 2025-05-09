from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session
from typing import List, Optional

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import crud
from backend.models import StrategyRead, StrategyCreate, StrategyUpdate
from database import get_session
# TODO: Import file handling logic when implemented

router = APIRouter(
    prefix="/strategies",
    tags=["strategies"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=StrategyRead, status_code=status.HTTP_201_CREATED)
def create_new_strategy(
    *,
    session: Session = Depends(get_session),
    strategy_in: StrategyCreate,
    # TODO: Add file upload parameter when implementing file handling
    # strategy_file: Optional[UploadFile] = File(None),
):
    """
    Create a new strategy.
    Optionally accepts a file upload (implementation pending).
    """
    # TODO: Add file saving logic here if strategy_file is provided
    # If file provided, ensure source is 'Uploaded' and store file_name
    # Example (needs proper error handling and storage location):
    # if strategy_file:
    #     if strategy_in.source != 'Uploaded':
    #         strategy_in.source = 'Uploaded' # Override or validate source
    #     strategy_in.file_name = strategy_file.filename
    #     # file_location = f"path/to/storage/{strategy_file.filename}"
    #     # with open(file_location, "wb+") as file_object:
    #     #     file_object.write(strategy_file.file.read())
    #     print(f"Simulating save of file: {strategy_file.filename}")


    strategy = crud.create_strategy(session=session, strategy_in=strategy_in)
    return strategy

@router.get("/", response_model=List[StrategyRead])
def read_strategies(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
):
    """
    Retrieve all strategies.
    """
    strategies = crud.get_strategies(session=session, skip=skip, limit=limit)
    return strategies

@router.get("/{strategy_id}", response_model=StrategyRead)
def read_strategy(
    *,
    session: Session = Depends(get_session),
    strategy_id: int,
):
    """
    Get a specific strategy by ID.
    """
    strategy = crud.get_strategy(session=session, strategy_id=strategy_id)
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")
    return strategy

@router.patch("/{strategy_id}", response_model=StrategyRead)
def update_existing_strategy(
    *,
    session: Session = Depends(get_session),
    strategy_id: int,
    strategy_in: StrategyUpdate,
):
    """
    Update a strategy (e.g., change status, description).
    """
    strategy = crud.update_strategy(session=session, strategy_id=strategy_id, strategy_in=strategy_in)
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")
    return strategy

@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_strategy(
    *,
    session: Session = Depends(get_session),
    strategy_id: int,
):
    """
    Delete a strategy.
    """
    deleted = crud.delete_strategy(session=session, strategy_id=strategy_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")
    # No content returned on successful delete
    return None

# TODO: Add endpoints for triggering backtests, getting results, etc.
# @router.post("/{strategy_id}/backtest", ...)
# @router.get("/{strategy_id}/backtest/results", ...)

@router.post("/schedule-generation", status_code=status.HTTP_200_OK)
def schedule_strategy_generation(
    *,
    session: Session = Depends(get_session),
    schedule_type: str,
    generation_config: dict,
):
    """
    Schedule automated strategy generation.
    
    - schedule_type: 'startup', 'daily', or 'weekly'
    - generation_config: Configuration for the strategy generation (market conditions, risk tolerance, etc.)
    """
    from datetime import datetime
    
    # Create a new strategy with scheduled generation
    strategy_in = StrategyCreate(
        name=f"Scheduled {schedule_type.capitalize()} Strategy {datetime.now().strftime('%Y-%m-%d')}",
        description=f"Automatically generated strategy with {schedule_type} schedule",
        status="Inactive",
        source="AI-Generated",
        generation_schedule=schedule_type,
        last_generation_time=datetime.now().isoformat(),
        generation_config=generation_config
    )
    
    strategy = crud.create_strategy(session=session, strategy_in=strategy_in)
    return {"message": f"Strategy generation scheduled with {schedule_type} frequency", "strategy_id": strategy.id}

@router.post("/run-scheduled-generations", status_code=status.HTTP_200_OK)
def run_scheduled_generations(
    *,
    session: Session = Depends(get_session),
):
    """
    Trigger execution of all scheduled strategy generations that are due.
    This endpoint would typically be called by a cron job or scheduler.
    """
    from datetime import datetime, timedelta
    
    # Get all strategies with scheduled generation
    strategies = crud.get_strategies_by_schedule(session=session)
    
    results = []
    now = datetime.now()
    
    for strategy in strategies:
        last_gen_time = None
        if strategy.last_generation_time:
            last_gen_time = datetime.fromisoformat(strategy.last_generation_time)
        
        should_generate = False
        
        # Check if generation is due based on schedule
        if strategy.generation_schedule == "startup":
            # Always generate on startup
            should_generate = True
        elif strategy.generation_schedule == "daily" and last_gen_time:
            # Generate if last generation was more than 24 hours ago
            should_generate = (now - last_gen_time) > timedelta(days=1)
        elif strategy.generation_schedule == "weekly" and last_gen_time:
            # Generate if last generation was more than 7 days ago
            should_generate = (now - last_gen_time) > timedelta(days=7)
        
        if should_generate:
            # Update last generation time
            crud.update_strategy(
                session=session,
                strategy_id=strategy.id,
                strategy_in=StrategyUpdate(last_generation_time=now.isoformat())
            )
            
            # TODO: Implement actual strategy generation logic here
            # This would call the AI strategy generation service
            
            results.append({
                "strategy_id": strategy.id,
                "name": strategy.name,
                "schedule": strategy.generation_schedule,
                "status": "Generation triggered"
            })
    
    return {"message": f"Processed {len(results)} scheduled generations", "results": results}

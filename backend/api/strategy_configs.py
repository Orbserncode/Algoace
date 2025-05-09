"""
API endpoints for strategy configurations.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from typing import List, Optional

from backend.database import get_session
import backend.crud_strategy_config as crud
import backend.schemas as schemas
import backend.models as models

router = APIRouter(
    prefix="/strategy-configs",
    tags=["strategy-configs"],
)

@router.post("/", response_model=schemas.StrategyConfigRead)
def create_strategy_config(
    config: schemas.StrategyConfigCreate,
    db: Session = Depends(get_session)
):
    """Create a new strategy configuration."""
    return crud.create_strategy_config(db=db, config=config)

@router.get("/{config_id}", response_model=schemas.StrategyConfigRead)
def get_strategy_config(config_id: int, db: Session = Depends(get_session)):
    """Get a strategy configuration by ID."""
    db_config = crud.get_strategy_config(db=db, config_id=config_id)
    if db_config is None:
        raise HTTPException(status_code=404, detail="Strategy configuration not found")
    return db_config

@router.get("/", response_model=List[schemas.StrategyConfigRead])
def get_strategy_configs(
    skip: int = 0,
    limit: int = 100,
    include_archived: bool = False,
    source: Optional[str] = None,
    strategy_id: Optional[str] = None,
    db: Session = Depends(get_session)
):
    """Get a list of strategy configurations with optional filtering."""
    return crud.get_strategy_configs(
        db=db,
        skip=skip,
        limit=limit,
        include_archived=include_archived,
        source=source,
        strategy_id=strategy_id,
    )

@router.get("/ai-suggestions/", response_model=List[schemas.StrategyConfigRead])
def get_ai_suggestions(
    skip: int = 0,
    limit: int = 100,
    include_archived: bool = False,
    strategy_id: Optional[str] = None,
    db: Session = Depends(get_session)
):
    """Get a list of AI-generated strategy configurations."""
    return crud.get_ai_generated_configs(
        db=db,
        skip=skip,
        limit=limit,
        include_archived=include_archived,
        strategy_id=strategy_id,
    )

@router.put("/{config_id}", response_model=schemas.StrategyConfigRead)
def update_strategy_config(
    config_id: int,
    config_update: schemas.StrategyConfigUpdate,
    db: Session = Depends(get_session)
):
    """Update a strategy configuration."""
    db_config = crud.update_strategy_config(db=db, config_id=config_id, config_update=config_update)
    if db_config is None:
        raise HTTPException(status_code=404, detail="Strategy configuration not found")
    return db_config

@router.delete("/{config_id}", response_model=bool)
def delete_strategy_config(config_id: int, db: Session = Depends(get_session)):
    """Delete a strategy configuration."""
    success = crud.delete_strategy_config(db=db, config_id=config_id)
    if not success:
        raise HTTPException(status_code=404, detail="Strategy configuration not found")
    return success

@router.post("/{config_id}/archive", response_model=schemas.StrategyConfigRead)
def archive_strategy_config(config_id: int, db: Session = Depends(get_session)):
    """Archive a strategy configuration."""
    db_config = crud.archive_strategy_config(db=db, config_id=config_id)
    if db_config is None:
        raise HTTPException(status_code=404, detail="Strategy configuration not found")
    return db_config

@router.post("/{config_id}/apply", response_model=schemas.StrategyConfigRead)
def apply_strategy_config(config_id: int, db: Session = Depends(get_session)):
    """
    Apply a strategy configuration.
    This will update the trading settings based on the configuration.
    """
    # Get the configuration
    db_config = crud.get_strategy_config(db=db, config_id=config_id)
    if db_config is None:
        raise HTTPException(status_code=404, detail="Strategy configuration not found")
    
    # TODO: Implement logic to apply the configuration to trading settings
    # This would involve updating the relevant settings in the database
    # and potentially notifying the execution agent
    
    # For now, just mark the configuration as applied by updating its status
    update_data = schemas.StrategyConfigUpdate(
        updated_at=db_config.updated_at,
        performance_summary=f"{db_config.performance_summary or ''} Applied on {db_config.updated_at}".strip()
    )
    
    return crud.update_strategy_config(db=db, config_id=config_id, config_update=update_data)
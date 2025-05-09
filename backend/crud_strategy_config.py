"""
CRUD operations for StrategyConfig model.
"""
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from datetime import datetime

from backend.models import StrategyConfig, ConfigStatusEnum, ConfigSourceEnum
import schemas
 
def create_strategy_config(
    db: Session,
    config: schemas.StrategyConfigCreate
) -> StrategyConfig:
    """
    Create a new strategy configuration.
    
    Args:
        db: Database session
        config: Configuration data
        
    Returns:
        The created StrategyConfig object
    """
    db_config = StrategyConfig(
        name=config.name,
        description=config.description,
        config_data=config.config_data,
        strategy_id=config.strategy_id,
        performance_summary=config.performance_summary,
        source=ConfigSourceEnum(config.source),
        status=ConfigStatusEnum.ACTIVE,
    )
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

def get_strategy_config(db: Session, config_id: int) -> Optional[StrategyConfig]:
    """
    Get a strategy configuration by ID.
    
    Args:
        db: Database session
        config_id: ID of the configuration to retrieve
        
    Returns:
        The StrategyConfig object if found, None otherwise
    """
    return db.get(StrategyConfig, config_id)

def get_strategy_configs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    include_archived: bool = False,
    source: Optional[str] = None,
    strategy_id: Optional[str] = None,
) -> List[StrategyConfig]:
    """
    Get a list of strategy configurations with optional filtering.
    
    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        include_archived: Whether to include archived configurations
        source: Filter by source (AI-Generated or User-Saved)
        strategy_id: Filter by associated strategy ID
        
    Returns:
        List of StrategyConfig objects
    """
    query = select(StrategyConfig)

    # Apply filters
    if not include_archived:
        query = query.where(StrategyConfig.status == ConfigStatusEnum.ACTIVE)

    if source:
        query = query.where(StrategyConfig.source == source)

    if strategy_id:
        query = query.where(StrategyConfig.strategy_id == strategy_id)

    # Apply pagination
    query = query.offset(skip).limit(limit)

    # Order by creation date (newest first)
    query = query.order_by(StrategyConfig.created_at.desc())

    return db.exec(query).all()

def update_strategy_config(
    db: Session,
    config_id: int,
    config_update: schemas.StrategyConfigUpdate
) -> Optional[StrategyConfig]:
    """
    Update a strategy configuration.
    
    Args:
        db: Database session
        config_id: ID of the configuration to update
        config_update: Updated configuration data
        
    Returns:
        The updated StrategyConfig object if found, None otherwise
    """
    db_config = get_strategy_config(db, config_id)
    if not db_config:
        return None

    # Update fields if provided
    update_data = config_update.model_dump(exclude_unset=True)

    # Handle status conversion if provided
    if "status" in update_data:
        update_data["status"] = ConfigStatusEnum(update_data["status"])

    # Set updated_at timestamp
    update_data["updated_at"] = datetime.utcnow()

    for key, value in update_data.items():
        setattr(db_config, key, value)

    session.add(db_config)
    session.commit()
    session.refresh(db_config)
    return db_config

def delete_strategy_config(db: Session, config_id: int) -> bool:
    """
    Delete a strategy configuration.
    
    Args:
        db: Database session
        config_id: ID of the configuration to delete
        
    Returns:
        True if the configuration was deleted, False otherwise
    """
    db_config = get_strategy_config(db, config_id)
    if not db_config:
        return False

    db.delete(db_config)
    db.commit()
    return True

def archive_strategy_config(db: Session, config_id: int) -> Optional[StrategyConfig]:
    """
    Archive a strategy configuration (mark as archived).
    
    Args:
        db: Database session
        config_id: ID of the configuration to archive
        
    Returns:
        The archived StrategyConfig object if found, None otherwise
    """
    db_config = get_strategy_config(db, config_id)
    if not db_config:
        return None

    db_config.status = ConfigStatusEnum.ARCHIVED
    db_config.updated_at = datetime.utcnow()

    db.add(db_config)
    db.commit()
    session.refresh(db_config)
    return db_config

def get_ai_generated_configs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    include_archived: bool = False,
    strategy_id: Optional[str] = None,
) -> List[StrategyConfig]:
    """
    Get a list of AI-generated strategy configurations.
    
    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        include_archived: Whether to include archived configurations
        strategy_id: Filter by associated strategy ID
        
    Returns:
        List of AI-generated StrategyConfig objects
    """
    return get_strategy_configs(
        db=db,
        skip=skip,
        limit=limit,
        include_archived=include_archived,
        source=ConfigSourceEnum.AI_GENERATED,
        strategy_id=strategy_id,
    )
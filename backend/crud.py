from typing import List, Optional
from sqlmodel import Session, select
from . import models

# === Strategy CRUD ===

def create_strategy(*, session: Session, strategy_in: models.StrategyCreate) -> models.Strategy:
    """Creates a new strategy record in the database."""
    db_strategy = models.Strategy.model_validate(strategy_in) # Validate input against the model
    session.add(db_strategy)
    session.commit()
    session.refresh(db_strategy)
    return db_strategy

def get_strategy(*, session: Session, strategy_id: int) -> Optional[models.Strategy]:
    """Gets a single strategy by its ID."""
    statement = select(models.Strategy).where(models.Strategy.id == strategy_id)
    strategy = session.exec(statement).first()
    return strategy

def get_strategies(*, session: Session, skip: int = 0, limit: int = 100) -> List[models.Strategy]:
    """Gets a list of strategies, with optional pagination."""
    statement = select(models.Strategy).offset(skip).limit(limit)
    strategies = session.exec(statement).all()
    return strategies

def update_strategy(*, session: Session, strategy_id: int, strategy_in: models.StrategyUpdate) -> Optional[models.Strategy]:
    """Updates an existing strategy."""
    db_strategy = get_strategy(session=session, strategy_id=strategy_id)
    if not db_strategy:
        return None

    update_data = strategy_in.model_dump(exclude_unset=True) # Get only fields that were provided
    for key, value in update_data.items():
        setattr(db_strategy, key, value)

    session.add(db_strategy)
    session.commit()
    session.refresh(db_strategy)
    return db_strategy

def delete_strategy(*, session: Session, strategy_id: int) -> bool:
    """Deletes a strategy by its ID."""
    db_strategy = get_strategy(session=session, strategy_id=strategy_id)
    if not db_strategy:
        return False

    # TODO: Add logic here to delete associated strategy file if applicable (source == 'Uploaded')
    # e.g., os.remove(file_path) or delete from S3/GCS

    session.delete(db_strategy)
    session.commit()
    return True

# TODO: Add CRUD functions for other resources (Agents, Logs, etc.) later

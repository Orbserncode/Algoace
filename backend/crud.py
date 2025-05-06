from typing import List, Optional, Type
from sqlmodel import Session, select
from pydantic import ValidationError # Import for catching validation errors

from . import models, schemas # Import schemas for validation
from .models import Agent as AgentModel # Alias to avoid conflict with schemas.Agent

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


# === Agent CRUD ===

def create_agent(*, session: Session, agent_in: schemas.AgentCreate) -> AgentModel:
    """Creates a new agent record in the database after validating its config."""
    try:
        # agent_in.type is already AgentTypeEnumSchema from the request
        # Pass its .value (string) to parse_agent_config
        parsed_config = schemas.parse_agent_config(agent_in.type.value, agent_in.config or {})
    except ValidationError as e:
        raise ValueError(f"Invalid configuration for agent type {agent_in.type.value}: {e.errors()}")

    # Convert AgentTypeEnumSchema to models.AgentTypeEnum for DB model
    try:
        db_agent_type = models.AgentTypeEnum(agent_in.type.value)
    except ValueError:
        # This should not happen if AgentTypeEnumSchema mirrors models.AgentTypeEnum
        raise ValueError(f"Invalid agent type value: {agent_in.type.value}")

    db_agent_data = agent_in.model_dump(exclude={'config', 'type'})
    db_agent_data['config'] = parsed_config.model_dump()
    db_agent_data['type'] = db_agent_type # Use the models.AgentTypeEnum

    db_agent = AgentModel.model_validate(db_agent_data)
    
    session.add(db_agent)
    session.commit()
    session.refresh(db_agent)
    return db_agent

def get_agent(*, session: Session, agent_id: int) -> Optional[AgentModel]:
    """Gets a single agent by its ID."""
    statement = select(AgentModel).where(AgentModel.id == agent_id)
    agent = session.exec(statement).first()
    return agent

def get_agents(*, session: Session, skip: int = 0, limit: int = 100) -> List[AgentModel]:
    """Gets a list of agents, with optional pagination."""
    statement = select(AgentModel).offset(skip).limit(limit)
    agents = session.exec(statement).all()
    return agents

def update_agent(*, session: Session, agent_id: int, agent_in: schemas.AgentUpdate) -> Optional[AgentModel]:
    """Updates an existing agent. Config validation is applied if config is updated."""
    db_agent = get_agent(session=session, agent_id=agent_id)
    if not db_agent:
        return None

    update_data = agent_in.model_dump(exclude_unset=True)
    
    if 'config' in update_data and update_data['config'] is not None:
        try:
            # db_agent.type is models.AgentTypeEnum, pass its .value
            parsed_config = schemas.parse_agent_config(db_agent.type.value, update_data['config'])
            update_data['config'] = parsed_config.model_dump()
        except ValidationError as e:
            raise ValueError(f"Invalid new configuration for agent type {db_agent.type.value}: {e.errors()}")
    
    # Handle status update: convert schema enum to model enum
    if 'status' in update_data and update_data['status'] is not None:
        try:
            # update_data['status'] is AgentStatusEnumSchema
            update_data['status'] = models.AgentStatusEnum(update_data['status'].value)
        except ValueError:
            raise ValueError(f"Invalid status value: {update_data['status']}")

    for key, value in update_data.items():
        setattr(db_agent, key, value)

    session.add(db_agent)
    session.commit()
    session.refresh(db_agent)
    return db_agent

def delete_agent(*, session: Session, agent_id: int) -> bool:
    """Deletes an agent by its ID."""
    db_agent = get_agent(session=session, agent_id=agent_id)
    if not db_agent:
        return False
    if db_agent.isDefault: # Prevent deleting default agents
        return False 
    session.delete(db_agent)
    session.commit()
    return True

# TODO: Add CRUD functions for other resources (Logs, etc.) later


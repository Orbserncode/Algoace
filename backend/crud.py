from typing import List, Optional, Type, Union
from sqlmodel import Session, select
from pydantic import ValidationError, BaseModel as PydanticBaseModel # Import for catching validation errors

from typing import List, Optional, Type, Union
from sqlmodel import Session, select
from pydantic import ValidationError, BaseModel as PydanticBaseModel # Import for catching validation errors

# Import specific models and enums from backend.models
from backend.models import (
    Strategy, StrategyCreate, StrategyUpdate,
    Agent, AgentTypeEnum, AgentStatusEnum
)

# Import specific schemas and functions from backend.schemas
from backend.schemas import (
    AgentCreate, AgentUpdate, AgentConfigUnion, parse_agent_config, AgentStatusEnumSchema
)


# === Strategy CRUD ===

def create_strategy(*, session: Session, strategy_in: StrategyCreate) -> Strategy:
    """Creates a new strategy record in the database."""
    db_strategy = Strategy.model_validate(strategy_in) # Validate input against the model
    session.add(db_strategy)
    session.commit()
    session.refresh(db_strategy)
    return db_strategy

def get_strategy(*, session: Session, strategy_id: int) -> Optional[Strategy]:
    """Gets a single strategy by its ID."""
    statement = select(Strategy).where(Strategy.id == strategy_id)
    strategy = session.exec(statement).first()
    return strategy

def get_strategies(*, session: Session, skip: int = 0, limit: int = 100) -> List[Strategy]:
    """Gets a list of strategies, with optional pagination."""
    statement = select(Strategy).offset(skip).limit(limit)
    strategies = session.exec(statement).all()
    return strategies

def update_strategy(*, session: Session, strategy_id: int, strategy_in: StrategyUpdate) -> Optional[Strategy]:
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
    session.delete(db_strategy)
    session.commit()
    return True


def get_strategies_by_schedule(*, session: Session, schedule_type: Optional[str] = None) -> List[Strategy]:
    """
    Gets strategies with scheduled generation.
    
    Args:
        session: Database session
        schedule_type: Optional filter for specific schedule type ('startup', 'daily', 'weekly')
                      If None, returns all strategies with any schedule
    
    Returns:
        List of Strategy objects with scheduled generation
    """
    if schedule_type:
        statement = select(Strategy).where(Strategy.generation_schedule == schedule_type)
    else:
        statement = select(Strategy).where(Strategy.generation_schedule.is_not(None))
    
    strategies = session.exec(statement).all()
    return strategies


# === Agent CRUD ===

def create_agent(*, session: Session, agent_in: AgentCreate) -> Agent:
    """
    Creates a new agent record in the database.
    The agent_in.config (Optional[Dict[str, Any]]) is parsed into a specific Pydantic config model.
    The .model_dump() of this parsed config is stored in the DB as JSON.
    """
    try:
        # agent_in.type is AgentTypeEnumSchema. Use its .value (string) for parsing.
        # agent_in.config is Optional[Dict[str, Any]]
        parsed_config_obj: Union[AgentConfigUnion, PydanticBaseModel] = parse_agent_config(
            agent_in.type.value,
            agent_in.config or {} # Pass empty dict if config is None
        )
    except ValidationError as e_parse:
        raise ValueError(f"Invalid configuration for agent type {agent_in.type.value}: {e_parse.errors()}")
    except Exception as e_gen_parse: # Catch any other parsing related errors
        raise ValueError(f"Error parsing agent configuration for type {agent_in.type.value}: {str(e_gen_parse)}")


    # Convert AgentTypeEnumSchema to models.AgentTypeEnum for DB model
    try:
        db_agent_type_enum = AgentTypeEnum(agent_in.type.value)
    except ValueError: # Should not happen if enums are aligned
        raise ValueError(f"Invalid agent type value received: {agent_in.type.value}")

    db_agent_data = agent_in.model_dump(exclude={'config', 'type'})
    db_agent_data['config'] = parsed_config_obj.model_dump() # Store the dict version of parsed config
    db_agent_data['type'] = db_agent_type_enum # Use the models.AgentTypeEnum

    # isDefault defaults to False in models.Agent, so no need to set it unless specified in AgentCreate
    if hasattr(agent_in, 'isDefault') and agent_in.isDefault is not None:
        db_agent_data['isDefault'] = agent_in.isDefault
    else:
        db_agent_data['isDefault'] = False # Explicitly set if not in AgentCreate or schema

    db_agent = Agent.model_validate(db_agent_data)

    session.add(db_agent)
    session.commit()
    session.refresh(db_agent)
    return db_agent


def get_agent(*, session: Session, agent_id: int) -> Optional[Agent]:
    """
    Gets a single agent by its ID. The agent's `config` field will be a dict (from JSON).
    The caller (e.g., API layer) is responsible for parsing this dict into a Pydantic model if needed.
    """
    statement = select(Agent).where(Agent.id == agent_id)
    agent = session.exec(statement).first()
    return agent

def get_agents(*, session: Session, skip: int = 0, limit: int = 100) -> List[Agent]:
    """
    Gets a list of agents. Each agent's `config` field will be a dict.
    """
    statement = select(Agent).offset(skip).limit(limit)
    agents = session.exec(statement).all()
    return agents


def update_agent(*, session: Session, agent_id: int, agent_in: AgentUpdate) -> Optional[Agent]:
    """
    Updates an existing agent.
    If agent_in.config is provided, it's a Dict[str, Any]. This dict is parsed into the
    specific Pydantic config model for the agent's type, and then its .model_dump()
    is stored in the DB.
    """
    db_agent = get_agent(session=session, agent_id=agent_id)
    if not db_agent:
        return None

    update_data = agent_in.model_dump(exclude_unset=True) # Get only fields that were provided

    # If 'config' is part of the update, it needs to be parsed and validated
    if 'config' in update_data and update_data['config'] is not None:
        if not isinstance(update_data['config'], dict):
            raise ValueError("Agent config update must be a dictionary.")
        try:
            # db_agent.type is models.AgentTypeEnum. Use its .value for parsing.
            parsed_config_update_obj = parse_agent_config(db_agent.type.value, update_data['config'])
            update_data['config'] = parsed_config_update_obj.model_dump() # Store the dict version
        except ValidationError as e_parse_update:
            raise ValueError(f"Invalid new configuration for agent type {db_agent.type.value}: {e_parse_update.errors()}")
        except Exception as e_gen_parse_update:
            raise ValueError(f"Error parsing updated agent configuration for type {db_agent.type.value}: {str(e_gen_parse_update)}")

    # Handle status update: convert schema enum to model enum if present
    if 'status' in update_data and update_data['status'] is not None:
        if not isinstance(update_data['status'], AgentStatusEnumSchema):
             # This case implies raw string or incorrect type was passed, which Pydantic should catch.
             # If it's already AgentStatusEnumSchema, we need its .value.
            raise ValueError("Invalid status type provided in update.")
        try:
            update_data['status'] = AgentStatusEnum(update_data['status'].value)
        except ValueError: # Should not happen if enums are aligned
            raise ValueError(f"Invalid status value for update: {update_data['status'].value}")

    for key, value in update_data.items():
        setattr(db_agent, key, value)

    session.add(db_agent)
    session.commit()
    session.refresh(db_agent)
    return db_agent


def delete_agent(*, session: Session, agent_id: int) -> bool:
    """Deletes an agent by its ID, unless it's a default agent."""
    db_agent = get_agent(session=session, agent_id=agent_id)
    if not db_agent:
        return False
    if db_agent.isDefault:
        # UI should prevent this, but good to have a safeguard
        # Alternatively, raise an error here. For now, just return False.
        print(f"Attempted to delete default agent {db_agent.name} (ID: {agent_id}). Operation denied.")
        return False

    session.delete(db_agent)
    session.commit()
    return True

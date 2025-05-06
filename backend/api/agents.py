# backend/api/agents.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing import List, Any
from pydantic import ValidationError as PydanticValidationError # For specific error handling

from .. import crud, schemas, models
from ..database import get_session

router = APIRouter(
    prefix="/agents",
    tags=["agents"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=schemas.AgentRead, status_code=status.HTTP_201_CREATED)
def create_new_agent(
    *,
    session: Session = Depends(get_session),
    agent_in: schemas.AgentCreate,
):
    """
    Create a new agent.
    The configuration within `agent_in.config` will be validated based on `agent_in.type`.
    """
    try:
        agent = crud.create_agent(session=session, agent_in=agent_in)
        # Manually parse config again for response model if crud returns raw dict
        # This ensures the AgentRead model gets a correctly typed config
        if isinstance(agent.config, dict): # Check if config is still a dict
             try:
                 agent.config = schemas.parse_agent_config(agent.type, agent.config)
             except PydanticValidationError:
                 # This should ideally not happen if crud.create_agent works correctly
                 # but as a fallback, set config to None or a base model
                 agent.config = schemas.BaseAgentConfig()
        return agent
    except ValueError as e: # Catch validation errors from CRUD
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        # Catch other potential errors during creation (e.g., database unique constraint)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")


@router.get("/", response_model=List[schemas.AgentRead])
def read_all_agents(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
):
    """
    Retrieve all agents.
    """
    db_agents = crud.get_agents(session=session, skip=skip, limit=limit)
    # Parse config for each agent before returning
    agents_out = []
    for agent in db_agents:
        try:
            parsed_config = schemas.parse_agent_config(agent.type, agent.config or {})
            agents_out.append(schemas.AgentRead(**agent.model_dump(exclude={'config'}), config=parsed_config))
        except PydanticValidationError:
            # Handle cases where stored config might be invalid or for a type not yet fully supported
            # For now, return with a base config or skip if critical
            agents_out.append(schemas.AgentRead(**agent.model_dump(exclude={'config'}), config=schemas.BaseAgentConfig())) # Fallback
    return agents_out


@router.get("/{agent_id}", response_model=schemas.AgentRead)
def read_single_agent(
    *,
    session: Session = Depends(get_session),
    agent_id: int,
):
    """
    Get a specific agent by ID.
    """
    agent = crud.get_agent(session=session, agent_id=agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    try:
        parsed_config = schemas.parse_agent_config(agent.type, agent.config or {})
        return schemas.AgentRead(**agent.model_dump(exclude={'config'}), config=parsed_config)
    except PydanticValidationError:
         # Fallback if stored config is somehow invalid for its type
        return schemas.AgentRead(**agent.model_dump(exclude={'config'}), config=schemas.BaseAgentConfig())


@router.patch("/{agent_id}", response_model=schemas.AgentRead)
def update_existing_agent(
    *,
    session: Session = Depends(get_session),
    agent_id: int,
    agent_in: schemas.AgentUpdate,
):
    """
    Update an agent (e.g., change status, description, config).
    Configuration is validated if provided.
    """
    try:
        agent = crud.update_agent(session=session, agent_id=agent_id, agent_in=agent_in)
    except ValueError as e: # Catch validation errors from CRUD
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    
    # Parse config for response
    try:
        parsed_config = schemas.parse_agent_config(agent.type, agent.config or {})
        return schemas.AgentRead(**agent.model_dump(exclude={'config'}), config=parsed_config)
    except PydanticValidationError:
        return schemas.AgentRead(**agent.model_dump(exclude={'config'}), config=schemas.BaseAgentConfig())


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_agent(
    *,
    session: Session = Depends(get_session),
    agent_id: int,
):
    """
    Delete an agent. Default agents cannot be deleted.
    """
    agent = crud.get_agent(session=session, agent_id=agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    if agent.isDefault:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Default agents cannot be deleted.")
        
    deleted = crud.delete_agent(session=session, agent_id=agent_id)
    if not deleted:
        # This case might be redundant if previous checks cover it, but good for safety
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found or deletion failed.")
    return None

@router.post("/{agent_id}/activate", response_model=schemas.AgentRead)
def activate_specific_agent(
    *,
    session: Session = Depends(get_session),
    agent_id: int,
):
    """
    Activate an agent. (Placeholder - Implement actual activation logic)
    """
    agent = crud.get_agent(session=session, agent_id=agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    # Placeholder: Update status in DB. Real activation might involve starting a process.
    agent.status = models.AgentStatusEnum.RUNNING # Or IDLE depending on agent type
    if agent.type == models.AgentTypeEnum.STRATEGY_CODING or agent.type == models.AgentTypeEnum.EXECUTION:
        agent.status = models.AgentStatusEnum.IDLE # These might start as Idle then become Running
    
    session.add(agent)
    session.commit()
    session.refresh(agent)
    
    # Parse config for response
    try:
        parsed_config = schemas.parse_agent_config(agent.type, agent.config or {})
        return schemas.AgentRead(**agent.model_dump(exclude={'config'}), config=parsed_config)
    except PydanticValidationError:
        return schemas.AgentRead(**agent.model_dump(exclude={'config'}), config=schemas.BaseAgentConfig())


@router.post("/{agent_id}/deactivate", response_model=schemas.AgentRead)
def deactivate_specific_agent(
    *,
    session: Session = Depends(get_session),
    agent_id: int,
):
    """
    Deactivate an agent. (Placeholder - Implement actual deactivation logic)
    """
    agent = crud.get_agent(session=session, agent_id=agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    # Placeholder: Update status in DB. Real deactivation might involve stopping a process.
    agent.status = models.AgentStatusEnum.STOPPED
    session.add(agent)
    session.commit()
    session.refresh(agent)

    # Parse config for response
    try:
        parsed_config = schemas.parse_agent_config(agent.type, agent.config or {})
        return schemas.AgentRead(**agent.model_dump(exclude={'config'}), config=parsed_config)
    except PydanticValidationError:
        return schemas.AgentRead(**agent.model_dump(exclude={'config'}), config=schemas.BaseAgentConfig())

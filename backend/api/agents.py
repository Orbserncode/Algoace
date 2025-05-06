# backend/api/agents.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlmodel import Session
from typing import List, Any, Dict
from pydantic import ValidationError as PydanticValidationError, BaseModel

from backend import crud, schemas, models
from backend.database import get_session
from backend.ai_agents import PydanticAIAgentWrapper, AgentTaskInput, AgentTaskOutput # Import base wrappers
from backend.ai_agents.strategy_coding_agent import GenerateStrategyInput # Specific input for one agent type

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
    try:
        agent = crud.create_agent(session=session, agent_in=agent_in)
        if isinstance(agent.config, dict):
             try:
                 agent.config = schemas.parse_agent_config(agent.type, agent.config)
             except PydanticValidationError:
                 agent.config = schemas.BaseAgentConfig()
        return agent
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")


@router.get("/", response_model=List[schemas.AgentRead])
def read_all_agents(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
):
    db_agents = crud.get_agents(session=session, skip=skip, limit=limit)
    agents_out = []
    for agent in db_agents:
        try:
            parsed_config = schemas.parse_agent_config(agent.type, agent.config or {})
            # Ensure agent.type is the string value for model_dump
            agent_dict = agent.model_dump(exclude={'config'})
            agent_dict['type'] = agent.type.value # Use enum value
            agents_out.append(schemas.AgentRead(**agent_dict, config=parsed_config))
        except PydanticValidationError:
            agent_dict_fallback = agent.model_dump(exclude={'config'})
            agent_dict_fallback['type'] = agent.type.value
            agents_out.append(schemas.AgentRead(**agent_dict_fallback, config=schemas.BaseAgentConfig()))
    return agents_out


@router.get("/{agent_id}", response_model=schemas.AgentRead)
def read_single_agent(
    *,
    session: Session = Depends(get_session),
    agent_id: int,
):
    agent = crud.get_agent(session=session, agent_id=agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    try:
        parsed_config = schemas.parse_agent_config(agent.type.value, agent.config or {})
        agent_dict = agent.model_dump(exclude={'config'})
        agent_dict['type'] = agent.type.value
        return schemas.AgentRead(**agent_dict, config=parsed_config)
    except PydanticValidationError:
        agent_dict_fallback = agent.model_dump(exclude={'config'})
        agent_dict_fallback['type'] = agent.type.value
        return schemas.AgentRead(**agent_dict_fallback, config=schemas.BaseAgentConfig())


@router.patch("/{agent_id}", response_model=schemas.AgentRead)
def update_existing_agent(
    *,
    session: Session = Depends(get_session),
    agent_id: int,
    agent_in: schemas.AgentUpdate,
):
    try:
        agent = crud.update_agent(session=session, agent_id=agent_id, agent_in=agent_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    
    try:
        parsed_config = schemas.parse_agent_config(agent.type.value, agent.config or {})
        agent_dict = agent.model_dump(exclude={'config'})
        agent_dict['type'] = agent.type.value
        return schemas.AgentRead(**agent_dict, config=parsed_config)
    except PydanticValidationError:
        agent_dict_fallback = agent.model_dump(exclude={'config'})
        agent_dict_fallback['type'] = agent.type.value
        return schemas.AgentRead(**agent_dict_fallback, config=schemas.BaseAgentConfig())


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_agent(
    *,
    session: Session = Depends(get_session),
    agent_id: int,
):
    agent = crud.get_agent(session=session, agent_id=agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    if agent.isDefault:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Default agents cannot be deleted.")
        
    deleted = crud.delete_agent(session=session, agent_id=agent_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found or deletion failed.")
    return None

# --- Agent Task Execution Endpoints ---

class GenericTaskInput(BaseModel):
    # This allows flexibility for different agent inputs
    # Specific agent task endpoints will expect a more defined body
    task_specific_input: Dict[str, Any] = Field(description="The actual input data for the agent's task.")


# Example for Strategy Coding Agent
@router.post("/{agent_id}/run-generate-strategy", response_model=AgentTaskOutput)
async def run_generate_strategy_task(
    agent_id: int,
    task_input: GenerateStrategyInput, # Specific input type
    session: Session = Depends(get_session),
):
    """
    Execute the 'generate strategy' task for a Strategy Coding Agent.
    """
    try:
        agent_wrapper = PydanticAIAgentWrapper.get_agent_wrapper(agent_id=agent_id, session=session)
        if not isinstance(agent_wrapper, PydanticAIAgentWrapper) or agent_wrapper.agent_model.type != models.AgentTypeEnum.STRATEGY_CODING:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agent is not a Strategy Coding Agent or wrapper type mismatch.")

        # Ensure the task_input matches the agent_wrapper's expected input_schema type
        # This is implicitly handled by FastAPI's request body validation against GenerateStrategyInput
        
        result = await agent_wrapper.run(task_input, session=session)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except NotImplementedError as e:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(e))
    except Exception as e:
        # Log the full error for debugging
        print(f"Unexpected error running agent task for agent {agent_id}: {type(e).__name__} - {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")


# Placeholder for a generic "run_task" endpoint, might be too broad
# Consider specific endpoints for each agent type's main task(s) for better type safety.
@router.post("/{agent_id}/run-task", response_model=AgentTaskOutput, deprecated=True)
async def run_agent_task(
    agent_id: int,
    task_input_payload: GenericTaskInput = Body(...), # Use generic wrapper for body
    session: Session = Depends(get_session),
):
    """
    Execute a task for a specific agent.
    The `task_specific_input` in the request body should match the
    expected input schema for the agent's task.
    
    DEPRECATED: Use specific task endpoints like /run-generate-strategy instead.
    """
    try:
        agent_wrapper = PydanticAIAgentWrapper.get_agent_wrapper(agent_id=agent_id, session=session)
        
        # Validate and parse task_specific_input against the agent's specific input_schema
        try:
            # The PydanticAIAgentWrapper instance has input_schema type
            concrete_task_input = agent_wrapper.input_schema(**task_input_payload.task_specific_input)
        except PydanticValidationError as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid task input: {e.errors()}")
            
        result = await agent_wrapper.run(concrete_task_input, session=session)
        return result
    except ValueError as e: # Catches agent not found from get_agent_wrapper
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except NotImplementedError as e: # Catches agent type not having a wrapper or run method
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(e))
    except Exception as e:
        # Log the full error for debugging
        print(f"Unexpected error running agent task for agent {agent_id}: {type(e).__name__} - {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")

# The activate/deactivate endpoints were more about persistent state.
# With pydantic-ai, tasks are typically executed on demand.
# "Status" might reflect "Idle" (ready for tasks) or "Busy" (if a long task is running, though FastAPI is async).
# For simplicity, we remove activate/deactivate as direct process controls.
# Agent status in DB (Running/Idle/Error/Stopped) will be managed by tasks or manual updates.

@router.post("/{agent_id}/set-status", response_model=schemas.AgentRead)
def set_agent_status_endpoint(
    agent_id: int,
    status_in: schemas.AgentStatusUpdate, # New schema for this
    session: Session = Depends(get_session)
):
    """
    Manually set the status of an agent (e.g., to Idle or Stopped).
    """
    db_agent = crud.get_agent(session=session, agent_id=agent_id)
    if not db_agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    # Convert string status from AgentStatusUpdate to AgentStatusEnum
    try:
        new_status_enum = models.AgentStatusEnum(status_in.status)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status value provided.")

    db_agent.status = new_status_enum
    session.add(db_agent)
    session.commit()
    session.refresh(db_agent)
    
    try:
        parsed_config = schemas.parse_agent_config(db_agent.type.value, db_agent.config or {})
        agent_dict = db_agent.model_dump(exclude={'config'})
        agent_dict['type'] = db_agent.type.value
        return schemas.AgentRead(**agent_dict, config=parsed_config)
    except PydanticValidationError:
        agent_dict_fallback = db_agent.model_dump(exclude={'config'})
        agent_dict_fallback['type'] = db_agent.type.value
        return schemas.AgentRead(**agent_dict_fallback, config=schemas.BaseAgentConfig())

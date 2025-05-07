# backend/api/agents.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlmodel import Session
from typing import List, Any, Dict
from pydantic import ValidationError as PydanticValidationError, BaseModel

from backend import crud, schemas, models
from backend.database import get_session
# Import both implementations to support gradual migration
from backend.ai_agents.base_agent import PydanticAIAgent, AgentTaskInput, AgentTaskOutput
from backend.ai_agents.base_agent_simplified import SimplifiedAgent
from backend.ai_agents.strategy_coding_agent import GenerateStrategyInput # Specific input

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
        # CRUD should handle config parsing during creation if agent_in.config is a dict
        agent = crud.create_agent(session=session, agent_in=agent_in)
        
        # crud.create_agent returns a models.Agent instance.
        # For the response, we need schemas.AgentRead which expects a parsed config.
        # The agent.config from DB is likely a dict.
        parsed_config_for_response = schemas.BaseAgentConfig() # Default
        if agent.config: # agent.config is Dict[str, Any] from models.Agent
            try:
                parsed_config_for_response = schemas.parse_agent_config(agent.type.value, agent.config)
            except PydanticValidationError as e_parse:
                # Log or handle parsing error for response, but agent is already created
                print(f"Warning: Config parsing failed for response model of new agent {agent.name}: {e_parse}")
        
        agent_dict = agent.model_dump(exclude={'config'})
        agent_dict['type'] = agent.type.value # Ensure enum value for response
        return schemas.AgentRead(**agent_dict, config=parsed_config_for_response)

    except ValueError as e: # Catches errors from crud.create_agent (e.g., config validation)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        # Log the full error for debugging
        print(f"Unexpected error creating agent: {type(e).__name__} - {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")


@router.get("/", response_model=List[schemas.AgentRead])
def read_all_agents(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
):
    db_agents = crud.get_agents(session=session, skip=skip, limit=limit)
    agents_out = []
    for agent_model in db_agents: # agent_model is models.Agent
        parsed_config = schemas.BaseAgentConfig() # Default
        if agent_model.config: # This is a dict from DB
            try:
                parsed_config = schemas.parse_agent_config(agent_model.type.value, agent_model.config)
            except PydanticValidationError:
                 # Fallback, log error
                print(f"Warning: Config parsing failed for agent {agent_model.name} in list view.")
        
        agent_dict = agent_model.model_dump(exclude={'config'})
        agent_dict['type'] = agent_model.type.value
        agents_out.append(schemas.AgentRead(**agent_dict, config=parsed_config))
    return agents_out


@router.get("/{agent_id}", response_model=schemas.AgentRead)
def read_single_agent(
    *,
    session: Session = Depends(get_session),
    agent_id: int,
):
    agent_model = crud.get_agent(session=session, agent_id=agent_id) # models.Agent
    if not agent_model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    
    parsed_config = schemas.BaseAgentConfig()
    if agent_model.config:
        try:
            parsed_config = schemas.parse_agent_config(agent_model.type.value, agent_model.config)
        except PydanticValidationError:
            print(f"Warning: Config parsing failed for agent {agent_model.name} in single view.")

    agent_dict = agent_model.model_dump(exclude={'config'})
    agent_dict['type'] = agent_model.type.value
    return schemas.AgentRead(**agent_dict, config=parsed_config)


@router.patch("/{agent_id}", response_model=schemas.AgentRead)
def update_existing_agent(
    *,
    session: Session = Depends(get_session),
    agent_id: int,
    agent_in: schemas.AgentUpdate, # agent_in.config is Optional[Dict[str, Any]]
):
    try:
        # crud.update_agent will handle parsing/validation of agent_in.config if provided
        updated_agent_model = crud.update_agent(session=session, agent_id=agent_id, agent_in=agent_in) # models.Agent
    except ValueError as e: # Catches errors from crud.update_agent (e.g., config validation)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    
    if not updated_agent_model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    
    parsed_config_for_response = schemas.BaseAgentConfig()
    if updated_agent_model.config: # This is a dict from DB after update
        try:
            parsed_config_for_response = schemas.parse_agent_config(updated_agent_model.type.value, updated_agent_model.config)
        except PydanticValidationError:
             print(f"Warning: Config parsing failed for response model of updated agent {updated_agent_model.name}.")
    
    agent_dict = updated_agent_model.model_dump(exclude={'config'})
    agent_dict['type'] = updated_agent_model.type.value
    return schemas.AgentRead(**agent_dict, config=parsed_config_for_response)


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
        
    deleted = crud.delete_agent(session=session, agent_id=agent_id) # crud.delete_agent handles isDefault check too
    if not deleted:
        # This might occur if delete_agent returns False due to isDefault or other reasons
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found or deletion failed (e.g., default agent).")
    return None


# --- Agent Task Execution Endpoints ---

@router.post("/{agent_id}/run-generate-strategy", response_model=AgentTaskOutput) # Keep AgentTaskOutput as generic base for now
async def run_generate_strategy_task(
    agent_id: int,
    task_input: GenerateStrategyInput, # Specific input type for this task
    session: Session = Depends(get_session),
):
    """
    Execute the 'generate strategy' task for a Strategy Coding Agent using pydantic-ai.
    """
    try:
        # PydanticAIAgent.get_agent_instance returns a specific agent instance like StrategyCodingAIAgent
        # Try to use the simplified agent first
        try:
            agent_instance = SimplifiedAgent.get_agent_instance(agent_id=agent_id, session=session)
        except (ImportError, NotImplementedError):
            # Fall back to PydanticAIAgent if simplified version fails
            agent_instance = PydanticAIAgent.get_agent_instance(agent_id=agent_id, session=session)
        
        if agent_instance.agent_model.type != models.AgentTypeEnum.STRATEGY_CODING:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agent is not a Strategy Coding Agent or type mismatch.")
        
        # agent_instance is now the specific agent type, e.g., StrategyCodingAIAgent
        # Its `run` method expects `GenerateStrategyInput` if it's a StrategyCodingAIAgent.
        # FastAPI handles request body validation against `GenerateStrategyInput`.
        result = await agent_instance.run(task_input, session=session) # Pass task_input directly
        return result
    except ValueError as e: # Catches agent not found, config errors from factory/constructor
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except NotImplementedError as e: # Catches agent type not having implementation or LLM client issues
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(e))
    except ConnectionError as e: # Specific error for LLM client issues
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        print(f"Unexpected error running agent task for agent {agent_id}: {type(e).__name__} - {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")


class GenericTaskInputWrapper(BaseModel):
    task_specific_input: Dict[str, Any] = Field(description="The actual input data for the agent's task.")

@router.post("/{agent_id}/run-task", response_model=AgentTaskOutput, deprecated=True)
async def run_generic_agent_task( # Renamed to avoid conflict
    agent_id: int,
    task_input_payload: GenericTaskInputWrapper = Body(...),
    session: Session = Depends(get_session),
):
    """
    DEPRECATED: Execute a generic task. Use specific task endpoints like /run-generate-strategy.
    """
    try:
        # Try to use the simplified agent first
        try:
            agent_instance = SimplifiedAgent.get_agent_instance(agent_id=agent_id, session=session)
        except (ImportError, NotImplementedError):
            # Fall back to PydanticAIAgent if simplified version fails
            agent_instance = PydanticAIAgent.get_agent_instance(agent_id=agent_id, session=session)
        
        # Validate and parse task_specific_input against the agent's specific input_schema
        try:
            concrete_task_input = agent_instance.input_schema(**task_input_payload.task_specific_input)
        except PydanticValidationError as e_val:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid task input: {e_val.errors()}")
            
        result = await agent_instance.run(concrete_task_input, session=session)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except NotImplementedError as e:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        print(f"Unexpected error running generic agent task for agent {agent_id}: {type(e).__name__} - {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")


@router.post("/{agent_id}/set-status", response_model=schemas.AgentRead)
def set_agent_status_endpoint(
    agent_id: int,
    status_in: schemas.AgentStatusUpdate,
    session: Session = Depends(get_session)
):
    db_agent_model = crud.get_agent(session=session, agent_id=agent_id)
    if not db_agent_model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    try:
        new_status_enum = models.AgentStatusEnum(status_in.status.value) # status_in.status is AgentStatusEnumSchema
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status value provided.")

    db_agent_model.status = new_status_enum
    session.add(db_agent_model)
    session.commit()
    session.refresh(db_agent_model)
    
    parsed_config_for_response = schemas.BaseAgentConfig()
    if db_agent_model.config:
        try:
            parsed_config_for_response = schemas.parse_agent_config(db_agent_model.type.value, db_agent_model.config)
        except PydanticValidationError:
            print(f"Warning: Config parsing failed for response after status update for agent {db_agent_model.name}.")

    agent_dict = db_agent_model.model_dump(exclude={'config'})
    agent_dict['type'] = db_agent_model.type.value
    return schemas.AgentRead(**agent_dict, config=parsed_config_for_response)

# backend/ai_agents/base_agent.py
from pydantic import BaseModel, Field
from typing import Generic, TypeVar, Type, Dict, Any, Optional, List
from sqlmodel import Session
from pydantic_ai import Instructor
from pydantic_ai.llm import LLM # For type hinting
from pydantic_ai.mode import Mode

from backend import schemas, models
from backend.ai_agents.llm_clients import get_llm_client
from backend.ai_agents.tools import get_enabled_tools_for_instructor, AVAILABLE_TOOLS_MAP

InputSchema = TypeVar('InputSchema', bound='AgentTaskInput')
OutputSchema = TypeVar('OutputSchema', bound='AgentTaskOutput')

class AgentTaskInput(BaseModel):
    """Base class for inputs to an agent task."""
    pass

class AgentTaskOutput(BaseModel):
    """Base class for outputs from an agent task."""
    success: bool
    message: Optional[str] = None
    error_details: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class PydanticAIAgent(Generic[InputSchema, OutputSchema]):
    """
    Base class for agents using the pydantic-ai framework.
    """
    agent_model: models.Agent
    config: schemas.AgentConfigUnion # Parsed config object
    input_schema: Type[InputSchema]
    output_schema: Type[OutputSchema]
    
    llm_client: LLM
    instructor: Instructor

    def __init__(self, agent_model: models.Agent, session: Session):
        if not agent_model.config:
            raise ValueError(f"Agent {agent_model.name} is missing configuration.")
        
        self.agent_model = agent_model
        try:
            # Config should already be parsed into a Pydantic model by the API layer or CRUD
            if isinstance(agent_model.config, dict): # If it's still a dict, parse it
                 self.config = schemas.parse_agent_config(agent_model.type.value, agent_model.config)
            elif isinstance(agent_model.config, schemas.AgentConfigUnion):
                 self.config = agent_model.config
            else:
                # This case implies that agent_model.config is already a parsed Pydantic model.
                # However, the type hint for agent_model.config in models.Agent is Dict[str, Any].
                # So, direct assignment without prior parsing might be unsafe if API layer doesn't handle it.
                # For safety, let's re-parse if it's not the expected union type.
                 self.config = schemas.parse_agent_config(agent_model.type.value, dict(agent_model.config) if hasattr(agent_model.config, 'model_dump') else agent_model.config)

        except Exception as e:
            raise ValueError(f"Failed to parse or assign configuration for agent {agent_model.name}: {e}")

        if not hasattr(self, 'input_schema') or not hasattr(self, 'output_schema'):
            raise NotImplementedError("Subclasses must define input_schema and output_schema.")

        # Initialize LLM client for pydantic-ai
        llm_provider_id: Optional[str] = getattr(self.config, 'llmModelProviderId', None)
        llm_model_name: Optional[str] = getattr(self.config, 'llmModelName', None)
        
        try:
            self.llm_client = get_llm_client(llm_provider_id, llm_model_name)
        except (ValueError, NotImplementedError) as e:
            self.log_message(f"Failed to initialize LLM client: {e}", level="error")
            # Depending on policy, either raise or allow agent to initialize without LLM
            raise ConnectionError(f"Could not initialize LLM for agent {self.agent_model.name}: {e}") from e
            
        # Initialize Instructor with enabled tools
        enabled_tool_names: List[schemas.ToolNameEnum] = getattr(self.config, 'enabledTools', [])
        
        # Check if any tool_name in enabled_tool_names is not an instance of ToolNameEnum
        # This can happen if the config was loaded from DB as simple strings
        parsed_enabled_tool_names = []
        for tool_name_val in enabled_tool_names:
            if isinstance(tool_name_val, schemas.ToolNameEnum):
                parsed_enabled_tool_names.append(tool_name_val)
            elif isinstance(tool_name_val, str):
                try:
                    parsed_enabled_tool_names.append(schemas.ToolNameEnum(tool_name_val))
                except ValueError:
                    self.log_message(f"Unknown tool name '{tool_name_val}' in config, skipping.", level="warn")
            else:
                self.log_message(f"Invalid tool entry '{tool_name_val}' in config, skipping.", level="warn")


        pydantic_ai_tools = get_enabled_tools_for_instructor(parsed_enabled_tool_names)
        
        self.instructor = Instructor(
            client=self.llm_client, 
            mode=Mode.TOOLS if pydantic_ai_tools else Mode.FUNCTIONS, # Use TOOLS if tools are present
            tools=pydantic_ai_tools,
            # TODO: Add chat_engine, retry options from config if needed
        )
        self.log_message(f"PydanticAIAgent initialized for {self.agent_model.name} with {len(pydantic_ai_tools)} tools.")


    async def run(self, task_input: InputSchema, session: Session) -> OutputSchema:
        """
        Main method to execute the agent's primary task.
        Subclasses MUST override this to define the interaction with the LLM
        using self.instructor.
        """
        raise NotImplementedError("The 'run' method must be implemented by subclasses.")

    def _update_agent_stats(self, success: bool, session: Session):
        """Helper to update agent's tasksCompleted or errors count."""
        # Ensure agent_model is loaded in the current session if it's not already
        # This is a common pattern if the agent_model was passed from a different session context.
        # However, if session management is handled carefully, this might not be strictly necessary.
        # For now, assuming session handling is correct upstream or agent_model is session-agnostic for this update.
        
        # Fetch the agent from the provided session to ensure it's attached
        db_agent = session.get(models.Agent, self.agent_model.id)
        if not db_agent:
            self.log_message(f"Agent {self.agent_model.id} not found in current session for stat update.", "error")
            return

        if success:
            db_agent.tasksCompleted = (db_agent.tasksCompleted or 0) + 1
        else:
            db_agent.errors = (db_agent.errors or 0) + 1
        
        session.add(db_agent)
        session.commit()
        session.refresh(db_agent)
        # Update the instance's agent_model to reflect DB changes, especially if it's used later.
        self.agent_model.tasksCompleted = db_agent.tasksCompleted
        self.agent_model.errors = db_agent.errors


    def log_message(self, message: str, level: str = "info"):
        print(f"[{level.upper()}] Agent {self.agent_model.name}: {message}")

    @classmethod
    def get_agent_instance(cls, agent_id: int, session: Session) -> 'PydanticAIAgent':
        """Factory method to get a specific agent instance by ID."""
        db_agent = session.get(models.Agent, agent_id) # Use session.get for direct PK lookup
        if not db_agent:
            raise ValueError(f"Agent with ID {agent_id} not found.")

        # Ensure config is parsed before passing to agent constructor
        # The API layer or CRUD should ideally handle this.
        # If db_agent.config is a dict, it needs to be parsed.
        if isinstance(db_agent.config, dict):
            try:
                parsed_config = schemas.parse_agent_config(db_agent.type.value, db_agent.config)
                # We can't directly assign back to db_agent.config if it's just a dict from DB
                # Instead, the PydanticAIAgent constructor will handle the parsed_config.
                # For this factory, we pass the original db_agent.
            except Exception as e:
                 raise ValueError(f"Failed to parse config for agent {db_agent.name} in factory: {e}")
        
        # Now db_agent is passed, and the PydanticAIAgent constructor handles config parsing/assignment.

        if db_agent.type == models.AgentTypeEnum.STRATEGY_CODING:
            from .strategy_coding_agent import StrategyCodingAIAgent
            return StrategyCodingAIAgent(agent_model=db_agent, session=session)
        # elif db_agent.type == models.AgentTypeEnum.EXECUTION:
        #     from .execution_agent import ExecutionAIAgent
        #     return ExecutionAIAgent(agent_model=db_agent, session=session)
        # Add other agent types here
        else:
            raise NotImplementedError(f"Agent type {db_agent.type.value} does not have a PydanticAIAgent implementation.")

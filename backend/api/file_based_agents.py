"""
API endpoints for file-based agents.
This module provides endpoints to read agent information from Python files in the ai_agents directory.
"""
from fastapi import APIRouter, HTTPException, status
import os
import importlib.util
import inspect
import sys
from typing import List, Dict, Any, Optional
import json

# Create a router for the file-based agents API
router = APIRouter(
    prefix="/file-agents",
    tags=["file-agents"],
    responses={404: {"description": "Not found"}},
)

# Path to the ai_agents directory
AGENTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ai_agents")

# Agent response model
class AgentInfo:
    def __init__(self, id: str, name: str, type: str, description: str, 
                 status: str = "Idle", file_path: str = "", 
                 config: Optional[Dict[str, Any]] = None):
        self.id = id
        self.name = name
        self.type = type
        self.description = description
        self.status = status
        self.file_path = file_path
        self.config = config or {}
        self.tasks_completed = 0
        self.errors = 0
        self.is_default = True
        self.associated_strategy_ids = []

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "description": self.description,
            "status": self.status,
            "tasksCompleted": self.tasks_completed,
            "errors": self.errors,
            "isDefault": self.is_default,
            "associatedStrategyIds": self.associated_strategy_ids,
            "config": self.config
        }

def get_agent_info_from_file(file_path: str) -> Optional[AgentInfo]:
    """
    Extract agent information from a Python file without importing it.
    This method reads the file content directly to avoid import errors.
    """
    try:
        # Get the file name without extension
        file_name = os.path.basename(file_path)
        module_name = os.path.splitext(file_name)[0]
        
        # Skip __init__.py and other non-agent files
        if module_name.startswith("__") or module_name in ["base_agent", "base_agent_simplified",
                                                          "llm_clients", "llm_clients_simplified", "tools"]:
            return None
        
        # Extract agent type from the file name
        agent_type = module_name.replace("_agent", "").title()
        if "_" in agent_type:
            agent_type = " ".join(word.title() for word in agent_type.split("_"))
        agent_type += " Agent"
        
        # Read the file content
        with open(file_path, 'r') as file:
            content = file.read()
        
        # Extract description from the file content
        description = f"{agent_type} for automated trading"
        
        # Look for a class docstring
        import re
        class_match = re.search(r'class\s+\w+.*?:\s*?"""(.*?)"""', content, re.DOTALL)
        if class_match:
            doc = class_match.group(1).strip()
            if doc:
                description = doc.split("\n")[0]  # Get the first line of the docstring
        
        # Create an agent info object
        agent_id = f"agent-{module_name}"
        agent_name = agent_type
        
        # Try to extract config from the file content
        config = {}
        config_match = re.search(r'default_config\s*=\s*({.*?})', content, re.DOTALL)
        if config_match:
            # This is a simplified approach - in a real implementation, you might want to use ast
            # to properly parse the Python code
            config_str = config_match.group(1)
            # Convert to a safer format for evaluation
            config_str = config_str.replace("'", '"')
            try:
                import json
                config = json.loads(config_str)
            except:
                # If JSON parsing fails, use a default config
                config = {
                    "logLevel": "info",
                    "enabledTools": ["MarketDataFetcher", "WebSearcher"],
                    "llmModelName": "gemini-2.0-flash"
                }
        
        return AgentInfo(
            id=agent_id,
            name=agent_name,
            type=agent_type,
            description=description,
            file_path=file_path,
            config=config
        )
    except Exception as e:
        print(f"Error extracting agent info from {file_path}: {e}")
        # Even if there's an error, return a basic agent info object
        # so that the agent appears in the UI
        agent_type = os.path.basename(file_path).replace(".py", "").replace("_agent", "").title()
        if "_" in agent_type:
            agent_type = " ".join(word.title() for word in agent_type.split("_"))
        agent_type += " Agent"
        
        return AgentInfo(
            id=f"agent-{os.path.basename(file_path).replace('.py', '')}",
            name=agent_type,
            type=agent_type,
            description=f"{agent_type} for automated trading",
            file_path=file_path,
            config={"logLevel": "info"}
        )

def get_all_agents() -> List[Dict[str, Any]]:
    """
    Get information about all agents in the ai_agents directory.
    """
    agents = []
    
    # Get all Python files in the ai_agents directory
    for file_name in os.listdir(AGENTS_DIR):
        if file_name.endswith(".py"):
            file_path = os.path.join(AGENTS_DIR, file_name)
            agent_info = get_agent_info_from_file(file_path)
            if agent_info:
                agents.append(agent_info.to_dict())
    
    return agents

def get_agent_by_id(agent_id: str) -> Optional[Dict[str, Any]]:
    """
    Get information about a specific agent by ID.
    """
    for file_name in os.listdir(AGENTS_DIR):
        if file_name.endswith(".py"):
            file_path = os.path.join(AGENTS_DIR, file_name)
            agent_info = get_agent_info_from_file(file_path)
            if agent_info and agent_info.id == agent_id:
                return agent_info.to_dict()
    
    return None

@router.get("/")
async def list_agents():
    """
    List all available agents from the ai_agents directory.
    """
    return get_all_agents()

@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    """
    Get information about a specific agent by ID.
    """
    agent = get_agent_by_id(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    return agent

@router.get("/{agent_id}/config")
async def get_agent_config(agent_id: str):
    """
    Get the configuration for a specific agent.
    """
    agent = get_agent_by_id(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    return agent.get("config", {})
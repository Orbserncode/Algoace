"""
API endpoints for file-based strategies.
This module provides endpoints to read strategy information from Python files in the strategies directory.
"""
from fastapi import APIRouter, HTTPException, status
import os
import importlib.util
import inspect
import sys
from typing import List, Dict, Any, Optional
import json
import ast

# Create a router for the file-based strategies API
router = APIRouter(
    prefix="/file-strategies",
    tags=["file-strategies"],
    responses={404: {"description": "Not found"}},
)

# Path to the strategies directory
STRATEGIES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "strategies")

# Strategy response model
class StrategyInfo:
    def __init__(self, id: str, name: str, description: str, 
                 status: str = "Active", file_path: str = "", 
                 source: str = "Uploaded", pnl: float = 0.0, win_rate: float = 0.0):
        self.id = id
        self.name = name
        self.description = description
        self.status = status
        self.file_path = file_path
        self.source = source
        self.pnl = pnl
        self.win_rate = win_rate
        self.file_name = os.path.basename(file_path) if file_path else ""

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "source": self.source,
            "pnl": self.pnl,
            "win_rate": self.win_rate,
            "file_name": self.file_name
        }

def extract_class_from_file(file_path: str) -> Optional[dict]:
    """
    Extract the main strategy class from a Python file using regex.
    """
    try:
        with open(file_path, 'r') as file:
            content = file.read()
        
        # Use regex to find class definitions
        import re
        class_match = re.search(r'class\s+(\w+).*?(?:Strategy|strategy).*?:', content)
        if class_match:
            class_name = class_match.group(1)
            
            # Try to find the docstring
            docstring_match = re.search(r'class\s+' + class_name + r'.*?:\s*?"""(.*?)"""', content, re.DOTALL)
            docstring = ""
            if docstring_match:
                docstring = docstring_match.group(1).strip()
            
            return {
                "name": class_name,
                "docstring": docstring
            }
        
        return None
    except Exception as e:
        print(f"Error parsing file {file_path}: {e}")
        return None

def get_strategy_info_from_file(file_path: str) -> Optional[StrategyInfo]:
    """
    Extract strategy information from a Python file without importing it.
    This method reads the file content directly to avoid import errors.
    """
    try:
        # Get the file name without extension
        file_name = os.path.basename(file_path)
        module_name = os.path.splitext(file_name)[0]
        
        # Extract strategy name from the file name
        strategy_name = module_name.replace("_", " ").title()
        
        # Try to extract class information using regex
        class_info = extract_class_from_file(file_path)
        if class_info:
            strategy_name = class_info["name"]
            description = class_info["docstring"]
            if not description:
                # Look for a comment that might describe the strategy
                with open(file_path, 'r') as file:
                    content = file.read()
                
                # Look for a comment that might describe the strategy
                lines = content.split('\n')
                description = ""
                for line in lines:
                    if line.strip().startswith('#') and len(line) > 2:
                        description = line.strip()[1:].strip()
                        break
                
                if not description:
                    description = f"{strategy_name} trading strategy"
        else:
            # If we couldn't find a class, use the file name and look for comments
            with open(file_path, 'r') as file:
                content = file.read()
            
            # Look for a comment that might describe the strategy
            lines = content.split('\n')
            description = ""
            for line in lines:
                if line.strip().startswith('#') and len(line) > 2:
                    description = line.strip()[1:].strip()
                    break
            
            if not description:
                description = f"{strategy_name} trading strategy"
        
        # Create a strategy info object
        strategy_id = f"strat-{module_name}"
        
        return StrategyInfo(
            id=strategy_id,
            name=strategy_name,
            description=description,
            file_path=file_path
        )
    except Exception as e:
        print(f"Error extracting strategy info from {file_path}: {e}")
        # Even if there's an error, return a basic strategy info object
        # so that the strategy appears in the UI
        strategy_name = os.path.basename(file_path).replace(".py", "").replace("_", " ").title()
        
        return StrategyInfo(
            id=f"strat-{os.path.basename(file_path).replace('.py', '')}",
            name=strategy_name,
            description=f"{strategy_name} trading strategy",
            file_path=file_path
        )

def get_all_strategies() -> List[Dict[str, Any]]:
    """
    Get information about all strategies in the strategies directory.
    """
    strategies = []
    
    try:
        # Check if the strategies directory exists
        if not os.path.exists(STRATEGIES_DIR):
            print(f"Warning: Strategies directory {STRATEGIES_DIR} does not exist")
            return strategies
            
        # Get all Python files in the strategies directory
        for file_name in os.listdir(STRATEGIES_DIR):
            try:
                if file_name.endswith(".py"):
                    file_path = os.path.join(STRATEGIES_DIR, file_name)
                    strategy_info = get_strategy_info_from_file(file_path)
                    if strategy_info:
                        strategies.append(strategy_info.to_dict())
            except Exception as e:
                print(f"Error processing strategy file {file_name}: {str(e)}")
                # Continue with other files
                continue
    except Exception as e:
        print(f"Error getting strategies: {str(e)}")
        # Return empty list in case of error
        return []
    
    return strategies

def get_strategy_by_id(strategy_id: str) -> Optional[Dict[str, Any]]:
    """
    Get information about a specific strategy by ID.
    """
    for file_name in os.listdir(STRATEGIES_DIR):
        if file_name.endswith(".py"):
            file_path = os.path.join(STRATEGIES_DIR, file_name)
            strategy_info = get_strategy_info_from_file(file_path)
            if strategy_info and strategy_info.id == strategy_id:
                return strategy_info.to_dict()
    
    return None

def get_strategy_code(strategy_id: str) -> Optional[str]:
    """
    Get the code for a specific strategy.
    """
    for file_name in os.listdir(STRATEGIES_DIR):
        if file_name.endswith(".py"):
            file_path = os.path.join(STRATEGIES_DIR, file_name)
            strategy_info = get_strategy_info_from_file(file_path)
            if strategy_info and strategy_info.id == strategy_id:
                with open(file_path, 'r') as file:
                    return file.read()
    
    return None

@router.get("/")
async def list_strategies(include_archived: bool = False):
    """
    List all available strategies from the strategies directory.
    """
    try:
        strategies = get_all_strategies()
        
        # Add default strategies if none found
        if not strategies:
            print("No strategies found, adding default placeholder strategies")
            strategies = [
                {
                    "id": "strat-bollinger_breakout",
                    "name": "Bollinger Breakout Strategy",
                    "description": "A strategy that trades breakouts from Bollinger Bands",
                    "status": "Active",
                    "source": "Default",
                    "pnl": 0.0,
                    "win_rate": 0.0,
                    "file_name": "bollinger_breakout.py"
                },
                {
                    "id": "strat-ema_cross",
                    "name": "EMA Cross Strategy",
                    "description": "A strategy that trades crossovers of exponential moving averages",
                    "status": "Active",
                    "source": "Default",
                    "pnl": 0.0,
                    "win_rate": 0.0,
                    "file_name": "ema_cross_strategy.py"
                }
            ]
            
        if not include_archived:
            strategies = [s for s in strategies if s.get("status") != "Archived"]
            
        return strategies
    except Exception as e:
        print(f"Error in list_strategies endpoint: {str(e)}")
        # Return empty list in case of error
        return []

@router.get("/{strategy_id}")
async def get_strategy(strategy_id: str):
    """
    Get information about a specific strategy by ID.
    """
    strategy = get_strategy_by_id(strategy_id)
    if strategy is None:
        raise HTTPException(status_code=404, detail=f"Strategy {strategy_id} not found")
    return strategy

@router.get("/{strategy_id}/code")
async def get_strategy_code_endpoint(strategy_id: str):
    """
    Get the code for a specific strategy.
    """
    code = get_strategy_code(strategy_id)
    if code is None:
        raise HTTPException(status_code=404, detail=f"Strategy {strategy_id} not found")
    return {"code": code}
"""
Configuration loader for AlgoAce Trader.
Loads configuration from YAML file and environment variables.
"""
import os
import yaml
import re
from typing import Dict, Any, Optional
import logfire

# Default configuration file path
DEFAULT_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.yaml")

def _resolve_env_vars(value: str) -> str:
    """
    Resolve environment variables in a string.
    
    Args:
        value: String that may contain environment variable references like ${VAR_NAME}
        
    Returns:
        String with environment variables resolved
    """
    if not isinstance(value, str):
        return value
        
    pattern = r'\${([A-Za-z0-9_]+)}'
    matches = re.findall(pattern, value)
    
    for match in matches:
        env_value = os.getenv(match)
        if env_value is None:
            logfire.warning(f"Environment variable {match} not found")
            # Keep the original reference if env var not found
            continue
        
        value = value.replace(f"${{{match}}}", env_value)
    
    return value

def _process_config_values(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process configuration values recursively, resolving environment variables.
    
    Args:
        config: Configuration dictionary
        
    Returns:
        Processed configuration dictionary
    """
    result = {}
    
    for key, value in config.items():
        if isinstance(value, dict):
            result[key] = _process_config_values(value)
        elif isinstance(value, list):
            result[key] = [
                _process_config_values(item) if isinstance(item, dict) else 
                _resolve_env_vars(item) if isinstance(item, str) else 
                item 
                for item in value
            ]
        elif isinstance(value, str):
            result[key] = _resolve_env_vars(value)
        else:
            result[key] = value
    
    return result

def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Load configuration from YAML file and resolve environment variables.
    
    Args:
        config_path: Path to configuration file (defaults to config.yaml in same directory)
        
    Returns:
        Loaded and processed configuration dictionary
        
    Raises:
        FileNotFoundError: If configuration file not found
        yaml.YAMLError: If configuration file is invalid YAML
    """
    config_path = config_path or DEFAULT_CONFIG_PATH
    
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
    except yaml.YAMLError as e:
        logfire.error(f"Error parsing configuration file: {e}")
        raise
    
    # Process configuration values
    processed_config = _process_config_values(config)
    
    # Override with environment variables if they exist
    # For example, ALGOACE_GLOBAL_LOG_LEVEL would override global.log_level
    for env_name, env_value in os.environ.items():
        if env_name.startswith("ALGOACE_"):
            # Remove prefix and split by underscore
            parts = env_name[8:].lower().split("_")
            
            # Navigate to the right place in the config
            current = processed_config
            for i, part in enumerate(parts):
                if i == len(parts) - 1:
                    # Last part is the key to set
                    current[part] = env_value
                else:
                    # Create nested dictionaries if they don't exist
                    if part not in current or not isinstance(current[part], dict):
                        current[part] = {}
                    current = current[part]
    
    return processed_config

def get_agent_config(config: Dict[str, Any], agent_type: str) -> Dict[str, Any]:
    """
    Get configuration for a specific agent type.
    
    Args:
        config: Full configuration dictionary
        agent_type: Agent type (e.g., "research", "portfolio", "risk", "execution")
        
    Returns:
        Agent configuration dictionary
        
    Raises:
        KeyError: If agent type not found in configuration
    """
    if "agents" not in config or agent_type not in config["agents"]:
        raise KeyError(f"Agent type {agent_type} not found in configuration")
    
    agent_config = config["agents"][agent_type]
    
    # Add global defaults if not specified in agent config
    if "llm_provider" not in agent_config and "global" in config and "default_llm_provider" in config["global"]:
        agent_config["llm_provider"] = config["global"]["default_llm_provider"]
    
    if "llm_model" not in agent_config and "global" in config and "default_llm_model" in config["global"]:
        agent_config["llm_model"] = config["global"]["default_llm_model"]
    
    return agent_config

def get_broker_config(config: Dict[str, Any], broker_id: str) -> Dict[str, Any]:
    """
    Get configuration for a specific broker.
    
    Args:
        config: Full configuration dictionary
        broker_id: Broker ID (e.g., "alpaca", "interactive_brokers", "paper")
        
    Returns:
        Broker configuration dictionary
        
    Raises:
        KeyError: If broker ID not found in configuration
    """
    if "brokers" not in config or broker_id not in config["brokers"]:
        raise KeyError(f"Broker {broker_id} not found in configuration")
    
    return config["brokers"][broker_id]

def get_api_key(config: Dict[str, Any], key_name: str) -> Optional[str]:
    """
    Get API key from configuration.
    
    Args:
        config: Full configuration dictionary
        key_name: API key name (e.g., "openai", "groq", "serp")
        
    Returns:
        API key or None if not found
    """
    if "api_keys" not in config or key_name not in config["api_keys"]:
        return None
    
    return config["api_keys"][key_name]

# Example usage
if __name__ == "__main__":
    try:
        config = load_config()
        print("Configuration loaded successfully")
        
        # Print some configuration values
        print(f"Default broker: {config.get('global', {}).get('default_broker')}")
        print(f"Log level: {config.get('global', {}).get('log_level')}")
        
        # Get agent configuration
        research_config = get_agent_config(config, "research")
        print(f"Research agent enabled: {research_config.get('enabled')}")
        print(f"Research agent LLM provider: {research_config.get('llm_provider')}")
        
        # Get broker configuration
        alpaca_config = get_broker_config(config, "alpaca")
        print(f"Alpaca paper trading: {alpaca_config.get('paper')}")
        
    except Exception as e:
        print(f"Error loading configuration: {e}")
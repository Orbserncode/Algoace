"""
LLM client implementations for various providers.
Supports OpenAI, Groq, and local models.
"""
import os
from typing import Optional, Dict, Any, Literal
from pydantic_ai.llm import LLM
from pydantic_ai.llm.openai import OpenAILLM
from pydantic_ai.llm.groq import GroqLLM
import logfire

# Define supported LLM providers
LLMProviderType = Literal["openai", "groq", "local"]

# Default models for each provider
DEFAULT_MODELS = {
    "openai": "gpt-4o",
    "groq": "llama3-70b-8192",
    "local": "local-model"  # This would be replaced with actual local model name
}

def get_llm_client(provider_id: Optional[str] = None, model_name: Optional[str] = None) -> LLM:
    """
    Get an LLM client based on the provider ID and model name.
    Falls back to environment variables if not provided.
    
    Args:
        provider_id: The LLM provider ID (openai, groq, local)
        model_name: The specific model name to use
        
    Returns:
        An initialized LLM client
        
    Raises:
        ValueError: If the provider is not supported or credentials are missing
    """
    # Default to environment variables if not provided
    provider_id = provider_id or os.getenv("DEFAULT_LLM_PROVIDER", "groq")
    
    # Normalize provider ID
    provider_id = provider_id.lower()
    
    # Validate provider
    if provider_id not in ["openai", "groq", "local"]:
        raise ValueError(f"Unsupported LLM provider: {provider_id}")
    
    # Use default model if not specified
    if not model_name:
        model_name = os.getenv(f"{provider_id.upper()}_MODEL", DEFAULT_MODELS[provider_id])
    
    logfire.info(f"Initializing LLM client", provider=provider_id, model=model_name)
    
    # Initialize the appropriate client
    if provider_id == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not found in environment variables")
        return OpenAILLM(model=model_name, api_key=api_key)
    
    elif provider_id == "groq":
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("Groq API key not found in environment variables")
        return GroqLLM(model=model_name, api_key=api_key)
    
    elif provider_id == "local":
        # This would be implemented with a local model client
        # For now, we'll use OpenAI as a fallback
        logfire.warning("Local model support not fully implemented, falling back to OpenAI")
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not found in environment variables")
        return OpenAILLM(model="gpt-3.5-turbo", api_key=api_key)
    
    # This should never happen due to the validation above
    raise ValueError(f"Unsupported LLM provider: {provider_id}")

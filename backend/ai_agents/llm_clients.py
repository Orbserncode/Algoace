# backend/ai_agents/llm_clients.py
import os
from pydantic_ai.llm import LLM, OpenAI, Gemini
from backend import schemas

def get_llm_client(
    provider_id: Optional[str], 
    model_name: Optional[str],
    api_key_override: Optional[str] = None # For specific agent key if ever needed
) -> LLM:
    """
    Instantiates an LLM client compatible with pydantic-ai based on provider ID and model name.
    Relies on environment variables for API keys (e.g., OPENAI_API_KEY, GOOGLE_API_KEY).
    """
    # Determine provider type from provider_id (e.g., 'llm-google-default', 'llm-openai-custom')
    # This is a simplified mapping. A more robust solution might involve fetching provider details.
    provider_type_str = "unknown"
    if provider_id:
        if "google" in provider_id.lower():
            provider_type_str = "google"
        elif "openai" in provider_id.lower():
            provider_type_str = "openai"
        # Add more mappings for Anthropic, Groq, local if specific pydantic-ai clients exist or are custom wrapped.

    actual_model_name = model_name

    if provider_type_str == "openai":
        api_key = api_key_override or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set for OpenAI provider.")
        if not actual_model_name:
            actual_model_name = "gpt-3.5-turbo" # Default OpenAI model
        return OpenAI(api_key=api_key, model=actual_model_name)
    
    elif provider_type_str == "google":
        api_key = api_key_override or os.getenv("GOOGLE_API_KEY") # google-generativeai uses GOOGLE_API_KEY
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set for Google Gemini provider.")
        if not actual_model_name:
            actual_model_name = "gemini-pro" # Default Gemini model
        # Ensure model name is in the format "models/gemini-pro" if using specific versions like "gemini-1.5-flash-latest"
        # pydantic-ai's Gemini client might handle this, or we might need to prepend "models/"
        # For gemini-pro, it's usually just "gemini-pro".
        # For newer models like gemini-1.5-flash, it might be 'gemini-1.5-flash-latest' or 'models/gemini-1.5-flash-latest'
        # Let's assume pydantic-ai's Gemini client handles it or the user provides the correct format.
        # If model_name includes "models/", use it directly. Otherwise, try with and without.
        # This is a simplification.
        
        # The pydantic-ai Gemini client expects model names like 'gemini-pro', 'gemini-1.5-flash-latest'
        # It does not prepend 'models/' itself.
        return Gemini(api_key=api_key, model=actual_model_name)
        
    # TODO: Add support for other providers like Anthropic, Groq, or local LLMs
    # For local LLMs, pydantic-ai might require a custom LLM wrapper if not directly supported.
    # Example for a generic local model (if pydantic-ai supported it directly or via a custom class):
    # elif provider_type_str == "local" and agent_config.apiUrl:
    #     return SomeLocalLLMClient(api_url=agent_config.apiUrl, model=actual_model_name)

    else:
        # Fallback or raise error if no suitable LLM client can be configured
        raise NotImplementedError(f"LLM provider type for '{provider_id}' is not supported or model_name is missing.")

from typing import Optional

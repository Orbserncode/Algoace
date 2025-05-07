# backend/ai_agents/llm_clients_simplified.py
from typing import Optional, Dict, Any

class SimplifiedLLM:
    """A simplified LLM client that doesn't rely on pydantic-ai."""
    
    def __init__(self, provider_id: Optional[str] = None, model_name: Optional[str] = None):
        self.provider_id = provider_id or "mock"
        self.model_name = model_name or "mock-model"
        print(f"Initialized SimplifiedLLM with provider={self.provider_id}, model={self.model_name}")
    
    async def generate(self, prompt: str) -> str:
        """Generate a response to the given prompt."""
        # This is a mock implementation
        return f"Mock response to: {prompt}"
    
    async def chat(self, messages: list) -> Dict[str, Any]:
        """Generate a response to the given chat messages."""
        # This is a mock implementation
        return {
            "content": "This is a mock chat response from the simplified LLM client.",
            "role": "assistant"
        }

def get_simplified_llm_client(provider_id: Optional[str] = None, model_name: Optional[str] = None) -> SimplifiedLLM:
    """Get a simplified LLM client instance."""
    return SimplifiedLLM(provider_id=provider_id, model_name=model_name)
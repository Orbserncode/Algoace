"""
Main entry point for the AlgoAce Trader application.
This file imports and runs the FastAPI app from the backend package.
"""
import sys
import os

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the FastAPI app from the backend package
from backend.main import app

# This file is used to run the application with uvicorn
# Example: uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
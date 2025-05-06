from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import create_db_and_tables, engine # Import engine for potential disconnect
from .api import strategies # Import the strategies router
from .api import agents as agents_router # Import the new agents router

# Define lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    print("FastAPI application starting up...")
    # Create database tables on startup (consider using Alembic migrations for production)
    # This might block startup if DB is slow, consider alternatives if needed
    try:
         create_db_and_tables()
         print("Database check/creation complete.")
    except Exception as e:
        # Log the error, but potentially allow startup to continue depending on severity
        print(f"CRITICAL: Database initialization failed during startup: {e}")
        # Depending on requirements, you might want to raise the error here
        # raise RuntimeError("Database initialization failed.") from e


    yield # Application runs here

    # --- Shutdown ---
    print("FastAPI application shutting down...")
    # Dispose of the database engine connection pool
    if engine:
        try:
            # For SQLAlchemy 2.0, engine.dispose() is synchronous
            engine.dispose() 
            print("Database engine disposed.")
        except Exception as e:
            print(f"Error disposing database engine: {e}")

# Create the FastAPI app instance with the lifespan manager
app = FastAPI(
    title="AlgoAce Trader API",
    description="Backend API for the multi-agent hedge fund trading platform.",
    version="0.1.0",
    lifespan=lifespan,
)

# --- CORS Middleware ---
# Allow requests from your Next.js frontend development server
# Adjust origins as needed for production environments
origins = [
    "http://localhost:9002", # Default Next.js dev port specified in package.json
    "http://localhost:3000", # Common alternative Next.js port
    # Add your production frontend URL here
    # "https://your-frontend-domain.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"], # Allows all headers
)

# --- Include API Routers ---
app.include_router(strategies.router)
app.include_router(agents_router.router) # Add agents router
# app.include_router(monitoring.router)
# app.include_router(cli.router)

# --- Root Endpoint ---
@app.get("/")
async def root():
    return {"message": "Welcome to the AlgoAce Trader API"}

# --- Run with Uvicorn (for local development) ---
# Use the command: uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
# The command is typically run from the project root directory.


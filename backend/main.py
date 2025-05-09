from fastapi import FastAPI, Depends, Body, Query, HTTPException
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import Session
from backend.database import get_session

from backend.database import create_db_and_tables, engine # Import engine for potential disconnect
from backend.api import strategies # Import the strategies router
from backend.api import agents as agents_router # Import the new agents router
from backend.api import strategy_configs # Import the strategy configs router
from backend.api import file_based_strategies # Import file-based strategies router
from backend.api import file_based_agents # Import file-based agents router
from backend.api import monitoring # Import monitoring router
from backend.api import datasets # Import datasets router
from backend.api import recommendations # Import recommendations router
from backend.api import backtesting # Import backtesting router
from backend.api import backtest_history # Import backtest history router
 
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
app.include_router(strategy_configs.router)
app.include_router(agents_router.router) # Add agents router
app.include_router(file_based_strategies.router) # Include file-based strategies router
app.include_router(file_based_agents.router) # Include file-based agents router
app.include_router(monitoring.router) # Include monitoring router
app.include_router(datasets.router) # Include datasets router
app.include_router(recommendations.router) # Include recommendations router
app.include_router(backtesting.router) # Include backtesting router

# --- Handlers for file-based endpoints ---
@app.get("/file-strategies")
async def handle_file_strategies(include_archived: bool = False):
    try:
        from backend.api.file_based_strategies import get_all_strategies
        strategies = get_all_strategies()
        
        # Filter out archived strategies if needed
        if not include_archived:
            strategies = [s for s in strategies if s["status"] != "Archived"]
            
        return strategies
    except Exception as e:
        # Log the error
        print(f"Error fetching strategies: {str(e)}")
        # Return an empty list instead of failing
        return []

@app.get("/file-agents")
async def handle_file_agents():
    from fastapi import Depends
    from backend.api.file_based_agents import get_all_agents
    return get_all_agents()

# --- API routes for backtesting ---
@app.post("/api/backtesting/run")
async def handle_backtesting_run(request: dict = Body(...), session: Session = Depends(get_session)):
    from backend.api.backtesting import run_backtest, BacktestRequest
    
    # Convert the request to the expected format
    backtest_request = BacktestRequest(**request)
    return await run_backtest(request=backtest_request, session=session)

@app.get("/api/backtesting/jobs/{job_id}/status")
async def handle_backtesting_job_status(job_id: str):
    from backend.api.backtesting import get_backtest_job_status
    return await get_backtest_job_status(job_id=job_id)
@app.get("/api/backtesting/results/{strategy_id}")
async def handle_backtesting_results(strategy_id: str, session: Session = Depends(get_session)):
    from backend.api.backtesting import get_backtest_results
    return await get_backtest_results(strategy_id=strategy_id, session=session)

# --- API routes for backtest history ---
@app.get("/api/backtest-history")
async def handle_backtest_history_list(
    strategy_id: Optional[str] = None,
    limit: int = Query(10, ge=1, le=100),
    session: Session = Depends(get_session)
):
    from backend.api.backtest_history import list_backtest_results
    return await list_backtest_results(strategy_id=strategy_id, limit=limit, session=session)

@app.get("/api/backtest-history/{backtest_id}")
async def handle_backtest_history_get(backtest_id: int, session: Session = Depends(get_session)):
    from backend.api.backtest_history import get_backtest_result_by_id
    return await get_backtest_result_by_id(backtest_id=backtest_id, session=session)

@app.delete("/api/backtest-history/{backtest_id}")
async def handle_backtest_history_delete(backtest_id: int, session: Session = Depends(get_session)):
    from backend.api.backtest_history import delete_backtest_result_by_id
    return await delete_backtest_result_by_id(backtest_id=backtest_id, session=session)

@app.delete("/api/backtest-history/strategy/{strategy_id}")
async def handle_backtest_history_delete_old(
    strategy_id: str,
    keep_count: int = Query(5, ge=1, le=100),
    session: Session = Depends(get_session)
):
    from backend.api.backtest_history import delete_old_results_for_strategy
    return await delete_old_results_for_strategy(strategy_id=strategy_id, keep_count=keep_count, session=session)

@app.post("/api/backtest-history/{backtest_id}/analyze")
async def handle_backtest_history_analyze(backtest_id: int, session: Session = Depends(get_session)):
    from backend.api.backtest_history import generate_ai_analysis
    return await generate_ai_analysis(backtest_id=backtest_id, session=session)

@app.get("/api/backtest-history/{backtest_id}/pdf")
async def handle_backtest_history_pdf(backtest_id: int, session: Session = Depends(get_session)):
    from backend.api.backtest_history import generate_pdf_report
    return await generate_pdf_report(backtest_id=backtest_id, session=session)
 
 
# --- Root Endpoint ---
@app.get("/")
async def root():
    return {"message": "Welcome to the AlgoAce Trader API"}

# --- Run with Uvicorn (for local development) ---
# Use the command: uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
# The command is typically run from the project root directory.


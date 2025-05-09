import os
from sqlmodel import create_engine, SQLModel, Session
from dotenv import load_dotenv

load_dotenv()

# Default to SQLite for development, but use PostgreSQL in production
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./algoace.db")

# Configure SQLAlchemy engine
if DATABASE_URL.startswith("sqlite"):
    # SQLite-specific configuration
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)
else:
    # PostgreSQL configuration
    engine = create_engine(
        DATABASE_URL,
        echo=True,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800
    )

def create_db_and_tables():
    # Import models here to avoid circular imports
    # This ensures models are only registered once during table creation
    from backend.models.dataset import Dataset, DatasetSubcategory, AgentRecommendation
    from backend.models.monitoring import PerformanceDataPoint, LogEntry, KeyMetrics, Trade
    from backend.models.strategy import Strategy
    from backend.models.agent import Agent
    from backend.models.strategy_config import StrategyConfig
    
    print("Creating database tables...")
    try:
        SQLModel.metadata.create_all(engine)
        print("Database tables created successfully.")
    except Exception as e:
        print(f"Error creating database tables: {e}")
        raise

def get_session():
    with Session(engine) as session:
        yield session

# Optional: Function to initialize DB, useful for first run or testing
if __name__ == "__main__":
    print(f"Initializing database at: {DATABASE_URL}")
    # In a real app, might use Alembic for migrations instead of create_all directly
    create_db_and_tables()
    print("Database initialization complete.")

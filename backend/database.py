import os
from sqlmodel import create_engine, SQLModel, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./algoace.db")
# Use connect_args for SQLite only to enable check_same_thread
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)

def create_db_and_tables():
    # Import models here to ensure they are registered with SQLModel metadata
    # Keep this import local to avoid circular dependencies at module level
    from . import models
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

import os
import sys
from datetime import datetime
from sqlmodel import Session, select

# Add the parent directory to the path so we can import from the backend package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import engine, get_session
from backend.models import Strategy

# Mock data from the frontend
mock_strategies = [
    {"id": "strat-001", "name": "EMA Cross", "description": "Simple EMA crossover strategy.", "status": "Active", "pnl": 1250.75, "win_rate": 65.2, "source": "Uploaded", "file_name": "ema_cross_strategy.py"},
    {"id": "strat-002", "name": "RSI Mean Reversion", "description": "Trades RSI extremes.", "status": "Inactive", "pnl": -340.10, "win_rate": 48.9, "source": "Uploaded", "file_name": "rsi_mean_reversion.py"},
    {"id": "strat-003", "name": "AI Trend Follower V2", "description": "Uses ML to identify and follow trends (updated).", "status": "Active", "pnl": 3105.00, "win_rate": 72.1, "source": "AI-Generated"},
    {"id": "strat-004", "name": "Bollinger Breakout", "description": "Trades breakouts of Bollinger Bands.", "status": "Debugging", "pnl": 0, "win_rate": 0, "source": "Uploaded", "file_name": "bollinger_breakout.py"},
    {"id": "strat-005", "name": "Old Volatility Strategy", "description": "An older strategy no longer in use.", "status": "Archived", "pnl": 50.15, "win_rate": 55.0, "source": "Uploaded", "file_name": "vol_breakout_old.py"}
]

def migrate_strategies():
    """Migrate mock strategy data to the database."""
    print("Starting strategy data migration...")
    
    with Session(engine) as session:
        # Check if we already have strategies in the database
        existing_strategies = session.exec(select(Strategy)).all()
        if existing_strategies:
            print(f"Found {len(existing_strategies)} existing strategies in the database.")
            user_input = input("Do you want to proceed and potentially create duplicates? (y/n): ")
            if user_input.lower() != 'y':
                print("Migration aborted.")
                return
        
        # Create strategy objects and add them to the session
        for strat_data in mock_strategies:
            # Convert the string ID to an integer for the database
            # We'll strip the 'strat-' prefix and convert to int
            strat_id = int(strat_data["id"].split("-")[1])
            
            # Check if this strategy already exists
            existing = session.exec(select(Strategy).where(Strategy.id == strat_id)).first()
            if existing:
                print(f"Strategy with ID {strat_id} already exists, skipping.")
                continue
                
            strategy = Strategy(
                id=strat_id,
                name=strat_data["name"],
                description=strat_data["description"],
                status=strat_data["status"],
                pnl=strat_data["pnl"],
                win_rate=strat_data["win_rate"],
                source=strat_data["source"],
                file_name=strat_data.get("file_name"),
                generation_schedule="manual",
                last_generation_time=datetime.utcnow().isoformat() if strat_data["source"] == "AI-Generated" else None
            )
            
            session.add(strategy)
            print(f"Added strategy: {strategy.name}")
        
        # Commit the changes
        session.commit()
        print("Strategy data migration completed successfully.")

if __name__ == "__main__":
    migrate_strategies()
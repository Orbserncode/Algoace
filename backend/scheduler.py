"""
Scheduler for running scheduled tasks like strategy generation.
This module provides functions to run scheduled tasks at specified intervals.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from sqlmodel import Session

import crud
from database import get_session

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variable to track if the scheduler is running
scheduler_running = False

async def run_scheduled_strategy_generations():
    """
    Run scheduled strategy generations based on their schedule type.
    This function is meant to be run periodically by the scheduler.
    """
    logger.info("Running scheduled strategy generations...")
    
    # Create a new session for this task
    session = next(get_session())
    
    try:
        # Get all strategies with scheduled generation
        strategies = crud.get_strategies_by_schedule(session=session)
        
        results = []
        now = datetime.now()
        
        for strategy in strategies:
            last_gen_time = None
            if strategy.last_generation_time:
                try:
                    last_gen_time = datetime.fromisoformat(strategy.last_generation_time)
                except ValueError:
                    logger.error(f"Invalid last_generation_time format for strategy {strategy.id}: {strategy.last_generation_time}")
                    continue
            
            should_generate = False
            
            # Check if generation is due based on schedule
            if strategy.generation_schedule == "startup":
                # Generate on startup if it hasn't been generated yet
                should_generate = last_gen_time is None
            elif strategy.generation_schedule == "daily" and last_gen_time:
                # Generate if last generation was more than 24 hours ago
                should_generate = (now - last_gen_time) > timedelta(days=1)
            elif strategy.generation_schedule == "weekly" and last_gen_time:
                # Generate if last generation was more than 7 days ago
                should_generate = (now - last_gen_time) > timedelta(days=7)
            
            if should_generate:
                logger.info(f"Generating strategy for scheduled strategy {strategy.id} ({strategy.name})")
                
                # Update last generation time
                crud.update_strategy(
                    session=session,
                    strategy_id=strategy.id,
                    strategy_in={"last_generation_time": now.isoformat()}
                )
                
                # TODO: Implement actual strategy generation logic here
                # This would call the AI strategy generation service
                # For now, just log that it would be generated
                
                results.append({
                    "strategy_id": strategy.id,
                    "name": strategy.name,
                    "schedule": strategy.generation_schedule,
                    "status": "Generation triggered"
                })
        
        logger.info(f"Processed {len(results)} scheduled generations")
        return results
    
    except Exception as e:
        logger.error(f"Error running scheduled strategy generations: {e}")
        return []
    finally:
        session.close()

async def scheduler_loop():
    """
    Main scheduler loop that runs tasks at specified intervals.
    """
    global scheduler_running
    
    if scheduler_running:
        logger.warning("Scheduler is already running. Ignoring this call.")
        return
    
    scheduler_running = True
    logger.info("Starting scheduler loop...")
    
    try:
        while True:
            # Run scheduled strategy generations
            await run_scheduled_strategy_generations()
            
            # Sleep for 1 hour before checking again
            # In a production environment, this could be more sophisticated
            # with different intervals for different tasks
            await asyncio.sleep(3600)  # 1 hour
    except asyncio.CancelledError:
        logger.info("Scheduler loop cancelled.")
    except Exception as e:
        logger.error(f"Error in scheduler loop: {e}")
    finally:
        scheduler_running = False

async def start_scheduler():
    """
    Start the scheduler as a background task.
    """
    logger.info("Starting scheduler...")
    asyncio.create_task(scheduler_loop())

def run_scheduler_on_startup():
    """
    Function to be called on application startup to run the scheduler.
    """
    logger.info("Initializing scheduler on startup...")
    asyncio.create_task(start_scheduler())
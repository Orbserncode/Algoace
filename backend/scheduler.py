"""
Scheduler for automated tasks in AlgoAce Trader.
"""
import asyncio
import threading
from datetime import datetime, timedelta
import time

# Flag to control the scheduler thread
scheduler_running = False
scheduler_thread = None

def run_scheduler_on_startup():
    """Start the scheduler thread when the application starts."""
    global scheduler_running, scheduler_thread
    
    if scheduler_running:
        print("Scheduler is already running.")
        return
    
    scheduler_running = True
    scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
    scheduler_thread.start()
    print("Scheduler thread started.")

def scheduler_loop():
    """Main scheduler loop that runs in a separate thread."""
    global scheduler_running
    
    print("Scheduler loop started.")
    
    while scheduler_running:
        try:
            # Check for scheduled tasks
            current_time = datetime.now()
            
            # TODO: Implement actual scheduled task checking
            # For now, just log that we're checking
            print(f"[Scheduler] Checking for scheduled tasks at {current_time}")
            
            # Sleep for a while before checking again (e.g., every minute)
            time.sleep(60)
            
        except Exception as e:
            print(f"Error in scheduler loop: {e}")
            # Sleep a bit before retrying
            time.sleep(10)
    
    print("Scheduler loop stopped.")

def stop_scheduler():
    """Stop the scheduler thread."""
    global scheduler_running
    
    if not scheduler_running:
        print("Scheduler is not running.")
        return
    
    scheduler_running = False
    if scheduler_thread:
        scheduler_thread.join(timeout=5)
        print("Scheduler thread stopped.")
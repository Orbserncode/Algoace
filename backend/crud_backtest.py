from typing import List, Optional, Dict, Any
from sqlmodel import Session, select
from datetime import datetime

from backend.models.backtest import BacktestResult

def create_backtest_result(
    session: Session,
    strategy_id: str,
    parameters: Dict[str, Any],
    summary_metrics: Dict[str, Any],
    equity_curve: List[Dict[str, Any]],
    trades: List[Dict[str, Any]],
    log_output: str,
    ai_analysis: Optional[str] = None
) -> BacktestResult:
    """
    Create a new backtest result in the database.
    """
    backtest_result = BacktestResult(
        strategy_id=strategy_id,
        timestamp=datetime.utcnow(),
        parameters=parameters,
        summary_metrics=summary_metrics,
        equity_curve=equity_curve,
        trades=trades,
        log_output=log_output,
        ai_analysis=ai_analysis
    )
    session.add(backtest_result)
    session.commit()
    session.refresh(backtest_result)
    return backtest_result

def get_backtest_result(session: Session, backtest_id: int) -> Optional[BacktestResult]:
    """
    Get a backtest result by ID.
    """
    return session.get(BacktestResult, backtest_id)

def get_backtest_results_by_strategy(session: Session, strategy_id: str, limit: int = 10) -> List[BacktestResult]:
    """
    Get all backtest results for a strategy, ordered by timestamp (most recent first).
    """
    statement = select(BacktestResult).where(BacktestResult.strategy_id == strategy_id).order_by(BacktestResult.timestamp.desc()).limit(limit)
    return session.exec(statement).all()

def get_latest_backtest_result(session: Session, strategy_id: str) -> Optional[BacktestResult]:
    """
    Get the most recent backtest result for a strategy.
    """
    statement = select(BacktestResult).where(BacktestResult.strategy_id == strategy_id).order_by(BacktestResult.timestamp.desc()).limit(1)
    results = session.exec(statement).all()
    return results[0] if results else None

def delete_backtest_result(session: Session, backtest_id: int) -> bool:
    """
    Delete a backtest result by ID.
    Returns False if the backtest result doesn't exist or is locked.
    """
    backtest_result = session.get(BacktestResult, backtest_id)
    if not backtest_result:
        return False
    
    # Check if the backtest is locked
    if backtest_result.locked:
        return False
        
    session.delete(backtest_result)
    session.commit()
    return True

def delete_old_backtest_results(session: Session, strategy_id: str, keep_count: int = 5) -> int:
    """
    Delete old backtest results for a strategy, keeping only the most recent ones.
    Skips locked backtest results.
    Returns the number of deleted results.
    """
    # Get all backtest results for the strategy
    statement = select(BacktestResult).where(BacktestResult.strategy_id == strategy_id).order_by(BacktestResult.timestamp.desc())
    results = session.exec(statement).all()
    
    # If we have more results than we want to keep, delete the oldest ones
    if len(results) <= keep_count:
        return 0
    
    # Delete the oldest results
    results_to_delete = results[keep_count:]
    deleted_count = 0
    
    for result in results_to_delete:
        # Skip locked backtest results
        if result.locked:
            continue
            
        session.delete(result)
        deleted_count += 1
    
    session.commit()
    return deleted_count

def update_backtest_result_analysis(session: Session, backtest_id: int, ai_analysis: str) -> bool:
    """
    Update the AI analysis for a backtest result.
    """
    backtest_result = session.get(BacktestResult, backtest_id)
    if not backtest_result:
        return False
    
    backtest_result.ai_analysis = ai_analysis
    session.add(backtest_result)
    session.commit()
    session.refresh(backtest_result)
    return True
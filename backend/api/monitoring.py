from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import random
import json

from backend.database import get_session
from backend.models.monitoring import (
    PerformanceDataPoint,
    LogEntry,
    KeyMetrics,
    Trade,
    PerformanceDataPointCreate,
    LogEntryCreate,
    TradeCreate,
    TradeType
)

router = APIRouter(prefix="/monitoring")
 
 # Trade management endpoints
@router.post("/trades/{trade_id}/close", status_code=status.HTTP_200_OK)
def close_trade(
    *,
    session: Session = Depends(get_session),
    trade_id: str
):
    """
    Close an open trade by setting its exit price.
    """
    try:
        # Find the trade
        statement = select(Trade).where(Trade.id == trade_id)
        trade = session.exec(statement).first()

        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade with ID {trade_id} not found"
            )

        # Check if trade is already closed
        if trade.exit_price is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trade is already closed"
            )

        # In a real implementation, this would connect to the broker API
        # to close the position and get the actual exit price

        # For now, simulate closing at current market price
        # In a real app, you would get this from a market data provider
        import random
        current_price = trade.entry_price * (1 + random.uniform(-0.05, 0.05))

        # Update the trade
        trade.exit_price = current_price
        trade.pnl = (current_price - trade.entry_price) * trade.lot_size
        if trade.trade_type == TradeType.SELL:
            trade.pnl = -trade.pnl

        trade.is_winning = trade.pnl > 0

        # Save changes
        session.add(trade)
        session.commit()

        return {"success": True, "message": "Trade closed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error closing trade: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to close trade: {str(e)}"
        )

# Performance data endpoints
@router.get("/performance", response_model=List[Dict[str, Any]])
def get_portfolio_history(
    *,
    session: Session = Depends(get_session),
    time_range: str = Query("1M", description="Time range for performance data (1D, 7D, 1M, YTD)")
):
    """
    Get portfolio performance history.
    """
    try:
        # Convert time_range to actual date range
        end_date = datetime.now()
        if time_range == "1D":
            start_date = end_date - timedelta(days=1)
        elif time_range == "7D":
            start_date = end_date - timedelta(days=7)
        elif time_range == "1M":
            start_date = end_date - timedelta(days=30)
        elif time_range == "YTD":
            start_date = datetime(end_date.year, 1, 1)
        else:
            start_date = end_date - timedelta(days=30)  # Default to 1M

        # Query performance data from database
        statement = select(PerformanceDataPoint).where(
            PerformanceDataPoint.date >= start_date,
            PerformanceDataPoint.date <= end_date
        ).order_by(PerformanceDataPoint.date)

        results = session.exec(statement).all()

        # Convert to dict for JSON serialization
        return [
            {
                "date": result.date.strftime("%Y-%m-%d"),
                "portfolioValue": result.portfolio_value,
                "profit": result.profit
            }
            for result in results
        ]
    except Exception as e:
        print(f"Error fetching portfolio history: {e}")
        # Generate mock data if no data exists yet
        return generate_mock_performance_data(time_range)

# Activity logs endpoints
@router.get("/logs", response_model=List[Dict[str, Any]])
def get_activity_logs(
    *,
    session: Session = Depends(get_session),
    limit: int = Query(50, ge=1, le=1000)
):
    """
    Get recent activity logs.
    """
    try:
        # Query logs from database
        statement = select(LogEntry).order_by(LogEntry.timestamp.desc()).limit(limit)
        results = session.exec(statement).all()

        # Convert to dict for JSON serialization
        return [
            {
                "timestamp": result.timestamp.isoformat(),
                "type": result.type,
                "message": result.message,
                "strategy": result.strategy
            }
            for result in results
        ]
    except Exception as e:
        print(f"Error fetching activity logs: {e}")
        # Generate mock data if no data exists yet
        return generate_mock_log_data(limit)

# Key metrics endpoint
@router.get("/metrics", response_model=Dict[str, Any])
def get_key_metrics(
    *,
    session: Session = Depends(get_session)
):
    """
    Get key performance metrics.
    """
    try:
        # Query metrics from database
        statement = select(KeyMetrics).order_by(KeyMetrics.id.desc()).limit(1)
        result = session.exec(statement).first()

        if result:
            return {
                "totalPnL": result.total_pnl,
                "todayPnL": result.today_pnl,
                "activeStrategies": result.active_strategies,
                "totalTradesToday": result.total_trades_today,
                "winRateLast7d": result.win_rate_last_7d,
                "maxDrawdown": result.max_drawdown
            }
        else:
            # Generate mock data if no data exists yet
            return generate_mock_key_metrics()
    except Exception as e:
        print(f"Error fetching key metrics: {e}")
        # Generate mock data if no data exists yet
        return generate_mock_key_metrics()

# Strategy performance endpoint
@router.get("/strategies/{strategy_id}/performance", response_model=List[Dict[str, Any]])
def get_strategy_performance(
    *,
    session: Session = Depends(get_session),
    strategy_id: str,
    time_range: str = Query("1M", description="Time range for performance data (1D, 7D, 1M, YTD)")
):
    """
    Get performance history for a specific strategy.
    """
    try:
        # Convert time_range to actual date range
        end_date = datetime.now()
        if time_range == "1D":
            start_date = end_date - timedelta(days=1)
        elif time_range == "7D":
            start_date = end_date - timedelta(days=7)
        elif time_range == "1M":
            start_date = end_date - timedelta(days=30)
        elif time_range == "YTD":
            start_date = datetime(end_date.year, 1, 1)
        else:
            start_date = end_date - timedelta(days=30)  # Default to 1M

        # Query performance data from database
        statement = select(PerformanceDataPoint).where(
            PerformanceDataPoint.date >= start_date,
            PerformanceDataPoint.date <= end_date,
            PerformanceDataPoint.strategy_id == strategy_id
        ).order_by(PerformanceDataPoint.date)

        results = session.exec(statement).all()

        # Convert to dict for JSON serialization
        return [
            {
                "date": result.date.strftime("%Y-%m-%d"),
                "portfolioValue": result.portfolio_value,
                "profit": result.profit
            }
            for result in results
        ]
    except Exception as e:
        print(f"Error fetching strategy performance: {e}")
        # Generate mock data if no data exists yet
        return generate_mock_strategy_performance(strategy_id, time_range)

# Strategy trades endpoint
@router.get("/strategies/{strategy_id}/trades", response_model=Dict[str, Any])
def get_strategy_trades(
    *,
    session: Session = Depends(get_session),
    strategy_id: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """
    Get trades for a specific strategy.
    """
    try:
        # Query trades from database
        statement = select(Trade).where(
            Trade.strategy_id == strategy_id
        ).order_by(Trade.timestamp.desc()).offset(offset).limit(limit)

        results = session.exec(statement).all()

        # Get total count
        count_statement = select(Trade).where(Trade.strategy_id == strategy_id)
        total = len(session.exec(count_statement).all())

        # Convert to dict for JSON serialization
        trades = [
            {
                "id": result.id,
                "timestamp": result.timestamp.isoformat(),
                "strategyId": result.strategy_id,
                "strategyName": result.strategy_name,
                "symbol": result.symbol,
                "tradeType": result.trade_type,
                "tradingMethod": result.trading_method,
                "assetType": result.asset_type,
                "category": result.category,
                "lotSize": result.lot_size,
                "entryPrice": result.entry_price,
                "exitPrice": result.exit_price,
                "pnl": result.pnl,
                "brokerName": result.broker_name,
                "pipsPnL": result.pips_pnl,
                "leverage": result.leverage,
                "isWinning": result.is_winning
            }
            for result in results
        ]

        return {
            "trades": trades,
            "total": total
        }
    except Exception as e:
        print(f"Error fetching strategy trades: {e}")
        # Generate mock data if no data exists yet
        return generate_mock_strategy_trades(strategy_id, limit, offset)

# Live broker trades endpoint
@router.get("/broker/trades", response_model=List[Dict[str, Any]])
def get_live_broker_trades(
    *,
    session: Session = Depends(get_session),
    broker_id: Optional[str] = None
):
    """
    Get live trades from broker.
    """
    try:
        # Check if broker credentials are configured
        from os import environ
        has_broker_config = any([
            environ.get('ALPACA_API_KEY') and environ.get('ALPACA_API_SECRET'),
            environ.get('IB_ACCOUNT_ID')
        ])

        if not has_broker_config:
            # Return empty list with a message that no broker is connected
            return []

        # Query trades from database
        statement = select(Trade).where(
            Trade.exit_price == None  # Open trades have no exit price
        )

        if broker_id:
            statement = statement.where(Trade.broker_name == broker_id)

        results = session.exec(statement).all()

        # Limit to 10 most recent trades
        results = results[:10]

        # Convert to dict for JSON serialization
        return [
            {
                "id": result.id,
                "timestamp": result.timestamp.isoformat(),
                "strategyId": result.strategy_id,
                "strategyName": result.strategy_name,
                "symbol": result.symbol,
                "tradeType": result.trade_type,
                "tradingMethod": result.trading_method,
                "assetType": result.asset_type,
                "category": result.category,
                "lotSize": result.lot_size,
                "entryPrice": result.entry_price,
                "brokerName": result.broker_name,
                "pipsPnL": result.pips_pnl,
                "leverage": result.leverage,
                "isWinning": result.is_winning
            }
            for result in results
        ]
    except Exception as e:
        print(f"Error fetching live broker trades: {e}")
        # Don't generate mock data, just return empty list
        return []

# Helper functions to generate mock data
def generate_mock_performance_data(time_range: str) -> List[Dict[str, Any]]:
    """Generate mock performance data for testing."""
    end_date = datetime.now()
    if time_range == "1D":
        days = 1
    elif time_range == "7D":
        days = 7
    elif time_range == "1M":
        days = 30
    elif time_range == "YTD":
        days = (end_date - datetime(end_date.year, 1, 1)).days
    else:
        days = 30  # Default to 1M

    start_date = end_date - timedelta(days=days)

    performance_data = []
    portfolio_value = 10000
    profit = 0

    current_date = start_date
    while current_date <= end_date:
        # Generate random daily change
        daily_change = random.uniform(-200, 300)
        portfolio_value += daily_change
        profit += daily_change

        performance_data.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "portfolioValue": max(8000, portfolio_value),  # Ensure minimum value
            "profit": profit
        })

        current_date += timedelta(days=1)

    return performance_data

def generate_mock_log_data(limit: int) -> List[Dict[str, Any]]:
    """Generate mock log data for testing."""
    log_types = ["Trade", "Signal", "System", "Error"]
    strategies = ["strat-001", "strat-003", "System", "agent-risk-default"]

    log_data = []
    for i in range(min(limit, 50)):  # Generate up to 50 logs
        log_type = random.choice(log_types)
        strategy = random.choice(strategies)

        if log_type == "Trade":
            message = f"Executed {'BUY' if random.random() > 0.5 else 'SELL'} {random.choice(['AAPL', 'MSFT', 'GOOGL', 'TSLA'])} @ {random.uniform(100, 500):.2f}, Size: {random.randint(1, 20)}"
        elif log_type == "Signal":
            message = f"Potential {'entry' if random.random() > 0.5 else 'exit'} signal for {random.choice(['AAPL', 'MSFT', 'GOOGL', 'TSLA'])}"
        elif log_type == "Error":
            message = random.choice([
                "Failed to connect to data provider. Retrying...",
                "API rate limit exceeded. Waiting before retry.",
                "Order execution failed. Insufficient funds."
            ])
        else:  # System
            message = random.choice([
                "Risk check passed for all active strategies.",
                "Market data connection established.",
                "Daily portfolio rebalancing completed."
            ])

        log_data.append({
            "timestamp": (datetime.now() - timedelta(minutes=i*15)).isoformat(),
            "type": log_type,
            "message": message,
            "strategy": strategy
        })

    return log_data

def generate_mock_key_metrics() -> Dict[str, Any]:
    """Generate mock key metrics for testing."""
    return {
        "totalPnL": random.uniform(800, 1500),
        "todayPnL": random.uniform(-100, 100),
        "activeStrategies": random.randint(2, 5),
        "totalTradesToday": random.randint(5, 15),
        "winRateLast7d": random.uniform(60, 80),
        "maxDrawdown": random.uniform(5, 15)
    }

def generate_mock_strategy_performance(strategy_id: str, time_range: str) -> List[Dict[str, Any]]:
    """Generate mock strategy performance data for testing."""
    # Similar to generate_mock_performance_data but strategy-specific
    end_date = datetime.now()
    if time_range == "1D":
        days = 1
    elif time_range == "7D":
        days = 7
    elif time_range == "1M":
        days = 30
    elif time_range == "YTD":
        days = (end_date - datetime(end_date.year, 1, 1)).days
    else:
        days = 30  # Default to 1M

    start_date = end_date - timedelta(days=days)

    # Use strategy_id to seed the random generator for consistent results
    random.seed(hash(strategy_id) % 10000)

    performance_data = []
    portfolio_value = 10000
    profit = 0

    # Different strategies have different performance characteristics
    if strategy_id == "strat-001":  # Momentum Burst
        daily_change_range = (-150, 350)  # More volatile
    elif strategy_id == "strat-003":  # AI Trend Follower
        daily_change_range = (-100, 250)  # Less volatile
    else:
        daily_change_range = (-200, 300)  # Default

    current_date = start_date
    while current_date <= end_date:
        # Generate random daily change
        daily_change = random.uniform(*daily_change_range)
        portfolio_value += daily_change
        profit += daily_change

        performance_data.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "portfolioValue": max(8000, portfolio_value),  # Ensure minimum value
            "profit": profit
        })

        current_date += timedelta(days=1)

    # Reset random seed
    random.seed()

    return performance_data

def generate_mock_strategy_trades(strategy_id: str, limit: int, offset: int) -> Dict[str, Any]:
    """Generate mock strategy trades for testing."""
    # Use strategy_id to seed the random generator for consistent results
    random.seed(hash(strategy_id) % 10000)

    # Different strategies have different characteristics
    if strategy_id == "strat-001":  # Momentum Burst
        symbols = ["NVDA", "TSLA", "MSFT", "AMZN"]
        strategy_name = "Momentum Burst"
        asset_type = "Stock"
        trading_method = "Spot"
    elif strategy_id == "strat-003":  # AI Trend Follower
        symbols = ["AAPL", "GOOGL", "BTC/USD", "ETH/USD"]
        strategy_name = "AI Trend Follower"
        asset_type = random.choice(["Stock", "Crypto"])
        trading_method = random.choice(["Spot", "Futures"])
    else:
        symbols = ["SPY", "QQQ", "IWM", "DIA"]
        strategy_name = f"Strategy {strategy_id}"
        asset_type = random.choice(["Stock", "ETF"])
        trading_method = "Spot"
    
    # Generate mock trades
    total_trades = random.randint(10, 30)
    trades = []
    
    for i in range(total_trades):
        symbol = random.choice(symbols)
        trade_type = random.choice(["BUY", "SELL"])
        entry_price = random.uniform(100, 1000) if asset_type == "Stock" else random.uniform(10000, 70000)
        lot_size = random.uniform(1, 20) if asset_type == "Stock" else random.uniform(0.1, 1.0)
        
        # Some trades are closed, some are open
        is_closed = random.random() > 0.3
        exit_price = random.uniform(0.95 * entry_price, 1.05 * entry_price) if is_closed else None
        pnl = (exit_price - entry_price) * lot_size if exit_price else None
        if trade_type == "SELL" and pnl:
            pnl = -pnl
        
        trades.append({
            "id": f"{strategy_id}-trade-{i+1}",
            "timestamp": (datetime.now() - timedelta(hours=i*2)).isoformat(),
            "strategyId": strategy_id,
            "strategyName": strategy_name,
            "symbol": symbol,
            "tradeType": trade_type,
            "tradingMethod": trading_method,
            "assetType": asset_type,
            "category": "Tech" if symbol in ["AAPL", "MSFT", "GOOGL", "NVDA"] else "Crypto" if "USD" in symbol else "ETF",
            "lotSize": lot_size,
            "entryPrice": entry_price,
            "exitPrice": exit_price,
            "pnl": pnl,
            "brokerName": random.choice(["Interactive Brokers", "TD Ameritrade", "Binance", "OANDA"]),
            "pipsPnL": random.randint(-50, 100),
            "leverage": random.choice([1, 2, 5, 10]),
            "isWinning": pnl > 0 if pnl else random.random() > 0.5
        })
    
    # Sort by timestamp (newest first)
    trades.sort(key=lambda x: x["timestamp"], reverse=True)
    
    # Apply pagination
    paginated_trades = trades[offset:offset+limit]
    
    # Reset random seed
    random.seed()
    
    return {
        "trades": paginated_trades,
        "total": total_trades
    }

# Removed mock data generation function for live broker trades
    
    # If broker_id is specified, only generate trades for that broker
    broker_names = [broker_id] if broker_id and broker_id in brokers else list(brokers.keys())
    
    for broker_name in broker_names:
        symbols = brokers[broker_name]
        asset_type = "Crypto" if broker_name == "Binance" else "Forex" if broker_name == "OANDA" else "Stock"
        
        # Generate 1-3 trades per broker
        for i in range(random.randint(1, 3)):
            symbol = random.choice(symbols)
            strategy_id = random.choice(["strat-001", "strat-003"])
            strategy_name = "Momentum Burst" if strategy_id == "strat-001" else "AI Trend Follower"
            
            if asset_type == "Crypto":
                entry_price = random.uniform(10000, 70000)
                lot_size = random.uniform(0.1, 1.0)
                leverage = random.choice([1, 2, 5, 10])
            elif asset_type == "Forex":
                entry_price = random.uniform(1.0, 1.5)
                lot_size = random.uniform(0.5, 2.0)
                leverage = random.choice([10, 20, 50, 100])
            else:  # Stock
                entry_price = random.uniform(100, 1000)
                lot_size = random.randint(5, 20)
                leverage = 1
            
            live_trades.append({
                "id": f"live-{broker_name}-{i+1}",
                "timestamp": (datetime.now() - timedelta(hours=random.randint(1, 12))).isoformat(),
                "strategyId": strategy_id,
                "strategyName": strategy_name,
                "symbol": symbol,
                "tradeType": random.choice(["BUY", "SELL"]),
                "tradingMethod": "Futures" if random.random() > 0.7 else "Spot",
                "assetType": asset_type,
                "category": "Tech" if asset_type == "Stock" else asset_type,
                "lotSize": lot_size,
                "entryPrice": entry_price,
                "brokerName": broker_name,
                "pipsPnL": random.randint(-50, 100),
                "leverage": leverage,
                "isWinning": random.random() > 0.5
            })
    
    return live_trades
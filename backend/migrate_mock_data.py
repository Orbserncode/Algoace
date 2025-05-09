"""
Script to migrate mock data to the PostgreSQL database.
This script will create the necessary tables and populate them with mock data.
"""
import os
import sys
from datetime import datetime
from sqlmodel import Session

# Add the parent directory to the path so we can import from the backend package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the database and models
from backend.database import engine, create_db_and_tables
from backend.models.dataset import (
    Dataset,
    DatasetSubcategory,
    AgentRecommendation,
    DatasetCategoryEnum,
    DatasetFormatEnum,
    AgentRecommendationType
)

# Mock data for agent recommendations
mock_recommendations = [
    {
        "agent_name": "Research Agent",
        "dataset_id": 1,  # Will be updated after datasets are created
        "type": AgentRecommendationType.SENTIMENT,
        "content": {
            "sentiment": "bullish",
            "confidence": 0.78,
            "timeframe": "short-term",
            "analysis": "Based on recent price action and technical indicators, EUR/USD shows bullish momentum with potential for upward movement in the short term.",
            "keyIndicators": {
                "rsi": 65,
                "macd": "positive",
                "movingAverages": "bullish"
            }
        },
        "confidence": 0.78,
        "tags": ["forex", "sentiment", "technical"]
    },
    {
        "agent_name": "Strategy Agent",
        "dataset_id": 2,  # Will be updated after datasets are created
        "type": AgentRecommendationType.STRATEGY_SUGGESTION,
        "content": {
            "strategyType": "mean_reversion",
            "parameters": {
                "lookbackPeriod": 24,
                "entryThreshold": 2.0,
                "exitThreshold": 0.5,
                "stopLoss": 3.0
            },
            "expectedPerformance": {
                "winRate": 0.65,
                "profitFactor": 1.8,
                "maxDrawdown": 12.5
            },
            "description": "Mean reversion strategy for BTC/USD based on Bollinger Bands with optimized parameters for current market conditions."
        },
        "confidence": 0.82,
        "tags": ["crypto", "strategy", "mean_reversion"]
    }
]

# Mock data for datasets
mock_datasets = [
    {
        "name": "EUR/USD Historical (1h)",
        "description": "Historical price data for EUR/USD pair with 1-hour timeframe",
        "category": DatasetCategoryEnum.FOREX,
        "subcategory": "major_pairs",
        "source": "OANDA",
        "format": DatasetFormatEnum.CSV,
        "size": 1024,
        "last_updated": datetime.fromisoformat("2025-05-01T00:00:00Z"),
        "path": "/data/forex/eurusd_1h_2020_2025.csv",
        "dataset_metadata": {
            "timeframe": "1h",
            "startDate": "2020-01-01",
            "endDate": "2025-05-01",
            "columns": ["timestamp", "open", "high", "low", "close", "volume"],
            "lumibot_compatible": True
        },
        "tags": ["forex", "eurusd", "hourly"]
    },
    {
        "name": "EUR/USD Historical (1m)",
        "description": "Historical price data for EUR/USD pair with 1-minute timeframe",
        "category": DatasetCategoryEnum.FOREX,
        "subcategory": "major_pairs",
        "source": "OANDA",
        "format": DatasetFormatEnum.CSV,
        "size": 5120,
        "last_updated": datetime.fromisoformat("2025-05-01T00:00:00Z"),
        "path": "/data/forex/eurusd_1m_2023_2025.csv",
        "dataset_metadata": {
            "timeframe": "1m",
            "startDate": "2023-01-01",
            "endDate": "2025-05-01",
            "columns": ["timestamp", "open", "high", "low", "close", "volume"],
            "lumibot_compatible": True
        },
        "tags": ["forex", "eurusd", "minute"]
    },
    {
        "name": "EUR/USD Historical (5m)",
        "description": "Historical price data for EUR/USD pair with 5-minute timeframe",
        "category": DatasetCategoryEnum.FOREX,
        "subcategory": "major_pairs",
        "source": "OANDA",
        "format": DatasetFormatEnum.CSV,
        "size": 3072,
        "last_updated": datetime.fromisoformat("2025-05-01T00:00:00Z"),
        "path": "/data/forex/eurusd_5m_2023_2025.csv",
        "dataset_metadata": {
            "timeframe": "5m",
            "startDate": "2023-01-01",
            "endDate": "2025-05-01",
            "columns": ["timestamp", "open", "high", "low", "close", "volume"],
            "lumibot_compatible": True
        },
        "tags": ["forex", "eurusd", "minute"]
    },
    {
        "name": "EUR/USD Historical (15m)",
        "description": "Historical price data for EUR/USD pair with 15-minute timeframe",
        "category": DatasetCategoryEnum.FOREX,
        "subcategory": "major_pairs",
        "source": "OANDA",
        "format": DatasetFormatEnum.CSV,
        "size": 2048,
        "last_updated": datetime.fromisoformat("2025-05-01T00:00:00Z"),
        "path": "/data/forex/eurusd_15m_2022_2025.csv",
        "dataset_metadata": {
            "timeframe": "15m",
            "startDate": "2022-01-01",
            "endDate": "2025-05-01",
            "columns": ["timestamp", "open", "high", "low", "close", "volume"],
            "lumibot_compatible": True
        },
        "tags": ["forex", "eurusd", "minute"]
    },
    {
        "name": "EUR/USD Historical (1d)",
        "description": "Historical price data for EUR/USD pair with daily timeframe",
        "category": DatasetCategoryEnum.FOREX,
        "subcategory": "major_pairs",
        "source": "OANDA",
        "format": DatasetFormatEnum.CSV,
        "size": 512,
        "last_updated": datetime.fromisoformat("2025-05-01T00:00:00Z"),
        "path": "/data/forex/eurusd_1d_2015_2025.csv",
        "dataset_metadata": {
            "timeframe": "1d",
            "startDate": "2015-01-01",
            "endDate": "2025-05-01",
            "columns": ["timestamp", "open", "high", "low", "close", "volume"],
            "lumibot_compatible": True
        },
        "tags": ["forex", "eurusd", "daily"]
    },
    {
        "name": "BTC/USD Historical",
        "description": "Historical price data for Bitcoin",
        "category": DatasetCategoryEnum.CRYPTO,
        "subcategory": "bitcoin",
        "source": "Binance",
        "format": DatasetFormatEnum.JSON,
        "size": 2048,
        "last_updated": datetime.fromisoformat("2025-05-01T00:00:00Z"),
        "path": "/data/crypto/btcusd_15m_2022_2025.json",
        "dataset_metadata": {
            "timeframe": "15m",
            "startDate": "2022-01-01",
            "endDate": "2025-05-01",
            "columns": ["timestamp", "open", "high", "low", "close", "volume"]
        },
        "tags": ["crypto", "bitcoin", "15min"]
    },
    {
        "name": "Tech Stocks Bundle",
        "description": "Historical data for major tech stocks",
        "category": DatasetCategoryEnum.STOCKS,
        "subcategory": "tech",
        "source": "Alpha Vantage",
        "format": DatasetFormatEnum.CSV,
        "size": 4096,
        "last_updated": datetime.fromisoformat("2025-04-15T00:00:00Z"),
        "path": "/data/stocks/tech_stocks_daily_2023_2025.csv",
        "dataset_metadata": {
            "timeframe": "1d",
            "startDate": "2023-01-01",
            "endDate": "2025-04-15",
            "symbols": ["AAPL", "MSFT", "GOOGL", "AMZN", "META"],
            "columns": ["timestamp", "symbol", "open", "high", "low", "close", "volume"]
        },
        "tags": ["stocks", "tech", "daily"]
    },
    {
        "name": "S&P 500 Futures",
        "description": "S&P 500 futures contracts historical data",
        "category": DatasetCategoryEnum.FUTURES,
        "subcategory": "indices",
        "source": "CME Group",
        "format": DatasetFormatEnum.CSV,
        "size": 1536,
        "last_updated": datetime.fromisoformat("2025-05-02T00:00:00Z"),
        "path": "/data/futures/sp500_futures_1d_2020_2025.csv",
        "dataset_metadata": {
            "timeframe": "1d",
            "startDate": "2020-01-01",
            "endDate": "2025-05-01",
            "columns": ["timestamp", "open", "high", "low", "close", "volume", "open_interest"]
        },
        "tags": ["futures", "sp500", "indices", "daily"]
    }
]

# Mock subcategories
mock_subcategories = [
    {"name": "Major Pairs", "category": DatasetCategoryEnum.FOREX, "description": "Major currency pairs like EUR/USD, GBP/USD, USD/JPY"},
    {"name": "Minor Pairs", "category": DatasetCategoryEnum.FOREX, "description": "Minor currency pairs like EUR/GBP, EUR/AUD, GBP/JPY"},
    {"name": "Bitcoin", "category": DatasetCategoryEnum.CRYPTO, "description": "Bitcoin (BTC) related datasets"},
    {"name": "Ethereum", "category": DatasetCategoryEnum.CRYPTO, "description": "Ethereum (ETH) related datasets"},
    {"name": "Altcoins", "category": DatasetCategoryEnum.CRYPTO, "description": "Alternative cryptocurrencies datasets"},
    {"name": "Tech", "category": DatasetCategoryEnum.STOCKS, "description": "Technology sector stocks"},
    {"name": "Finance", "category": DatasetCategoryEnum.STOCKS, "description": "Financial sector stocks"},
    {"name": "Healthcare", "category": DatasetCategoryEnum.STOCKS, "description": "Healthcare sector stocks"},
    {"name": "Indices", "category": DatasetCategoryEnum.FUTURES, "description": "Index futures like S&P 500, Nasdaq, Dow Jones"},
    {"name": "Commodities", "category": DatasetCategoryEnum.FUTURES, "description": "Commodity futures like Gold, Oil, Natural Gas"}
]

def migrate_data(force=False):
    """Migrate mock data to the database."""
    print("Creating database tables...")
    create_db_and_tables()
    
    print("Migrating mock data...")
    with Session(engine) as session:
        # Check if data already exists
        existing_datasets = session.query(Dataset).count()
        if existing_datasets > 0 and not force:
            print(f"Found {existing_datasets} existing datasets. Skipping migration.")
            return
        
        # If force is True and datasets exist, delete existing EUR/USD datasets
        if force and existing_datasets > 0:
            print("Force update enabled. Deleting existing EUR/USD datasets...")
            from sqlmodel import select
            eurusd_datasets = session.exec(select(Dataset).where(Dataset.name.contains("EUR/USD"))).all()
            for dataset in eurusd_datasets:
                print(f"  - Deleting dataset: {dataset.name}")
                session.delete(dataset)
            session.commit()
        
        # Migrate subcategories
        print("Migrating subcategories...")
        subcategory_map = {}  # To store the mapping between subcategory names and IDs
        for subcategory_data in mock_subcategories:
            subcategory = DatasetSubcategory(**subcategory_data)
            session.add(subcategory)
            session.flush()  # Flush to get the ID
            subcategory_map[subcategory.name] = subcategory.id
        
        # Migrate datasets
        print("Migrating datasets...")
        dataset_map = {}  # To store the mapping between dataset names and IDs
        for dataset_data in mock_datasets:
            dataset = Dataset(**dataset_data)
            session.add(dataset)
            session.flush()  # Flush to get the ID
            dataset_map[dataset.name] = dataset.id
        
        # Migrate agent recommendations
        print("Migrating agent recommendations...")
        for i, recommendation_data in enumerate(mock_recommendations):
            # Update dataset_id to use the actual ID
            dataset_name = "EUR/USD Historical (1h)" if i == 0 else "BTC/USD Historical"
            if dataset_name in dataset_map:
                recommendation_data["dataset_id"] = dataset_map[dataset_name]
                recommendation = AgentRecommendation(**recommendation_data)
                session.add(recommendation)
            else:
                print(f"Warning: Dataset '{dataset_name}' not found for recommendation {i}")
        
        # Commit the changes
        session.commit()
        
        print(f"Successfully migrated {len(mock_subcategories)} subcategories, {len(mock_datasets)} datasets, and {len(mock_recommendations)} recommendations.")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate mock data to the database")
    parser.add_argument("--force", action="store_true", help="Force update of EUR/USD datasets")
    args = parser.parse_args()
    
    migrate_data(force=args.force)
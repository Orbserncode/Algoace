from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from datetime import datetime

from backend.models.dataset import Dataset, DatasetSubcategory, AgentRecommendation, DatasetCategoryEnum

# Dataset CRUD operations
def create_dataset(
    session: Session,
    *,
    name: str,
    description: str,
    category: DatasetCategoryEnum,
    subcategory: str,
    source: str,
    format: str,
    size: int,
    path: str,
    dataset_metadata: Dict[str, Any] = None,
    tags: List[str] = None
) -> Dataset:
    """Create a new dataset"""
    dataset = Dataset(
        name=name,
        description=description,
        category=category,
        subcategory=subcategory,
        source=source,
        format=format,
        size=size,
        path=path,
        dataset_metadata=dataset_metadata or {},
        tags=tags or []
    )
    session.add(dataset)
    session.commit()
    session.refresh(dataset)
    return dataset

def get_dataset(session: Session, dataset_id: int) -> Optional[Dataset]:
    """Get a dataset by ID"""
    return session.get(Dataset, dataset_id)

def get_datasets(
    session: Session, 
    *,
    skip: int = 0, 
    limit: int = 100,
    category: Optional[DatasetCategoryEnum] = None
) -> List[Dataset]:
    """Get all datasets with optional filtering"""
    query = select(Dataset)
    if category:
        query = query.where(Dataset.category == category)
    return session.exec(query.offset(skip).limit(limit)).all()

def update_dataset(
    session: Session,
    *,
    dataset_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    category: Optional[DatasetCategoryEnum] = None,
    subcategory: Optional[str] = None,
    source: Optional[str] = None,
    format: Optional[str] = None,
    size: Optional[int] = None,
    path: Optional[str] = None,
    dataset_metadata: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None
) -> Optional[Dataset]:
    """Update a dataset"""
    dataset = session.get(Dataset, dataset_id)
    if not dataset:
        return None
    
    # Update fields if provided
    if name is not None:
        dataset.name = name
    if description is not None:
        dataset.description = description
    if category is not None:
        dataset.category = category
    if subcategory is not None:
        dataset.subcategory = subcategory
    if source is not None:
        dataset.source = source
    if format is not None:
        dataset.format = format
    if size is not None:
        dataset.size = size
    if path is not None:
        dataset.path = path
    if dataset_metadata is not None:
        dataset.dataset_metadata = dataset_metadata
    if tags is not None:
        dataset.tags = tags
    
    # Update last_updated timestamp
    dataset.last_updated = datetime.utcnow()
    
    session.add(dataset)
    session.commit()
    session.refresh(dataset)
    return dataset

def delete_dataset(session: Session, dataset_id: int) -> bool:
    """Delete a dataset and its associated file"""
    import os
    import logging
    import glob
    
    logger = logging.getLogger(__name__)
    
    dataset = session.get(Dataset, dataset_id)
    if not dataset:
        return False
    
    # Try to delete the actual file
    file_path = dataset.path
    
    # Make sure the path is absolute and correct
    if not file_path.startswith('/workspaces/Algoace') and not os.path.exists(file_path):
        file_path = os.path.join('/workspaces/Algoace', file_path.lstrip('/'))
    
    # Check if the file exists
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            logger.info(f"Deleted file: {file_path}")
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {str(e)}")
    else:
        # Try to find the file in the data directory
        symbol = dataset.name.split()[0]  # Assuming name format like "EUR/USD Historical (1d)"
        timeframe = dataset.dataset_metadata.get('timeframe', '1d')
        
        base_path = "/workspaces/Algoace/data"
        if symbol.lower() == "eur/usd":
            category = "forex"
            symbol = "eurusd"  # Normalize symbol for filename
        elif symbol.lower() in ["btc/usd", "btcusd"]:
            category = "crypto"
            symbol = "btcusd"  # Normalize symbol for filename
        elif symbol.lower() in ["sp500"]:
            category = "futures"
        else:
            category = "stocks"
        
        # Map timeframe to filename
        timeframe_map = {
            "1d": "1d",
            "1h": "1h",
            "15m": "15m",
            "5m": "5m",
            "1m": "1m"
        }
        
        tf = timeframe_map.get(timeframe, timeframe)
        
        # Try to find the file
        potential_paths = [
            f"{base_path}/{category}/{symbol.lower()}_{tf}_*.csv",
            f"{base_path}/{category}/{symbol.lower()}_{tf}_*.json"
        ]
        
        for pattern in potential_paths:
            matches = glob.glob(pattern)
            if matches:
                for match in matches:
                    try:
                        os.remove(match)
                        logger.info(f"Deleted file: {match}")
                    except Exception as e:
                        logger.error(f"Error deleting file {match}: {str(e)}")
    
    # Delete the dataset from the database
    session.delete(dataset)
    session.commit()
    return True

# Subcategory CRUD operations
def create_subcategory(
    session: Session,
    *,
    name: str,
    category: DatasetCategoryEnum,
    description: str
) -> DatasetSubcategory:
    """Create a new dataset subcategory"""
    subcategory = DatasetSubcategory(
        name=name,
        category=category,
        description=description
    )
    session.add(subcategory)
    session.commit()
    session.refresh(subcategory)
    return subcategory

def get_subcategories(
    session: Session,
    *,
    category: Optional[DatasetCategoryEnum] = None
) -> List[DatasetSubcategory]:
    """Get all subcategories with optional filtering by category"""
    query = select(DatasetSubcategory)
    if category:
        query = query.where(DatasetSubcategory.category == category)
    return session.exec(query).all()

# Agent Recommendation CRUD operations
def create_recommendation(
    session: Session,
    *,
    agent_name: str,
    dataset_id: int,
    type: str,
    content: Dict[str, Any],
    confidence: float,
    tags: List[str] = None
) -> AgentRecommendation:
    """Create a new agent recommendation"""
    recommendation = AgentRecommendation(
        agent_name=agent_name,
        dataset_id=dataset_id,
        type=type,
        content=content,
        confidence=confidence,
        tags=tags or []
    )
    session.add(recommendation)
    session.commit()
    session.refresh(recommendation)
    return recommendation

def get_recommendations_by_dataset(
    session: Session,
    dataset_id: int
) -> List[AgentRecommendation]:
    """Get all recommendations for a specific dataset"""
    query = select(AgentRecommendation).where(AgentRecommendation.dataset_id == dataset_id)
    return session.exec(query).all()

def get_recommendations_by_agent(
    session: Session,
    agent_name: str
) -> List[AgentRecommendation]:
    """Get all recommendations from a specific agent"""
    query = select(AgentRecommendation).where(AgentRecommendation.agent_name == agent_name)
    return session.exec(query).all()

def get_all_recommendations(
    session: Session
) -> List[AgentRecommendation]:
    """Get all agent recommendations across all datasets"""
    query = select(AgentRecommendation)
    return session.exec(query).all()

def search_datasets(session: Session, search_term: str, filters: Optional[Dict[str, Any]] = None) -> List[Dataset]:
    """
    Search for datasets matching a search term and optional filters.
    
    Args:
        session: Database session
        search_term: Text to search for in dataset name, description, or metadata
        filters: Optional dictionary of filters to apply (e.g., {"timeframe": "1d"})
        
    Returns:
        List of matching Dataset objects
    """
    # Start with a base query
    query = select(Dataset)
    
    # Add search term condition (search in name, description, and metadata)
    if search_term:
        query = query.where(
            (Dataset.name.contains(search_term)) |
            (Dataset.description.contains(search_term))
        )
    
    # Execute the query to get initial results
    datasets = session.exec(query).all()
    
    # Filter results based on metadata fields
    if filters:
        filtered_datasets = []
        for dataset in datasets:
            matches_all_filters = True
            
            for key, value in filters.items():
                # Check if the key exists in metadata and the value matches
                if key == "timeframe":
                    # Special handling for timeframe which is in dataset_metadata
                    if "timeframe" not in dataset.dataset_metadata or dataset.dataset_metadata["timeframe"] != value:
                        matches_all_filters = False
                        break
                else:
                    # For other filters, check in description as fallback
                    if key not in dataset.dataset_metadata and not f"{key}:{value}" in dataset.description:
                        matches_all_filters = False
                        break
                    elif key in dataset.dataset_metadata and dataset.dataset_metadata[key] != value:
                        matches_all_filters = False
                        break
            
            if matches_all_filters:
                filtered_datasets.append(dataset)
        
        return filtered_datasets
    
    return datasets
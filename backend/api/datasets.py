from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Body
from sqlmodel import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime

from backend.database import get_session
from backend.models.dataset import Dataset, DatasetSubcategory, AgentRecommendation, DatasetCategoryEnum
import backend.crud_datasets as crud_datasets

router = APIRouter(
    prefix="/datasets",
    tags=["datasets"],
    responses={404: {"description": "Not found"}},
)

# Recommendations are handled in a separate router in recommendations.py

@router.post("/", response_model=Dataset, status_code=status.HTTP_201_CREATED)
def create_dataset(
    *,
    session: Session = Depends(get_session),
    name: str,
    description: str,
    category: DatasetCategoryEnum,
    subcategory: str,
    source: str,
    format: str,
    size: int,
    path: str,
    dataset_file: Optional[UploadFile] = File(None),
    metadata: Optional[dict] = None,
    tags: Optional[List[str]] = None
):
    """
    Create a new dataset.
    Optionally accepts a file upload.
    """
    # TODO: Add file saving logic here if dataset_file is provided
    
    dataset = crud_datasets.create_dataset(
        session=session,
        name=name,
        description=description,
        category=category,
        subcategory=subcategory,
        source=source,
        format=format,
        size=size,
        path=path,
        dataset_metadata=metadata,
        tags=tags
    )
    return dataset

@router.get("/", response_model=List[Dataset])
def read_datasets(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """
    Retrieve all datasets, with optional filtering by category.
    """
    if category:
        try:
            category_enum = DatasetCategoryEnum(category)
            datasets = crud_datasets.get_datasets_by_category(session=session, category=category_enum, skip=skip, limit=limit)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
    else:
        datasets = crud_datasets.get_datasets(session=session, skip=skip, limit=limit)
    return datasets

@router.get("/check", response_model=dict)
def check_dataset_availability(
    symbol: str,
    timeframe: str,
    session: Session = Depends(get_session),
):
    """
    Check if a dataset is available for the given symbol and timeframe.
    Returns availability status, count, and date range information.
    """
    # Search for datasets matching the symbol and timeframe
    datasets = crud_datasets.search_datasets(
        session=session,
        search_term=symbol,
        filters={"timeframe": timeframe}
    )
    
    # Log the search results for debugging
    print(f"Dataset availability check for {symbol} with timeframe {timeframe}: Found {len(datasets)} datasets")
    
    # Initialize response with default values
    response = {
        "available": len(datasets) > 0,
        "count": len(datasets),
        "start_date": None,
        "end_date": None,
        "has_date_range": False
    }
    
    # If datasets are found, extract date range information
    if datasets:
        for dataset in datasets:
            print(f"  - Dataset: {dataset.name}, Timeframe: {dataset.dataset_metadata.get('timeframe', 'unknown')}")
            
            # Extract date range if available in metadata
            metadata = dataset.dataset_metadata
            if "start_date" in metadata and "end_date" in metadata:
                response["start_date"] = metadata["start_date"]
                response["end_date"] = metadata["end_date"]
                response["has_date_range"] = True
                break  # Use the first dataset with date range info
    
    return response

@router.get("/{dataset_id}", response_model=Dataset)
def read_dataset(
    *,
    session: Session = Depends(get_session),
    dataset_id: int,
):
    """
    Get a specific dataset by ID.
    """
    dataset = crud_datasets.get_dataset(session=session, dataset_id=dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.get("/{dataset_id}/data")
def read_dataset_data(
    *,
    session: Session = Depends(get_session),
    dataset_id: int,
    page: int = 1,
    pageSize: int = 100,
    sortColumn: Optional[str] = None,
    sortDirection: Optional[str] = None,
):
    """
    Get paginated data for a specific dataset.
    """
    dataset = crud_datasets.get_dataset(session=session, dataset_id=dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # In a real implementation, this would fetch the actual data from the dataset file
    # For now, we'll return mock data
    
    # Calculate total rows based on dataset size (rough estimate)
    # Assuming 100 bytes per row on average
    estimated_total_rows = max(1, dataset.size // 100)
    
    # Calculate start and end indices for pagination
    start_idx = (page - 1) * pageSize
    end_idx = min(start_idx + pageSize, estimated_total_rows)
    
    # Generate mock data rows
    data = []
    for i in range(start_idx, end_idx):
        # Create a row with some sample data
        row = {
            "timestamp": f"2023-01-{(i % 30) + 1:02d} {(i % 24):02d}:{(i % 60):02d}:00",
            "open": 100 + (i % 10),
            "high": 105 + (i % 15),
            "low": 95 + (i % 8),
            "close": 102 + (i % 12),
            "volume": 1000 + (i * 100)
        }
        data.append(row)
    
    return {
        "data": data,
        "totalRows": estimated_total_rows
    }

@router.get("/{dataset_id}/download")
def download_dataset(
    *,
    session: Session = Depends(get_session),
    dataset_id: int,
):
    """
    Download a dataset file.
    """
    dataset = crud_datasets.get_dataset(session=session, dataset_id=dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # In a real implementation, this would return the actual file
    # For now, we'll return a mock response
    return {
        "download_url": f"/api/datasets/{dataset_id}/file",
        "filename": f"{dataset.name}.{dataset.format}"
    }

@router.post("/download", status_code=status.HTTP_201_CREATED)
def download_market_data(
    *,
    session: Session = Depends(get_session),
    symbol: str = Body(...),
    timeframe: str = Body(...),
    startDate: str = Body(...),
    endDate: str = Body(...),
):
    """
    Download market data for a specific symbol and timeframe.
    This would connect to a broker API in a real implementation.
    """
    print(f"Downloading market data for {symbol} ({timeframe}) from {startDate} to {endDate}")
    
    # Check if dataset already exists
    existing_datasets = crud_datasets.search_datasets(
        session=session,
        search_term=symbol,
        filters={"timeframe": timeframe}
    )
    
    if existing_datasets:
        print(f"Dataset for {symbol} ({timeframe}) already exists. Returning existing dataset.")
        return {"success": True, "message": "Dataset already exists", "dataset_id": existing_datasets[0].id}
    
    # In a real implementation, this would download data from a broker API
    # For now, we'll create a mock dataset
    
    # Calculate size based on timeframe and date range
    size_multiplier = {
        "1m": 10,
        "5m": 5,
        "15m": 3,
        "1h": 1,
        "4h": 0.5,
        "1d": 0.2
    }.get(timeframe, 1)
    
    # Parse dates to calculate approximate size
    from datetime import datetime
    start = datetime.strptime(startDate, "%Y-%m-%d")
    end = datetime.strptime(endDate, "%Y-%m-%d")
    days = (end - start).days
    size = int(days * size_multiplier * 100)  # Rough estimate in KB
    
    # Create a new dataset
    dataset = crud_datasets.create_dataset(
        session=session,
        name=f"{symbol} Historical ({timeframe})",
        description=f"Historical price data for {symbol} with {timeframe} timeframe",
        category=DatasetCategoryEnum.FOREX if "/" in symbol else DatasetCategoryEnum.STOCKS,
        subcategory="major_pairs" if symbol == "EUR/USD" else "other",
        source="OANDA" if "/" in symbol else "Alpha Vantage",
        format="CSV",
        size=size,
        path=f"/data/{symbol.lower().replace('/', '')}/{timeframe}_{startDate}_{endDate}.csv",
        dataset_metadata={
            "timeframe": timeframe,
            "startDate": startDate,
            "endDate": endDate,
            "columns": ["timestamp", "open", "high", "low", "close", "volume"],
            "lumibot_compatible": True
        },
        tags=[symbol.lower(), timeframe, "downloaded"]
    )
    
    return {
        "success": True,
        "message": f"Successfully downloaded {symbol} data with {timeframe} timeframe",
        "dataset_id": dataset.id
    }

@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    *,
    session: Session = Depends(get_session),
    dataset_id: int,
):
    """
    Delete a dataset.
    """
    deleted = crud_datasets.delete_dataset(session=session, dataset_id=dataset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return None

@router.get("/{dataset_id}/recommendations", response_model=List[AgentRecommendation])
def read_dataset_recommendations(
    *,
    session: Session = Depends(get_session),
    dataset_id: int,
):
    """
    Get recommendations for a specific dataset.
    """
    dataset = crud_datasets.get_dataset(session=session, dataset_id=dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    recommendations = crud_datasets.get_recommendations_by_dataset(session=session, dataset_id=dataset_id)
    return recommendations
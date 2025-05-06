from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session
from typing import List, Optional

from .. import crud, models
from ..database import get_session
# TODO: Import file handling logic when implemented

router = APIRouter(
    prefix="/strategies",
    tags=["strategies"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=models.StrategyRead, status_code=status.HTTP_201_CREATED)
def create_new_strategy(
    *,
    session: Session = Depends(get_session),
    strategy_in: models.StrategyCreate,
    # TODO: Add file upload parameter when implementing file handling
    # strategy_file: Optional[UploadFile] = File(None),
):
    """
    Create a new strategy.
    Optionally accepts a file upload (implementation pending).
    """
    # TODO: Add file saving logic here if strategy_file is provided
    # If file provided, ensure source is 'Uploaded' and store file_name
    # Example (needs proper error handling and storage location):
    # if strategy_file:
    #     if strategy_in.source != 'Uploaded':
    #         strategy_in.source = 'Uploaded' # Override or validate source
    #     strategy_in.file_name = strategy_file.filename
    #     # file_location = f"path/to/storage/{strategy_file.filename}"
    #     # with open(file_location, "wb+") as file_object:
    #     #     file_object.write(strategy_file.file.read())
    #     print(f"Simulating save of file: {strategy_file.filename}")


    strategy = crud.create_strategy(session=session, strategy_in=strategy_in)
    return strategy

@router.get("/", response_model=List[models.StrategyRead])
def read_strategies(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
):
    """
    Retrieve all strategies.
    """
    strategies = crud.get_strategies(session=session, skip=skip, limit=limit)
    return strategies

@router.get("/{strategy_id}", response_model=models.StrategyRead)
def read_strategy(
    *,
    session: Session = Depends(get_session),
    strategy_id: int,
):
    """
    Get a specific strategy by ID.
    """
    strategy = crud.get_strategy(session=session, strategy_id=strategy_id)
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")
    return strategy

@router.patch("/{strategy_id}", response_model=models.StrategyRead)
def update_existing_strategy(
    *,
    session: Session = Depends(get_session),
    strategy_id: int,
    strategy_in: models.StrategyUpdate,
):
    """
    Update a strategy (e.g., change status, description).
    """
    strategy = crud.update_strategy(session=session, strategy_id=strategy_id, strategy_in=strategy_in)
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")
    return strategy

@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_strategy(
    *,
    session: Session = Depends(get_session),
    strategy_id: int,
):
    """
    Delete a strategy.
    """
    deleted = crud.delete_strategy(session=session, strategy_id=strategy_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")
    # No content returned on successful delete
    return None

# TODO: Add endpoints for triggering backtests, getting results, etc.
# @router.post("/{strategy_id}/backtest", ...)
# @router.get("/{strategy_id}/backtest/results", ...)

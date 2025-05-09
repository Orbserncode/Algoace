from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing import List, Optional

from backend.database import get_session
from backend.models.dataset import AgentRecommendation
import backend.crud_datasets as crud_datasets

router = APIRouter(
    prefix="/recommendations",
    tags=["recommendations"],
    responses={404: {"description": "Not found"}},
)

@router.get("/all")
def read_all_recommendations(
    *,
    session: Session = Depends(get_session),
):
    """
    Get all agent recommendations across all datasets.
    """
    try:
        print("Fetching all recommendations...")
        recommendations = crud_datasets.get_all_recommendations(
            session=session
        )
        print(f"Found {len(recommendations)} recommendations")
        
        # Convert the recommendations to dictionaries and convert the enum to a string
        result = []
        for rec in recommendations:
            print(f"Processing recommendation: ID={rec.id}, Agent={rec.agent_name}, Type={rec.type}")
            # Get the dataset name
            dataset = crud_datasets.get_dataset(session=session, dataset_id=rec.dataset_id)
            dataset_name = dataset.name if dataset else "Unknown Dataset"
            print(f"Dataset name: {dataset_name}")
            
            rec_dict = {
                "id": str(rec.id),  # Convert to string to match frontend expectations
                "timestamp": rec.timestamp.isoformat(),  # Convert datetime to ISO string
                "agentName": rec.agent_name,  # Rename to match frontend expectations
                "agentId": str(rec.id),  # Add agentId field
                "datasetId": str(rec.dataset_id),  # Convert to string to match frontend expectations
                "datasetName": dataset_name,  # Add dataset name
                "type": rec.type.value,  # Convert enum to string
                "content": rec.content,
                "confidence": rec.confidence,
                "tags": rec.tags if rec.tags else []  # Ensure tags is an array
            }
            result.append(rec_dict)
        
        print(f"Returning {len(result)} recommendations")
        return result
    except Exception as e:
        import traceback
        print(f"Error in read_all_recommendations: {e}")
        print(traceback.format_exc())
        return []

@router.get("/{recommendation_id}")
def read_recommendation(
    *,
    session: Session = Depends(get_session),
    recommendation_id: int,
):
    """
    Get a specific recommendation by ID.
    """
    # This is a placeholder for a function that would get a specific recommendation
    # You would need to add this function to crud_datasets.py
    return {"message": "Not implemented yet"}
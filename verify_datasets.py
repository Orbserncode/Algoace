import os
from sqlmodel import Session, select
from backend.database import engine
from backend.models.dataset import Dataset

def verify_datasets():
    """Verify that dataset paths are correct and files exist"""
    with Session(engine) as session:
        # Get all datasets
        datasets = session.exec(select(Dataset)).all()
        
        print(f"Found {len(datasets)} datasets in the database")
        
        for dataset in datasets:
            path = dataset.path
            file_exists = os.path.exists(path)
            
            print(f"Dataset ID: {dataset.id}, Name: {dataset.name}")
            print(f"  Path: {path}")
            print(f"  File exists: {file_exists}")
            print(f"  Timeframe: {dataset.dataset_metadata.get('timeframe', 'unknown')}")
            print()
            
            # Create empty files for datasets that don't exist
            if not file_exists:
                try:
                    # Create directory if it doesn't exist
                    os.makedirs(os.path.dirname(path), exist_ok=True)
                    
                    # Create empty file
                    with open(path, 'w') as f:
                        if path.endswith('.csv'):
                            f.write("date,open,high,low,close,volume\n")
                        elif path.endswith('.json'):
                            f.write("[]")
                    
                    print(f"  Created empty file at {path}")
                except Exception as e:
                    print(f"  Error creating file: {str(e)}")

if __name__ == "__main__":
    verify_datasets()
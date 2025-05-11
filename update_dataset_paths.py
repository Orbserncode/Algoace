from sqlmodel import Session, select
from backend.database import engine
from backend.models.dataset import Dataset

def update_dataset_paths():
    """Update dataset paths to point to the local workspace directory"""
    with Session(engine) as session:
        # Get all datasets
        datasets = session.exec(select(Dataset)).all()
        
        print(f"Found {len(datasets)} datasets in the database")
        
        for dataset in datasets:
            old_path = dataset.path
            
            # Update paths to point to our workspace directory
            if old_path.startswith('/data/'):
                new_path = old_path.replace('/data/', 'data/')
                dataset.path = new_path
                print(f"Updating path: {old_path} -> {new_path}")
            
        # Commit changes
        session.commit()
        print("Database updated successfully")

if __name__ == "__main__":
    update_dataset_paths()
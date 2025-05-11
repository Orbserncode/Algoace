from sqlmodel import Session
from backend.database import engine
from backend.crud_datasets import get_datasets

def main():
    with Session(engine) as session:
        datasets = get_datasets(session)
        print('Available datasets:')
        for ds in datasets:
            print(f'ID: {ds.id}, Name: {ds.name}')
            print(f'  Path: {ds.path}')
            print(f'  Metadata: {ds.dataset_metadata}')
            print()

if __name__ == "__main__":
    main()
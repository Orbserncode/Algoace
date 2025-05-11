from sqlmodel import Session
from backend.database import engine
from backend.crud import get_strategies

def main():
    with Session(engine) as session:
        strategies = get_strategies(session)
        print('Available strategies:')
        for strategy in strategies:
            print(f'ID: {strategy.id}, Name: {strategy.name}, Type: {strategy.strategy_type}')
            print(f'  Description: {strategy.description}')
            print()

if __name__ == "__main__":
    main()
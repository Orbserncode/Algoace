from database import get_session, engine
from sqlmodel import Session
from models import Strategy

def add_sample_strategy():
    with Session(engine) as session:
        strategy = Strategy(
            name='EMA Cross',
            description='Simple EMA crossover strategy.',
            status='Active',
            pnl=1250.75,
            win_rate=65.2,
            source='Uploaded',
            file_name='ema_cross_strategy.py'
        )
        session.add(strategy)
        session.commit()
        print('Strategy added successfully')

if __name__ == "__main__":
    add_sample_strategy()
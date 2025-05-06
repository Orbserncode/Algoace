# This file can be removed or used for non-SQLModel Pydantic schemas if needed later.
# SQLModel combines Pydantic validation with SQLAlchemy models,
# so StrategyCreate, StrategyUpdate, StrategyRead are defined in models.py.

# Example of a potential non-db schema:
# from pydantic import BaseModel
#
# class CliCommand(BaseModel):
#     command: str
#
# class CliResponse(BaseModel):
#     output: str
#     error: bool = False

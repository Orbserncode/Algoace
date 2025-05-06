import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
# target_metadata = None

# --- SQLModel Integration ---
# Import your SQLModel models here so Alembic can detect changes
from backend.models import Strategy # Import all your SQLModel table models
from backend.database import SQLModel # Import the base SQLModel

target_metadata = SQLModel.metadata
# --------------------------

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

# Override the sqlalchemy.url from alembic.ini with the environment variable if set
db_url = os.getenv("DATABASE_URL", config.get_main_option("sqlalchemy.url"))
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Include SQLModel specific options if necessary
        render_as_batch=True # Recommended for SQLite support
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Ensure connectable uses the URL from config (potentially overridden by env var)
    connectable_config = config.get_section(config.config_ini_section)
    if connectable_config:
        connectable = engine_from_config(
            connectable_config, # Use the retrieved section directly
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )
    else:
        # Fallback if section is not found (shouldn't happen with default ini)
        from backend.database import engine
        connectable = engine


    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Include SQLModel specific options if necessary
            render_as_batch=True # Recommended for SQLite support
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

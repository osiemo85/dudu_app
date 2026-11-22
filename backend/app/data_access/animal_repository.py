from app.core.config import settings
from app.data_access.database import database, using_postgres


def initialize_animal_tables() -> None:
    # Production PostgreSQL schemas use explicit Alembic/manual migrations.
    if using_postgres() or not settings.load_demo_seed:
        return
    script = (settings.seed_path.parent / "animal_cases.sql").read_text()
    with database() as connection:
        connection.executescript(script)

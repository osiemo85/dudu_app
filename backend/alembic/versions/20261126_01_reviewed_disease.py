"""Keep the expert's disease decision separate from the original AI result."""
from alembic import op
from sqlalchemy import inspect

revision = "20261126_01"
down_revision = "20261122_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in inspect(bind).get_columns("disease_cases")}
    if "reviewed_disease_id" not in columns:
        op.execute("ALTER TABLE disease_cases ADD COLUMN reviewed_disease_id INTEGER REFERENCES diseases(id) ON DELETE SET NULL")


def downgrade() -> None:
    # Preserve expert decisions.
    pass

"""Bootstrap empty application tables without local seed files or sample rows."""
from alembic import op

from app.data_access.database import _initialize_schema

revision = "20261122_01"
down_revision = "20261121_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    _initialize_schema(bind.connection.driver_connection, postgres=bind.dialect.name == "postgresql")


def downgrade() -> None:
    # Keep manually entered records and existing tables intact on downgrade.
    pass

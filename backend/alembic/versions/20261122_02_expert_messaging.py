"""Optional profile location and private expert conversations, without seed users."""
from alembic import op
from app.data_access.messaging_schema import initialize_messaging_schema

revision = "20261122_02"
down_revision = "20261122_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    initialize_messaging_schema(bind.connection.driver_connection, postgres=bind.dialect.name == "postgresql")


def downgrade() -> None:
    # Preserve private conversations and profile values rather than dropping data.
    pass

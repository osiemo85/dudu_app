"""Track ownership for saved disease cases.

Revision ID: 20261109_01
Revises:
Create Date: 2026-11-09
"""

from alembic import op
import sqlalchemy as sa


revision = "20261109_01"
down_revision = None
branch_labels = None
depends_on = None


INDEX_NAME = "disease_cases_user_id"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "disease_cases" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("disease_cases")}
    if "user_id" not in columns:
        # Batch mode keeps this migration portable to SQLite and PostgreSQL.
        with op.batch_alter_table("disease_cases") as batch_op:
            batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))

    indexes = {index["name"] for index in inspector.get_indexes("disease_cases")}
    if INDEX_NAME not in indexes:
        op.create_index(INDEX_NAME, "disease_cases", ["user_id", "created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "disease_cases" not in inspector.get_table_names():
        return

    indexes = {index["name"] for index in inspector.get_indexes("disease_cases")}
    if INDEX_NAME in indexes:
        op.drop_index(INDEX_NAME, table_name="disease_cases")

    columns = {column["name"] for column in inspector.get_columns("disease_cases")}
    if "user_id" in columns:
        with op.batch_alter_table("disease_cases") as batch_op:
            batch_op.drop_column("user_id")

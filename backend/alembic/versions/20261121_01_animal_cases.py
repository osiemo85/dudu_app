"""Add private animal-health case snapshots."""
from alembic import op
import sqlalchemy as sa

revision = '20261121_01'
down_revision = 'cef63bdbb746'
branch_labels = None
depends_on = None

def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if 'users' not in inspector.get_table_names():
        return
    if 'animal_cases' not in inspector.get_table_names():
        op.create_table('animal_cases',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('created_at', sa.Text(), nullable=False),
            sa.Column('observation_json', sa.Text(), nullable=False),
            sa.Column('result_json', sa.Text(), nullable=False))

def downgrade() -> None:
    if 'animal_cases' in sa.inspect(op.get_bind()).get_table_names():
        op.drop_table('animal_cases')

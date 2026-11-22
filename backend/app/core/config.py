import os
from dataclasses import dataclass, field
from pathlib import Path
import re
from urllib.parse import urlsplit

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_DIR = BACKEND_DIR.parent
load_dotenv(BACKEND_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    env: str = field(default_factory=lambda: os.getenv("ENV", "dev").strip().lower())
    # CORS origins must be supplied by the runtime environment; never default to a URL.
    frontend_url: str = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    # Required. Supports PostgreSQL/Supabase and explicit sqlite:/// URLs.
    # There is intentionally no implicit local-database fallback.
    database_url: str = field(default_factory=lambda: os.getenv("DATABASE_URL", "").strip(), repr=False)
    supabase_database_url: str = field(default_factory=lambda: os.getenv("SUPABASE_DATABASE_URL", "").strip(), repr=False)
    supabase_url: str = field(default_factory=lambda: os.getenv("SUPABASE_URL", "").strip().rstrip("/"))
    supabase_secret_key: str = field(default_factory=lambda: os.getenv("SUPABASE_SECRET_KEY", "").strip(), repr=False)
    supabase_storage_bucket: str = field(default_factory=lambda: os.getenv("SUPABASE_STORAGE_BUCKET", "").strip())
    seed_path: Path = PROJECT_DIR / "data" / "seed.sql"
    outbreak_evidence_dir: Path = Path(os.getenv("OUTBREAK_EVIDENCE_DIR", PROJECT_DIR / "data" / "outbreak_evidence"))
    openai_api_key: str | None = field(default=os.getenv("OPENAI_API_KEY"), repr=False)
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-5.6-terra")
    agent_debug_output: bool = os.getenv("AGENT_DEBUG_OUTPUT", "false").lower() in {"1", "true", "yes"}

    @property
    def is_production(self) -> bool:
        return self.env in {"prod", "production"}

    def __post_init__(self) -> None:
        if not self.is_production:
            return
        required = {
            "SUPABASE_DATABASE_URL": self.supabase_database_url,
            "SUPABASE_URL": self.supabase_url,
            "SUPABASE_SECRET_KEY": self.supabase_secret_key,
            "SUPABASE_STORAGE_BUCKET": self.supabase_storage_bucket,
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise ValueError("ENV=prod requires: " + ", ".join(missing))
        if not self.supabase_database_url.startswith(("postgresql://", "postgres://")):
            raise ValueError("SUPABASE_DATABASE_URL must be a PostgreSQL connection string.")
        url = urlsplit(self.supabase_url)
        if (url.scheme != "https" or not url.hostname or url.username or url.password
                or url.path not in {"", "/"} or url.query or url.fragment):
            raise ValueError("SUPABASE_URL must be the HTTPS project URL without a path or credentials.")
        if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]*", self.supabase_storage_bucket):
            raise ValueError("SUPABASE_STORAGE_BUCKET must be a bucket name, not a URL or path.")
        # All existing repositories and Alembic consume this resolved URL.
        # Never fall back to a development database in production.
        object.__setattr__(self, "database_url", self.supabase_database_url)


settings = Settings()


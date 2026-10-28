import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_DIR = BACKEND_DIR.parent
load_dotenv(BACKEND_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    database_path: Path = Path(os.getenv("DATABASE_PATH", PROJECT_DIR / "data" / "advisory.db"))
    seed_path: Path = PROJECT_DIR / "data" / "seed.sql"
    outbreak_evidence_dir: Path = Path(os.getenv("OUTBREAK_EVIDENCE_DIR", PROJECT_DIR / "data" / "outbreak_evidence"))
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-5.6-terra")
    agent_debug_output: bool = os.getenv("AGENT_DEBUG_OUTPUT", "false").lower() in {"1", "true", "yes"}


settings = Settings()


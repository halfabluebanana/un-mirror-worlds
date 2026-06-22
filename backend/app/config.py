import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    _backend_root = Path(__file__).resolve().parents[1]
    _repo_root = _backend_root.parent
    for _env_path in (_backend_root / ".env", _repo_root / ".env"):
        if _env_path.exists():
            load_dotenv(_env_path)
except ImportError:
    pass

REPO_ROOT = Path(__file__).resolve().parents[2]
CASE_STUDIES_DIR = REPO_ROOT / "case_studies"

DATACOMMONS_BASE_URL = (
    "https://cdc-un-cs-datacommons-web-service-620046630330.us-central1.run.app/core/api"
)
SDG_METADATA_API_URL = "https://unstats.un.org/SDGMetadataAPI/api/Metadata/SDMXReport"

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic")
LLM_EXTRACTION_ENABLED = os.getenv("LLM_EXTRACTION_ENABLED", "true").lower() in (
    "1",
    "true",
    "yes",
)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
ANTHROPIC_API_URL = os.getenv("ANTHROPIC_API_URL", "https://api.anthropic.com")

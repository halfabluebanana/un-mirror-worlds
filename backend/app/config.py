from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CASE_STUDIES_DIR = REPO_ROOT / "case_studies"

DATACOMMONS_BASE_URL = (
    "https://cdc-un-cs-datacommons-web-service-620046630330.us-central1.run.app/core/api"
)
SDG_METADATA_API_URL = "https://unstats.un.org/SDGMetadataAPI/api/Metadata/SDMXReport"

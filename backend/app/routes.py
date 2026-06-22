from flask import Blueprint, jsonify, request
from pydantic import ValidationError
import httpx

from app.models import IngestRequest, ReportClaim
from app.services.claim_extractor import extract_claim
from app.services.evaluation_engine import evaluate_claim, list_twins_summary, load_demo_claims

api_bp = Blueprint("api", __name__, url_prefix="/api")


def _error(message: str, status: int = 400):
    return jsonify({"description": message}), status


@api_bp.get("/health")
def health():
    return jsonify({"status": "ok"})


@api_bp.get("/twins")
def twins():
    return jsonify(list_twins_summary())


@api_bp.get("/demo-claims")
def demo_claims():
    claims = load_demo_claims()
    return jsonify([claim.model_dump() for claim in claims])


@api_bp.get("/demo-claims/<claim_id>")
def demo_claim(claim_id: str):
    for claim in load_demo_claims():
        if claim.claim_id == claim_id:
            return jsonify(claim.model_dump())
    return _error("Demo claim not found", 404)


@api_bp.post("/extract")
def extract():
    payload = request.get_json(silent=True)
    if payload is None:
        return _error("Request body must be JSON")

    try:
        ingest = IngestRequest.model_validate(payload)
    except ValidationError as exc:
        return _error(str(exc.errors()))

    if not ingest.url and not ingest.text:
        return _error("Provide either url or text")

    try:
        claim, method, preview = extract_claim(
            url=ingest.url,
            text=ingest.text,
            title=ingest.title,
        )
    except httpx.HTTPError as exc:
        return _error(f"Could not fetch URL: {exc}", 422)
    except ValueError as exc:
        return _error(str(exc))

    return jsonify(
        {
            "claim": claim.model_dump(),
            "extraction_method": method,
            "text_preview": preview,
        }
    )


@api_bp.post("/analyze")
def analyze():
    payload = request.get_json(silent=True)
    if payload is None:
        return _error("Request body must be JSON")

    try:
        ingest = IngestRequest.model_validate(payload)
    except ValidationError as exc:
        return _error(str(exc.errors()))

    if not ingest.url and not ingest.text:
        return _error("Provide either url or text")

    try:
        claim, method, preview = extract_claim(
            url=ingest.url,
            text=ingest.text,
            title=ingest.title,
        )
        result = evaluate_claim(claim)
    except httpx.HTTPError as exc:
        return _error(f"Could not fetch URL: {exc}", 422)
    except ValueError as exc:
        return _error(str(exc))

    return jsonify(
        {
            "claim": claim.model_dump(),
            "extraction_method": method,
            "text_preview": preview,
            "label": result.label.model_dump(),
        }
    )


@api_bp.post("/evaluate")
def evaluate():
    payload = request.get_json(silent=True)
    if payload is None:
        return _error("Request body must be JSON")

    try:
        claim = ReportClaim.model_validate(payload)
    except ValidationError as exc:
        return _error(str(exc.errors()))

    result = evaluate_claim(claim)
    return jsonify(result.model_dump())

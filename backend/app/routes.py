from flask import Blueprint, abort, jsonify, request
from pydantic import ValidationError

from app.models import ReportClaim
from app.services.evaluation_engine import evaluate_claim, list_twins_summary, load_demo_claims

api_bp = Blueprint("api", __name__, url_prefix="/api")


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
    abort(404, description="Demo claim not found")


@api_bp.post("/evaluate")
def evaluate():
    payload = request.get_json(silent=True)
    if payload is None:
        abort(400, description="Request body must be JSON")

    try:
        claim = ReportClaim.model_validate(payload)
    except ValidationError as exc:
        abort(400, description=exc.errors())

    result = evaluate_claim(claim)
    return jsonify(result.model_dump())

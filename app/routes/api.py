"""JSON API routes — balances, opportunities, AI recommend, execute-intent."""
from flask import Blueprint, jsonify, request

from app.services import chain_service, ai_service

bp = Blueprint("api", __name__)


@bp.route("/balances")
def balances():
    """GET /api/balances?address=... — aggregated balances for address."""
    address = request.args.get("address", "").strip()
    if not address:
        return jsonify({"error": "address required"}), 400
    data = chain_service.get_balances(address)
    return jsonify(data)


@bp.route("/opportunities")
def opportunities():
    """GET /api/opportunities — current top yield opportunities."""
    data = chain_service.get_opportunities()
    return jsonify(data)


@bp.route("/opportunity-history")
def opportunity_history():
    """GET /api/opportunity-history — historical APY series for charts."""
    return jsonify(chain_service.get_opportunity_history())


@bp.route("/recommend", methods=["POST"])
def recommend():
    """POST /api/recommend — AI yield recommendations. Body: { "address", "message?" }."""
    body = request.get_json(silent=True) or {}
    address = (body.get("address") or "").strip()
    message = (body.get("message") or "").strip()
    if not address:
        return jsonify({"error": "address required"}), 400
    recommendations = ai_service.get_recommendations(address, message)
    return jsonify({"recommendations": recommendations})


@bp.route("/execute-intent", methods=["POST"])
def execute_intent():
    """POST /api/execute-intent — returns encoded TX payload for wallet to sign/send.
    Body: { "address", "action_id", "params" }.
    """
    body = request.get_json(silent=True) or {}
    address = (body.get("address") or "").strip()
    action_id = body.get("action_id")
    params = body.get("params") or {}
    if not address or action_id is None:
        return jsonify({"error": "address and action_id required"}), 400
    payload = chain_service.build_execute_payload(address, action_id, params)
    demo_execution = chain_service.execute_action_demo(address, str(action_id), params)
    return jsonify({**payload, "demo_execution": demo_execution})


@bp.route("/tx-history")
def tx_history():
    """GET /api/tx-history?address=... — recent user transaction history."""
    address = request.args.get("address", "").strip()
    if not address:
        return jsonify({"error": "address required"}), 400
    return jsonify(chain_service.get_tx_history(address))


@bp.route("/tx-history", methods=["POST"])
def add_tx_history():
    """POST /api/tx-history — append transaction history row.
    Body: { address, kind, status, tx_hash?, details?, time? }
    """
    body = request.get_json(silent=True) or {}
    address = (body.get("address") or "").strip()
    if not address:
        return jsonify({"error": "address required"}), 400
    entry = chain_service.append_tx_history(
        address,
        {
            "kind": body.get("kind", "action"),
            "status": body.get("status", "pending"),
            "tx_hash": body.get("tx_hash", ""),
            "network": body.get("network", "demo"),
            "details": body.get("details", {}),
            "time": body.get("time"),
        },
    )
    return jsonify(entry), 201


@bp.route("/tx-lookup")
def tx_lookup():
    """GET /api/tx-lookup?tx_hash=... — check if tx is indexed on testnet."""
    tx_hash = request.args.get("tx_hash", "").strip()
    if not tx_hash:
        return jsonify({"error": "tx_hash required"}), 400
    return jsonify(chain_service.lookup_tx_on_testnet(tx_hash))

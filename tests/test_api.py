from __future__ import annotations


def test_balances_requires_address(client):
    resp = client.get("/api/balances")
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "address required"


def test_bridge_suggest_returns_payload(client):
    resp = client.post(
        "/api/bridge-suggest",
        json={"from_chain": "base", "asset": "USDC", "amount": "100", "preference": "cost"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert "best_route" in data
    assert "alternatives" in data
    assert data["best_route"]["asset"] == "USDC"


def test_tx_history_roundtrip(client):
    address = "init1history"
    add_resp = client.post(
        "/api/tx-history",
        json={
            "address": address,
            "kind": "send",
            "status": "pending",
            "network": "pending",
            "tx_hash": "ABC123",
        },
    )
    assert add_resp.status_code == 201

    list_resp = client.get(f"/api/tx-history?address={address}")
    assert list_resp.status_code == 200
    rows = list_resp.get_json()
    assert len(rows) == 1
    assert rows[0]["kind"] == "send"
    assert rows[0]["network"] == "pending"


def test_tx_lookup_validates_hash(client):
    resp = client.get("/api/tx-lookup?tx_hash=123")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["exists"] is False
    assert data["reason"] == "invalid_hash"


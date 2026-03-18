from __future__ import annotations

from app.services import chain_service


def test_build_execute_payload_contains_stake_message(app):
    with app.app_context():
        payload = chain_service.build_execute_payload(
            "init1abc",
            "stake_init",
            {"amount": "1.25"},
        )
    msgs = payload["payload"]["value"]["msgs"]
    assert msgs
    assert msgs[0]["typeUrl"] == "/cosmos.staking.v1beta1.MsgDelegate"
    assert msgs[0]["value"]["delegatorAddress"] == "init1abc"


def test_suggest_bridge_route_returns_best_route():
    result = chain_service.suggest_bridge_route(
        {"from_chain": "arbitrum", "asset": "USDC", "amount": "500", "preference": "balanced"}
    )
    assert "best_route" in result
    assert result["best_route"]["asset"] == "USDC"
    assert len(result["alternatives"]) >= 1
    assert "success_probability" in result["prediction"]


def test_execute_action_demo_bridge_updates_balance(app):
    address = "init1tester"
    with app.app_context():
        before = chain_service.get_balances(address)
        before_usdc = next((b for b in before["balances"] if b["symbol"] == "USDC"), {"amount": "0"})
        before_amt = int(before_usdc["amount"])

        result = chain_service.execute_action_demo(
            address,
            "bridge_in",
            {"asset": "USDC", "amount": "2.5", "destination": address},
        )

        assert result["applied"] is True
        after = chain_service.get_balances(address)
        after_usdc = next((b for b in after["balances"] if b["symbol"] == "USDC"), {"amount": "0"})
        assert int(after_usdc["amount"]) > before_amt


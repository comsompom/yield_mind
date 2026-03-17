"""Chain and data layer: balances, pools, opportunities, TX payloads."""
from flask import current_app


def get_balances(address: str) -> dict:
    """Aggregated balances for address (from RPC/indexer). Returns normalized dict."""
    # TODO: call Initia RPC / indexer; for now return stub
    return {
        "address": address,
        "chain_id": current_app.config.get("CHAIN_ID", "initiation-2"),
        "balances": [
            {"denom": "uinit", "amount": "1000000", "symbol": "INIT"},
            {"denom": "uusdc", "amount": "50000000", "symbol": "USDC"},
        ],
        "total_usd_estimate": "51.00",
    }


def get_opportunities() -> list:
    """Current top yield opportunities (pools, APYs, risk)."""
    # TODO: fetch from indexer/API; for now return stub
    return [
        {
            "id": "pool_staking_1",
            "name": "Initia Staking",
            "apy": "12.5",
            "risk": "low",
            "tvl": "1.2M",
            "action": "stake",
        },
        {
            "id": "pool_lp_1",
            "name": "INIT/USDC LP",
            "apy": "18.2",
            "risk": "medium",
            "tvl": "450K",
            "action": "add_liquidity",
        },
    ]


def build_execute_payload(address: str, action_id: str, params: dict) -> dict:
    """Build encoded TX payload for wallet (InterwovenKit) to sign/send."""
    # TODO: use Initia SDK to build real Msg; return serialized payload
    return {
        "chain_id": current_app.config.get("CHAIN_ID", "initiation-2"),
        "payload": {
            "type": "cosmos-sdk/StdTx",
            "value": {
                "msgs": [],
                "fee": {"amount": [], "gas": "200000"},
                "memo": f"YieldMind action:{action_id}",
            },
        },
        "action_id": action_id,
        "params": params,
    }

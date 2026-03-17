"""Chain and data layer: balances, pools, opportunities, TX payloads."""
from __future__ import annotations

from flask import current_app

# In-memory demo portfolio state by address. This lets the dashboard show
# balance changes after "Execute" actions even before real chain integration.
_DEMO_PORTFOLIOS: dict[str, dict[str, int]] = {}


def _get_portfolio(address: str) -> dict[str, int]:
    if address not in _DEMO_PORTFOLIOS:
        _DEMO_PORTFOLIOS[address] = {
            "INIT": 1_000_000,
            "USDC": 50_000_000,
            "stINIT": 0,
            "INIT-USDC-LP": 0,
        }
    return _DEMO_PORTFOLIOS[address]


def _portfolio_to_balances(portfolio: dict[str, int]) -> list[dict]:
    rows = []
    for symbol, denom in (
        ("INIT", "uinit"),
        ("USDC", "uusdc"),
        ("stINIT", "ustinit"),
        ("INIT-USDC-LP", "ulp"),
    ):
        amount = int(portfolio.get(symbol, 0))
        if amount <= 0:
            continue
        rows.append({"denom": denom, "amount": str(amount), "symbol": symbol})
    return rows


def get_balances(address: str) -> dict:
    """Aggregated balances for address (from RPC/indexer). Returns normalized dict."""
    portfolio = _get_portfolio(address)
    balances = _portfolio_to_balances(portfolio)
    total_usd = (portfolio.get("INIT", 0) / 1_000_000) + (portfolio.get("USDC", 0) / 1_000_000)
    return {
        "address": address,
        "chain_id": current_app.config.get("CHAIN_ID", "initiation-2"),
        "balances": balances,
        "total_usd_estimate": f"{total_usd:.2f}",
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


def execute_action_demo(address: str, action_id: str, params: dict | None = None) -> dict:
    """Apply action to local demo balances and return execution result."""
    params = params or {}
    portfolio = _get_portfolio(address)

    if action_id in ("pool_staking_1", "stake_init"):
        amount_pct = int(params.get("amount_pct", 30) or 30)
        amount_pct = max(1, min(100, amount_pct))
        init_balance = int(portfolio.get("INIT", 0))
        move_amount = max(1, (init_balance * amount_pct) // 100) if init_balance > 0 else 0
        if move_amount <= 0 or init_balance < move_amount:
            return {"applied": False, "message": "Not enough INIT to stake", "balances": get_balances(address)}
        portfolio["INIT"] = init_balance - move_amount
        portfolio["stINIT"] = int(portfolio.get("stINIT", 0)) + move_amount
        return {
            "applied": True,
            "message": f"Staked {move_amount} INIT ({amount_pct}%) in demo mode",
            "balances": get_balances(address),
        }

    if action_id in ("pool_lp_1", "add_liquidity"):
        amount_pct = int(params.get("amount_pct", 20) or 20)
        amount_pct = max(1, min(100, amount_pct))
        init_balance = int(portfolio.get("INIT", 0))
        usdc_balance = int(portfolio.get("USDC", 0))
        init_to_lp = max(1, (init_balance * amount_pct) // 100) if init_balance > 0 else 0
        usdc_to_lp = max(1, (usdc_balance * amount_pct) // 100) if usdc_balance > 0 else 0
        if init_to_lp <= 0 or usdc_to_lp <= 0 or init_balance < init_to_lp or usdc_balance < usdc_to_lp:
            return {"applied": False, "message": "Not enough INIT/USDC to add liquidity", "balances": get_balances(address)}
        portfolio["INIT"] = init_balance - init_to_lp
        portfolio["USDC"] = usdc_balance - usdc_to_lp
        portfolio["INIT-USDC-LP"] = int(portfolio.get("INIT-USDC-LP", 0)) + min(init_to_lp, usdc_to_lp)
        return {
            "applied": True,
            "message": "Added INIT/USDC liquidity in demo mode",
            "balances": get_balances(address),
        }

    if action_id == "bridge_in":
        asset = str(params.get("asset", "USDC")).upper()
        raw_amount = str(params.get("amount", "0")).strip()
        try:
            amount_units = int(float(raw_amount) * 1_000_000)
        except (TypeError, ValueError):
            amount_units = 0
        if amount_units <= 0:
            return {"applied": False, "message": "Bridge amount must be greater than 0", "balances": get_balances(address)}
        if asset not in ("USDC", "INIT"):
            return {"applied": False, "message": "Unsupported bridge asset in demo mode", "balances": get_balances(address)}
        portfolio[asset] = int(portfolio.get(asset, 0)) + amount_units
        return {
            "applied": True,
            "message": f"Bridged {raw_amount} {asset} to Initia (demo mode)",
            "balances": get_balances(address),
        }

    return {"applied": False, "message": "Action supported only as payload preview", "balances": get_balances(address)}

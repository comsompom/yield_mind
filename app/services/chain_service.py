"""Chain and data layer: balances, pools, opportunities, TX payloads."""
from __future__ import annotations

from datetime import datetime, timezone
import json
from urllib import error as urllib_error
from urllib import request as urllib_request

from flask import current_app

# In-memory demo portfolio state by address. This lets the dashboard show
# balance changes after "Execute" actions even before real chain integration.
_DEMO_PORTFOLIOS: dict[str, dict[str, int]] = {}
_TX_HISTORY: dict[str, list[dict]] = {}
_OPPORTUNITIES: list[dict] = [
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


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _parse_amount_uinit(value: object, default: int = 0) -> int:
    text = str(value or "").strip()
    if not text:
        return default
    try:
        return max(int(float(text) * 1_000_000), 0)
    except (TypeError, ValueError):
        return default


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
    return [dict(item) for item in _OPPORTUNITIES]


def get_opportunity_history() -> dict:
    """Stub historical series for charting and recommendation justification."""
    labels = ["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "Today"]
    return {
        "labels": labels,
        "series": [
            {
                "id": "pool_staking_1",
                "name": "Initia Staking",
                "points": [10.8, 11.2, 11.6, 12.0, 12.2, 12.4, 12.5],
            },
            {
                "id": "pool_lp_1",
                "name": "INIT/USDC LP",
                "points": [16.4, 16.8, 17.2, 17.7, 18.0, 18.1, 18.2],
            },
        ],
    }


def build_execute_payload(address: str, action_id: str, params: dict) -> dict:
    """Build encoded TX payload for wallet (InterwovenKit) to sign/send."""
    action = str(action_id)
    amount_uinit = _parse_amount_uinit(params.get("amount"), default=100_000)
    msgs: list[dict] = []

    if action in ("pool_staking_1", "stake_init"):
        validator = str(params.get("validator", "initvaloper1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq5f4n2"))
        msgs.append(
            {
                "typeUrl": "/cosmos.staking.v1beta1.MsgDelegate",
                "value": {
                    "delegatorAddress": address,
                    "validatorAddress": validator,
                    "amount": {"denom": "uinit", "amount": str(max(amount_uinit, 1))},
                },
            }
        )
    elif action in ("pool_lp_1", "add_liquidity"):
        msgs.append(
            {
                "typeUrl": "/initia.dex.v1.MsgAddLiquidity",
                "value": {
                    "sender": address,
                    "poolId": str(params.get("pool_id", "pool_lp_1")),
                    "tokenA": {"denom": "uinit", "amount": str(max(amount_uinit, 1))},
                    "tokenB": {"denom": "uusdc", "amount": str(max(amount_uinit, 1))},
                },
            }
        )
    elif action == "bridge_in":
        asset = str(params.get("asset", "USDC")).upper()
        denom = "uusdc" if asset == "USDC" else "uinit"
        destination = str(params.get("destination", address)).strip() or address
        from_chain = str(params.get("from_chain", "ethereum")).lower()
        msgs.append(
            {
                "typeUrl": "/initia.bridge.v1.MsgBridgeTransfer",
                "value": {
                    "sender": address,
                    "receiver": destination,
                    "sourceChain": from_chain,
                    "amount": {"denom": denom, "amount": str(max(amount_uinit, 1))},
                },
            }
        )

    return {
        "chain_id": current_app.config.get("CHAIN_ID", "initiation-2"),
        "payload": {
            "type": "cosmos-sdk/StdTx",
            "value": {
                "msgs": msgs,
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
        append_tx_history(
            address,
            {
                "kind": "recommendation",
                "status": "success",
                "network": "demo",
                "details": {"action_id": action_id, "amount_pct": amount_pct},
            },
        )
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
        append_tx_history(
            address,
            {
                "kind": "recommendation",
                "status": "success",
                "network": "demo",
                "details": {"action_id": action_id, "amount_pct": amount_pct},
            },
        )
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
        append_tx_history(
            address,
            {
                "kind": "bridge",
                "status": "success",
                "network": "demo",
                "details": {"asset": asset, "amount": raw_amount},
            },
        )
        return {
            "applied": True,
            "message": f"Bridged {raw_amount} {asset} to Initia (demo mode)",
            "balances": get_balances(address),
        }

    return {"applied": False, "message": "Action supported only as payload preview", "balances": get_balances(address)}


def append_tx_history(address: str, tx: dict) -> dict:
    """Add transaction entry for a wallet address."""
    entries = _TX_HISTORY.setdefault(address, [])
    entry = {
        "kind": tx.get("kind", "action"),
        "status": tx.get("status", "pending"),
        "tx_hash": tx.get("tx_hash", ""),
        "network": tx.get("network", "demo"),
        "details": tx.get("details", {}),
        "time": tx.get("time") or _now_iso(),
    }
    entries.insert(0, entry)
    _TX_HISTORY[address] = entries[:100]
    return entry


def get_tx_history(address: str) -> list[dict]:
    """Get recent tx history for address."""
    return _TX_HISTORY.get(address, [])


def lookup_tx_on_testnet(tx_hash: str) -> dict:
    """Check if tx hash exists on Initia testnet LCD."""
    normalized = (tx_hash or "").strip().upper()
    if len(normalized) != 64 or any(ch not in "0123456789ABCDEF" for ch in normalized):
        return {"exists": False, "reason": "invalid_hash"}

    url = f"https://lcd.testnet.initia.xyz/cosmos/tx/v1beta1/txs/{normalized}"
    req = urllib_request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib_request.urlopen(req, timeout=8) as resp:
            body = resp.read().decode("utf-8")
            data = json.loads(body) if body else {}
            return {"exists": bool(data.get("tx_response")), "reason": "found"}
    except urllib_error.HTTPError as exc:
        if exc.code == 404:
            return {"exists": False, "reason": "not_found"}
        return {"exists": False, "reason": f"http_{exc.code}"}
    except Exception:
        return {"exists": False, "reason": "lookup_failed"}


def suggest_bridge_route(params: dict) -> dict:
    """Return route candidates and best route for bridge-in."""
    from_chain = str(params.get("from_chain", "ethereum")).lower()
    asset = str(params.get("asset", "USDC")).upper()
    amount_raw = str(params.get("amount", "0")).strip()
    preference = str(params.get("preference", "balanced")).lower()
    try:
        amount = max(float(amount_raw), 0.0)
    except (TypeError, ValueError):
        amount = 0.0

    route_db = {
        "ethereum": {"fee_base": 4.8, "eta_min": 18, "reliability": 0.99},
        "arbitrum": {"fee_base": 1.7, "eta_min": 7, "reliability": 0.98},
        "base": {"fee_base": 1.4, "eta_min": 6, "reliability": 0.98},
        "optimism": {"fee_base": 1.6, "eta_min": 8, "reliability": 0.97},
        "polygon": {"fee_base": 0.9, "eta_min": 9, "reliability": 0.96},
        "cosmoshub": {"fee_base": 0.6, "eta_min": 11, "reliability": 0.95},
    }
    assets_multiplier = {"USDC": 1.0, "INIT": 0.85}
    selected = route_db.get(from_chain, route_db["ethereum"])
    all_routes = []
    for chain, data in route_db.items():
        multiplier = assets_multiplier.get(asset, 1.0)
        liquidity_penalty = 0.002 * amount
        fee_usd = round((data["fee_base"] * multiplier) + liquidity_penalty, 2)
        eta = int(data["eta_min"] + min(amount / 250, 12))
        confidence = max(0.72, min(0.995, data["reliability"] - (amount / 50000)))
        score = 0.0
        if preference == "cost":
            score = 100 - (fee_usd * 8) - eta
        elif preference == "speed":
            score = 100 - (eta * 3) - (fee_usd * 2)
        else:
            score = (confidence * 100) - (fee_usd * 4) - (eta * 1.2)
        all_routes.append(
            {
                "from_chain": chain,
                "asset": asset,
                "estimated_fee_usd": fee_usd,
                "estimated_eta_min": eta,
                "confidence": round(confidence, 3),
                "score": round(score, 3),
            }
        )
    all_routes.sort(key=lambda r: r["score"], reverse=True)

    preferred_route = next((r for r in all_routes if r["from_chain"] == from_chain), None)
    best_route = all_routes[0] if all_routes else preferred_route
    chosen = best_route or preferred_route or {
        "from_chain": from_chain,
        "asset": asset,
        "estimated_fee_usd": 0.0,
        "estimated_eta_min": 0,
        "confidence": 0.72,
        "score": 0.0,
    }

    why = (
        f"{chosen['from_chain']} has the best combined score for {asset} "
        f"considering fee (${chosen['estimated_fee_usd']}) and ETA ({chosen['estimated_eta_min']}m)."
    )
    return {
        "input": {
            "from_chain": from_chain,
            "asset": asset,
            "amount": amount_raw,
            "preference": preference,
        },
        "best_route": chosen,
        "selected_route": preferred_route,
        "alternatives": all_routes[:3],
        "explanation": why,
        "prediction": {
            "success_probability": chosen["confidence"],
            "expected_minutes": chosen["estimated_eta_min"],
        },
    }

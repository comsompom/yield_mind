"""AI recommendation engine: yield suggestions from wallet + market data."""
from flask import current_app

from app.services import chain_service


def get_recommendations(address: str, message: str = "") -> list:
    """
    Propose 1–3 concrete actions (e.g. deposit to pool X) with explanation and risk.
    Uses LLM when API key is set; otherwise returns deterministic fallback suggestions.
    """
    wallet = chain_service.get_balances(address)
    opportunities = chain_service.get_opportunities()

    api_key = current_app.config.get("OPENAI_API_KEY")
    if api_key and message:
        return _recommend_via_llm(wallet, opportunities, message)
    return _recommend_fallback(wallet, opportunities, message)


def _recommend_fallback(wallet: dict, opportunities: list, message: str) -> list:
    """Deterministic fallback recommendations when no LLM or empty message."""
    recs = []
    for i, opp in enumerate(opportunities[:3]):
        recs.append({
            "id": opp["id"],
            "action": opp["action"],
            "title": f"Consider {opp['name']}",
            "description": f"APY {opp['apy']}%, risk {opp['risk']}. {opp.get('action', 'stake')} for yield.",
            "risk": opp.get("risk", "medium"),
            "params": {"pool_id": opp["id"], "amount_pct": 30},
        })
    return recs


def _recommend_via_llm(wallet: dict, opportunities: list, message: str) -> list:
    """Call OpenAI (or compatible) API for natural-language recommendations."""
    try:
        from openai import OpenAI
        client = OpenAI(
            api_key=current_app.config.get("OPENAI_API_KEY"),
            base_url=current_app.config.get("OPENAI_BASE_URL"),
        )
        model = current_app.config.get("AI_MODEL", "gpt-4o-mini")
        prompt = _build_prompt(wallet, opportunities, message)
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
        )
        text = response.choices[0].message.content or ""
        return _parse_llm_recommendations(text, opportunities)
    except Exception:
        return _recommend_fallback(wallet, opportunities, message)


def _build_prompt(wallet: dict, opportunities: list, message: str) -> str:
    """Build prompt for LLM."""
    balances_str = ", ".join(
        f"{b.get('symbol', b.get('denom', ''))}: {b.get('amount', '0')}"
        for b in wallet.get("balances", [])
    )
    opps_str = "\n".join(
        f"- {o['name']}: APY {o['apy']}%, risk {o['risk']}, action={o.get('action')}"
        for o in opportunities
    )
    return f"""User wallet: {balances_str}.
Available yield opportunities:
{opps_str}

User message: {message or 'Suggest best yield actions.'}

Respond with 1-3 concrete recommendations. Each line: "ACTION_ID | Title | Short description | risk_level".
Example: pool_staking_1 | Stake INIT | Move 30% of INIT to staking for 12.5% APY | low
Use only the ACTION_IDs from the list above."""


def _parse_llm_recommendations(text: str, opportunities: list) -> list:
    """Parse LLM response into list of recommendation dicts."""
    opp_by_id = {o["id"]: o for o in opportunities}
    recs = []
    for line in text.strip().split("\n"):
        line = line.strip()
        if not line or "|" not in line:
            continue
        parts = [p.strip() for p in line.split("|", 3)]
        if len(parts) < 3:
            continue
        action_id, title, desc = parts[0], parts[1], parts[2]
        risk = parts[3] if len(parts) > 3 else "medium"
        if action_id not in opp_by_id:
            continue
        opp = opp_by_id[action_id]
        recs.append({
            "id": action_id,
            "action": opp.get("action", "stake"),
            "title": title,
            "description": desc,
            "risk": risk,
            "params": {"pool_id": action_id, "amount_pct": 30},
        })
    return recs if recs else _recommend_fallback({"balances": []}, opportunities, "")

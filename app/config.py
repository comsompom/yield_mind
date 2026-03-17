"""Configuration for YieldMind Flask app."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _env(key: str, default: str = "") -> str:
    return os.environ.get(key, default).strip()


class Config:
    """Base config from environment."""

    SECRET_KEY = _env("SECRET_KEY", "dev-secret-change-in-production")
    DEBUG = _env("FLASK_DEBUG", "0").lower() in ("1", "true", "yes")

    # Initia appchain (L1 testnet default; use your rollup RPC + chain ID when deployed)
    INITIA_RPC_URL = _env("INITIA_RPC_URL", "https://rpc.testnet.initia.xyz")
    CHAIN_ID = _env("CHAIN_ID", "initiation-2")

    # AI (OpenAI or compatible API)
    OPENAI_API_KEY = _env("OPENAI_API_KEY", "")
    OPENAI_BASE_URL = _env("OPENAI_BASE_URL", "https://api.openai.com/v1")
    AI_MODEL = _env("AI_MODEL", "gpt-4o-mini")

    # Revenue: fee rate on executed actions (e.g. 0.001 = 0.1%)
    FEE_RATE = float(_env("FEE_RATE", "0.002"))
    FEE_RECIPIENT = _env("FEE_RECIPIENT", "")

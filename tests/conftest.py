from __future__ import annotations

import pytest

from app import create_app
from app.services import chain_service


@pytest.fixture(autouse=True)
def _reset_demo_state() -> None:
    chain_service._DEMO_PORTFOLIOS.clear()  # noqa: SLF001
    chain_service._TX_HISTORY.clear()  # noqa: SLF001


@pytest.fixture()
def app():
    app = create_app()
    app.config.update(TESTING=True)
    return app


@pytest.fixture()
def client(app):
    return app.test_client()


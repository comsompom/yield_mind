"""YieldMind — AI-powered yield optimization on Initia."""
from pathlib import Path

from flask import Flask

from app.config import Config

# Project root (parent of app/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent


def create_app(config_class=Config) -> Flask:
    """Application factory."""
    app = Flask(
        __name__,
        template_folder=str(PROJECT_ROOT / "templates"),
        static_folder=str(PROJECT_ROOT / "static"),
        static_url_path="/static",
    )
    app.config.from_object(config_class)

    from app.routes import web, api

    app.register_blueprint(web.bp, url_prefix="")
    app.register_blueprint(api.bp, url_prefix="/api")

    return app

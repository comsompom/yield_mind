"""Web (page) routes — server-rendered with Jinja2."""
from flask import Blueprint, render_template

bp = Blueprint("web", __name__)


@bp.route("/")
def index():
    """Landing / home page."""
    return render_template("index.html")


@bp.route("/dashboard")
def dashboard():
    """Main dashboard: positions and suggested actions."""
    return render_template("dashboard.html")


@bp.route("/health")
def health():
    """Health check for deployment."""
    return {"status": "ok", "app": "yieldmind"}, 200

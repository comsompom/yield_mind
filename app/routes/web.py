"""Web (page) routes — server-rendered with Jinja2."""
from flask import Blueprint, render_template

bp = Blueprint("web", __name__)


@bp.route("/")
def index():
    """Landing / home page."""
    return render_template("index.html")


@bp.route("/dashboard")
def dashboard():
    """Main dashboard: balances + opportunities + chart."""
    return render_template("dashboard.html")


@bp.route("/operations")
def operations():
    """Operations page: send, bridge, and transaction history."""
    return render_template("operations.html")


@bp.route("/recommendations")
def recommendations():
    """AI recommendations page with examples and prediction chart."""
    return render_template("recommendations.html")


@bp.route("/how-to-use")
def how_to_use():
    """Product guide: what users can achieve and how to use features."""
    return render_template("how_to_use.html")


@bp.route("/health")
def health():
    """Health check for deployment."""
    return {"status": "ok", "app": "yieldmind"}, 200

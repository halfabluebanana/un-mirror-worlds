import os

from flask import Flask
from flask_cors import CORS

from app.routes import api_bp


def create_app() -> Flask:
    app = Flask(__name__)
    allowed_origins = [
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        os.environ.get("FRONTEND_URL", ""),
    ]
    CORS(
        app,
        resources={r"/api/*": {"origins": [o for o in allowed_origins if o]}},
        supports_credentials=True,
    )
    app.register_blueprint(api_bp)
    return app


app = create_app()

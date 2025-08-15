import os
from flask import Flask, send_from_directory
from app import app as api_app
from config_loader import config_manager

# Configure app to serve frontend from ../dist directory
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist'))

# Register all API routes
for rule in api_app.url_map.iter_rules():
    # Skip static and debug endpoints
    if rule.endpoint != 'static' and not rule.rule.startswith('/debug'):
        api_app.add_url_rule(rule.rule, view_func=api_app.view_functions[rule.endpoint], methods=rule.methods)

# Route for serving the frontend assets
@api_app.route('/<path:path>')
def serve_frontend_assets(path):
    """Serve static files from the frontend build"""
    return send_from_directory(frontend_path, path)

# Route for serving index.html for all other routes (SPA client routing)
@api_app.route('/', defaults={'path': ''})
@api_app.route('/<path:path>')
def serve_spa(path):
    """Serve index.html for all client-side routes"""
    return send_from_directory(frontend_path, 'index.html')

if __name__ == '__main__':
    server_config = config_manager.get_server_config()
    port = int(os.environ.get('PORT', server_config.get("port", 5001)))
    host = server_config.get("host", "0.0.0.0")
    debug = server_config.get("debug", False)
    api_app.run(host=host, port=port, debug=debug) 
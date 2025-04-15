import os
import json

class ConfigManager:
    """Configuration manager for the backend"""
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one instance exists"""
        if cls._instance is None:
            cls._instance = super(ConfigManager, cls).__new__(cls)
            cls._instance._load_config()
        return cls._instance
    
    def _load_config(self):
        """Load configuration from JSON file"""
        config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'config.json')
        try:
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"Error loading configuration: {e}")
            # Use default configuration if file cannot be loaded
            self.config = {
                "backend": {
                    "server": {
                        "host": "0.0.0.0",
                        "port": 5001,
                        "debug": True
                    },
                    "uploads": {
                        "folder": "uploads",
                        "allowedExtensions": ["png", "jpg", "jpeg", "gif", "pdf", "txt", "doc", "docx"],
                        "maxContentLength": 16 * 1024 * 1024  # 16MB
                    },
                    "cors": {
                        "enabled": True
                    }
                }
            }
    
    def get_config(self):
        """Get the entire configuration"""
        return self.config
    
    def get_backend_config(self):
        """Get backend specific configuration"""
        return self.config.get("backend", {})
    
    def get_server_config(self):
        """Get server configuration"""
        return self.get_backend_config().get("server", {})
    
    def get_uploads_config(self):
        """Get uploads configuration"""
        return self.get_backend_config().get("uploads", {})
    
    def get_cors_config(self):
        """Get CORS configuration"""
        return self.get_backend_config().get("cors", {})

# Create a singleton instance
config_manager = ConfigManager() 
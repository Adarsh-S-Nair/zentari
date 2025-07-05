import os
from plaid import Configuration, ApiClient
from plaid.api import plaid_api

class PlaidConfig:
    def __init__(self, environment='sandbox'):
        # Map development to sandbox since Plaid only supports sandbox and production
        if environment == 'development':
            environment = 'sandbox'
        
        self.environment = environment
        
        # Plaid uses the same client ID for both environments
        self.client_id = os.getenv('PLAID_CLIENT_ID')
        
        # Get environment-specific secrets
        if environment == 'sandbox':
            self.secret = os.getenv('PLAID_SECRET')  # Use the environment-specific secret
            self.host = 'https://sandbox.plaid.com'
        elif environment == 'production':
            self.secret = os.getenv('PLAID_SECRET')  # Use the environment-specific secret
            self.host = 'https://production.plaid.com'
        else:
            raise ValueError(f"Invalid environment: {environment}. Must be 'sandbox' or 'production'")
        
        if not self.client_id:
            raise ValueError("PLAID_CLIENT_ID must be set in environment variables")
        
        if not self.secret:
            raise ValueError(f"PLAID_SECRET must be set in environment variables")
        
        # Configure Plaid client
        configuration = Configuration(
            host=self.host,
            api_key={
                'clientId': self.client_id,
                'secret': self.secret,
            }
        )
        
        # Disable proxy settings in configuration
        configuration.proxy = None
        
        # Create API client without any additional parameters
        # Filter out any proxy-related environment variables that might be automatically passed
        original_proxy_vars = {}
        proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'NO_PROXY', 'no_proxy']
        
        # Temporarily remove proxy environment variables
        for var in proxy_vars:
            if var in os.environ:
                original_proxy_vars[var] = os.environ[var]
                del os.environ[var]
        
        try:
            print(f"Creating Plaid ApiClient with configuration: host={self.host}")
            api_client = ApiClient(configuration)
            print("Plaid ApiClient created successfully")
        except Exception as e:
            print(f"Error creating Plaid ApiClient: {e}")
            raise
        finally:
            # Restore original proxy environment variables
            for var, value in original_proxy_vars.items():
                os.environ[var] = value
        self.client = plaid_api.PlaidApi(api_client)
    
    def get_client(self):
        """Get the configured Plaid client"""
        return self.client

# Global Plaid client instances
plaid_clients = {}

def get_plaid_client(environment='sandbox'):
    """Get or create the Plaid client instance for the specified environment"""
    # Map development to sandbox
    if environment == 'development':
        environment = 'sandbox'
    
    if environment not in plaid_clients:
        plaid_clients[environment] = PlaidConfig(environment).get_client()
    return plaid_clients[environment] 
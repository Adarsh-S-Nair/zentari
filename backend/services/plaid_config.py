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
            self.secret = os.getenv('PLAID_SANDBOX_SECRET')
            self.host = 'https://sandbox.plaid.com'
        elif environment == 'production':
            self.secret = os.getenv('PLAID_PRODUCTION_SECRET')
            self.host = 'https://production.plaid.com'
        else:
            raise ValueError(f"Invalid environment: {environment}. Must be 'sandbox' or 'production'")
        
        if not self.client_id:
            raise ValueError("PLAID_CLIENT_ID must be set in environment variables")
        
        if not self.secret:
            raise ValueError(f"PLAID_{environment.upper()}_SECRET must be set in environment variables")
        
        # Configure Plaid client
        configuration = Configuration(
            host=self.host,
            api_key={
                'clientId': self.client_id,
                'secret': self.secret,
            }
        )
        
        # Create API client without any additional parameters
        api_client = ApiClient(configuration)
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
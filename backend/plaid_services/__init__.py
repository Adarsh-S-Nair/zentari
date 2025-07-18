from .client import PlaidClient
from .link import LinkService
from .accounts import AccountService
from .transactions import TransactionService
from .institutions import InstitutionService
from .items import ItemService

# Global instances
_client = None
_link = None
_accounts = None
_transactions = None
_institutions = None
_items = None

def get_client() -> PlaidClient:
    """Get the global Plaid client instance"""
    global _client
    if _client is None:
        _client = PlaidClient()
    return _client

def get_link() -> LinkService:
    """Get the global link service instance"""
    global _link
    if _link is None:
        _link = LinkService(get_client())
    return _link

def get_accounts() -> AccountService:
    """Get the global account service instance"""
    global _accounts
    if _accounts is None:
        _accounts = AccountService(get_client())
    return _accounts

def get_transactions() -> TransactionService:
    """Get the global transaction service instance"""
    global _transactions
    if _transactions is None:
        _transactions = TransactionService(get_client())
    return _transactions

def get_institutions() -> InstitutionService:
    """Get the global institution service instance"""
    global _institutions
    if _institutions is None:
        _institutions = InstitutionService(get_client())
    return _institutions

def get_items() -> ItemService:
    """Get the global item service instance"""
    global _items
    if _items is None:
        _items = ItemService(get_client())
    return _items

__all__ = [
    'PlaidClient',
    'LinkService',
    'AccountService', 
    'TransactionService',
    'InstitutionService',
    'ItemService',
    'get_client',
    'get_link',
    'get_accounts',
    'get_transactions', 
    'get_institutions',
    'get_items'
] 
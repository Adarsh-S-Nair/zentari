from .client import SupabaseClient
from .accounts import AccountService
from .transactions import TransactionService
from .categories import CategoryService
from .institutions import InstitutionService
from .sync import SyncService
from .portfolios import PortfolioService
from .orders import OrderService
from .universe import UniverseService
from .positions import PositionService
from .snapshots import SnapshotService

# Global instances
_client = None
_accounts = None
_transactions = None
_categories = None
_institutions = None
_sync = None
_snapshots = None
_portfolios = None
_orders = None
_positions = None
_universe = None

def get_client() -> SupabaseClient:
    """Get the global Supabase client instance"""
    global _client
    if _client is None:
        _client = SupabaseClient()
    return _client

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

def get_categories() -> CategoryService:
    """Get the global category service instance"""
    global _categories
    if _categories is None:
        _categories = CategoryService(get_client())
    return _categories

def get_institutions() -> InstitutionService:
    """Get the global institution service instance"""
    global _institutions
    if _institutions is None:
        _institutions = InstitutionService(get_client())
    return _institutions

def get_sync() -> SyncService:
    """Get the global sync service instance"""
    global _sync
    if _sync is None:
        _sync = SyncService(get_client())
    return _sync

def get_snapshots() -> SnapshotService:
    """Get the global snapshot service instance"""
    global _snapshots
    if _snapshots is None:
        _snapshots = SnapshotService(get_client())
    return _snapshots

def get_portfolios() -> PortfolioService:
    """Get the global portfolio service instance"""
    global _portfolios
    if _portfolios is None:
        _portfolios = PortfolioService(get_client())
    return _portfolios

def get_orders() -> OrderService:
    global _orders
    if _orders is None:
        _orders = OrderService(get_client())
    return _orders

def get_positions() -> PositionService:
    global _positions
    if _positions is None:
        _positions = PositionService(get_client())
    return _positions

def get_universe() -> UniverseService:
    global _universe
    if _universe is None:
        _universe = UniverseService(get_client())
    return _universe

__all__ = [
    'SupabaseClient',
    'AccountService',
    'TransactionService',
    'CategoryService',
    'InstitutionService',
    'SyncService',
    'SnapshotService',
    'PortfolioService',
    'OrderService',
    'PositionService',
    'UniverseService',
    'get_client',
    'get_accounts',
    'get_transactions',
    'get_categories',
    'get_institutions',
    'get_sync',
    'get_snapshots'
    , 'get_portfolios', 'get_orders', 'get_positions', 'get_universe'
] 
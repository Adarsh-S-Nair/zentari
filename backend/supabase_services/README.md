# Supabase Services

This directory contains a modular, scalable Supabase service architecture that replaces the monolithic `SupabaseService` class.

## Architecture

The new structure is organized into focused service classes, each handling a specific domain:

### Core Components

- **`SupabaseClient`** - Base client for database operations
- **`AccountService`** - Account management operations
- **`TransactionService`** - Transaction operations
- **`CategoryService`** - Category management
- **`InstitutionService`** - Financial institution operations
- **`SyncService`** - Plaid sync state management
- **`SnapshotService`** - Balance snapshot operations

### Usage

#### Direct Service Access

```python
from supabase_services import get_accounts, get_transactions, get_categories

# Get services
accounts = get_accounts()
transactions = get_transactions()
categories = get_categories()

# Use services
user_accounts = accounts.get_by_user(user_id)
user_transactions = transactions.get_by_user(user_id)
all_categories = categories.get_all()
```

## Service Methods

### AccountService

- `store_plaid_accounts()` - Store Plaid accounts with sync state
- `insert()` - Insert new account
- `update()` - Update existing account
- `exists()` - Check if account exists
- `get_by_user()` - Get all accounts for user
- `get_by_id()` - Get account by ID
- `get_by_plaid_id()` - Get account by Plaid account ID
- `get_auto_sync()` - Get accounts with auto_sync=True
- `update_balances()` - Update account balances
- `delete()` - Delete account
- `count_by_item()` - Count accounts for item
- `update_auto_sync()` - Update auto_sync for account
- `update_name()` - Update name for account

### TransactionService

- `store()` - Store new transactions using upsert
- `update()` - Update existing transactions
- `get_by_user()` - Get transactions for user with category info
- `delete_by_plaid_ids()` - Delete transactions by Plaid transaction IDs
- `update_category()` - Update category for transaction

### CategoryService

- `get_all()` - Get all categories
- `get_id()` - Get category ID by name
- `_format_name()` - Format category name

### InstitutionService

- `get_or_create()` - Get or create institution record
- `get_by_ids()` - Get institution data for multiple IDs
- `get_by_id()` - Get institution by ID
- `get_by_plaid_id()` - Get institution by Plaid institution ID

### SyncService

- `create_or_update()` - Create or update sync state
- `get_state()` - Get sync state for user-item
- `get_by_item_id()` - Get plaid_item by item_id
- `update_cursor()` - Update transaction cursor
- `update_status()` - Update sync status
- `get_by_user()` - Get all sync states for user
- `delete()` - Delete sync state
- `delete_by_token()` - Find and delete sync state by access_token

### SnapshotService

- `store()` - Store balance snapshot
- `store_initial()` - Store initial balance snapshot for new account
- `get_by_account()` - Get snapshots for account
- `_balances_changed()` - Check if balances have changed

## Migration Guide

If you were using the old monolithic `SupabaseService`:

1. Replace `from services.supabase_service import get_supabase_service` with `from supabase_services import get_accounts, get_transactions, etc.`
2. Replace `service = get_supabase_service()` with individual service instances
3. Use the specific service methods directly

Example migration:
```python
# Old way
from services.supabase_service import get_supabase_service
service = get_supabase_service()
accounts = service.get_user_accounts(user_id)

# New way
from supabase_services import get_accounts
accounts_service = get_accounts()
accounts = accounts_service.get_by_user(user_id)
``` 
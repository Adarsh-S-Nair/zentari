# Plaid Services

This directory contains a modular, scalable Plaid service architecture that replaces the monolithic `PlaidService` class.

## Architecture

The new structure is organized into focused service classes, each handling a specific Plaid API domain:

### Core Components

- **`PlaidClient`** - Base client for Plaid API operations
- **`LinkService`** - Plaid Link operations (token creation, exchange)
- **`AccountService`** - Account operations
- **`TransactionService`** - Transaction operations and sync
- **`InstitutionService`** - Institution information operations
- **`ItemService`** - Item management operations

### Usage

#### Direct Service Access

```python
from plaid_services import get_link, get_accounts, get_transactions

# Get services
link = get_link()
accounts = get_accounts()
transactions = get_transactions()

# Use services
link_result = link.create_token(user_id)
accounts_result = accounts.get(access_token)
transactions_result = transactions.sync(access_token, cursor)
```

## Service Methods

### LinkService

- `create_token()` - Create a link token for Plaid Link flow
- `exchange_token()` - Exchange public token for access token

### AccountService

- `get()` - Get accounts for access token

### TransactionService

- `get()` - Get transactions for account IDs over specified period
- `sync()` - Sync transactions using Plaid's incremental sync API
- `get_by_ids()` - Get full transaction data for specific transaction IDs

### InstitutionService

- `get()` - Get institution information including logo

### ItemService

- `get()` - Get item information including institution_id
- `remove()` - Remove a Plaid item

## Migration Guide

If you were using the old monolithic `PlaidService`:

1. Replace `from services.plaid_service import PlaidService` with `from plaid_services import get_link, get_accounts, etc.`
2. Replace `service = PlaidService()` with individual service instances
3. Use the specific service methods directly

Example migration:
```python
# Old way
from services.plaid_service import PlaidService
service = PlaidService()
link_token = service.create_link_token(user_id)

# New way
from plaid_services import get_link
link = get_link()
link_token = link.create_token(user_id)
``` 
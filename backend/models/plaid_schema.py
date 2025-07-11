from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class LinkTokenRequest(BaseModel):
    user_id: str
    client_name: Optional[str] = "Zentari"

class LinkTokenResponse(BaseModel):
    success: bool
    link_token: Optional[str] = None
    expiration: Optional[str] = None
    error: Optional[str] = None

class PublicTokenRequest(BaseModel):
    public_token: str

class TokenExchangeResponse(BaseModel):
    success: bool
    access_token: Optional[str] = None
    item_id: Optional[str] = None
    error: Optional[str] = None

class AccountBalance(BaseModel):
    available: Optional[float] = None
    current: Optional[float] = None
    limit: Optional[float] = None
    iso_currency_code: Optional[str] = None
    unofficial_currency_code: Optional[str] = None

class Account(BaseModel):
    account_id: str
    name: str
    mask: Optional[str] = None
    type: Optional[str] = None
    subtype: Optional[str] = None
    balances: Optional[AccountBalance] = None

class AccountsResponse(BaseModel):
    success: bool
    accounts: Optional[List[Account]] = None
    item_id: Optional[str] = None
    institution_id: Optional[str] = None
    error: Optional[str] = None

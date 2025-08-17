from fastapi import APIRouter, HTTPException
import yfinance as yf

router = APIRouter(prefix="/market", tags=["Market Data"])

@router.get("/quote/{ticker}")
async def get_quote(ticker: str):
    try:
        symbol = (ticker or '').strip().upper()
        if not symbol:
            raise HTTPException(status_code=400, detail="Ticker required")
        info = yf.Ticker(symbol).fast_info
        price = info.get('last_price') or info.get('regularMarketPrice') or None
        currency = info.get('currency') or 'USD'
        if price is None:
            # Try fallback via history
            hist = yf.Ticker(symbol).history(period='1d')
            if not hist.empty:
                price = float(hist['Close'].iloc[-1])
        if price is None:
            raise HTTPException(status_code=404, detail="Price not available")
        return {"success": True, "ticker": symbol, "price": float(price), "currency": currency}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



from fastapi import APIRouter, HTTPException

try:
    from openai_services import get_openai  # type: ignore
except Exception:
    from backend.openai_services import get_openai  # type: ignore


router = APIRouter(prefix="/openai", tags=["OpenAI"])


@router.post("/hello")
async def openai_hello():
    """Send a minimal hello request to the LLM using the hello_test template.
    Returns a JSON object with the model's message content and raw payload.
    """
    try:
        svc = get_openai()
        if not svc.is_configured():
            svc.ensure_client()
            if not svc.is_configured():
                raise HTTPException(status_code=400, detail="OpenAI is not configured (missing API key)")

        # Use the simple hello template we added; ensure JSON response
        resp = svc.send_template_message("hello_test")
        if not resp.get("success"):
            raise HTTPException(status_code=500, detail=resp.get("error") or "OpenAI call failed")

        data = resp.get("data") or {}
        # Extract a friendly content string if present
        try:
            choices = data.get('choices') or []
            first = (choices[0] or {}) if choices else {}
            message = (first.get('message') or {})
            content = message.get('content')
        except Exception:
            content = None

        return {
            "success": True,
            "message": content,
            "raw": data,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



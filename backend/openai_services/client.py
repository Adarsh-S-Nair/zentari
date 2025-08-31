import os
from typing import Dict, Any, Optional
import requests
import json

try:
    from .prompts import PromptTemplates
except ImportError:
    # Fallback for when running as standalone
    PromptTemplates = None


class OpenAIService:
    """Minimal HTTP-based client for Chat Completions.

    Avoids SDK/version conflicts by calling the REST API directly.
    Reads API key from `OPENAI_API_KEY`. Optional overrides: `OPENAI_BASE_URL`, `OPENAI_MODEL`.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self._client = True if self.api_key else None  # sentinel to indicate configured
        self.prompts = PromptTemplates() if PromptTemplates else None

    def is_configured(self) -> bool:
        return bool(self.api_key) and self._client is not None

    def ensure_client(self) -> None:
        """No-op for HTTP transport; mark initialized if API key exists."""
        if self._client is None and self.api_key:
            self._client = True

    def debug_status(self) -> Dict[str, Any]:
        key = self.api_key or os.getenv('OPENAI_API_KEY') or ''
        masked = ''
        if key:
            # Show first 4 and last 4 characters only
            masked = f"{key[:4]}...{key[-4:]}"
        return {
            'has_api_key': bool(key),
            'api_key_length': len(key) if key else 0,
            'api_key_preview': masked,
            'client_initialized': self._client is not None,
            'model': os.getenv('OPENAI_MODEL', 'gpt-5-nano'),
            'cwd': os.getcwd(),
            'transport': 'http',
            'prompts_available': self.prompts is not None,
        }

    def send_simple_message(self, message: str) -> Dict[str, Any]:
        """Send a simple user message to a chat model and return the raw response.

        Returns a dict with keys: success(bool), data(any) or error(str).
        """
        if not self.is_configured():
            return {"success": False, "error": "OpenAI not configured or client unavailable"}
        try:
            print(f"[OPENAI] Sending message: {message}")
            base_url = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
            url = f"{base_url.rstrip('/')}/chat/completions"
            headers = {
                'Authorization': f"Bearer {self.api_key}",
                'Content-Type': 'application/json',
            }
            payload = {
                'model': os.getenv('OPENAI_MODEL', 'gpt-5-nano'),
                'messages': [
                    {"role": "system", "content": "You are a helpful trading assistant."},
                    {"role": "user", "content": message},
                ],
            }
            # Log request payload for debugging
            try:
                print(f"[OPENAI][REQUEST] {payload}")
            except Exception:
                pass

            r = requests.post(url, headers=headers, json=payload, timeout=30)
            if r.status_code >= 400:
                return {"success": False, "error": f"HTTP {r.status_code}: {r.text}"}
            data = r.json()
            # Log assistant content only, pretty-print JSON if possible
            try:
                choices = data.get('choices') or []
                first = (choices[0] or {}) if choices else {}
                message = (first.get('message') or {})
                content = (message.get('content') or '').strip()
                if content:
                    try:
                        parsed = json.loads(content)
                        print('[OPENAI][CONTENT]\n' + json.dumps(parsed, indent=2))
                    except Exception:
                        print(f"[OPENAI][CONTENT] {content}")
            except Exception:
                pass
            return {"success": True, "data": data}
        except Exception as e:
            print(f"[OPENAI] Error sending message: {e}")
            return {"success": False, "error": str(e)}

    def send_template_message(self, template_name: str, **kwargs) -> Dict[str, Any]:
        """Send a message using a prompt template with variable substitution.
        
        Args:
            template_name: Name of the template to use
            **kwargs: Variables to substitute in the template
        
        Returns:
            Dict with keys: success(bool), data(any) or error(str)
        """
        if not self.prompts:
            return {"success": False, "error": "Prompt templates not available"}
        
        if not self.is_configured():
            return {"success": False, "error": "OpenAI not configured or client unavailable"}
        
        try:
            # Get formatted prompt template
            prompt_data = None
            try:
                specialized = getattr(self.prompts, template_name, None)
                if callable(specialized):
                    candidate = specialized(**kwargs)
                    # Only accept specialized result if it's a dict
                    prompt_data = candidate if isinstance(candidate, dict) else None
            except Exception:
                prompt_data = None
            if not prompt_data:
                prompt_data = self.prompts.custom(template_name, **kwargs)
            if not prompt_data:
                return {"success": False, "error": f"Template '{template_name}' not found"}
            
            print(f"[OPENAI] Using template: {template_name}")
            
            # Prepare the request
            base_url = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
            url = f"{base_url.rstrip('/')}/chat/completions"
            headers = {
                'Authorization': f"Bearer {self.api_key}",
                'Content-Type': 'application/json',
            }
            
            # Build messages array
            messages = []
            if prompt_data.get('system'):
                messages.append({"role": "system", "content": prompt_data['system']})
            if prompt_data.get('user'):
                messages.append({"role": "user", "content": prompt_data['user']})
            
            if not messages:
                return {"success": False, "error": "Template must have system or user content"}
            
            # Debug: log full prompt content (system + user)
            try:
                sys_preview = (prompt_data.get('system') or '')
                usr_preview = (prompt_data.get('user') or '')
                print(f"[OPENAI][PROMPT] System ({len(sys_preview)} chars):\n{sys_preview}")
                print(f"[OPENAI][PROMPT] User ({len(usr_preview)} chars):\n{usr_preview}")
            except Exception:
                pass

            payload = {
                'model': prompt_data.get('model', os.getenv('OPENAI_MODEL', 'gpt-5-nano')),
                'messages': messages,
            }
            
            # Add response format if specified (json_object or json_schema)
            has_response_format = False
            if prompt_data.get('response_format'):
                rf = prompt_data['response_format']
                if rf == 'json_object':
                    payload['response_format'] = { 'type': 'json_object' }
                    has_response_format = True
                elif rf == 'json_schema':
                    js = prompt_data.get('json_schema') or {}
                    # Expect structure: { name: str, schema: {...}, strict: bool }
                    name = js.get('name', 'ResponseSchema')
                    schema = js.get('schema') or {}
                    strict = js.get('strict', True)
                    payload['response_format'] = {
                        'type': 'json_schema',
                        'json_schema': {
                            'name': name,
                            'schema': schema,
                            'strict': strict,
                        }
                    }
                    has_response_format = True
                else:
                    payload['response_format'] = rf
            # Make the request (support env override and per-template minimums)
            try:
                env_timeout = os.getenv('OPENAI_TIMEOUT')
                base_timeout = int(env_timeout) if env_timeout else int(prompt_data.get('timeout', 30))
            except Exception:
                base_timeout = 30
            # Portfolio strategy can be slow; ensure at least 60s
            if template_name == 'portfolio_strategy' and base_timeout < 60:
                base_timeout = 60

            def _post_with_timeout(p, to):
                return requests.post(url, headers=headers, json=p, timeout=to)

            # Log request payload for debugging
            try:
                print(f"[OPENAI][REQUEST] {payload}")
            except Exception:
                pass

            try:
                r = _post_with_timeout(payload, base_timeout)
            except requests.exceptions.Timeout:
                # Retry once with higher timeout
                retry_timeout = min(max(base_timeout * 2, 60), 120)
                print(f"[OPENAI] Request timeout at {base_timeout}s for '{template_name}', retrying with {retry_timeout}s")
                r = _post_with_timeout(payload, retry_timeout)
            
            if r.status_code >= 400:
                return {"success": False, "error": f"HTTP {r.status_code}: {r.text}"}
            
            data = r.json()
            # Log assistant content only, pretty-print JSON if possible
            try:
                choices = data.get('choices') or []
                first = (choices[0] or {}) if choices else {}
                message = (first.get('message') or {})
                content = (message.get('content') or '').strip()
                if content:
                    try:
                        parsed = json.loads(content)
                        print('[OPENAI][CONTENT]\n' + json.dumps(parsed, indent=2))
                    except Exception:
                        print(f"[OPENAI][CONTENT] {content}")
            except Exception:
                pass
            print(f"[OPENAI] Template response received for '{template_name}'")
            return {"success": True, "data": data}
            
        except Exception as e:
            print(f"[OPENAI] Error sending template message: {e}")
            return {"success": False, "error": str(e)}

    def send_portfolio_strategy_message(
        self, 
        starting_balance: float,
        timeframe_months: int = 6,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        market_cap_constraint: str = "micro-cap stocks (market cap under $300M)",
        rebalancing_frequency: str = "daily",
        portfolio_context: str = "Cash: $0\nPositions: None",
        available_universe: str = "[]"
    ) -> Dict[str, Any]:
        """Send a portfolio strategy message using the portfolio_strategy template"""
        return self.send_template_message(
            'portfolio_strategy',
            starting_balance=starting_balance,
            timeframe_months=timeframe_months,
            start_date=start_date,
            end_date=end_date,
            market_cap_constraint=market_cap_constraint,
            rebalancing_frequency=rebalancing_frequency,
            portfolio_context=portfolio_context,
            available_universe=available_universe
        )




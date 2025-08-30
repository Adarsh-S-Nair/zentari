import pytest
from unittest.mock import patch, Mock
import sys
from pathlib import Path

# Add the backend directory to the path so we can import the modules
# Resolve to the project backend folder: .../backend
backend_dir = Path(__file__).resolve().parents[3]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend.openai_services.client import OpenAIService


class TestOpenAIService:
    """Test cases for OpenAIService class"""
    
    def test_init_with_api_key(self):
        """Test initialization with API key"""
        service = OpenAIService(api_key="test_key")
        assert service.api_key == "test_key"
        assert service._client is True
    
    def test_init_without_api_key(self):
        """Test initialization without API key"""
        with patch.dict('os.environ', {}, clear=True):
            service = OpenAIService()
            assert service.api_key is None
            assert service._client is None
    
    def test_is_configured(self):
        """Test configuration status"""
        service = OpenAIService(api_key="test_key")
        assert service.is_configured() is True
        
        service = OpenAIService()
        assert service.is_configured() is False
    
    def test_ensure_client(self):
        """Test client initialization"""
        service = OpenAIService()
        assert service._client is None
        
        service.ensure_client()
        assert service._client is None  # No API key
        
        service = OpenAIService(api_key="test_key")
        service._client = None
        service.ensure_client()
        assert service._client is True
    
    def test_debug_status(self):
        """Test debug status information"""
        with patch.dict('os.environ', {'OPENAI_MODEL': 'gpt-4'}, clear=True):
            service = OpenAIService(api_key="test_key_12345")
            status = service.debug_status()
            
            assert status['has_api_key'] is True
            assert status['api_key_length'] == 14  # "test_key_12345" is 14 characters
            assert status['api_key_preview'] == "test...2345"  # Shows first 4 and last 4 chars
            assert status['client_initialized'] is True
            assert status['model'] == 'gpt-4'
            assert status['transport'] == 'http'
            assert status['prompts_available'] is True  # Should be True when prompts are available
    
    def test_send_portfolio_strategy_message(self):
        """Test sending portfolio strategy message"""
        mock_prompts = Mock()
        mock_prompts.custom.return_value = {
            'system': 'You are a portfolio strategist',
            'user': 'Build portfolio with $100',
            'max_tokens': 800,
            'response_format': 'json_object'
        }
        
        with patch('backend.openai_services.client.PromptTemplates', return_value=mock_prompts):
            service = OpenAIService(api_key="test_key")
            
            result = service.send_portfolio_strategy_message(
                starting_balance=100,
                timeframe_months=6,
                portfolio_context="Cash: $100\nPositions: None",
                available_universe="[{\"ticker\": \"ABCD\"}]"
            )
            
            # Verify the template was called with correct parameters
            mock_prompts.custom.assert_called_once_with(
                'portfolio_strategy',
                starting_balance=100,
                timeframe_months=6,
                start_date=mock_prompts.custom.call_args[1]['start_date'],
                end_date=mock_prompts.custom.call_args[1]['end_date'],
                market_cap_constraint="micro-cap stocks (market cap under $300M)",
                rebalancing_frequency="daily",
                portfolio_context="Cash: $100\nPositions: None",
                available_universe="[{\"ticker\": \"ABCD\"}]"
            )
    
    def test_send_portfolio_strategy_message_custom_parameters(self):
        """Test sending portfolio strategy message with custom parameters"""
        mock_prompts = Mock()
        mock_prompts.custom.return_value = {
            'system': 'You are a portfolio strategist',
            'user': 'Custom strategy',
            'max_tokens': 1000
        }
        
        with patch('backend.openai_services.client.PromptTemplates', return_value=mock_prompts):
            service = OpenAIService(api_key="test_key")
            
            result = service.send_portfolio_strategy_message(
                starting_balance=5000,
                timeframe_months=12,
                start_date="01-01-25",
                end_date="12-31-25",
                market_cap_constraint="large-cap stocks",
                rebalancing_frequency="weekly",
                portfolio_context="Cash: $1000\nPositions: AAPL: 10 shares",
                available_universe="[{\"ticker\": \"AAPL\"}]"
            )
            
            # Verify custom parameters were passed through
            call_args = mock_prompts.custom.call_args[1]
            assert call_args['starting_balance'] == 5000
            assert call_args['timeframe_months'] == 12
            assert call_args['start_date'] == "01-01-25"
            assert call_args['end_date'] == "12-31-25"
            assert call_args['market_cap_constraint'] == "large-cap stocks"
            assert call_args['rebalancing_frequency'] == "weekly"
            assert call_args['portfolio_context'] == "Cash: $1000\nPositions: AAPL: 10 shares"
            assert call_args['available_universe'] == "[{\"ticker\": \"AAPL\"}]"
    
    def test_send_portfolio_strategy_message_defaults(self):
        """Test sending portfolio strategy message with default parameters"""
        mock_prompts = Mock()
        mock_prompts.custom.return_value = {}
        
        with patch('backend.openai_services.client.PromptTemplates', return_value=mock_prompts):
            service = OpenAIService(api_key="test_key")
            
            result = service.send_portfolio_strategy_message(starting_balance=1000)
            
            # Verify default parameters
            call_args = mock_prompts.custom.call_args[1]
            assert call_args['starting_balance'] == 1000
            assert call_args['timeframe_months'] == 6
            assert call_args['market_cap_constraint'] == "micro-cap stocks (market cap under $300M)"
            assert call_args['rebalancing_frequency'] == "daily"
            assert call_args['portfolio_context'] == "Cash: $0\nPositions: None"
            assert call_args['available_universe'] == "[]"
    
    def test_send_portfolio_strategy_message_no_prompts(self):
        """Test behavior when prompts are not available"""
        with patch('backend.openai_services.client.PromptTemplates', None):
            service = OpenAIService(api_key="test_key")
            
            result = service.send_portfolio_strategy_message(starting_balance=1000)
            
            assert result['success'] is False
            assert 'Prompt templates not available' in result['error']
    
    def test_send_portfolio_strategy_message_not_configured(self):
        """Test behavior when service is not configured"""
        mock_prompts = Mock()
        mock_prompts.custom.return_value = {}
        
        with patch('backend.openai_services.client.PromptTemplates', return_value=mock_prompts):
            service = OpenAIService()  # No API key
            
            result = service.send_portfolio_strategy_message(starting_balance=1000)
            
            assert result['success'] is False
            assert 'OpenAI not configured' in result['error']
    
    def test_send_template_message_with_response_format(self):
        """Test that response_format is properly included in API calls"""
        mock_prompts = Mock()
        mock_prompts.custom.return_value = {
            'system': 'You are a portfolio strategist',
            'user': 'Build portfolio',
            'response_format': 'json_object',
            'max_tokens': 800
        }
        
        with patch('backend.openai_services.client.PromptTemplates', return_value=mock_prompts):
            with patch('backend.openai_services.client.requests.post') as mock_post:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {'choices': [{'message': {'content': '{}'}}]}
                mock_post.return_value = mock_response
                
                service = OpenAIService(api_key="test_key")
                
                result = service.send_template_message('portfolio_strategy', starting_balance=1000)
                
                # Verify the API call included response_format
                call_args = mock_post.call_args
                payload = call_args[1]['json']
                assert payload['response_format'] == { 'type': 'json_object' }
    
    def test_send_template_message_without_response_format(self):
        """Test that response_format is optional"""
        mock_prompts = Mock()
        mock_prompts.custom.return_value = {
            'system': 'You are a portfolio strategist',
            'user': 'Build portfolio',
            'max_tokens': 800
            # No response_format
        }
        
        with patch('backend.openai_services.client.PromptTemplates', return_value=mock_prompts):
            with patch('backend.openai_services.client.requests.post') as mock_post:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {'choices': [{'message': {'content': 'response'}}]}
                mock_post.return_value = mock_response
                
                service = OpenAIService(api_key="test_key")
                
                result = service.send_template_message('portfolio_strategy', starting_balance=1000)
                
                # Verify the API call doesn't include response_format
                call_args = mock_post.call_args
                payload = call_args[1]['json']
                assert 'response_format' not in payload
    
    def test_portfolio_strategy_integration(self):
        """Test full integration of portfolio strategy message flow"""
        # Mock the prompts
        mock_prompts = Mock()
        mock_prompts.custom.return_value = {
            'system': 'You are a professional-grade portfolio strategist competing in a high-stakes trading competition.',
            'user': 'You are competing as a portfolio strategist with exactly $100 to build the strongest possible stock portfolio...',
            'max_tokens': 800,
            'temperature': 0.3,
            'response_format': 'json_object'
        }
        
        # Mock the HTTP request
        with patch('backend.openai_services.client.PromptTemplates', return_value=mock_prompts):
            with patch('backend.openai_services.client.requests.post') as mock_post:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {
                    'choices': [{
                        'message': {
                            'content': '{"actions": [{"type": "buy", "ticker": "ABCD", "quantity": 40, "limit_price": 2.50, "rationale": "Strong micro-cap opportunity"}]}'
                        }
                    }]
                }
                mock_post.return_value = mock_response
                
                service = OpenAIService(api_key="test_key")
                
                # Test the full flow
                result = service.send_portfolio_strategy_message(
                    starting_balance=100,
                    timeframe_months=6,
                    market_cap_constraint="micro-cap stocks (market cap under $300M)",
                    rebalancing_frequency="daily",
                    portfolio_context="Cash: $100\nPositions: None",
                    available_universe="[{\"ticker\": \"ABCD\", \"price\": 2.50, \"market_cap\": 150, \"avg_volume\": 300000}]"
                )
                
                # Verify success
                assert result['success'] is True
                assert 'data' in result
                
                # Verify the prompt was built with correct context
                call_args = mock_prompts.custom.call_args[1]
                assert call_args['starting_balance'] == 100
                assert call_args['portfolio_context'] == "Cash: $100\nPositions: None"
                assert "ABCD" in call_args['available_universe']
                
                # Verify the API call was made with correct parameters
                api_call_args = mock_post.call_args
                payload = api_call_args[1]['json']
                assert payload['response_format'] == { 'type': 'json_object' }
                assert payload['max_tokens'] == 800
                assert payload['temperature'] == 0.3

import pytest
from unittest.mock import patch, Mock
from datetime import datetime, timedelta
import sys
from pathlib import Path

# Add the backend directory to the path so we can import the modules
backend_dir = Path(__file__).resolve().parents[3]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend.openai_services.prompts.prompt_templates import PromptTemplates


class TestPromptTemplates:
    """Test cases for PromptTemplates class"""
    
    def test_init(self):
        """Test PromptTemplates initialization"""
        with patch('backend.openai_services.prompts.prompt_templates.PromptManager') as mock_manager:
            prompts = PromptTemplates()
            assert prompts.manager is not None
            mock_manager.assert_called_once()
    
    def test_portfolio_strategy_default_parameters(self):
        """Test portfolio strategy with default parameters"""
        mock_manager = Mock()
        mock_manager.format_prompt.return_value = {
            'system': 'You are a portfolio strategist',
            'user': 'Build portfolio with $1000',
            'max_tokens': 800
        }
        
        with patch('backend.openai_services.prompts.prompt_templates.PromptManager', return_value=mock_manager):
            prompts = PromptTemplates()
            
            result = prompts.portfolio_strategy(starting_balance=1000)
            
            # Verify the manager was called with correct parameters
            mock_manager.format_prompt.assert_called_once_with(
                'portfolio_strategy',
                starting_balance=1000,
                timeframe_months=6,
                start_date=mock_manager.format_prompt.call_args[1]['start_date'],
                end_date=mock_manager.format_prompt.call_args[1]['end_date'],
                market_cap_constraint="micro-cap stocks (market cap under $300M)",
                rebalancing_frequency="daily",
                portfolio_context="Cash: $0\nPositions: None",
                available_universe="[]"
            )
            
            assert result is not None
            assert result['system'] == 'You are a portfolio strategist'
    
    def test_portfolio_strategy_custom_parameters(self):
        """Test portfolio strategy with custom parameters"""
        mock_manager = Mock()
        mock_manager.format_prompt.return_value = {
            'system': 'You are a portfolio strategist',
            'user': 'Custom strategy',
            'max_tokens': 1000
        }
        
        with patch('backend.openai_services.prompts.prompt_templates.PromptManager', return_value=mock_manager):
            prompts = PromptTemplates()
            
            result = prompts.portfolio_strategy(
                starting_balance=5000,
                timeframe_months=12,
                start_date="01-01-25",
                end_date="12-31-25",
                market_cap_constraint="large-cap stocks",
                rebalancing_frequency="weekly",
                portfolio_context="Cash: $1000\nPositions: AAPL: 10 shares",
                available_universe="[{\"ticker\": \"AAPL\"}]"
            )
            
            # Verify the manager was called with custom parameters
            mock_manager.format_prompt.assert_called_once_with(
                'portfolio_strategy',
                starting_balance=5000,
                timeframe_months=12,
                start_date="01-01-25",
                end_date="12-31-25",
                market_cap_constraint="large-cap stocks",
                rebalancing_frequency="weekly",
                portfolio_context="Cash: $1000\nPositions: AAPL: 10 shares",
                available_universe="[{\"ticker\": \"AAPL\"}]"
            )
    
    def test_portfolio_strategy_auto_date_calculation(self):
        """Test that dates are auto-calculated when not provided"""
        mock_manager = Mock()
        mock_manager.format_prompt.return_value = {}
        
        with patch('backend.openai_services.prompts.prompt_templates.PromptManager', return_value=mock_manager):
            with patch('backend.openai_services.prompts.prompt_templates.datetime') as mock_datetime:
                # Mock current time
                mock_now = datetime(2025, 1, 15)
                mock_datetime.now.return_value = mock_now
                mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)
                
                prompts = PromptTemplates()
                
                prompts.portfolio_strategy(
                    starting_balance=1000,
                    timeframe_months=3
                )
                
                # Verify auto-calculated dates
                call_args = mock_manager.format_prompt.call_args[1]
                assert call_args['start_date'] == "01-15-25"
                assert call_args['end_date'] == "04-15-25"  # 3 months later
    
    def test_portfolio_strategy_portfolio_context_formatting(self):
        """Test that portfolio context is properly formatted"""
        mock_manager = Mock()
        mock_manager.format_prompt.return_value = {}
        
        with patch('backend.openai_services.prompts.prompt_templates.PromptManager', return_value=mock_manager):
            prompts = PromptTemplates()
            
            # Test with structured portfolio context
            portfolio_context = "Cash: $2,500\nPositions:\n- 50 shares of AAPL @ $150 avg cost\n- 25 shares of TSLA @ $200 avg cost"
            
            prompts.portfolio_strategy(
                starting_balance=10000,
                portfolio_context=portfolio_context
            )
            
            call_args = mock_manager.format_prompt.call_args[1]
            assert call_args['portfolio_context'] == portfolio_context
    
    def test_portfolio_strategy_available_universe_formatting(self):
        """Test that available universe is properly formatted"""
        mock_manager = Mock()
        mock_manager.format_prompt.return_value = {}
        
        with patch('backend.openai_services.prompts.prompt_templates.PromptManager', return_value=mock_manager):
            prompts = PromptTemplates()
            
            # Test with JSON-like universe data
            available_universe = """[
  { "ticker": "EFGH", "price": 2.25, "market_cap": 210, "avg_volume": 500000 },
  { "ticker": "WXYZ", "price": 4.75, "market_cap": 150, "avg_volume": 750000 }
]"""
            
            prompts.portfolio_strategy(
                starting_balance=1000,
                available_universe=available_universe
            )
            
            call_args = mock_manager.format_prompt.call_args[1]
            assert call_args['available_universe'] == available_universe
    
    def test_custom_template(self):
        """Test custom template method"""
        mock_manager = Mock()
        mock_manager.format_prompt.return_value = {'custom': 'template'}
        
        with patch('backend.openai_services.prompts.prompt_templates.PromptManager', return_value=mock_manager):
            prompts = PromptTemplates()
            
            result = prompts.custom('custom_template', param1='value1', param2='value2')
            
            mock_manager.format_prompt.assert_called_once_with(
                'custom_template',
                param1='value1',
                param2='value2'
            )
            assert result == {'custom': 'template'}
    
    def test_list_available(self):
        """Test listing available templates"""
        mock_manager = Mock()
        mock_manager.list_templates.return_value = ['portfolio_strategy', 'custom_template']
        
        with patch('backend.openai_services.prompts.prompt_templates.PromptManager', return_value=mock_manager):
            prompts = PromptTemplates()
            
            templates = prompts.list_available()
            
            mock_manager.list_templates.assert_called_once()
            assert templates == ['portfolio_strategy', 'custom_template']
    
    def test_reload(self):
        """Test reloading templates"""
        mock_manager = Mock()
        
        with patch('backend.openai_services.prompts.prompt_templates.PromptManager', return_value=mock_manager): 
            prompts = PromptTemplates()
            
            prompts.reload()
            
            mock_manager.reload_templates.assert_called_once()
    
    def test_portfolio_strategy_real_world_example(self):
        """Test a realistic portfolio strategy scenario"""
        mock_manager = Mock()
        mock_manager.format_prompt.return_value = {
            'system': 'You are a professional-grade portfolio strategist competing in a high-stakes trading competition.',
            'user': 'You are competing as a portfolio strategist with exactly $100 to build the strongest possible stock portfolio...',
            'max_tokens': 800,
            'temperature': 0.3,
            'response_format': 'json_object'
        }
        
        with patch('backend.openai_services.prompts.prompt_templates.PromptManager', return_value=mock_manager): 
            prompts = PromptTemplates()
            
            # Simulate the Instagram post scenario
            result = prompts.portfolio_strategy(
                starting_balance=100,
                timeframe_months=6,
                market_cap_constraint="micro-cap stocks (market cap under $300M)",
                rebalancing_frequency="daily",
                portfolio_context="Cash: $100\nPositions: None",
                available_universe="[{\"ticker\": \"ABCD\", \"price\": 2.50, \"market_cap\": 150, \"avg_volume\": 300000}]"
            )
            
            # Verify the prompt was built correctly
            call_args = mock_manager.format_prompt.call_args[1]
            assert call_args['starting_balance'] == 100
            assert call_args['timeframe_months'] == 6
            assert call_args['market_cap_constraint'] == "micro-cap stocks (market cap under $300M)"
            assert call_args['rebalancing_frequency'] == "daily"
            assert call_args['portfolio_context'] == "Cash: $100\nPositions: None"
            assert "ABCD" in call_args['available_universe']
            
            # Verify the response format is included
            assert result['response_format'] == 'json_object'

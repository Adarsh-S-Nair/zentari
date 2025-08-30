import pytest
from unittest.mock import patch, mock_open
import yaml
from pathlib import Path
import sys
import os

# Add the backend directory to the path so we can import the modules
backend_dir = Path(__file__).resolve().parents[3]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend.openai_services.prompts.prompt_manager import PromptManager


class TestPromptManager:
    """Test cases for PromptManager class"""
    
    def test_init_with_default_directory(self):
        """Test initialization with default prompts directory"""
        # Default directory should be the actual prompts package directory
        manager = PromptManager()
        expected = Path(__file__).resolve().parents[3] / "openai_services" / "prompts"
        assert str(manager.prompts_dir).endswith(str(Path("openai_services/prompts")))
    
    def test_init_with_custom_directory(self):
        """Test initialization with custom prompts directory"""
        custom_dir = "/custom/prompts"
        with patch('builtins.open', mock_open(read_data='')):
            manager = PromptManager(custom_dir)
            assert manager.prompts_dir == Path(custom_dir)
    
    def test_load_templates_success(self):
        """Test successful template loading"""
        mock_yaml_data = {
            'portfolio_strategy': {
                'system': 'You are a portfolio strategist',
                'user': 'Build portfolio with ${starting_balance}',
                'max_tokens': 800
            },
            'defaults': {
                'model': 'gpt-5-nano',
                'temperature': 0.5
            }
        }
        
        with patch('builtins.open', mock_open(read_data=yaml.dump(mock_yaml_data))):
            with patch('pathlib.Path.exists', return_value=True):
                manager = PromptManager()
                
                assert 'portfolio_strategy' in manager.templates
                assert manager.templates['portfolio_strategy']['system'] == 'You are a portfolio strategist'
                assert manager.defaults['model'] == 'gpt-5-nano'
    
    def test_load_templates_file_not_found(self):
        """Test handling when templates.yaml is not found"""
        with patch('pathlib.Path.exists', return_value=False):
            manager = PromptManager()
            assert manager.templates == {}
            assert manager.defaults == {}
    
    def test_load_templates_yaml_error(self):
        """Test handling of YAML parsing errors"""
        with patch('builtins.open', mock_open(read_data='invalid: yaml: content:')):
            manager = PromptManager()
            assert manager.templates == {}
            assert manager.defaults == {}
    
    def test_get_template(self):
        """Test getting a specific template"""
        mock_yaml_data = {
            'portfolio_strategy': {
                'system': 'You are a portfolio strategist',
                'user': 'Build portfolio with ${starting_balance}'
            }
        }
        
        with patch('builtins.open', mock_open(read_data=yaml.dump(mock_yaml_data))):
            with patch('pathlib.Path.exists', return_value=True):
                manager = PromptManager()
                
                template = manager.get_template('portfolio_strategy')
                assert template is not None
                assert template['system'] == 'You are a portfolio strategist'
                
                # Test non-existent template
                assert manager.get_template('non_existent') is None
    
    def test_get_system_prompt(self):
        """Test getting system prompt from template"""
        mock_yaml_data = {
            'portfolio_strategy': {
                'system': 'You are a portfolio strategist',
                'user': 'Build portfolio with ${starting_balance}'
            }
        }
        
        with patch('builtins.open', mock_open(read_data=yaml.dump(mock_yaml_data))):
            with patch('pathlib.Path.exists', return_value=True):
                manager = PromptManager()
                
                system_prompt = manager.get_system_prompt('portfolio_strategy')
                assert system_prompt == 'You are a portfolio strategist'
                
                # Test template without system prompt
                assert manager.get_system_prompt('non_existent') is None
    
    def test_get_user_prompt(self):
        """Test getting user prompt from template"""
        mock_yaml_data = {
            'portfolio_strategy': {
                'system': 'You are a portfolio strategist',
                'user': 'Build portfolio with ${starting_balance}'
            }
        }
        
        with patch('builtins.open', mock_open(read_data=yaml.dump(mock_yaml_data))):
            with patch('pathlib.Path.exists', return_value=True):
                manager = PromptManager()
                
                user_prompt = manager.get_user_prompt('portfolio_strategy')
                assert user_prompt == 'Build portfolio with ${starting_balance}'
                
                # Test template without user prompt
                assert manager.get_user_prompt('non_existent') is None
    
    def test_format_prompt_with_variables(self):
        """Test formatting prompt with variable substitution"""
        mock_yaml_data = {
            'portfolio_strategy': {
                'system': 'You are a portfolio strategist',
                'user': 'Build portfolio with ${starting_balance} and ${timeframe_months} months',
                'max_tokens': 800
            },
            'defaults': {
                'model': 'gpt-5-nano',
                'temperature': 0.5
            }
        }
        
        with patch('builtins.open', mock_open(read_data=yaml.dump(mock_yaml_data))):
            with patch('pathlib.Path.exists', return_value=True):
                manager = PromptManager()
                
                formatted = manager.format_prompt(
                    'portfolio_strategy',
                    starting_balance=10000,
                    timeframe_months=6
                )
                
                assert formatted is not None
                assert formatted['user'] == 'Build portfolio with 10000 and 6 months'
                assert formatted['max_tokens'] == 800
                assert formatted['model'] == 'gpt-5-nano'  # From defaults
                assert formatted['temperature'] == 0.5      # From defaults
    
    def test_format_prompt_template_not_found(self):
        """Test formatting non-existent template"""
        with patch('builtins.open', mock_open(read_data='')):
            manager = PromptManager()
            
            formatted = manager.format_prompt('non_existent', starting_balance=10000)
            assert formatted is None
    
    def test_format_prompt_no_variables(self):
        """Test formatting prompt without variable substitution"""
        mock_yaml_data = {
            'portfolio_strategy': {
                'system': 'You are a portfolio strategist',
                'user': 'Build portfolio',
                'max_tokens': 800
            }
        }
        
        with patch('builtins.open', mock_open(read_data=yaml.dump(mock_yaml_data))):
            with patch('pathlib.Path.exists', return_value=True):
                manager = PromptManager()
                
                formatted = manager.format_prompt('portfolio_strategy')
                
                assert formatted is not None
                assert formatted['user'] == 'Build portfolio'  # No substitution needed
                assert formatted['max_tokens'] == 800
    
    def test_list_templates(self):
        """Test listing available templates"""
        mock_yaml_data = {
            'portfolio_strategy': {
                'system': 'You are a portfolio strategist'
            },
            'defaults': {
                'model': 'gpt-5-nano'
            }
        }
        
        with patch('builtins.open', mock_open(read_data=yaml.dump(mock_yaml_data))):
            with patch('pathlib.Path.exists', return_value=True):
                manager = PromptManager()
                
                templates = manager.list_templates()
                assert 'portfolio_strategy' in templates
                assert 'defaults' not in templates  # Should exclude defaults
                assert len(templates) == 1
    
    def test_reload_templates(self):
        """Test reloading templates from disk"""
        mock_yaml_data = {
            'portfolio_strategy': {
                'system': 'You are a portfolio strategist'
            }
        }
        
        with patch('builtins.open', mock_open(read_data=yaml.dump(mock_yaml_data))):
            with patch('pathlib.Path.exists', return_value=True):
                manager = PromptManager()
                
                # Verify initial load
                assert 'portfolio_strategy' in manager.templates
                
                # Test reload
                manager.reload_templates()
                assert 'portfolio_strategy' in manager.templates

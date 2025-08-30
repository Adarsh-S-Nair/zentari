import os
import re
from string import Template
import yaml
from typing import Dict, Any, Optional
from pathlib import Path


class PromptManager:
    """Manages LLM prompt templates loaded from YAML files"""
    
    def __init__(self, prompts_dir: Optional[str] = None):
        # Default to the prompts directory relative to this file
        if prompts_dir is None:
            prompts_dir = Path(__file__).parent
        
        self.prompts_dir = Path(prompts_dir)
        self.templates = {}
        self.defaults = {}
        self._load_templates()
    
    def _load_templates(self) -> None:
        """Load all prompt templates from YAML files"""
        try:
            # Load main templates file
            templates_file = self.prompts_dir / "templates.yaml"
            if templates_file.exists():
                with open(templates_file, 'r', encoding='utf-8') as f:
                    data = yaml.safe_load(f)
                    self.templates = data
                    self.defaults = data.get('defaults', {})
                    print(f"[PROMPTS] Loaded {len(self.templates)} prompt templates")
            else:
                print(f"[PROMPTS] Warning: No templates.yaml found in {self.prompts_dir}")
        
        except Exception as e:
            print(f"[PROMPTS] Error loading templates: {e}")
            self.templates = {}
            self.defaults = {}
    
    def get_template(self, template_name: str) -> Optional[Dict[str, Any]]:
        """Get a specific prompt template by name"""
        return self.templates.get(template_name)
    
    def get_system_prompt(self, template_name: str) -> Optional[str]:
        """Get the system prompt for a specific template"""
        template = self.get_template(template_name)
        return template.get('system') if template else None
    
    def get_user_prompt(self, template_name: str) -> Optional[str]:
        """Get the user prompt for a specific template"""
        template = self.get_template(template_name)
        return template.get('user') if template else None
    
    def _substitute_vars(self, text: str, values: Dict[str, Any]) -> str:
        """Substitute ${var} placeholders using string.Template to avoid brace conflicts."""
        if text is None:
            return text
        try:
            return Template(text).safe_substitute(**values)
        except Exception:
            return text

    def format_prompt(self, template_name: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Get a formatted prompt template with variable substitution"""
        template = self.get_template(template_name)
        if not template:
            return None
        
        # Create a copy to avoid modifying the original
        formatted = template.copy()
        
        # Format system and user prompts with kwargs
        if 'system' in formatted:
            formatted['system'] = self._substitute_vars(formatted.get('system'), kwargs)
        if 'user' in formatted:
            formatted['user'] = self._substitute_vars(formatted.get('user'), kwargs)
        
        # Merge with defaults
        for key, value in self.defaults.items():
            if key not in formatted:
                formatted[key] = value
        
        return formatted
    
    def list_templates(self) -> list:
        """List all available template names"""
        return [name for name in self.templates.keys() if name != 'defaults']
    
    def reload_templates(self) -> None:
        """Reload templates from disk (useful for development)"""
        self._load_templates()

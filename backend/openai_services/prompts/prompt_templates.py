from .prompt_manager import PromptManager
from typing import Dict, Any, Optional
from datetime import datetime, timedelta


class PromptTemplates:
    """Convenience class for accessing portfolio strategy prompt templates"""
    
    def __init__(self):
        self.manager = PromptManager()
    
    def portfolio_strategy(
        self, 
        starting_balance: float,
        timeframe_months: int = 0,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        market_cap_constraint: str = "micro-cap stocks (market cap under $300M)",
        rebalancing_frequency: str = "weekly",
        portfolio_context: str = "Cash: $0\nPositions: None"
    ) -> Optional[Dict[str, Any]]:
        """Get portfolio strategy prompt with customizable parameters"""
        
        # Auto-calculate dates if not provided
        now = datetime.now()
        if start_date is None:
            start_date = now.strftime("%m/%d/%Y")
        if end_date is None:
            # Default to 1-week window if timeframe_months==0
            if timeframe_months and timeframe_months > 0:
                end_dt = now + timedelta(days=timeframe_months * 30)
                timeframe_label = f"{timeframe_months} months"
            else:
                end_dt = now + timedelta(days=7)
                timeframe_label = "1 week"
            end_date = end_dt.strftime("%m/%d/%Y")
        else:
            # Provide a reasonable label when explicit dates are passed with 7-day span
            try:
                sd = datetime.strptime(start_date, "%m/%d/%Y")
                ed = datetime.strptime(end_date, "%m/%d/%Y")
                days = (ed - sd).days
                timeframe_label = f"{days} days" if days != 7 else "1 week"
            except Exception:
                timeframe_label = "custom"
        
        return self.manager.format_prompt(
            'portfolio_strategy',
            starting_balance=starting_balance,
            timeframe_months=timeframe_months,
            start_date=start_date,
            end_date=end_date,
            market_cap_constraint=market_cap_constraint,
            rebalancing_frequency=rebalancing_frequency,
            portfolio_context=portfolio_context,
            timeframe_label=timeframe_label
        )
    
    def custom(self, template_name: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Get a custom prompt template with variable substitution"""
        return self.manager.format_prompt(template_name, **kwargs)
    
    def list_available(self) -> list:
        """List all available template names"""
        return self.manager.list_templates()
    
    def reload(self) -> None:
        """Reload templates from disk"""
        self.manager.reload_templates()

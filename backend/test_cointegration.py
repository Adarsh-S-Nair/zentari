#!/usr/bin/env python3
"""
Simple test script to verify cointegration strategy integration
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all necessary modules can be imported"""
    try:
        from strategies.cointegration_strategy import CointegrationStrategy
        from strategies.momentum_strategy import MomentumStrategy
        from strategies.sma_crossover_strategy import SMACrossoverStrategy
        from utils.data_fetcher import DataFetcher
        from utils.price_utils import PriceUtils
        print("✅ All imports successful")
        return True
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False

def test_data_fetcher():
    """Test DataFetcher class instantiation"""
    try:
        data_fetcher = DataFetcher()
        print("✅ DataFetcher instantiated successfully")
        return True
    except Exception as e:
        print(f"❌ DataFetcher error: {e}")
        return False

def test_strategy_instantiation():
    """Test strategy class instantiation"""
    try:
        # Mock params object
        class MockParams:
            def __init__(self):
                self.start_date = "2024-01-01"
                self.end_date = "2024-06-01"
                self.lookback_months = 12
                self.skip_recent_months = 1
                self.hold_months = 1
                self.top_n = 10
                self.starting_value = 10000
                self.benchmark = "SPY"
                self.strategy = "momentum"
                self.tp_threshold = 10
                self.sl_threshold = 5

        params = MockParams()
        
        # Test each strategy
        cointegration = CointegrationStrategy(params)
        momentum = MomentumStrategy(params)
        sma = SMACrossoverStrategy(params)
        
        print("✅ All strategies instantiated successfully")
        return True
    except Exception as e:
        print(f"❌ Strategy instantiation error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing cointegration strategy integration...")
    
    tests = [
        test_imports,
        test_data_fetcher,
        test_strategy_instantiation
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Cointegration strategy is ready to use.")
    else:
        print("⚠️ Some tests failed. Please check the errors above.")
        sys.exit(1) 
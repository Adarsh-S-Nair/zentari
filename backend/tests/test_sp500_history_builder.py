import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.utils.sp500_history_builder import SP500HistoryBuilder

def test_get_revisions():
    builder = SP500HistoryBuilder()
    revisions = builder.get_revisions(limit=10)
    assert len(revisions) == 10
    assert "timestamp" in revisions[0]
    assert "revid" in revisions[0]


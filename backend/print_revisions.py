import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.sp500_history_builder import SP500HistoryBuilder

if __name__ == "__main__":
    builder = SP500HistoryBuilder()
    revision_id = 112958830  # 🆔 First appearance of ticker symbols (March 5, 2007)

    print(f"📥 Downloading revision {revision_id}...")

    html = builder.fetch_revision_html(revision_id)

    output_path = "data/revision_112958830.html"
    os.makedirs("data", exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅ HTML saved to {output_path}")

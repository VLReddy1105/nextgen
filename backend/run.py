"""Repository-local launcher supporting a conventional venv or local .deps."""

import sys
from pathlib import Path

root = Path(__file__).resolve().parent
if (root / ".deps").exists():
    sys.path.insert(0, str(root / ".deps"))
sys.path.insert(0, str(root))
if __name__ == "__main__":
    if "--test" in sys.argv:
        import pytest

        raise SystemExit(pytest.main([str(root / "tests"), "-q"]))
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, access_log=False)

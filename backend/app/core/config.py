import os
from pathlib import Path
from urllib.parse import urlparse
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    public_key: str
    frontend_origin: str


def load_settings() -> Settings:
    # Only this repository's existing local configuration; never log values.
    local = Path(__file__).resolve().parents[3] / ".env.local"
    values = {}
    if local.exists():
        for line in local.read_text(encoding="utf-8-sig").splitlines():
            key, sep, value = line.partition("=")
            if sep and not key.strip().startswith("#"):
                values[key.strip()] = value.strip().strip('"').strip("'")

    def get(key, default=""):
        return os.environ.get(key, values.get(key, default))

    url = get("NEXT_PUBLIC_SUPABASE_URL").rstrip("/")
    public_key = get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if url:
        parsed = urlparse(url)
        if parsed.scheme != "https" and not (
            parsed.scheme == "http"
            and parsed.hostname in ("localhost", "127.0.0.1", "::1")
        ):
            raise ValueError("Invalid Supabase URL configuration")
        if (
            parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
            or parsed.path
        ):
            raise ValueError("Invalid Supabase URL configuration")
    if public_key.startswith("sb_secret_"):
        raise ValueError("Only a public Supabase key may be configured")
    if public_key.count(".") == 2:
        import base64, json

        try:
            part = public_key.split(".")[1]
            claims = json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))
            if claims.get("role") != "anon":
                raise ValueError("Only a public Supabase key may be configured")
        except (ValueError, TypeError):
            raise ValueError("Invalid public Supabase key configuration") from None
    return Settings(url, public_key, get("FRONTEND_ORIGIN", "http://localhost:3000"))

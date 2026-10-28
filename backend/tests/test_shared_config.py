import os
from pathlib import Path
import pytest
from app.core import config

KEYS = ("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "FRONTEND_ORIGIN")

@pytest.fixture
def isolated(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "__file__", str(tmp_path / "backend/app/core/config.py"))
    for key in (*KEYS, "NODE_ENV"):
        monkeypatch.delenv(key, raising=False)
    (tmp_path / ".env.development").write_text("NEXT_PUBLIC_SUPABASE_URL=https://shared.example.test\nNEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_test\n")
    return tmp_path

def test_fresh_developer_without_local_file(monkeypatch, isolated):
    monkeypatch.setenv("NODE_ENV", "development")
    assert config.load_settings().supabase_url == "https://shared.example.test"
    assert not (isolated / ".env.local").exists()

def test_override_precedence(monkeypatch, isolated):
    monkeypatch.setenv("NODE_ENV", "development")
    (isolated / ".env.local").write_text("NEXT_PUBLIC_SUPABASE_URL=https://local.example.test\n")
    assert config.load_settings().supabase_url == "https://local.example.test"
    (isolated / ".env.development.local").write_text("NEXT_PUBLIC_SUPABASE_URL=https://mode.example.test\n")
    assert config.load_settings().supabase_url == "https://mode.example.test"
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://process.example.test")
    assert config.load_settings().supabase_url == "https://process.example.test"

@pytest.mark.parametrize("mode", [None, "production", "test"])
def test_no_development_defaults_outside_development(monkeypatch, isolated, mode):
    if mode: monkeypatch.setenv("NODE_ENV", mode)
    assert config.load_settings().supabase_url == ""
    assert config.load_settings().public_key == ""

def test_secret_override_rejected(monkeypatch, isolated):
    monkeypatch.setenv("NODE_ENV", "development")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_secret_do_not_use")
    with pytest.raises(ValueError, match="public Supabase key"):
        config.load_settings()

"""email_service.py — Resend integration, without touching the network."""

import io
import json
import logging
import urllib.error

import pytest

from services.api import email_service


class FakeResponse:
    status = 200

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


# Happy path
def test_reset_email_is_sent_to_resend_with_key_and_link(monkeypatch):
    sent = {}

    def fake_urlopen(request, timeout):
        sent["url"] = request.full_url
        sent["auth"] = request.get_header("Authorization")
        sent["body"] = json.loads(request.data)
        return FakeResponse()

    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.delenv("EMAIL_FROM", raising=False)
    monkeypatch.setattr(email_service.urllib.request, "urlopen", fake_urlopen)
    email_service.send_password_reset_email("ana@example.com", "http://localhost:3000/reset-password?token=abc", 30)

    assert sent["url"] == "https://api.resend.com/emails"
    assert sent["auth"] == "Bearer re_test_key"
    assert sent["body"]["to"] == ["ana@example.com"]
    assert sent["body"]["from"] == email_service.DEFAULT_SENDER
    assert "token=abc" in sent["body"]["html"] and "token=abc" in sent["body"]["text"]
    assert "30 minutos" in sent["body"]["text"]


# Edge cases
def test_link_is_html_escaped_in_the_html_body(monkeypatch):
    sent = {}
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(email_service.urllib.request, "urlopen", lambda r, timeout: sent.setdefault("b", json.loads(r.data)) and FakeResponse())
    email_service.send_password_reset_email("a@example.com", 'http://x/reset?token=a"b<c', 30)
    assert 'a"b<c' not in sent["b"]["html"] and "a&quot;b&lt;c" in sent["b"]["html"]


def test_without_api_key_nothing_is_sent_and_link_is_logged(monkeypatch, caplog):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.setattr(email_service.urllib.request, "urlopen", lambda *a, **k: pytest.fail("must not call Resend"))
    with caplog.at_level(logging.WARNING, logger="trackflow.email"):
        email_service.send_password_reset_email("a@example.com", "http://x/reset?token=abc", 30)
    assert "token=abc" in caplog.text


# Failure modes
def test_resend_rejection_raises_delivery_error_with_detail(monkeypatch):
    def rejected(request, timeout):
        raise urllib.error.HTTPError(request.full_url, 403, "Forbidden", {}, io.BytesIO(b'{"message":"domain not verified"}'))

    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(email_service.urllib.request, "urlopen", rejected)
    with pytest.raises(email_service.EmailDeliveryError, match="domain not verified"):
        email_service.send_password_reset_email("a@example.com", "http://x", 30)


def test_network_failure_raises_delivery_error(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(email_service.urllib.request, "urlopen", lambda r, timeout: (_ for _ in ()).throw(urllib.error.URLError("timed out")))
    with pytest.raises(email_service.EmailDeliveryError, match="Could not reach Resend"):
        email_service.send_password_reset_email("a@example.com", "http://x", 30)


def test_failed_delivery_still_answers_200_to_the_client(api_database, monkeypatch):
    client, *_ = api_database
    from services.api.tests.helpers import register

    register(client)
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(email_service.urllib.request, "urlopen", lambda r, timeout: (_ for _ in ()).throw(urllib.error.URLError("down")))
    assert client.post("/auth/forgot-password", json={"email": "ops@example.com"}).status_code == 200

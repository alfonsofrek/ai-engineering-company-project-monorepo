"""Transactional email through Resend (https://resend.com).

Configuration (environment variables, never hardcoded):

- ``RESEND_API_KEY`` — API key from the Resend dashboard. Required to send real emails.
- ``EMAIL_FROM`` — sender. Defaults to Resend's onboarding sender, which works without a
  custom domain (in that mode Resend only delivers to the email you signed up with).

Without ``RESEND_API_KEY`` the email is not sent: the reset link is written to the server
log instead, so the flow can still be tried locally. Never run production that way.
"""

from __future__ import annotations

import html
import json
import logging
import os
import urllib.error
import urllib.request

logger = logging.getLogger("trackflow.email")

RESEND_URL = "https://api.resend.com/emails"
DEFAULT_SENDER = "TrackFlow <onboarding@resend.dev>"


class EmailDeliveryError(RuntimeError):
    pass


def _send(to: str, subject: str, html_body: str, text_body: str) -> None:
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key:
        logger.warning("RESEND_API_KEY is not set; email to %s not sent. Content:\n%s", to, text_body)
        return

    payload = json.dumps(
        {
            "from": os.getenv("EMAIL_FROM", DEFAULT_SENDER),
            "to": [to],
            "subject": subject,
            "html": html_body,
            "text": text_body,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        RESEND_URL,
        data=payload,
        method="POST",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if response.status >= 300:
                raise EmailDeliveryError(f"Resend answered {response.status}")
    except urllib.error.HTTPError as error:
        # Resend explains the problem in the body (unverified sender, invalid key…).
        detail = error.read().decode("utf-8", "replace")[:500]
        raise EmailDeliveryError(f"Resend answered {error.code}: {detail}") from error
    except urllib.error.URLError as error:
        raise EmailDeliveryError(f"Could not reach Resend: {error.reason}") from error


def send_password_reset_email(to: str, reset_url: str, minutes: int) -> None:
    safe_url = html.escape(reset_url, quote=True)
    subject = "Restablece tu contraseña de TrackFlow"
    text_body = (
        "Hemos recibido una solicitud para restablecer tu contraseña de TrackFlow.\n\n"
        f"Abre este enlace para elegir una nueva (caduca en {minutes} minutos y solo sirve una vez):\n"
        f"{reset_url}\n\n"
        "Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambiará."
    )
    html_body = f"""<!doctype html>
<html lang="es"><body style="margin:0;padding:24px 12px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#0f1724">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:10px">
    <tr><td style="padding:28px 24px">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;color:#0e7490;font-weight:bold">TRACKFLOW</p>
      <h1 style="margin:0 0 16px;font-size:22px">Restablece tu contraseña</h1>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.5">Hemos recibido una solicitud para restablecer tu contraseña. Pulsa el botón para elegir una nueva.</p>
      <p style="margin:0 0 20px"><a href="{safe_url}" style="display:inline-block;padding:14px 22px;background:#0e7490;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:bold">Elegir nueva contraseña</a></p>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#475569">El enlace caduca en {minutes} minutos y solo se puede usar una vez.</p>
      <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#475569;word-break:break-all">Si el botón no funciona, copia este enlace en tu navegador:<br>{safe_url}</p>
      <p style="margin:0;font-size:13px;color:#64748b">Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambiará.</p>
    </td></tr>
  </table>
</body></html>"""
    _send(to, subject, html_body, text_body)

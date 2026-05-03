from __future__ import annotations

import smtplib
from email.message import EmailMessage

from .settings import SMTP_FROM, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USERNAME


def send_password_reset_mail(to_address: str, username: str, reset_url: str) -> None:
    if not SMTP_HOST:
        raise RuntimeError("SMTP host is not configured.")
    message = EmailMessage()
    message["From"] = SMTP_FROM
    message["To"] = to_address
    message["Subject"] = "OneCRM password reset"
    message.set_content(
        "\n".join([
            f"Hello {username},",
            "",
            "A password reset was requested for your OneCRM account.",
            "Open the following URL and set a new password:",
            "",
            reset_url,
            "",
            "If you did not request this, ignore this message.",
            "",
            "OneCRM",
        ])
    )
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
        if SMTP_USERNAME:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(message)

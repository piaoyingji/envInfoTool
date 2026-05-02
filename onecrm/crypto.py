import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from .settings import APP_SECRET_KEY


PREFIX = "enc:v1:"


def _fernet() -> Fernet:
    digest = hashlib.sha256(APP_SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_text(value: str | None) -> str:
    if not value:
        return ""
    if value.startswith(PREFIX):
        return value
    return PREFIX + _fernet().encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_text(value: str | None) -> str:
    if not value:
        return ""
    if not value.startswith(PREFIX):
        return value
    try:
        return _fernet().decrypt(value[len(PREFIX):].encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError):
        return ""

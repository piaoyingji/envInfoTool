from __future__ import annotations

from io import BytesIO
from typing import Any
from urllib.parse import quote

from minio import Minio

from .settings import MINIO_ACCESS_KEY, MINIO_BUCKET, MINIO_ENDPOINT, MINIO_SECRET_KEY


def minio_client() -> Minio:
    return Minio(MINIO_ENDPOINT, access_key=MINIO_ACCESS_KEY, secret_key=MINIO_SECRET_KEY, secure=False)


def ensure_bucket() -> None:
    try:
        client = minio_client()
        if not client.bucket_exists(MINIO_BUCKET):
            client.make_bucket(MINIO_BUCKET)
    except Exception as exc:
        print(f"MinIO bucket check skipped: {exc}")


def object_exists(object_key: str) -> bool:
    client = minio_client()
    try:
        client.stat_object(MINIO_BUCKET, object_key)
        return True
    except Exception:
        return False


def safe_metadata(metadata: dict[str, Any] | None) -> dict[str, str]:
    result: dict[str, str] = {}
    for key, value in (metadata or {}).items():
        safe_key = str(key).encode("ascii", "ignore").decode("ascii")
        if not safe_key:
            continue
        text = str(value)
        try:
            text.encode("ascii")
            result[safe_key] = text
        except UnicodeEncodeError:
            result[safe_key] = quote(text, safe="")
            result[f"{safe_key}-encoding"] = "url-utf8"
    return result


def put_bytes_if_missing(object_key: str, payload: bytes, content_type: str = "application/octet-stream", metadata: dict[str, Any] | None = None) -> None:
    client = minio_client()
    if not client.bucket_exists(MINIO_BUCKET):
        client.make_bucket(MINIO_BUCKET)
    if object_exists(object_key):
        return
    client.put_object(
        MINIO_BUCKET,
        object_key,
        BytesIO(payload),
        length=len(payload),
        content_type=content_type or "application/octet-stream",
        metadata=safe_metadata(metadata),
    )


def get_object_bytes(object_key: str) -> bytes:
    client = minio_client()
    response = client.get_object(MINIO_BUCKET, object_key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()

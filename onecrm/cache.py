import json
from typing import Any

import redis

from .settings import REDIS_URL


def redis_client():
    try:
        return redis.Redis.from_url(REDIS_URL, socket_timeout=1, socket_connect_timeout=1, decode_responses=True)
    except Exception:
        return None


def get_json(key: str) -> Any | None:
    client = redis_client()
    if not client:
        return None
    try:
        value = client.get(key)
        return json.loads(value) if value else None
    except Exception:
        return None


def set_json(key: str, value: Any, ttl_seconds: int) -> None:
    client = redis_client()
    if not client:
        return
    try:
        client.setex(key, ttl_seconds, json.dumps(value, ensure_ascii=False))
    except Exception:
        pass

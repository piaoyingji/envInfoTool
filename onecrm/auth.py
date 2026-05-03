from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import psycopg
from psycopg.rows import dict_row

from .settings import AUTH_PASSWORD, DATABASE_URL, PASSWORD_RESET_MINUTES, SESSION_DAYS


ROLE_ADMINS = "Admins"
ROLE_USERS = "Users"
SESSION_COOKIE = "onecrm_session"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_secret(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    iterations = 260_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return "pbkdf2_sha256${}${}${}".format(
        iterations,
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(digest).decode("ascii"),
    )


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations_text, salt_text, digest_text = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_text)
        salt = base64.b64decode(salt_text.encode("ascii"))
        expected = base64.b64decode(digest_text.encode("ascii"))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def normalize_user(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if not row:
        return None
    return {
        "id": str(row["id"]),
        "username": row.get("username") or "",
        "role": row.get("role") or ROLE_USERS,
        "email": row.get("email") or "",
        "displayName": row.get("display_name") or row.get("username") or "",
        "avatarObjectKey": row.get("avatar_object_key") or "",
        "avatarUrl": f"/api/auth/avatar/{row['id']}" if row.get("avatar_object_key") else "",
        "disabled": bool(row.get("disabled")),
        "createdAt": row.get("created_at").isoformat() if row.get("created_at") else "",
        "updatedAt": row.get("updated_at").isoformat() if row.get("updated_at") else "",
    }


def connect() -> psycopg.Connection:
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def ensure_admin_user() -> None:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("select count(*) as count from users")
            if int(cur.fetchone()["count"]) > 0:
                return
            cur.execute(
                """
                insert into users(id, username, role, email, display_name, password_hash)
                values(%s, %s, %s, %s, %s, %s)
                """,
                (uuid.uuid4(), "Admin", ROLE_ADMINS, "", "Admin", hash_password(AUTH_PASSWORD)),
            )
        conn.commit()


def list_users() -> list[dict[str, Any]]:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("select * from users order by lower(username)")
            return [normalize_user(dict(row)) for row in cur.fetchall()]


def get_user(user_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("select * from users where id=%s", (user_id,))
            return normalize_user(cur.fetchone())


def get_user_for_auth(username_or_email: str) -> dict[str, Any] | None:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "select * from users where lower(username)=lower(%s) or lower(email)=lower(%s)",
                (username_or_email, username_or_email),
            )
            row = cur.fetchone()
            return dict(row) if row else None


def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(40)
    expires_at = now_utc() + timedelta(days=SESSION_DAYS)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into user_sessions(id, user_id, token_hash, expires_at)
                values(%s, %s, %s, %s)
                """,
                (uuid.uuid4(), user_id, hash_secret(token), expires_at),
            )
        conn.commit()
    return token


def user_from_session(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select u.* from user_sessions s
                join users u on u.id=s.user_id
                where s.token_hash=%s and s.expires_at>now() and u.disabled=false
                """,
                (hash_secret(token),),
            )
            row = cur.fetchone()
            if not row:
                return None
            cur.execute("update user_sessions set last_seen_at=now() where token_hash=%s", (hash_secret(token),))
            conn.commit()
            return normalize_user(dict(row))


def delete_session(token: str | None) -> None:
    if not token:
        return
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("delete from user_sessions where token_hash=%s", (hash_secret(token),))
        conn.commit()


def authenticate(username: str, password: str) -> dict[str, Any] | None:
    row = get_user_for_auth(username)
    if not row or row.get("disabled"):
        return None
    if not verify_password(password, row.get("password_hash") or ""):
        return None
    return normalize_user(row)


def create_user(values: dict[str, Any]) -> dict[str, Any]:
    username = str(values.get("username") or "").strip()
    if not username:
        raise ValueError("Username is required")
    role = str(values.get("role") or ROLE_USERS)
    if role not in {ROLE_ADMINS, ROLE_USERS}:
        role = ROLE_USERS
    password = str(values.get("password") or secrets.token_urlsafe(10))
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into users(id, username, role, email, display_name, password_hash)
                values(%s, %s, %s, %s, %s, %s)
                returning *
                """,
                (
                    uuid.uuid4(),
                    username,
                    role,
                    str(values.get("email") or "").strip(),
                    str(values.get("displayName") or username).strip(),
                    hash_password(password),
                ),
            )
            row = dict(cur.fetchone())
        conn.commit()
    user = normalize_user(row)
    user["temporaryPassword"] = password
    return user


def update_user(user_id: str, values: dict[str, Any]) -> dict[str, Any]:
    role = str(values.get("role") or ROLE_USERS)
    if role not in {ROLE_ADMINS, ROLE_USERS}:
        role = ROLE_USERS
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update users
                set username=%s, role=%s, email=%s, display_name=%s, updated_at=now()
                where id=%s
                returning *
                """,
                (
                    str(values.get("username") or "").strip(),
                    role,
                    str(values.get("email") or "").strip(),
                    str(values.get("displayName") or values.get("username") or "").strip(),
                    user_id,
                ),
            )
            row = cur.fetchone()
            if not row:
                raise ValueError("User not found")
        conn.commit()
    return normalize_user(dict(row))


def set_user_disabled(user_id: str, disabled: bool) -> dict[str, Any]:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("update users set disabled=%s, updated_at=now() where id=%s returning *", (disabled, user_id))
            row = cur.fetchone()
            if not row:
                raise ValueError("User not found")
            if disabled:
                cur.execute("delete from user_sessions where user_id=%s", (user_id,))
        conn.commit()
    return normalize_user(dict(row))


def reset_user_password(user_id: str, password: str | None = None) -> dict[str, Any]:
    new_password = password or secrets.token_urlsafe(12)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "update users set password_hash=%s, password_changed_at=now(), updated_at=now() where id=%s returning *",
                (hash_password(new_password), user_id),
            )
            row = cur.fetchone()
            if not row:
                raise ValueError("User not found")
            cur.execute("delete from user_sessions where user_id=%s", (user_id,))
        conn.commit()
    user = normalize_user(dict(row))
    user["temporaryPassword"] = new_password
    return user


def change_own_password(user_id: str, current_password: str, new_password: str) -> None:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("select password_hash from users where id=%s and disabled=false", (user_id,))
            row = cur.fetchone()
            if not row or not verify_password(current_password, row["password_hash"]):
                raise ValueError("Current password is incorrect")
            cur.execute(
                "update users set password_hash=%s, password_changed_at=now(), updated_at=now() where id=%s",
                (hash_password(new_password), user_id),
            )
            cur.execute("delete from user_sessions where user_id=%s", (user_id,))
        conn.commit()


def update_own_profile(user_id: str, values: dict[str, Any]) -> dict[str, Any]:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "update users set email=%s, display_name=%s, updated_at=now() where id=%s returning *",
                (str(values.get("email") or "").strip(), str(values.get("displayName") or "").strip(), user_id),
            )
            row = cur.fetchone()
        conn.commit()
    return normalize_user(dict(row))


def update_avatar(user_id: str, object_key: str) -> dict[str, Any]:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("update users set avatar_object_key=%s, updated_at=now() where id=%s returning *", (object_key, user_id))
            row = cur.fetchone()
        conn.commit()
    return normalize_user(dict(row))


def create_password_reset(username_or_email: str) -> tuple[dict[str, Any], str] | tuple[None, None]:
    row = get_user_for_auth(username_or_email)
    if not row or row.get("disabled"):
        return None, None
    token = secrets.token_urlsafe(40)
    expires_at = now_utc() + timedelta(minutes=PASSWORD_RESET_MINUTES)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into password_reset_tokens(id, user_id, token_hash, expires_at)
                values(%s, %s, %s, %s)
                """,
                (uuid.uuid4(), row["id"], hash_secret(token), expires_at),
            )
        conn.commit()
    return normalize_user(row), token


def reset_password_by_token(token: str, new_password: str) -> dict[str, Any]:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select prt.*, u.disabled from password_reset_tokens prt
                join users u on u.id=prt.user_id
                where prt.token_hash=%s and prt.expires_at>now() and prt.used_at is null
                """,
                (hash_secret(token),),
            )
            row = cur.fetchone()
            if not row or row.get("disabled"):
                raise ValueError("Reset token is invalid or expired")
            cur.execute(
                "update users set password_hash=%s, password_changed_at=now(), updated_at=now() where id=%s returning *",
                (hash_password(new_password), row["user_id"]),
            )
            user = dict(cur.fetchone())
            cur.execute("update password_reset_tokens set used_at=now() where id=%s", (row["id"],))
            cur.execute("delete from user_sessions where user_id=%s", (row["user_id"],))
        conn.commit()
    return normalize_user(user)

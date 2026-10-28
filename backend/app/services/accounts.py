"""Local demo accounts with salted scrypt hashes and opaque, revocable sessions."""
import hashlib
import hmac
import secrets
import sqlite3
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, Request, Response

from app.data_access.database import database
from app.models.user_plans import Account, Credentials

COOKIE_NAME = 'shamba_session'
SESSION_SECONDS = 7 * 24 * 60 * 60


def _password_hash(password: str, salt: bytes) -> str:
    return hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1).hex()


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _set_session(response: Response, user_id: int, request: Request) -> None:
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(UTC) + timedelta(seconds=SESSION_SECONDS)).isoformat()
    with database() as connection:
        connection.execute('INSERT INTO user_sessions(token_hash,user_id,expires_at) VALUES (?,?,?)', (_token_hash(token), user_id, expires))
    response.set_cookie(COOKIE_NAME, token, max_age=SESSION_SECONDS, httponly=True,
                        secure=request.url.scheme == 'https', samesite='lax', path='/')


def register(credentials: Credentials, response: Response, request: Request) -> Account:
    salt = secrets.token_bytes(16)
    encoded = f'{salt.hex()}:{_password_hash(credentials.password, salt)}'
    try:
        with database() as connection:
            cursor = connection.execute('INSERT INTO users(email,password_hash,created_at) VALUES (?,?,?)',
                                        (credentials.email, encoded, datetime.now(UTC).isoformat()))
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail='An account with this email already exists.')
    _set_session(response, user_id, request)
    return Account(id=user_id, email=credentials.email)


def login(credentials: Credentials, response: Response, request: Request) -> Account:
    with database() as connection:
        row = connection.execute('SELECT id,email,password_hash FROM users WHERE email=?', (credentials.email,)).fetchone()
    # Perform the same password derivation even if the account is absent.
    salt_hex, expected = row['password_hash'].split(':') if row else ('00' * 16, '00' * 64)
    actual = _password_hash(credentials.password, bytes.fromhex(salt_hex))
    if not row or not hmac.compare_digest(actual, expected):
        raise HTTPException(status_code=401, detail='Incorrect email or password.')
    _set_session(response, row['id'], request)
    return Account(id=row['id'], email=row['email'])


def current_user(request: Request) -> Account:
    token = request.cookies.get(COOKIE_NAME)
    if token:
        with database() as connection:
            row = connection.execute('''SELECT u.id,u.email FROM user_sessions s JOIN users u ON u.id=s.user_id
                WHERE s.token_hash=? AND s.expires_at>?''', (_token_hash(token), datetime.now(UTC).isoformat())).fetchone()
        if row:
            return Account(**dict(row))
    raise HTTPException(status_code=401, detail='Please log in to access your saved plans.')


def logout(request: Request, response: Response) -> None:
    token = request.cookies.get(COOKIE_NAME)
    if token:
        with database() as connection:
            connection.execute('DELETE FROM user_sessions WHERE token_hash=?', (_token_hash(token),))
    response.delete_cookie(COOKIE_NAME, path='/', httponly=True, samesite='lax', secure=request.url.scheme == 'https')

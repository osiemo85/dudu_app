"""Create an administrator account without exposing admin registration in the UI."""
from __future__ import annotations

import getpass
import secrets
import sys
from datetime import UTC, datetime
from pathlib import Path

# Direct script execution places ``scripts/`` rather than ``backend/`` on
# sys.path. Add the backend root before importing application modules.
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import app.data_access.database as database_access
from app.data_access.database import database, using_postgres
from app.services.accounts import _password_hash


def required(prompt: str) -> str:
    value = input(prompt).strip()
    if not value:
        raise ValueError("This value is required.")
    return value


def main() -> int:
    try:
        name = required("Name: ")
        email = required("Email: ").lower()
        if email.count("@") != 1 or any(part == "" for part in email.split("@")):
            raise ValueError("Enter a valid email address.")
        password = getpass.getpass("Password: ")
        confirmation = getpass.getpass("Confirm password: ")
        if len(password) < 8:
            raise ValueError("Password must contain at least 8 characters.")
        if password != confirmation:
            raise ValueError("Passwords do not match.")
        salt = secrets.token_bytes(16)
        encoded = f"{salt.hex()}:{_password_hash(password, salt)}"
        with database() as connection:
            if using_postgres():
                connection.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''")
                connection.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'")
            else:
                columns = {row[1] for row in connection.execute("PRAGMA table_info(users)")}
                if "name" not in columns:
                    connection.execute("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''")
                if "role" not in columns:
                    connection.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
            connection.execute(
                "INSERT INTO users(name,email,password_hash,role,created_at) VALUES (?,?,?,?,?)",
                (name, email, encoded, "admin", datetime.now(UTC).isoformat()),
            )
    except database_access.IntegrityError:
        print("An account with this email already exists.", file=sys.stderr)
        return 1
    except (EOFError, KeyboardInterrupt):
        print("\nCancelled.", file=sys.stderr)
        return 1
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1
    print(f"Created administrator account for {email}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

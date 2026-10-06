"""
Regression tests for the core finance API: authentication, users, accounts,
categories, tags, transactions and merchants.

Every test gets a fresh schema (tables are dropped afterwards), so tests are
independent of each other.
"""

import os
import sys
from datetime import datetime, timedelta, timezone

# Fixed test key, so importing JWTToken never writes a .jwt_secret into the repo.
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-core-api-tests"

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from jose import jwt  # noqa: E402

import JWTToken  # noqa: E402

# The old hardcoded key (public FastAPI tutorial key) - tokens signed with it must be rejected.
OLD_PUBLIC_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
PASSWORD = "correct-horse-1"


def _build_app() -> FastAPI:
    # Import the real app, so a broken main.py (or router) fails the tests.
    from main import app

    return app


@pytest.fixture()
def client(monkeypatch):
    from data_access.data_access import Base, engine, init_db

    # Auto-categorisation is best-effort; block the ML module so results are deterministic
    # (create_transaction then simply leaves category_id empty).
    monkeypatch.setitem(sys.modules, "services.transaction_categorizer", None)

    init_db()
    # No context manager: the startup migration is not needed here (init_db() created the tables).
    test_client = TestClient(_build_app())
    try:
        yield test_client
    finally:
        test_client.close()
        Base.metadata.drop_all(bind=engine)


# --- helpers -----------------------------------------------------------------

def register(client, email, password=PASSWORD, **extra):
    res = client.post("/user/register", json={"email": email, "password": password, **extra})
    assert res.status_code == 201, res.text
    return res.json()


def login(client, email, password=PASSWORD):
    res = client.post("/login", data={"username": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def make_user(client, email):
    """Register + login; returns (user_json, headers)."""
    user = register(client, email)
    return user, auth(login(client, email))


def make_account(client, headers, name="Konto"):
    res = client.post("/account/", json={"name": name, "type": "asset", "currency_code": "CHF"}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def make_category(client, headers, name, parent_id=None, ctype="expense"):
    res = client.post("/category/", json={"name": name, "type": ctype, "parent_id": parent_id}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def make_tag(client, headers, name, color="#ff0000"):
    res = client.post("/tag/", json={"name": name, "color": color}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def make_transaction(client, headers, account_id, **fields):
    payload = {
        "account_id": account_id,
        "date": "2026-09-30",
        "description": "Migros",
        "amount_cents": -2550,
        "currency_code": "CHF",
        **fields,
    }
    res = client.post("/transaction/", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


# --- registration / login ------------------------------------------------------

def test_register_rejects_short_and_empty_password(client):
    for pw in ("short", "1234567", ""):
        res = client.post("/user/register", json={"email": "a@example.com", "password": pw})
        assert res.status_code == 400, (pw, res.text)

    user = register(client, "a@example.com", password="12345678")
    assert user["email"] == "a@example.com"
    assert "password" not in user and "password_hash" not in user


def test_register_duplicate_email_rejected(client):
    register(client, "dup@example.com")
    res = client.post("/user/register", json={"email": "dup@example.com", "password": PASSWORD})
    assert res.status_code == 400


def test_login_returns_bearer_token_with_user_id_subject(client):
    user = register(client, "login@example.com")
    res = client.post("/login", data={"username": "login@example.com", "password": PASSWORD})
    assert res.status_code == 200
    body = res.json()
    assert set(body) == {"access_token", "token_type"}
    assert body["token_type"] == "bearer"

    payload = jwt.decode(body["access_token"], JWTToken.SECRET_KEY, algorithms=[JWTToken.ALGORITHM])
    assert payload["sub"] == str(user["id"])
    # Lifetime is ACCESS_TOKEN_EXPIRE_MINUTES (not days, as with the old timedelta bug)
    lifetime = datetime.fromtimestamp(payload["exp"], timezone.utc) - datetime.now(timezone.utc)
    expected = timedelta(minutes=JWTToken.ACCESS_TOKEN_EXPIRE_MINUTES)
    assert expected - timedelta(minutes=1) < lifetime <= expected


def test_login_wrong_password_or_unknown_user(client):
    register(client, "pw@example.com")
    assert client.post("/login", data={"username": "pw@example.com", "password": "wrong-password"}).status_code == 401
    assert client.post("/login", data={"username": "nobody@example.com", "password": PASSWORD}).status_code == 401


def test_login_with_legacy_or_empty_hash_returns_401(client):
    from data_access.data_access import SessionLocal
    from models.user import User

    with SessionLocal() as db:
        db.add_all([
            User(email="legacy@example.com", password_hash="$2b$12$notapbkdf2hashatall......"),
            User(email="nohash@example.com", password_hash=""),
        ])
        db.commit()

    for email in ("legacy@example.com", "nohash@example.com"):
        res = client.post("/login", data={"username": email, "password": PASSWORD})
        assert res.status_code == 401, (email, res.text)


def test_user_me(client):
    user, headers = make_user(client, "me@example.com")
    res = client.get("/user/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["id"] == user["id"]
    assert res.json()["email"] == "me@example.com"

    assert client.get("/user/me").status_code == 401


# --- tokens ----------------------------------------------------------------------

def test_token_survives_email_change(client):
    user, headers = make_user(client, "old@example.com")
    res = client.put(f"/user/{user['id']}", json={"email": "new@example.com"}, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["email"] == "new@example.com"

    me = client.get("/user/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == "new@example.com"

    login(client, "new@example.com")
    assert client.post("/login", data={"username": "old@example.com", "password": PASSWORD}).status_code == 401


def test_update_user_explicit_null_email_is_ignored(client):
    user, headers = make_user(client, "null@example.com")
    res = client.put(f"/user/{user['id']}", json={"email": None, "name": "Neu"}, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["email"] == "null@example.com"
    assert res.json()["name"] == "Neu"


def test_token_forged_with_old_public_key_is_rejected(client):
    user, _ = make_user(client, "victim@example.com")
    exp = datetime.now(timezone.utc) + timedelta(hours=1)
    for sub in (str(user["id"]), "victim@example.com"):
        forged = jwt.encode({"sub": sub, "exp": exp}, OLD_PUBLIC_KEY, algorithm="HS256")
        assert client.get("/user/me", headers=auth(forged)).status_code == 401


def test_expired_garbage_and_invalid_subject_tokens_are_rejected(client):
    user, _ = make_user(client, "tok@example.com")

    expired = JWTToken.create_access_token({"sub": str(user["id"])}, expires_delta=timedelta(minutes=-1))
    assert client.get("/user/me", headers=auth(expired)).status_code == 401

    assert client.get("/user/me", headers=auth("garbage")).status_code == 401
    assert client.get("/user/me", headers=auth("a.b.c")).status_code == 401

    # Validly signed, but the old e-mail style subject / unknown id / no subject
    for data in ({"sub": "tok@example.com"}, {"sub": "999999"}, {}):
        token = JWTToken.create_access_token(data)
        assert client.get("/user/me", headers=auth(token)).status_code == 401, data


def test_get_user_by_id_requires_auth_and_ownership(client):
    user_a, headers_a = make_user(client, "a@example.com")
    user_b, _ = make_user(client, "b@example.com")

    res = client.get(f"/user/{user_a['id']}", headers=headers_a)
    assert res.status_code == 200
    assert isinstance(res.json(), dict)
    assert res.json()["id"] == user_a["id"]

    assert client.get(f"/user/{user_b['id']}", headers=headers_a).status_code == 403
    assert client.get(f"/user/{user_a['id']}").status_code == 401
    # Also no profile/password updates for another user
    assert client.put(f"/user/{user_b['id']}", json={"name": "x"}, headers=headers_a).status_code == 403
    res = client.put(
        f"/user/{user_b['id']}/password",
        json={"current_password": PASSWORD, "new_password": "another-pass-1"},
        headers=headers_a,
    )
    assert res.status_code == 403


def test_change_password(client):
    user, headers = make_user(client, "chpw@example.com")
    url = f"/user/{user['id']}/password"
    assert client.put(url, json={"current_password": PASSWORD, "new_password": "short"}, headers=headers).status_code == 400
    assert client.put(url, json={"current_password": "wrong-pass-1", "new_password": "new-pass-123"}, headers=headers).status_code == 400
    assert client.put(url, json={"current_password": PASSWORD, "new_password": "new-pass-123"}, headers=headers).status_code == 200
    login(client, "chpw@example.com", "new-pass-123")


# --- list endpoints ----------------------------------------------------------------

@pytest.mark.parametrize("path", ["/account/", "/category/", "/tag/", "/transaction/", "/merchant/", "/transaction/filter"])
def test_list_endpoints_return_empty_list(client, path):
    _, headers = make_user(client, "empty@example.com")
    res = client.get(path, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json() == []


@pytest.mark.parametrize("path", ["/account/999", "/category/999", "/tag/999", "/transaction/999", "/merchant/999"])
def test_missing_items_return_404(client, path):
    _, headers = make_user(client, "missing@example.com")
    assert client.get(path, headers=headers).status_code == 404


# --- categories ------------------------------------------------------------------------

def test_category_update_with_unchanged_name_and_partial_body(client):
    _, headers = make_user(client, "cat@example.com")
    cat = make_category(client, headers, "Lebensmittel")

    # Same name + description (what the Settings UI sends)
    res = client.put("/category/", json={"id": cat["id"], "name": "Lebensmittel", "type": "expense",
                                          "parent_id": None, "description": "Wocheneinkauf"}, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["description"] == "Wocheneinkauf"

    # Only id + name: optional fields default to None and are left unchanged
    res = client.put("/category/", json={"id": cat["id"], "name": "Essen"}, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Essen"
    assert res.json()["type"] == "expense"
    assert res.json()["description"] == "Wocheneinkauf"


def test_category_rename_to_existing_name_rejected(client):
    _, headers = make_user(client, "dupcat@example.com")
    make_category(client, headers, "Miete")
    other = make_category(client, headers, "Freizeit")
    res = client.put("/category/", json={"id": other["id"], "name": "Miete"}, headers=headers)
    assert res.status_code == 400


def test_category_cycle_rejected(client):
    _, headers = make_user(client, "cycle@example.com")
    root = make_category(client, headers, "Root")
    child = make_category(client, headers, "Child", parent_id=root["id"])
    grandchild = make_category(client, headers, "Grandchild", parent_id=child["id"])

    for new_parent in (root["id"], child["id"], grandchild["id"]):
        res = client.put("/category/", json={"id": root["id"], "parent_id": new_parent}, headers=headers)
        assert res.status_code in (400, 422), (new_parent, res.text)

    assert client.get(f"/category/{root['id']}", headers=headers).json()["parent_id"] is None

    # Deleting the tree still works (no recursion problem)
    assert client.delete(f"/category/{root['id']}", headers=headers).status_code == 200
    assert client.get("/category/", headers=headers).json() == []


def test_category_move_to_top_level_and_reparent(client):
    _, headers = make_user(client, "move@example.com")
    a = make_category(client, headers, "A")
    b = make_category(client, headers, "B")
    child = make_category(client, headers, "Child", parent_id=a["id"])

    res = client.put("/category/", json={"id": child["id"], "parent_id": b["id"]}, headers=headers)
    assert res.status_code == 200 and res.json()["parent_id"] == b["id"]

    res = client.put("/category/", json={"id": child["id"], "parent_id": None}, headers=headers)
    assert res.status_code == 200 and res.json()["parent_id"] is None

    # Omitting parent_id leaves it unchanged
    client.put("/category/", json={"id": child["id"], "parent_id": a["id"]}, headers=headers)
    res = client.put("/category/", json={"id": child["id"], "name": "Kind"}, headers=headers)
    assert res.status_code == 200 and res.json()["parent_id"] == a["id"]


def test_category_unknown_or_foreign_id(client):
    _, headers_a = make_user(client, "cat-a@example.com")
    _, headers_b = make_user(client, "cat-b@example.com")
    cat_a = make_category(client, headers_a, "Privat")

    assert client.put("/category/", json={"id": 99999, "name": "x"}, headers=headers_a).status_code == 404
    assert client.put("/category/", json={"id": cat_a["id"], "name": "Hacked"}, headers=headers_b).status_code == 404
    assert client.get(f"/category/{cat_a['id']}", headers=headers_b).status_code == 404
    assert client.delete(f"/category/{cat_a['id']}", headers=headers_b).status_code in (400, 404)

    # Another user's category cannot be used as parent
    own_b = make_category(client, headers_b, "B-Kategorie")
    res = client.post("/category/", json={"name": "Sub", "type": "expense", "parent_id": cat_a["id"]}, headers=headers_b)
    assert res.status_code in (400, 404)
    res = client.put("/category/", json={"id": own_b["id"], "parent_id": cat_a["id"]}, headers=headers_b)
    assert res.status_code in (400, 404)

    still = client.get(f"/category/{cat_a['id']}", headers=headers_a)
    assert still.status_code == 200 and still.json()["name"] == "Privat"
    assert [c["name"] for c in client.get("/category/", headers=headers_b).json()] == ["B-Kategorie"]


# --- transactions ------------------------------------------------------------------------

def test_transaction_create_minimal(client):
    _, headers = make_user(client, "txmin@example.com")
    account = make_account(client, headers)
    res = client.post("/transaction/", json={"account_id": account["id"], "date": "2026-10-01", "amount_cents": 1000},
                      headers=headers)
    assert res.status_code == 200, res.text
    tx = res.json()
    assert tx["category_id"] is None
    assert tx["tags"] == []
    assert tx["currency_code"]


def test_transaction_create_update_and_clear(client):
    _, headers = make_user(client, "tx@example.com")
    account = make_account(client, headers)
    cat = make_category(client, headers, "Einkauf")
    tag1 = make_tag(client, headers, "Ferien")
    tag2 = make_tag(client, headers, "Familie", color="#00ff00")

    tx = make_transaction(client, headers, account["id"], category_id=cat["id"], tags=[tag1["id"], tag2["id"]])
    assert tx["category_id"] == cat["id"]
    assert sorted(t["id"] for t in tx["tags"]) == sorted([tag1["id"], tag2["id"]])
    assert client.get(f"/transaction/{tx['id']}", headers=headers).json()["id"] == tx["id"]

    # Partial update: fields that are not sent stay unchanged
    res = client.put(f"/transaction/{tx['id']}", json={"amount_cents": -3000, "description": "Coop"}, headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["amount_cents"] == -3000 and body["description"] == "Coop"
    assert body["category_id"] == cat["id"]
    assert len(body["tags"]) == 2

    # Replace tags
    res = client.put(f"/transaction/{tx['id']}", json={"tags": [tag2["id"]]}, headers=headers)
    assert [t["id"] for t in res.json()["tags"]] == [tag2["id"]]

    # Clear category, tags untouched
    res = client.put(f"/transaction/{tx['id']}", json={"category_id": None}, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["category_id"] is None
    assert [t["id"] for t in res.json()["tags"]] == [tag2["id"]]

    # Clear tags with [] ...
    res = client.put(f"/transaction/{tx['id']}", json={"tags": []}, headers=headers)
    assert res.status_code == 200 and res.json()["tags"] == []

    # ... and with null
    client.put(f"/transaction/{tx['id']}", json={"tags": [tag1["id"]], "category_id": cat["id"]}, headers=headers)
    res = client.put(f"/transaction/{tx['id']}", json={"tags": None}, headers=headers)
    assert res.status_code == 200 and res.json()["tags"] == []
    assert res.json()["category_id"] == cat["id"]

    stored = client.get(f"/transaction/{tx['id']}", headers=headers).json()
    assert stored["tags"] == [] and stored["category_id"] == cat["id"]

    # remove_category route
    res = client.put(f"/transaction/{tx['id']}/remove_category", headers=headers)
    assert res.status_code == 200 and res.json()["category_id"] is None


def test_transaction_update_unknown_id(client):
    _, headers = make_user(client, "txnone@example.com")
    assert client.put("/transaction/99999", json={"amount_cents": 1}, headers=headers).status_code == 404
    assert client.delete("/transaction/99999", headers=headers).status_code == 404


def test_transaction_filter(client):
    _, headers = make_user(client, "filter@example.com")
    account = make_account(client, headers)
    make_transaction(client, headers, account["id"], amount_cents=-500, description="Kaffee", date="2026-09-01")
    make_transaction(client, headers, account["id"], amount_cents=-5000, description="Migros", date="2026-09-15")
    make_transaction(client, headers, account["id"], amount_cents=10000, description="Lohn", date="2026-09-25")

    res = client.get("/transaction/filter", params={"amount_cents": 0, "amount_operation": "gt"}, headers=headers)
    # amount_cents=0 is treated as "no filter"
    assert res.status_code == 200 and len(res.json()) == 3

    res = client.get("/transaction/filter", params={"amount_cents": -1000, "amount_operation": "lt"}, headers=headers)
    assert [t["description"] for t in res.json()] == ["Migros"]

    res = client.get("/transaction/filter", params={"date": "2026-09-10", "date_operation": "gte"}, headers=headers)
    assert [t["description"] for t in res.json()] == ["Lohn", "Migros"]

    res = client.get("/transaction/filter", params={"description": "kaf"}, headers=headers)
    assert [t["description"] for t in res.json()] == ["Kaffee"]

    res = client.get("/transaction/filter", params={"amount_cents": 1, "amount_operation": "between"}, headers=headers)
    assert res.status_code == 400


def test_transaction_with_foreign_category_rejected(client):
    _, headers_a = make_user(client, "fc-a@example.com")
    _, headers_b = make_user(client, "fc-b@example.com")
    cat_a = make_category(client, headers_a, "A-Kategorie")
    account_b = make_account(client, headers_b)

    res = client.post("/transaction/", json={"account_id": account_b["id"], "date": "2026-09-30",
                                             "amount_cents": -100, "currency_code": "CHF",
                                             "category_id": cat_a["id"]}, headers=headers_b)
    assert res.status_code == 404

    tx_b = make_transaction(client, headers_b, account_b["id"])
    res = client.put(f"/transaction/{tx_b['id']}", json={"category_id": cat_a["id"]}, headers=headers_b)
    assert res.status_code == 404
    assert client.get(f"/transaction/{tx_b['id']}", headers=headers_b).json()["category_id"] is None


# --- cross-user isolation -------------------------------------------------------------------

def test_user_cannot_read_or_modify_other_users_data(client):
    _, headers_a = make_user(client, "owner@example.com")
    _, headers_b = make_user(client, "intruder@example.com")

    account_a = make_account(client, headers_a, "A-Konto")
    cat_a = make_category(client, headers_a, "A-Kat")
    tag_a = make_tag(client, headers_a, "A-Tag")
    tx_a = make_transaction(client, headers_a, account_a["id"], category_id=cat_a["id"], tags=[tag_a["id"]])

    # Read
    assert client.get(f"/account/{account_a['id']}", headers=headers_b).status_code == 404
    assert client.get(f"/category/{cat_a['id']}", headers=headers_b).status_code == 404
    assert client.get(f"/tag/{tag_a['id']}", headers=headers_b).status_code == 404
    assert client.get(f"/transaction/{tx_a['id']}", headers=headers_b).status_code == 404
    for path in ("/account/", "/category/", "/tag/", "/transaction/", "/transaction/filter"):
        assert client.get(path, headers=headers_b).json() == [], path

    # Modify
    res = client.put(f"/transaction/{tx_a['id']}", json={"amount_cents": 1, "category_id": None, "tags": []},
                     headers=headers_b)
    assert res.status_code == 404
    assert client.put(f"/transaction/{tx_a['id']}/remove_category", headers=headers_b).status_code == 404
    assert client.delete(f"/transaction/{tx_a['id']}", headers=headers_b).status_code == 404
    assert client.put("/category/", json={"id": cat_a["id"], "name": "Hacked"}, headers=headers_b).status_code == 404
    # Account/tag/category PUT+DELETE report "unable to ..." (400) for rows that are not the user's
    assert client.put("/account/", json={"id": account_a["id"], "name": "Hacked"}, headers=headers_b).status_code in (400, 404)
    assert client.delete(f"/account/{account_a['id']}", headers=headers_b).status_code in (400, 404)
    assert client.put("/tag/", json={"id": tag_a["id"], "name": "Hacked"}, headers=headers_b).status_code in (400, 404)
    assert client.delete(f"/tag/{tag_a['id']}", headers=headers_b).status_code in (400, 404)
    assert client.delete(f"/category/{cat_a['id']}", headers=headers_b).status_code in (400, 404)

    # B cannot book onto A's account or move own transactions there; A's tags are ignored
    res = client.post("/transaction/", json={"account_id": account_a["id"], "date": "2026-09-30",
                                             "amount_cents": -100, "currency_code": "CHF"}, headers=headers_b)
    assert res.status_code in (404, 409)
    account_b = make_account(client, headers_b, "B-Konto")
    tx_b = make_transaction(client, headers_b, account_b["id"], tags=[tag_a["id"]])
    assert tx_b["tags"] == []
    res = client.put(f"/transaction/{tx_b['id']}", json={"account_id": account_a["id"]}, headers=headers_b)
    assert res.status_code in (404, 409)

    # A's data is untouched
    account = client.get(f"/account/{account_a['id']}", headers=headers_a).json()
    assert account["name"] == "A-Konto"
    assert [t["id"] for t in account["transactions"]] == [tx_a["id"]]
    assert client.get(f"/category/{cat_a['id']}", headers=headers_a).json()["name"] == "A-Kat"
    assert client.get(f"/tag/{tag_a['id']}", headers=headers_a).json()["name"] == "A-Tag"
    tx = client.get(f"/transaction/{tx_a['id']}", headers=headers_a).json()
    assert tx["amount_cents"] == tx_a["amount_cents"]
    assert tx["category_id"] == cat_a["id"]
    assert [t["id"] for t in tx["tags"]] == [tag_a["id"]]

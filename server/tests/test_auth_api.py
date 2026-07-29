"""Focused authentication, rotation, invalidation, and RBAC tests."""

from tests.conftest import TEST_PASSWORD, ApiContext


def test_valid_login_and_current_user(context: ApiContext) -> None:
    tokens = context.login(context.admin_email)
    response = context.client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )

    assert tokens["token_type"] == "bearer"
    assert tokens["expires_in"] == 900
    assert response.status_code == 200
    assert response.json()["email"] == context.admin_email
    assert response.json()["role"] == "admin"


def test_invalid_login_is_generic(context: ApiContext) -> None:
    response = context.client.post(
        "/api/v1/auth/login",
        json={
            "organization_slug": "test-legal-aid",
            "email": context.admin_email,
            "password": "incorrect-password",
        },
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"
    assert response.json()["error"]["message"] == ("Invalid organisation, email, or password.")


def test_missing_access_token(context: ApiContext) -> None:
    response = context.client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_access_token"


def test_refresh_rotation_rejects_old_token_reuse(context: ApiContext) -> None:
    original = context.login(context.admin_email)
    rotated = context.client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": original["refresh_token"]},
    )
    reuse = context.client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": original["refresh_token"]},
    )

    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] != original["refresh_token"]
    assert reuse.status_code == 401
    assert reuse.json()["error"]["code"] == "invalid_refresh_token"


def test_logout_revokes_refresh_and_is_idempotent(context: ApiContext) -> None:
    tokens = context.login(context.admin_email)
    first_logout = context.client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": tokens["refresh_token"]},
    )
    second_logout = context.client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": tokens["refresh_token"]},
    )
    refresh = context.client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )

    assert first_logout.status_code == 204
    assert second_logout.status_code == 204
    assert refresh.status_code == 401


def test_password_change_invalidates_existing_tokens(context: ApiContext) -> None:
    tokens = context.login(context.admin_email)
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    new_password = "ReplacementPassword@2026"

    changed = context.client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={
            "current_password": TEST_PASSWORD,
            "new_password": new_password,
        },
    )
    old_access = context.client.get("/api/v1/auth/me", headers=headers)
    old_refresh = context.client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    new_login = context.client.post(
        "/api/v1/auth/login",
        json={
            "organization_slug": "test-legal-aid",
            "email": context.admin_email,
            "password": new_password,
        },
    )

    assert changed.status_code == 204
    assert old_access.status_code == 401
    assert old_refresh.status_code == 401
    assert new_login.status_code == 200


def test_admin_can_provision_normalized_user(context: ApiContext) -> None:
    response = context.client.post(
        "/api/v1/users",
        headers=context.access_headers(context.admin_email),
        json={
            "email": "NEW.REVIEWER@TEST.LEGALBRIDGE",
            "full_name": "New Reviewer",
            "role": "reviewer",
            "temporary_password": "TemporaryUser@2026",
        },
    )

    assert response.status_code == 201
    assert response.json()["email"] == "new.reviewer@test.legalbridge"
    assert response.json()["role"] == "reviewer"


def test_attorney_cannot_provision_users(context: ApiContext) -> None:
    response = context.client.post(
        "/api/v1/users",
        headers=context.access_headers(context.attorney_email),
        json={
            "email": "blocked@test.legalbridge",
            "full_name": "Blocked User",
            "role": "reviewer",
            "temporary_password": "TemporaryUser@2026",
        },
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "insufficient_role"

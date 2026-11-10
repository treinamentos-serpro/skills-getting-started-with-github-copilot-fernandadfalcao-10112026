from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

import src.app as app_module


@pytest.fixture
def client(monkeypatch):
    test_activities = deepcopy(app_module.activities)
    monkeypatch.setattr(app_module, "activities", test_activities)
    return TestClient(app_module.app)


def test_get_activities_returns_activity_data(client):
    response = client.get("/activities")

    assert response.status_code == 200
    assert response.json()["Chess Club"]["participants"] == [
        "michael@mergington.edu",
        "daniel@mergington.edu",
    ]


def test_signup_adds_participant(client):
    email = "new.student@mergington.edu"

    response = client.post("/activities/Chess%20Club/signup", params={"email": email})

    assert response.status_code == 200
    assert email in app_module.activities["Chess Club"]["participants"]


def test_signup_returns_404_for_unknown_activity(client):
    response = client.post("/activities/Unknown%20Club/signup", params={"email": "student@mergington.edu"})

    assert response.status_code == 404


def test_signup_rejects_duplicate_participant(client):
    email = "michael@mergington.edu"
    participants_before = app_module.activities["Chess Club"]["participants"].copy()

    response = client.post("/activities/Chess%20Club/signup", params={"email": email})

    assert response.status_code == 400
    assert app_module.activities["Chess Club"]["participants"] == participants_before


def test_signup_rejects_full_activity_without_changing_participants(client):
    activity = app_module.activities["Chess Club"]
    activity["participants"] = [
        f"student{index}@mergington.edu" for index in range(activity["max_participants"])
    ]
    participants_before = activity["participants"].copy()

    response = client.post(
        "/activities/Chess%20Club/signup",
        params={"email": "new.student@mergington.edu"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Activity is full"
    assert activity["participants"] == participants_before


def test_unregister_removes_participant(client):
    email = "michael@mergington.edu"

    response = client.delete("/activities/Chess%20Club/signup", params={"email": email})

    assert response.status_code == 200
    assert email not in app_module.activities["Chess Club"]["participants"]


def test_unregister_returns_404_for_unknown_activity(client):
    response = client.delete(
        "/activities/Unknown%20Club/signup",
        params={"email": "student@mergington.edu"},
    )

    assert response.status_code == 404


def test_unregister_returns_404_for_unregistered_participant(client):
    response = client.delete(
        "/activities/Chess%20Club/signup",
        params={"email": "unknown.student@mergington.edu"},
    )

    assert response.status_code == 404


def test_unregister_frees_spot_for_another_participant(client):
    activity = app_module.activities["Chess Club"]
    activity["max_participants"] = len(activity["participants"])
    email_to_remove = activity["participants"][0]

    removal_response = client.delete(
        "/activities/Chess%20Club/signup",
        params={"email": email_to_remove},
    )
    signup_response = client.post(
        "/activities/Chess%20Club/signup",
        params={"email": "new.student@mergington.edu"},
    )

    assert removal_response.status_code == 200
    assert signup_response.status_code == 200
    assert len(activity["participants"]) == activity["max_participants"]
"""TTL cache and the two cached endpoints: incident summary and supplier list."""

from __future__ import annotations

from services.api.cache import TTLCache
from services.api.tests.test_auth import create_authenticated_user

SUPPLIER = {
    "name": "Cached Carrier",
    "country": "USA",
    "categories": ["carrier_last_mile"],
    "rate_per_shipment": 5.0,
    "currency": "USD",
    "status": "active",
}
INCIDENT = {
    "title": "Paquete no entregado",
    "description": "El cliente indica que el paquete no ha llegado.",
    "category": "delayed_delivery",
    "origin": "branch",
    "branch": "zaragoza",
}


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def test_ttl_cache_hits_until_expiry_then_recomputes():
    clock = FakeClock()
    cache = TTLCache(clock=clock)
    calls = []
    compute = lambda: calls.append(1) or len(calls)  # noqa: E731

    assert cache.get_or_compute("ns", "k", 30, compute) == (1, False)
    assert cache.get_or_compute("ns", "k", 30, compute) == (1, True)
    clock.now += 31
    assert cache.get_or_compute("ns", "k", 30, compute) == (2, False)
    assert (cache.hits, cache.misses) == (1, 2)


def test_invalidate_only_drops_its_namespace_and_size_is_bounded():
    cache = TTLCache(max_entries=2)
    cache.get_or_compute("a", 1, 60, lambda: "a1")
    cache.get_or_compute("b", 1, 60, lambda: "b1")
    cache.invalidate("a")
    assert cache.get_or_compute("b", 1, 60, lambda: "new")[1] is True
    assert cache.get_or_compute("a", 1, 60, lambda: "a2") == ("a2", False)
    cache.get_or_compute("c", 1, 60, lambda: "c1")  # evicts the least recently used ("b")
    assert cache.get_or_compute("b", 1, 60, lambda: "b2") == ("b2", False)


def test_incident_summary_is_cached_and_invalidated_by_writes(api_database):
    client, *_ = api_database
    _, headers = create_authenticated_user(client)

    first = client.get("/api/incidents/summary", headers=headers)
    second = client.get("/api/incidents/summary", headers=headers)
    assert (first.headers["X-Cache"], second.headers["X-Cache"]) == ("MISS", "HIT")
    assert second.json()["total"] == 0

    created = client.post("/api/incidents", json=INCIDENT, headers=headers).json()
    after_create = client.get("/api/incidents/summary", headers=headers)
    assert after_create.headers["X-Cache"] == "MISS" and after_create.json()["total"] == 1

    client.patch(f"/api/incidents/{created['id']}/status", json={"status": "in_progress"}, headers=headers)
    after_status = client.get("/api/incidents/summary", headers=headers).json()
    assert after_status["by_status"]["in_progress"] == 1 and after_status["by_status"]["open"] == 0


def test_supplier_list_cache_is_keyed_by_filters_and_cleared_on_every_write(api_database):
    client, *_ = api_database
    _, headers = create_authenticated_user(client)
    created = client.post("/suppliers", json=SUPPLIER, headers=headers).json()

    assert client.get("/suppliers", headers=headers).headers["X-Cache"] == "MISS"
    assert client.get("/suppliers", headers=headers).headers["X-Cache"] == "HIT"
    assert client.get("/suppliers?country=Spain", headers=headers).headers["X-Cache"] == "MISS"
    assert client.get("/suppliers?country=Spain", headers=headers).json() == []

    for write in (
        lambda: client.patch(f"/suppliers/{created['id']}/rate", json={"rate_per_shipment": 6.5}, headers=headers),
        lambda: client.patch(f"/suppliers/{created['id']}/status", json={"status": "suspended"}, headers=headers),
    ):
        write()
        refreshed = client.get("/suppliers", headers=headers)
        assert refreshed.headers["X-Cache"] == "MISS"
    assert refreshed.json()[0]["rate_per_shipment"] == 6.5
    assert refreshed.json()[0]["status"] == "suspended"

    client.delete(f"/suppliers/{created['id']}", headers=headers)
    assert client.get("/suppliers", headers=headers).json() == []


def test_cached_endpoints_still_require_authentication(api_database):
    client, *_ = api_database
    _, headers = create_authenticated_user(client)
    client.get("/suppliers", headers=headers)  # warm the cache
    assert client.get("/suppliers").status_code == 401
    assert client.get("/api/incidents/summary").status_code == 401

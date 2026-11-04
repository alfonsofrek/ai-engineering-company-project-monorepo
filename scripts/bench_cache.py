#!/usr/bin/env python3
"""Measures the API's own processing time (Server-Timing header from the timing middleware).

Start the API first, then:  python scripts/bench_cache.py --base http://127.0.0.1:8000 --runs 30
Registers a throwaway user, then calls each read endpoint N times in a burst (like a
dashboard being refreshed) and prints median and p95 per endpoint.
"""

from __future__ import annotations

import argparse
import json
import statistics
import time
import urllib.request
import uuid

ENDPOINTS = ["/api/incidents/summary", "/suppliers", "/suppliers?country=Spain", "/api/incidents", "/auth/me"]


def call(base: str, path: str, method: str = "GET", body: dict | None = None, token: str | None = None):
    request = urllib.request.Request(base + path, method=method, data=json.dumps(body).encode() if body else None)
    request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(request, timeout=60) as response:
        server_ms = float(response.headers.get("Server-Timing", "app;dur=0").split("dur=")[1])
        return json.loads(response.read() or b"null"), server_ms, response.headers.get("X-Cache", "-")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    parser.add_argument("--runs", type=int, default=30)
    args = parser.parse_args()

    email, password = f"bench-{uuid.uuid4().hex[:8]}@example.com", "benchmark-pass-123"
    call(args.base, "/users", "POST", {"email": email, "password": password})
    token = call(args.base, "/auth/login", "POST", {"email": email, "password": password})[0]["access_token"]

    for path in ENDPOINTS:
        samples, states = [], []
        for _ in range(args.runs):
            _, server_ms, state = call(args.base, path, token=token)
            samples.append(server_ms)
            states.append(state)
            time.sleep(0.01)
        samples_sorted = sorted(samples)
        p95 = samples_sorted[int(len(samples_sorted) * 0.95) - 1]
        print(f"{path:<28} first={samples[0]:8.1f}ms  median={statistics.median(samples):8.1f}ms  p95={p95:8.1f}ms  "
              f"hits={states.count('HIT')}/{len(states)}")


if __name__ == "__main__":
    main()

"""Small in-process TTL cache for read-heavy endpoints.

Why in-process and not Redis: the API runs as a single Uvicorn process (one container,
``--workers 1`` in docker-compose.prod.yml) and TinyDB is a local file, so a dict in memory
is the cheapest correct option. With several workers, each would keep its own copy and
invalidation would only reach one of them — that is the point to move this to Redis.

Every entry has a TTL, the cache has a size bound, and writes invalidate by namespace.
"""

from __future__ import annotations

import os
import threading
import time
from collections import OrderedDict
from collections.abc import Callable, Hashable
from typing import Any, TypeVar

T = TypeVar("T")


class TTLCache:
    def __init__(self, max_entries: int = 256, clock: Callable[[], float] = time.monotonic):
        self._entries: OrderedDict[tuple[str, Hashable], tuple[float, Any]] = OrderedDict()
        self._lock = threading.Lock()
        self._max_entries = max_entries
        self._clock = clock
        self.hits = 0
        self.misses = 0

    def get_or_compute(self, namespace: str, key: Hashable, ttl_seconds: float, compute: Callable[[], T]) -> tuple[T, bool]:
        """Returns (value, was_cached). ``compute`` runs outside the lock."""
        if os.getenv("API_CACHE_ENABLED", "true").lower() in {"0", "false", "no"}:
            return compute(), False  # kill switch, also used to measure "before" in CACHING_REPORT.md
        full_key = (namespace, key)
        now = self._clock()
        with self._lock:
            entry = self._entries.get(full_key)
            if entry is not None and entry[0] > now:
                self._entries.move_to_end(full_key)
                self.hits += 1
                return entry[1], True
            self.misses += 1

        value = compute()
        with self._lock:
            self._entries[full_key] = (self._clock() + ttl_seconds, value)
            self._entries.move_to_end(full_key)
            while len(self._entries) > self._max_entries:
                self._entries.popitem(last=False)  # least recently used
        return value, False

    def invalidate(self, namespace: str) -> None:
        """Drops every entry of a namespace (e.g. all supplier list variants after a write)."""
        with self._lock:
            for full_key in [k for k in self._entries if k[0] == namespace]:
                del self._entries[full_key]

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()
            self.hits = self.misses = 0


cache = TTLCache()

# Namespaces and TTLs (seconds). Rationale in CACHING_REPORT.md.
INCIDENT_SUMMARY = "incidents:summary"
INCIDENT_SUMMARY_TTL = 30
SUPPLIER_LIST = "suppliers:list"
SUPPLIER_LIST_TTL = 300

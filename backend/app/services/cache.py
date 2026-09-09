import json
import logging
import time
from typing import Optional, Any, Dict
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """
    Unified Caching and Idempotency service.
    Connects to Redis with automatic high-performance in-memory fallback
    to guarantee 100% uptime and testability in any environment.
    """

    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None
        self._memory_cache: Dict[str, Any] = {}
        self._memory_ttl: Dict[str, float] = {}
        self._is_redis_available = False

    async def initialize(self):
        """Try connecting to Redis on startup."""
        try:
            client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2.0,
            )
            await client.ping()
            self._redis = client
            self._is_redis_available = True
            logger.info("Connected to Redis server successfully.")
        except Exception as e:
            logger.warning(
                f"Redis server unavailable ({e}). Defaulting to resilient in-memory session and idempotency store."
            )
            self._is_redis_available = False

    def _purge_expired_memory(self):
        now = time.time()
        expired_keys = [k for k, exp in self._memory_ttl.items() if exp <= now]
        for k in expired_keys:
            self._memory_cache.pop(k, None)
            self._memory_ttl.pop(k, None)

    async def set_idempotency_key(self, event_id: str, ttl_seconds: int = 3600) -> bool:
        """
        Check and set idempotency lock for webhook events.
        Returns True if the event is new (acquired lock), False if already processed/duplicate.
        """
        key = f"recoverflow:idempotency:{event_id}"
        if self._is_redis_available and self._redis:
            try:
                # SET key val NX EX ttl -> returns True if set, None if already exists
                result = await self._redis.set(key, "1", nx=True, ex=ttl_seconds)
                return bool(result)
            except Exception as e:
                logger.error(f"Redis idempotency error: {e}")

        # Fallback in-memory check
        self._purge_expired_memory()
        if key in self._memory_cache:
            return False

        self._memory_cache[key] = "1"
        self._memory_ttl[key] = time.time() + ttl_seconds
        return True

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached dunning session context."""
        key = f"recoverflow:session:{session_id}"
        if self._is_redis_available and self._redis:
            try:
                data = await self._redis.get(key)
                return json.loads(data) if data else None
            except Exception as e:
                logger.error(f"Redis get_session error: {e}")

        self._purge_expired_memory()
        return self._memory_cache.get(key)

    async def set_session(self, session_id: str, data: Dict[str, Any], ttl_seconds: int = 7200):
        """Store dunning session state with TTL."""
        key = f"recoverflow:session:{session_id}"
        if self._is_redis_available and self._redis:
            try:
                await self._redis.set(key, json.dumps(data), ex=ttl_seconds)
                return
            except Exception as e:
                logger.error(f"Redis set_session error: {e}")

        self._purge_expired_memory()
        self._memory_cache[key] = data
        self._memory_ttl[key] = time.time() + ttl_seconds


cache_service = CacheService()

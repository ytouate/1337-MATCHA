import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from src.core.config import IS_PRODUCTION

RATE_LIMITS: dict[str, tuple[int, int]] = {
    "/api/auth/signin": (5, 60),
    "/api/auth/signup": (5, 60),
    "/api/auth/forgot-password": (3, 60),
}

_request_log: dict[str, deque[float]] = defaultdict(deque)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if not IS_PRODUCTION:
            return await call_next(request)

        path = request.url.path
        limit_rule = RATE_LIMITS.get(path)
        if limit_rule is None:
            return await call_next(request)

        max_requests, window_seconds = limit_rule
        client_ip = request.client.host if request.client else "unknown"
        bucket_key = f"{client_ip}:{path}"
        now = time.time()
        timestamps = _request_log[bucket_key]

        while timestamps and timestamps[0] <= now - window_seconds:
            timestamps.popleft()

        if len(timestamps) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )

        timestamps.append(now)
        return await call_next(request)

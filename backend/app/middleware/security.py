import time
from collections import defaultdict
from threading import Lock
from typing import Dict, List, Tuple
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from backend.app.config import settings

class InMemoryRateLimiter:
    """Thread-safe sliding-window rate limiter by client IP."""
    def __init__(self):
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._lock = Lock()

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int = 60) -> Tuple[bool, int]:
        now = time.time()
        window_start = now - window_seconds
        with self._lock:
            # Purge expired timestamps
            timestamps = [t for t in self._requests[key] if t > window_start]
            if len(timestamps) >= max_requests:
                # Calculate retry-after
                retry_after = max(1, int(timestamps[0] + window_seconds - now))
                self._requests[key] = timestamps
                return True, retry_after

            timestamps.append(now)
            self._requests[key] = timestamps
            return False, 0

    def reset(self, key: str):
        with self._lock:
            self._requests.pop(key, None)

rate_limiter = InMemoryRateLimiter()

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enforces essential production HTTP security headers on all responses."""
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=()"

        # HSTS (Strict-Transport-Security)
        if request.url.scheme == "https" or settings.APP_ENV == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Applies IP-based rate limiting to prevent brute-force attacks and resource exhaustion."""
    async def dispatch(self, request: Request, call_next):
        # Exempt health checks and documentation
        path = request.url.path
        if path in ["/health", "/api/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        # Get client IP (support reverse-proxy X-Forwarded-For)
        client_ip = "127.0.0.1"
        x_forwarded_for = request.headers.get("x-forwarded-for")
        if x_forwarded_for:
            client_ip = x_forwarded_for.split(",")[0].strip()
        elif request.client and request.client.host:
            client_ip = request.client.host

        # Allow test client by default unless explicitly testing rate limits
        if client_ip == "testclient" and not request.headers.get("x-test-rate-limit"):
            return await call_next(request)

        # Determine rate limit category
        is_auth_endpoint = any(path.startswith(p) for p in [
            f"{settings.API_PREFIX}/auth/login",
            f"{settings.API_PREFIX}/auth/register",
            f"{settings.API_PREFIX}/auth/forgot-password",
            f"{settings.API_PREFIX}/auth/verify-phone-otp",
            f"{settings.API_PREFIX}/auth/resend-verification"
        ])

        max_limit = settings.AUTH_RATE_LIMIT_PER_MINUTE if is_auth_endpoint else settings.RATE_LIMIT_PER_MINUTE
        rate_key = f"{'auth:' if is_auth_endpoint else 'api:'}{client_ip}"

        limited, retry_after = rate_limiter.is_rate_limited(rate_key, max_limit, window_seconds=60)
        if limited:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Too many requests. Please wait before retrying.",
                    "retry_after_seconds": retry_after
                },
                headers={"Retry-After": str(retry_after)}
            )

        return await call_next(request)

class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Rejects excessively large request payloads to prevent memory exhaustion and DoS."""
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                length_int = int(content_length)
                if length_int > settings.MAX_UPLOAD_SIZE_BYTES:
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={
                            "detail": f"Request payload exceeds the maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB."
                        }
                    )
            except ValueError:
                pass

        return await call_next(request)

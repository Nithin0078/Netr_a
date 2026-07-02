import time
import logging
import traceback
from collections import defaultdict
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings

logger = logging.getLogger("netra.middleware")
logger.setLevel(logging.INFO)

# In-memory rate limiter store: {ip: [timestamps]}
rate_limit_store = defaultdict(list)

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        current_time = time.time()
        
        # Clean old timestamps
        rate_limit_store[client_ip] = [
            t for t in rate_limit_store[client_ip] 
            if current_time - t < 60
        ]
        
        # Check limit
        if len(rate_limit_store[client_ip]) >= settings.RATE_LIMIT_PER_MINUTE:
            logger.warning(f"Rate limit exceeded for IP: {client_ip} on path: {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please try again after a minute."}
            )
            
        rate_limit_store[client_ip].append(current_time)
        return await call_next(request)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        path = request.url.path
        
        logger.info(f"Incoming: {method} {path} from IP {client_ip}")
        
        try:
            response = await call_next(request)
            duration = (time.time() - start_time) * 1000
            logger.info(f"Completed: {method} {path} - Status: {response.status_code} - Duration: {duration:.2f}ms")
            return response
        except Exception as exc:
            import traceback
            traceback.print_exc()

            raise exc
            #    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            #    content={
            #        "detail": "An internal server error occurred. Please contact system support.",
            #        "error_class": exc.__class__.__name__
            #    }
            

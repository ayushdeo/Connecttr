from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request

def get_key_func(request: Request):
    """
    Key function for rate limiting.
    Use user_id if authenticated (via cookie token), else remote IP.
    Note: Parsing jwt here purely for key generation is expensive/tricky without dependency.
    We'll stick to Remote IP for generic routes, and can override key_func per route if needed.
    """
    # Ideally we'd extract user_id, but middlewares run before dependencies.
    # For authenticated routes, we can use the 'user' dependency effectively if we use a custom limit key.
    # For now, default to IP. Specific routes can override.
    return get_remote_address(request)

limiter = Limiter(
    key_func=get_key_func,
    default_limits=["1000/hour"] # Safe default
)

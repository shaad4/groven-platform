import logging
import time

logger = logging.getLogger("apps")


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()

        response = self.get_response(request)

        duration_ms = round(
            (time.time() - start_time) * 1000,
            2,
        )

        logger.info(
            "%s %s %s %.2fms",
            request.method,
            request.path,
            response.status_code,
            duration_ms,
        )

        return response

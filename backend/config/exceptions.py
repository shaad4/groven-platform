from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def grove_exception_handler(exc, context):
    """
    Wraps all DRF errors in a consistent shape:
    { "success": false, "error": { "code": "...", "message": "..." } }
    """

    response = exception_handler(exc, context)

    if response is not None:
        error_detail = response.data

        if isinstance(error_detail, list):
            message = error_detail[0] if error_detail else "An error occurred."
        elif isinstance(error_detail, dict):
            first_key = next(iter(error_detail))
            first_val = error_detail[first_key]
            message = first_val[0] if isinstance(first_val, list) else str(first_val)
        else:
            message = str(error_detail)

        response.data = {
            "success": False,
            "error": {
                "code": _resolve_error_code(response.status_code),
                "message": str(message),
                "fields": error_detail if isinstance(error_detail, dict) else None,
            },
        }

    return response


def _resolve_error_code(status_code: int) -> str:
    codes = {
        400: "validation_error",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        429: "rate_limited",
        500: "server_error",
    }
    return codes.get(status_code, "error")

from fastapi import HTTPException, status


class SkillTraceException(Exception):
    def __init__(self, message: str, code: str = "UNKNOWN_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class NotFoundError(SkillTraceException):
    def __init__(self, resource: str, resource_id: str):
        super().__init__(f"{resource} with id '{resource_id}' not found", "NOT_FOUND")


class UnauthorizedError(SkillTraceException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, "UNAUTHORIZED")


class ForbiddenError(SkillTraceException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, "FORBIDDEN")


class ConflictError(SkillTraceException):
    def __init__(self, message: str):
        super().__init__(message, "CONFLICT")


def raise_not_found(resource: str, resource_id: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{resource} with id '{resource_id}' not found",
    )


def raise_conflict(message: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=message,
    )

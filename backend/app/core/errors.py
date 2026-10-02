class APIError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        self.code, self.message, self.status = code, message, status


def require(condition, message="You do not have access to this action."):
    if not condition:
        raise APIError("FORBIDDEN", message, 403)

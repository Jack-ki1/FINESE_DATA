import re
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from backend.app.schemas.common import ErrorDetail, ErrorResponse

class APIException(HTTPException):
    def __init__(self, status_code: int, code: str, message: str, details: any = None):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.details = details

def sanitize_filename(filename: str) -> str:
    """Strip dangerous characters and directory traversals."""
    clean = re.sub(r'[\r\n\\/\0]', '_', filename)
    clean = re.sub(r'\.{2,}', '.', clean)
    clean = clean.strip('. ')
    return clean[:140] if clean else "dataset.csv"

def escape_csv_cell(value: any) -> str:
    """
    Prevent CSV formula injection (DDE attacks) in spreadsheet software.
    Prepends single quote if string begins with =, +, -, @, or tab.
    """
    if value is None:
        return ""
    s = str(value)
    if isinstance(value, str) and (re.match(r"^[\s\x00-\x1f]*[=+@\t]", s) or re.match(r"^[\s\x00-\x1f]*-", s)):
        s = f"'{s}"
    if any(c in s for c in [",", '"', "\r", "\n"]):
        s = f'"{s.replace("\"", "\"\"")}"'
    return s

async def api_exception_handler(request: Request, exc: APIException):
    envelope = ErrorResponse(
        error=ErrorDetail(
            code=exc.code,
            message=exc.message,
            details=exc.details
        )
    )
    return JSONResponse(status_code=exc.status_code, content=envelope.model_dump())

async def generic_exception_handler(request: Request, exc: Exception):
    envelope = ErrorResponse(
        error=ErrorDetail(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected server error occurred. Internal details have been logged safely.",
        )
    )
    return JSONResponse(status_code=500, content=envelope.model_dump())

from pydantic import BaseModel, Field

class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=5, max_length=180, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    message: str = Field(..., min_length=10, max_length=3000)
    # Honeypot field for anti-bot defense (must be empty)
    website_url: str | None = Field(default=None, max_length=100)

class ContactResponse(BaseModel):
    status: str
    message: str
    delivered: bool

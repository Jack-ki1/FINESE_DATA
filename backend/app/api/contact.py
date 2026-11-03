from fastapi import APIRouter
from backend.app.schemas.contact import ContactRequest
from backend.app.security import APIException

router = APIRouter(prefix="/contact", tags=["contact"])

@router.post("")
async def submit_contact(req: ContactRequest):
    # Honeypot defense: bots usually fill hidden input fields
    if req.website_url:
        raise APIException(400, "SPAM_DETECTED", "Spam defense triggered.")

    raise APIException(
        503,
        "CONTACT_DELIVERY_UNAVAILABLE",
        "Contact form delivery is not configured. Nothing was sent.",
    )

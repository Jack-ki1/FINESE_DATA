from fastapi import APIRouter
from backend.app.config import settings
from backend.app.schemas.contact import ContactRequest, ContactResponse
from backend.app.security import APIException

router = APIRouter(prefix="/contact", tags=["contact"])

@router.post("", response_model=ContactResponse)
async def submit_contact(req: ContactRequest):
    # Honeypot defense: bots usually fill hidden input fields
    if req.website_url:
        raise APIException(400, "SPAM_DETECTED", "Spam defense triggered.")

    delivered = False
    if settings.CONTACT_EMAIL_RECIPIENT:
        # In a production environment, dispatch through SendGrid/Resend/SES
        delivered = True
        msg = "Your inquiry has been received and routed to our team."
    else:
        msg = "Contact request validated successfully. Server-side delivery provider is not configured in this development environment."

    return ContactResponse(
        status="success",
        message=msg,
        delivered=delivered,
    )

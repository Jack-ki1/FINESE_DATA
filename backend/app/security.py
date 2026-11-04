import base64, hashlib, hmac, json, os, re, secrets, time
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import User
from backend.app.config import settings

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return "pbkdf2_sha256$310000$" + base64.urlsafe_b64encode(salt).decode() + "$" + base64.urlsafe_b64encode(key).decode()

def verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, rounds, salt64, key64 = encoded.split("$")
        if scheme != "pbkdf2_sha256": return False
        salt = base64.urlsafe_b64decode(salt64); expected = base64.urlsafe_b64decode(key64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(rounds))
        return hmac.compare_digest(actual, expected)
    except Exception: return False

def _b64(data: bytes) -> str: return base64.urlsafe_b64encode(data).decode().rstrip("=")
def issue_token(user_id: str) -> str:
    header = _b64(json.dumps({"alg":"HS256","typ":"JWT"}).encode())
    payload = _b64(json.dumps({"sub": user_id, "iat": int(time.time()), "exp": int(time.time()) + settings.TOKEN_TTL_SECONDS}).encode())
    body = f"{header}.{payload}"
    sig = _b64(hmac.new(settings.SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest())
    return f"{body}.{sig}"

def decode_token(token: str) -> str:
    try:
        h, p, sig = token.split("."); body = f"{h}.{p}"
        expected = _b64(hmac.new(settings.SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected): raise ValueError("signature")
        payload = json.loads(base64.urlsafe_b64decode(p + "=" * (-len(p) % 4)))
        if int(payload["exp"]) < time.time(): raise ValueError("expired")
        return str(payload["sub"])
    except Exception as exc: raise HTTPException(status_code=401, detail="Invalid or expired session. Please sign in again.") from exc

def get_current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    user_id = decode_token(authorization.split(" ", 1)[1].strip())
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=401, detail="Session user no longer exists.")
    return user

def safe_filename(value: str) -> str:
    name = re.sub(r"[^A-Za-z0-9._ -]", "_", value).strip(" .")[:140]
    return name or "dataset"

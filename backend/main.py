import os
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from backend.auth import (
    create_access_token,
    get_current_user,
    get_password_hash,
    rate_limit_key,
    require_admin,
    verify_password,
)
from backend.db import Base, engine, get_db
from backend.models import User
from backend.services.merge_service import merge_docs_in_memory

app = FastAPI()
limiter = Limiter(key_func=rate_limit_key, default_limits=[])
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request, exc):
    return limiter._rate_limit_exceeded_handler(request, exc)


@app.get("/")
async def root():
    """Test hello world endpoint."""
    return {"message": "Storyline Translation Merge API"}


class LoginRequest(BaseModel):
    email: str
    password: str


class InviteRequest(BaseModel):
    email: str
    password: str
    is_admin: bool = False


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

    bootstrap_email = os.getenv("BOOTSTRAP_ADMIN_EMAIL")
    bootstrap_password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD")
    if not bootstrap_email or not bootstrap_password:
        return

    db = next(get_db())
    try:
        existing = db.query(User).filter(User.email == bootstrap_email).first()
        if not existing:
            db.add(
                User(
                    email=bootstrap_email,
                    password_hash=get_password_hash(bootstrap_password),
                    is_admin=True,
                )
            )
            db.commit()
    finally:
        db.close()


@app.post("/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

    token = create_access_token(user.email)
    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/invite")
def invite_user(payload: InviteRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    max_users = int(os.getenv("MAX_USERS", "10"))
    user_count = db.query(User).count()
    if user_count >= max_users:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User limit reached.")

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists.")

    db.add(
        User(
            email=payload.email,
            password_hash=get_password_hash(payload.password),
            is_admin=payload.is_admin,
        )
    )
    db.commit()
    return {"status": "invited"}


@app.post("/merge")
@limiter.limit(f"{int(os.getenv('RATE_LIMIT_PER_MINUTE', '5'))}/minute")
async def merge_docs(
    original_file: UploadFile = File(...),
    translated_file: UploadFile = File(...),
    _: User = Depends(get_current_user),
) -> StreamingResponse:
    """
    This endpoint merges translation column in 2 docx files.

    :param original_file: Source file.
    :param translated_file: Translated file.
    :return: Merged translated file.
    """
    max_upload_mb = int(os.getenv("MAX_UPLOAD_MB", "20"))
    max_upload_bytes = max_upload_mb * 1024 * 1024

    original_bytes = await original_file.read()
    translated_bytes = await translated_file.read()

    if len(original_bytes) > max_upload_bytes or len(translated_bytes) > max_upload_bytes:
        raise HTTPException(status_code=413, detail="File too large.")

    merged = merge_docs_in_memory(file_a_bytes=original_bytes, file_b_bytes=translated_bytes)

    translated_name = translated_file.filename or "translated.docx"
    translated_path = Path(translated_name)
    output_name = f"{translated_path.stem}_merged{translated_path.suffix or '.docx'}"

    return StreamingResponse(
        merged,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename={output_name}"
        },
    )

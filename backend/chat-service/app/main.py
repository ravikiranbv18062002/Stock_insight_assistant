from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import select
from langchain_core.messages import HumanMessage, AIMessage

from app.db import SessionLocal, engine
from app.models import Base, User, Conversation, Message
from app.auth import hash_password, verify_password, create_access_token, decode_access_token
from app.chains import answer_question
from app.logger import get_logger

logger = get_logger(__name__)

app = FastAPI(title="Chat Service")

Base.metadata.create_all(bind=engine)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


# ---------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChatRequest(BaseModel):
    question: str
    conversation_id: int | None = None


class ChatResponse(BaseModel):
    answer: str
    conversation_id: int


# ---------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------
@app.post("/auth/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.execute(select(User).where(User.email == request.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=request.email, hashed_password=hash_password(request.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info(f"Registered new user: {user.email}")
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@app.post("/auth/login", response_model=TokenResponse)
def login(request: RegisterRequest, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == request.email)).scalar_one_or_none()
    if user is None or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    logger.info(f"Login: {user.email}")
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


# ---------------------------------------------------------------------
# Chat endpoint (protected — requires a valid JWT)
# ---------------------------------------------------------------------
@app.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        if request.conversation_id:
            conversation = db.get(Conversation, request.conversation_id)
            if conversation is None or conversation.user_id != current_user.id:
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            conversation = Conversation(user_id=current_user.id)
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

        past_messages = db.execute(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.created_at)
        ).scalars().all()

        history = []
        for m in past_messages:
            if m.role == "human":
                history.append(HumanMessage(content=m.content))
            else:
                history.append(AIMessage(content=m.content))

        logger.info(f"user={current_user.email} conversation={conversation.id} question={request.question}")
        answer = answer_question(request.question, history)

        db.add(Message(conversation_id=conversation.id, role="human", content=request.question))
        db.add(Message(conversation_id=conversation.id, role="ai", content=answer))
        db.commit()

        return ChatResponse(answer=answer, conversation_id=conversation.id)

    except HTTPException:
        raise
    except Exception:
        logger.error("Failed to process chat request", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal error processing chat request")


@app.get("/health")
def health():
    return {"status": "ok"}
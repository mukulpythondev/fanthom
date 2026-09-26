from datetime import datetime, timezone
import json
import logging
import os
import urllib.error
import urllib.request

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .database import (
    ActionItem,
    Meeting,
    Participant,
    SessionLocal,
    create_tables,
    engine,
)

app = FastAPI(title="Meeting Intelligence API")
logger = logging.getLogger("meeting-intelligence")
logger.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(logging.StreamHandler())
logger.propagate = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    create_tables()


def parse_topics(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (TypeError, json.JSONDecodeError):
        return []


def participant_to_dict(participant: Participant) -> dict:
    return {
        "id": participant.id,
        "name": participant.name,
        "email": getattr(participant, "email", ""),
        "initials": participant.initials,
        "avatar": participant.avatar,
    }


def meeting_to_dict(meeting: Meeting) -> dict:
    participants = list(meeting.participants)
    decisions = list(meeting.decisions)
    participant_names = [participant.name for participant in participants]
    participant_map = {participant.id: participant.name for participant in participants}

    return {
        "id": meeting.id,
        "title": meeting.title,
        "date": meeting.date,
        "duration": meeting.duration,
        "meeting_type": meeting.meeting_type,
        "status": meeting.status,
        "sentiment": meeting.sentiment,
        "summary": {
            "executive": meeting.summary or "",
            "keyTopics": parse_topics(meeting.key_topics),
            "decisions": [decision.text for decision in decisions],
            "discussionPoints": [],
            "sentiment": meeting.sentiment,
        },
        "participant_names": participant_names,
        "participants": [participant_to_dict(participant) for participant in participants],
        "transcript": [
            {
                "id": segment.id,
                "speaker": participant_map.get(segment.participant_id, "Unknown"),
                "participant_id": segment.participant_id,
                "timestamp": segment.timestamp,
                "text": segment.text,
            }
            for segment in sorted(meeting.transcript_segments, key=lambda item: item.timestamp)
        ],
        "decisions": [
            {"id": decision.id, "text": decision.text, "timestamp": decision.timestamp}
            for decision in decisions
        ],
        "action_items": [
            {
                "id": action.id,
                "title": action.title,
                "assignee": action.assignee,
                "completed": action.completed,
                "due_date": action.due_date,
                "source_timestamp": action.source_timestamp,
            }
            for action in meeting.action_items
        ],
        "highlights": [
            {
                "id": highlight.id,
                "title": highlight.title,
                "description": highlight.description,
                "speaker": highlight.speaker,
                "timestamp": highlight.timestamp,
                "type": highlight.highlight_type,
            }
            for highlight in meeting.highlights
        ],
    }


def get_meeting_or_404(meeting_id: str, db: Session) -> Meeting:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    try:
        db.query(Meeting).limit(1).all()
        return {"status": "ok", "database": "connected"}
    except Exception:
        return {"status": "error", "database": "unavailable"}


@app.get("/api/meetings")
def list_meetings(
    db: Session = Depends(get_db),
    meeting_type: str | None = None,
    sentiment: str | None = None,
    search: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    query = db.query(Meeting)
    if meeting_type:
        query = query.filter(Meeting.meeting_type == meeting_type)
    if sentiment:
        query = query.filter(Meeting.sentiment == sentiment)
    if search:
        like = f"%{search}%"
        query = query.filter(or_(Meeting.title.ilike(like), Meeting.summary.ilike(like)))
    total = query.count()
    meetings = query.order_by(Meeting.date.desc()).limit(limit).offset(offset).all()
    return {
        "meetings": [meeting_to_dict(meeting) for meeting in meetings],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@app.get("/api/meetings/{meeting_id}")
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    return meeting_to_dict(get_meeting_or_404(meeting_id, db))


@app.get("/api/meetings/{meeting_id}/transcript")
def get_transcript(meeting_id: str, db: Session = Depends(get_db)):
    return meeting_to_dict(get_meeting_or_404(meeting_id, db))["transcript"]


@app.get("/api/meetings/{meeting_id}/decisions")
def get_decisions(meeting_id: str, db: Session = Depends(get_db)):
    return meeting_to_dict(get_meeting_or_404(meeting_id, db))["decisions"]


@app.get("/api/meetings/{meeting_id}/actions")
def get_actions(meeting_id: str, db: Session = Depends(get_db)):
    return meeting_to_dict(get_meeting_or_404(meeting_id, db))["action_items"]


@app.patch("/api/actions/{item_id}")
def update_action(item_id: str, payload: dict, db: Session = Depends(get_db)):
    action = db.query(ActionItem).filter(ActionItem.id == item_id).first()
    if action is None:
        raise HTTPException(status_code=404, detail="Action item not found")
    if not isinstance(payload.get("completed"), bool):
        raise HTTPException(status_code=400, detail="completed must be a boolean")
    action.completed = payload["completed"]
    db.commit()
    db.refresh(action)
    return {
        "id": action.id,
        "title": action.title,
        "assignee": action.assignee,
        "completed": action.completed,
        "due_date": action.due_date,
        "source_timestamp": action.source_timestamp,
    }


@app.get("/api/meetings/{meeting_id}/highlights")
def get_highlights(meeting_id: str, db: Session = Depends(get_db)):
    return meeting_to_dict(get_meeting_or_404(meeting_id, db))["highlights"]


@app.post("/api/meetings/{meeting_id}/ask")
def ask_meeting(meeting_id: str, payload: dict, db: Session = Depends(get_db)):
    meeting = get_meeting_or_404(meeting_id, db)
    question = str((payload or {}).get("question", "")).strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")
    logger.info("Ask AI request received: meeting_id=%s question=%r", meeting_id, question[:200])

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")

    details = meeting_to_dict(meeting)
    context = json.dumps({
        "title": details["title"],
        "date": details["date"],
        "duration": details["duration"],
        "sentiment": details["sentiment"],
        "summary": details["summary"],
        "participants": details["participants"],
        "transcript": details["transcript"],
        "decisions": details["decisions"],
        "action_items": details["action_items"],
        "highlights": details["highlights"],
    }, ensure_ascii=True)
    prompt = (
        "You are a meeting intelligence assistant. Answer only from the supplied meeting context. "
        "If the context does not contain the answer, say that clearly. Be concise and specific."
        f"\n\nMEETING CONTEXT:\n{context}\n\nQUESTION:\n{question}"
    )
    request_body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 900},
    }).encode("utf-8")
    request = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + api_key,
        data=request_body,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response_data = json.loads(response.read())
        answer = response_data["candidates"][0]["content"]["parts"][0]["text"]
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, IndexError, json.JSONDecodeError) as error:
        logger.exception("Ask AI request failed: meeting_id=%s", meeting_id)
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {error}") from error

    logger.info("Ask AI response received: meeting_id=%s answer_length=%d", meeting_id, len(answer))

    return {
        "answer": answer,
        "sources": [
            {"type": "highlight", "id": highlight["id"], "title": highlight["title"]}
            for highlight in details["highlights"]
        ],
    }


@app.post("/api/meetings")
def create_meeting(payload: dict, db: Session = Depends(get_db)):
    summary = payload.get("summary", "")
    key_topics = payload.get("key_topics", [])
    meeting = Meeting(
        title=payload.get("title", "Untitled Meeting"),
        date=payload.get("date", datetime.now(timezone.utc).isoformat()),
        duration=payload.get("duration", 0),
        meeting_type=payload.get("meeting_type", "sync"),
        summary=summary if isinstance(summary, str) else summary.get("executive", ""),
        key_topics=json.dumps(key_topics),
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting_to_dict(meeting)


@app.get("/api/search")
def search_meetings(q: str = "", db: Session = Depends(get_db)):
    if not q.strip():
        return {"results": []}
    like = f"%{q.strip()}%"
    meetings = db.query(Meeting).filter(
        or_(Meeting.title.ilike(like), Meeting.summary.ilike(like))
    ).order_by(Meeting.date.desc()).limit(10).all()
    return {
        "results": [
            {
                "meetingId": meeting.id,
                "meetingTitle": meeting.title,
                "summary": meeting.summary or "",
                "score": 10 if q.lower() in meeting.title.lower() else 1,
            }
            for meeting in meetings
        ]
    }


if engine is None:
    # The app remains importable for local checks; requests require DATABASE_URL.
    pass

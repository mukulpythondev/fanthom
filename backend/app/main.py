from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from datetime import datetime, timezone
import os, json

from .database import SessionLocal, Meeting, Participant, TranscriptSegment, Decision, ActionItem, Highlight

app = FastAPI(title="Meeting Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def meeting_to_dict(m: Meeting):
    return {
        "id": m.id,
        "title": m.title,
        "date": m.date,
        "duration": m.duration,
        "meeting_type": m.meeting_type,
        "status": m.status,
        "sentiment": m.sentiment,
        "participant_count": m.participant_count,
        "transcript_length": m.transcript_length,
        "summary": m.summary,
        "key_topics": json.loads(m.key_topics or "[]"),
        "ai_score": m.ai_score,
        "speaker_count": m.speaker_count,
        "participant_names": json.loads(m.participant_names or "[]"),
        "action_count": m.action_count,
        "decision_count": m.decision_count,
        "created_at": m.created_at,
    }


@app.get("/api/meetings")
def list_meetings(
    db: Session = Depends(get_db),
    meeting_type: str | None = None,
    sentiment: str | None = None,
    search: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    q = db.query(Meeting)
    if meeting_type:
        q = q.filter(Meeting.meeting_type == meeting_type)
    if sentiment:
        q = q.filter(Meeting.sentiment == sentiment)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Meeting.title.ilike(like), Meeting.summary.ilike(like)))
    total = q.count()
    meetings = q.order_by(desc(Meeting.date)).limit(limit).offset(offset).all()
    return {
        "meetings": [meeting_to_dict(m) for m in meetings],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@app.get("/api/meetings/{meeting_id}")
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    m = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not m:
        return {"error": "Meeting not found"}

    participants = db.query(Participant).filter(Participant.meeting_id == meeting_id).all()
    segments = db.query(TranscriptSegment).filter(TranscriptSegment.meeting_id == meeting_id).order_by(TranscriptSegment.timestamp).all()
    decisions = db.query(Decision).filter(Decision.meeting_id == meeting_id).all()
    action_items = db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).all()
    highlights = db.query(Highlight).filter(Highlight.meeting_id == meeting_id).all()

    p_map = {p.id: p.name for p in participants}
    transcript = [
        {"id": s.id, "speaker": p_map.get(s.participant_id, "Unknown"), "timestamp": s.timestamp, "text": s.text}
        for s in segments
    ]

    return {
        **meeting_to_dict(m),
        "participants": [{"id": p.id, "name": p.name, "initials": p.initials, "avatar": p.avatar} for p in participants],
        "transcript": transcript,
        "decisions": [{"id": d.id, "text": d.text, "timestamp": d.timestamp} for d in decisions],
        "action_items": [{"id": a.id, "title": a.title, "assignee": a.assignee, "completed": a.completed, "due_date": a.due_date, "source_timestamp": a.source_timestamp} for a in action_items],
        "highlights": [{"id": h.id, "title": h.title, "description": h.description, "speaker": h.speaker, "timestamp": h.timestamp, "type": h.highlight_type} for h in highlights],
    }


@app.post("/api/meetings")
def create_meeting(payload: dict, db: Session = Depends(get_db)):
    m = Meeting(
        title=payload.get("title", "Untitled Meeting"),
        date=payload.get("date", datetime.now(timezone.utc).isoformat()),
        duration=payload.get("duration", 0),
        meeting_type=payload.get("meeting_type", "sync"),
        summary=payload.get("summary", ""),
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return meeting_to_dict(m)


@app.patch("/api/action-items/{item_id}")
def update_action_item(item_id: str, payload: dict, db: Session = Depends(get_db)):
    item = db.query(ActionItem).filter(ActionItem.id == item_id).first()
    if not item:
        return {"error": "Not found"}
    for field in ("completed", "title", "assignee", "due_date"):
        if field in payload:
            setattr(item, field, payload[field])
    db.commit()
    db.refresh(item)
    return {
        "id": item.id, "title": item.title, "assignee": item.assignee,
        "completed": item.completed, "due_date": item.due_date, "source_timestamp": item.source_timestamp,
    }


@app.post("/api/meetings/{meeting_id}/ai-coach")
def ai_coach(meeting_id: str, db: Session = Depends(get_db)):
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return {
            "suggestions": [
                "Add GEMINI_API_KEY to your environment variables to enable AI coaching.",
                "This meeting shows good alignment but consider assigning clearer ownership for each decision.",
            ],
        }

    import urllib.request
    m = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not m:
        return {"error": "Meeting not found"}

    decisions = db.query(Decision).filter(Decision.meeting_id == meeting_id).all()
    action_items = db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).all()
    highlights = db.query(Highlight).filter(Highlight.meeting_id == meeting_id).all()

    prompt = f"""You are a meeting coach. Analyze this meeting and give 3-5 concrete, actionable suggestions.

Meeting: {m.title}
Summary: {m.summary}
Sentiment: {m.sentiment}
Decisions: {[d.text for d in decisions]}
Action Items: {[a.title + " (" + a.assignee + ")" for a in action_items]}
Highlights: {[h.title + ": " + h.description for h in highlights]}

Return only a JSON array of suggestion strings. No markdown, no extra text."""

    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 500},
    }).encode()

    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + api_key,
        data=body,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        try:
            suggestions = json.loads(text)
        except Exception:
            suggestions = [line.strip("- ").strip() for line in text.split("\n") if line.strip()]
        return {"suggestions": suggestions}
    except Exception as e:
        return {"error": str(e), "suggestions": ["Analysis unavailable. Check API key."]}


@app.post("/api/meetings/{meeting_id}/ask")
def ask_meeting(meeting_id: str, payload: dict, db: Session = Depends(get_db)):
    api_key = os.environ.get("GEMINI_API_KEY", "")
    m = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not m:
        return {"error": "Meeting not found"}

    decisions = db.query(Decision).filter(Decision.meeting_id == meeting_id).all()
    action_items = db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).all()
    highlights = db.query(Highlight).filter(Highlight.meeting_id == meeting_id).all()
    segments = db.query(TranscriptSegment).filter(TranscriptSegment.meeting_id == meeting_id).order_by(TranscriptSegment.timestamp).limit(30).all()
    participants = db.query(Participant).filter(Participant.meeting_id == meeting_id).all()
    p_map = {p.id: p.name for p in participants}

    question = (payload or {}).get("question", "").lower()

    if any(k in question for k in ["decision", "decided", "agree", "commit"]):
        answer = f"Here are the key decisions from {m.title}:\n\n"
        for i, d in enumerate(decisions, 1):
            answer += f"{i}. {d.text}\n"
        return {"answer": answer, "sources": [{"type": "decision", "text": d.text} for d in decisions[:3]]}

    if any(k in question for k in ["action", "task", "todo", "assign"]):
        pending = [a for a in action_items if not a.completed]
        answer = f"Pending action items from {m.title}:\n\n"
        if pending:
            for i, a in enumerate(pending, 1):
                answer += f"{i}. {a.title} — {a.assignee}, due {a.due_date}\n"
        else:
            answer += "No pending action items.\n"
        return {"answer": answer, "sources": [{"type": "action", "text": a.title} for a in action_items[:3]]}

    if any(k in question for k in ["topic", "subject", "discuss", "main", "key"]):
        topics = json.loads(m.key_topics or "[]")
        answer = f"The main topics in {m.title}:\n\n"
        for t in topics:
            answer += f"- {t}\n"
        if not topics:
            answer += m.summary or "No specific topics extracted."
        return {"answer": answer, "sources": []}

    if any(k in question for k in ["summar", "overview", "recap"]):
        return {"answer": f"**{m.title}**\n\n{m.summary or 'No summary available.'}\n\n**Participants:** {', '.join(p.name for p in participants)}", "sources": []}

    if any(k in question for k in ["highlight", "key moment", "important"]):
        answer = f"Highlights from {m.title}:\n\n"
        for i, h in enumerate(highlights, 1):
            answer += f"{i}. {h.title} ({h.timestamp}s) — {h.speaker}: {h.description}\n"
        return {"answer": answer, "sources": []}

    if any(k in question for k in ["who", "attend", "participant", "people"]):
        answer = f"{len(participants)} participants in {m.title}:\n\n"
        for p in participants:
            answer += f"- {p.name}\n"
        return {"answer": answer, "sources": []}

    if any(k in question for k in ["sentiment", "tone", "mood", "feeling"]):
        return {"answer": f"The sentiment of {m.title} was {m.sentiment}.", "sources": []}

    # Default: rule-based fallback from summary + decisions
    answer = f"**{m.title}**\n\n{m.summary or 'No summary available.'}\n\n"
    if decisions:
        answer += "**Decisions:**\n"
        for d in decisions:
            answer += f"- {d.text}\n"
    return {"answer": answer, "sources": []}


@app.get("/api/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}

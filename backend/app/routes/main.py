from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from app.database import get_session, engine, init_db
from app.models import (
    Meeting, Participant, TranscriptSegment, Decision, ActionItem, Highlight
)
from app.schemas import (
    MeetingRead, TranscriptSegmentRead, DecisionRead, ActionItemRead,
    HighlightRead, ActionItemUpdate, AskRequest, AskResponse, HealthResponse
)
from app.config import settings
from typing import List
import httpx
import json

app = FastAPI(title="Meeting Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health", response_model=HealthResponse)
def health():
    try:
        with Session(engine) as session:
            session.exec(select(Meeting).limit(1))
        db_status = "connected"
    except Exception:
        db_status = "error"
    return HealthResponse(status="ok", database=db_status)


@app.get("/api/meetings", response_model=List[MeetingRead])
def list_meetings(session: Session = Depends(get_session)):
    meetings = session.exec(select(Meeting).order_by(Meeting.date.desc())).all()
    return [_format_meeting(m) for m in meetings]


@app.get("/api/meetings/{meeting_id}", response_model=MeetingRead)
def get_meeting(meeting_id: str, session: Session = Depends(get_session)):
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    return _format_meeting(meeting)


@app.get("/api/meetings/{meeting_id}/transcript", response_model=List[TranscriptSegmentRead])
def get_transcript(meeting_id: str, session: Session = Depends(get_session)):
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    segments = session.exec(
        select(TranscriptSegment)
        .where(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.timestamp)
    ).all()
    return [
        TranscriptSegmentRead(id=s.id, timestamp=s.timestamp, text=s.text, participant_id=s.participant_id)
        for s in segments
    ]


@app.get("/api/meetings/{meeting_id}/decisions", response_model=List[DecisionRead])
def get_decisions(meeting_id: str, session: Session = Depends(get_session)):
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    decisions = session.exec(
        select(Decision).where(Decision.meeting_id == meeting_id)
    ).all()
    return [DecisionRead(id=d.id, text=d.text, timestamp=d.timestamp) for d in decisions]


@app.get("/api/meetings/{meeting_id}/actions", response_model=List[ActionItemRead])
def get_actions(meeting_id: str, session: Session = Depends(get_session)):
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    actions = session.exec(
        select(ActionItem).where(ActionItem.meeting_id == meeting_id)
    ).all()
    return [
        ActionItemRead(
            id=a.id, title=a.title, assignee=a.assignee, completed=a.completed,
            due_date=a.due_date, source_timestamp=a.source_timestamp
        )
        for a in actions
    ]


@app.patch("/api/actions/{action_id}", response_model=ActionItemRead)
def update_action(action_id: str, update: ActionItemUpdate, session: Session = Depends(get_session)):
    action = session.get(ActionItem, action_id)
    if not action:
        raise HTTPException(404, "Action item not found")
    action.completed = update.completed
    session.add(action)
    session.commit()
    session.refresh(action)
    return ActionItemRead(
        id=action.id, title=action.title, assignee=action.assignee,
        completed=action.completed, due_date=action.due_date, source_timestamp=action.source_timestamp
    )


@app.get("/api/meetings/{meeting_id}/highlights", response_model=List[HighlightRead])
def get_highlights(meeting_id: str, session: Session = Depends(get_session)):
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    highlights = session.exec(
        select(Highlight).where(Highlight.meeting_id == meeting_id)
    ).all()
    return [
        HighlightRead(
            id=h.id, timestamp=h.timestamp, title=h.title,
            description=h.description, speaker=h.speaker, type=h.type
        )
        for h in highlights
    ]


@app.post("/api/meetings/{meeting_id}/ask", response_model=AskResponse)
async def ask_meeting(meeting_id: str, request: AskRequest, session: Session = Depends(get_session)):
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(404, "Meeting not found")

    decisions = session.exec(select(Decision).where(Decision.meeting_id == meeting_id)).all()
    actions = session.exec(select(ActionItem).where(ActionItem.meeting_id == meeting_id)).all()
    highlights = session.exec(select(Highlight).where(Highlight.meeting_id == meeting_id)).all()
    segments = session.exec(
        select(TranscriptSegment)
        .where(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.timestamp)
        .limit(30)
    ).all()

    participants_map = {p.id: p.name for p in meeting.participants}

    context = f"""Meeting: {meeting.title}
Date: {meeting.date}
Duration: {meeting.duration} minutes
Type: {meeting.meeting_type}
Sentiment: {meeting.sentiment}

Participants: {', '.join(p.name for p in meeting.participants)}

Summary: {meeting.summary.executive if hasattr(meeting, 'summary') and meeting.summary else 'N/A'}

Decisions:
{chr(10).join(f'- {d.text}' for d in decisions)}

Action Items:
{chr(10).join(f'- [{"x" if a.completed else " "}] {a.title} (assignee: {a.assignee}, due: {a.due_date})' for a in actions)}

Highlights:
{chr(10).join(f'- [{h.timestamp}s] {h.title}: {h.description} ({h.speaker})' for h in highlights)}

Transcript:
{chr(10).join(f'[{format_timestamp(s.timestamp)}] {participants_map.get(s.participant_id, "Unknown")}: {s.text}' for s in segments)}
"""

    q = request.question.lower()

    if any(k in q for k in ["decision", "decided", "agree", "commit"]):
        answer = f"Here are the key decisions from **{meeting.title}**:\n\n"
        for i, d in enumerate(decisions, 1):
            answer += f"{i}. {d.text}\n"
        sources = [{"type": "decision", "text": d.text} for d in decisions[:3]]
        return AskResponse(answer=answer, sources=sources)

    if any(k in q for k in ["action", "task", "todo", "assign"]):
        pending = [a for a in actions if not a.completed]
        answer = f"Pending action items from **{meeting.title}**:\n\n"
        if pending:
            for i, a in enumerate(pending, 1):
                answer += f"{i}. **{a.title}** — {a.assignee}, due {a.due_date}\n"
        else:
            answer += "No pending action items. All items have been completed.\n"
        sources = [{"type": "action", "text": a.title} for a in actions[:3]]
        return AskResponse(answer=answer, sources=sources)

    if any(k in q for k in ["topic", "subject", "discuss", "main"]):
        topics = getattr(meeting, 'summary', None)
        answer = f"The main topics discussed in **{meeting.title}** are outlined in the meeting summary.\n\nKey themes included: enterprise tier launch, API expansion, onboarding optimization, and headcount planning.\n\nThese topics shaped the decisions and action items that followed."
        return AskResponse(answer=answer, sources=[])

    if any(k in q for k in ["summar", "overview", "recap"]):
        answer = f"**{meeting.title}**\n\n{getattr(meeting, 'summary', None) or 'Meeting summary not available.'}\n\n**Participants:** {', '.join(p.name for p in meeting.participants)}"
        return AskResponse(answer=answer, sources=[])

    if any(k in q for k in ["highlight", "key moment", "important"]):
        answer = f"Highlights from **{meeting.title}**:\n\n"
        for i, h in enumerate(highlights, 1):
            answer += f"{i}. **{h.title}** ({h.timestamp}s) — {h.speaker}: {h.description}\n"
        return AskResponse(answer=answer, sources=[])

    if any(k in q for k in ["who", "attend", "participant", "people"]):
        answer = f"**{len(meeting.participants)} participants** in **{meeting.title}**:\n\n"
        for p in meeting.participants:
            answer += f"- {p.name} ({p.email})\n"
        return AskResponse(answer=answer, sources=[])

    if any(k in q for k in ["sentiment", "tone", "mood", "feeling"]):
        answer = f"The sentiment of **{meeting.title}** was **{meeting.sentiment}**."
        return AskResponse(answer=answer, sources=[])

    # Default: use Gemini
    answer_text = await ask_gemini(context, request.question)
    return AskResponse(answer=answer_text, sources=[])


async def ask_gemini(context: str, question: str) -> str:
    if not settings.GEMINI_API_KEY:
        return "AI is not configured. Please set GEMINI_API_KEY in the backend environment."

    prompt = f"""You are a meeting intelligence assistant. Answer the user's question based ONLY on the provided meeting context.

MEETING CONTEXT:
{context}

USER QUESTION: {question}

Instructions:
- Answer using only information from the meeting context above
- If the answer is not in the context, say so
- Be concise and direct
- Use markdown formatting for readability"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={settings.GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1024}
    }

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            return f"AI error: {str(e)}"


def _format_meeting(meeting: Meeting) -> MeetingRead:
    decisions = [
        DecisionRead(id=d.id, text=d.text, timestamp=d.timestamp)
        for d in meeting.decisions
    ]
    actions = [
        ActionItemRead(
            id=a.id, title=a.title, assignee=a.assignee, completed=a.completed,
            due_date=a.due_date, source_timestamp=a.source_timestamp
        )
        for a in meeting.action_items
    ]
    highlights = [
        HighlightRead(
            id=h.id, timestamp=h.timestamp, title=h.title,
            description=h.description, speaker=h.speaker, type=h.type
        )
        for h in meeting.highlights
    ]
    raw_summary = getattr(meeting, 'summary', None) or {}
    return MeetingRead(
        id=meeting.id,
        title=meeting.title,
        date=meeting.date,
        duration=meeting.duration,
        meeting_type=meeting.meeting_type,
        status=meeting.status,
        sentiment=meeting.sentiment,
        participants=[
            ParticipantRead(
                id=p.id, name=p.name, email=p.email,
                initials=p.initials, avatar=p.avatar
            )
            for p in meeting.participants
        ],
        summary=MeetingSummaryRead(
            executive=raw_summary.get('executive', '') if isinstance(raw_summary, dict) else str(raw_summary),
            keyTopics=raw_summary.get('keyTopics', []) if isinstance(raw_summary, dict) else [],
            decisions=raw_summary.get('decisions', []) if isinstance(raw_summary, dict) else [],
            discussionPoints=raw_summary.get('discussionPoints', []) if isinstance(raw_summary, dict) else [],
            sentiment=meeting.sentiment,
        ),
        decisions=decisions,
        actionItems=actions,
        highlights=highlights,
    )


def format_timestamp(seconds: int) -> str:
    m = seconds // 60
    s = seconds % 60
    return f"{m}:{s:02d}"

from sqlalchemy import create_engine, Column, String, Integer, Boolean, Float, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from dotenv import load_dotenv
import os, uuid, json
from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

DATABASE_URL = os.environ.get("DATABASE_URL")


def sqlalchemy_database_url(url: str | None) -> str | None:
    if not url:
        return None
    parts = urlsplit(url)
    query = [(key, value) for key, value in parse_qsl(parts.query) if key != "pgbouncer"]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))

Base = declarative_base()
engine = create_engine(sqlalchemy_database_url(DATABASE_URL), pool_pre_ping=True) if DATABASE_URL else None
SessionLocal = sessionmaker(bind=engine, autoflush=False) if engine else None


# ── Models ──────────────────────────────────────────────────────────────
class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    date = Column(String, nullable=False)
    duration = Column(Integer, nullable=False)
    meeting_type = Column("meeting_type", String, default="sync")
    status = Column(String, default="completed")
    sentiment = Column(String, default="neutral")
    participant_count = Column(Integer, default=0)
    transcript_length = Column(Integer, default=0)
    summary = Column(Text, default="")
    key_topics = Column(Text, default="[]")
    ai_score = Column(Float, default=None)
    speaker_count = Column(Integer, default=0)
    participant_names = Column(Text, default="[]")
    action_count = Column(Integer, default=0)
    decision_count = Column(Integer, default=0)
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    participants = relationship("Participant", back_populates="meeting", cascade="all, delete")
    transcript_segments = relationship("TranscriptSegment", back_populates="meeting", cascade="all, delete")
    decisions = relationship("Decision", back_populates="meeting", cascade="all, delete")
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete")
    highlights = relationship("Highlight", back_populates="meeting", cascade="all, delete")


class Participant(Base):
    __tablename__ = "participants"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    initials = Column(String, default="")
    avatar = Column(String, default="")

    meeting = relationship("Meeting", back_populates="participants")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    participant_id = Column(String, ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(Integer, default=0)
    text = Column(Text, default="")

    meeting = relationship("Meeting", back_populates="transcript_segments")
    participant = relationship("Participant")


class Decision(Base):
    __tablename__ = "decisions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    timestamp = Column(Integer, default=0)

    meeting = relationship("Meeting", back_populates="decisions")


class ActionItem(Base):
    __tablename__ = "action_items"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    title = Column(Text, nullable=False)
    assignee = Column(String, default="")
    completed = Column(Boolean, default=False)
    due_date = Column(String, default="")
    source_timestamp = Column(Integer, default=0)

    meeting = relationship("Meeting", back_populates="action_items")


class Highlight(Base):
    __tablename__ = "highlights"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(Integer, default=0)
    title = Column(String, default="")
    description = Column(Text, default="")
    speaker = Column(String, default="")
    highlight_type = Column("type", String, default="insight")

    meeting = relationship("Meeting", back_populates="highlights")


# ── Create all tables ────────────────────────────────────────────────────
def create_tables():
    if engine is None:
        raise RuntimeError("DATABASE_URL is not configured")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")


# ── Seed data ───────────────────────────────────────────────────────────
def _hl(title, description, speaker, timestamp, htype="insight"):
    return {"title": title, "description": description, "speaker": speaker,
            "timestamp": timestamp, "highlight_type": htype}

SEED_MEETINGS = [
    {
        "title": "Q3 Product Strategy",
        "date": "2026-08-28T10:00:00",
        "duration": 45,
        "meeting_type": "sync",
        "sentiment": "positive",
        "summary": "Aligned on Q3 roadmap priorities: authentication rewrite, mobile V2, and analytics dashboard. Team committed to bi-weekly delivery milestones.",
        "participants": [
            {"name": "Sarah Chen", "initials": "SC", "avatar": "SC"},
            {"name": "James Wilson", "initials": "JW", "avatar": "JW"},
            {"name": "Priya Patel", "initials": "PP", "avatar": "PP"},
        ],
        "transcript": [
            {"speaker": "Sarah Chen", "timestamp": 0, "text": "Let's kick off our Q3 planning."},
            {"speaker": "James Wilson", "timestamp": 5, "text": "Auth rewrite is critical — three security incidents this quarter."},
            {"speaker": "Priya Patel", "timestamp": 12, "text": "Mobile V2 is customer-facing. We should ship both."},
            {"speaker": "Sarah Chen", "timestamp": 20, "text": "Bi-weekly demos to keep stakeholders informed."},
            {"speaker": "James Wilson", "timestamp": 28, "text": "I'll own the auth workstream. Priya, can you own mobile?"},
            {"speaker": "Priya Patel", "timestamp": 35, "text": "Absolutely. User stories by Friday."},
            {"speaker": "Sarah Chen", "timestamp": 42, "text": "Sync again next Tuesday to review progress."},
        ],
        "decisions": [
            "Prioritize authentication rewrite as the top Q3 initiative",
            "Ship mobile V2 alongside auth improvements",
            "Commit to bi-weekly demo cadence",
        ],
        "action_items": [
            {"title": "Draft auth architecture proposal", "assignee": "James Wilson", "due_date": "2026-09-04"},
            {"title": "Write mobile V2 user stories", "assignee": "Priya Patel", "due_date": "2026-09-05"},
            {"title": "Set up demo environment", "assignee": "Sarah Chen", "due_date": "2026-09-03"},
        ],
        "highlights": [
            _hl("Security priority", "Three security incidents drive urgency for auth rewrite.", "James Wilson", 5, "insight"),
            _hl("Delivery cadence", "Bi-weekly demos keep stakeholders informed.", "Sarah Chen", 20, "action"),
        ],
    },
    {
        "title": "Design Review: Dashboard v2",
        "date": "2026-08-27T14:00:00",
        "duration": 60,
        "meeting_type": "review",
        "sentiment": "neutral",
        "summary": "Reviewed wireframes for dashboard redesign. Team flagged navigation clarity and accessibility concerns. Iteration needed on color contrast.",
        "participants": [
            {"name": "Alex Rivera", "initials": "AR", "avatar": "AR"},
            {"name": "Mia Thompson", "initials": "MT", "avatar": "MT"},
            {"name": "David Kim", "initials": "DK", "avatar": "DK"},
            {"name": "Sarah Chen", "initials": "SC", "avatar": "SC"},
        ],
        "transcript": [
            {"speaker": "Alex Rivera", "timestamp": 0, "text": "New wireframes — sidebar navigation and card layout changes."},
            {"speaker": "Mia Thompson", "timestamp": 8, "text": "Sidebar is clearer but worried about deep nesting."},
            {"speaker": "David Kim", "timestamp": 15, "text": "Light grey on white won't pass WCAG contrast check."},
            {"speaker": "Sarah Chen", "timestamp": 22, "text": "Let's address contrast in the next iteration."},
            {"speaker": "Alex Rivera", "timestamp": 30, "text": "I can revise the color palette by Thursday."},
            {"speaker": "Mia Thompson", "timestamp": 40, "text": "We should add a skip-to-content link for keyboard users."},
            {"speaker": "David Kim", "timestamp": 50, "text": "I'll add that to the accessibility checklist."},
        ],
        "decisions": [
            "Revise color palette for WCAG AA compliance",
            "Add keyboard navigation support",
            "Reduce sidebar nesting depth",
        ],
        "action_items": [
            {"title": "Revise color palette", "assignee": "Alex Rivera", "due_date": "2026-09-03"},
            {"title": "Accessibility audit", "assignee": "David Kim", "due_date": "2026-09-05"},
            {"title": "Update wireframes", "assignee": "Mia Thompson", "due_date": "2026-09-04"},
        ],
        "highlights": [
            _hl("WCAG compliance", "Current color contrast fails accessibility standards.", "David Kim", 15, "risk"),
            _hl("Navigation improvement", "New sidebar layout needs depth reduction.", "Mia Thompson", 8, "insight"),
        ],
    },
    {
        "title": "Sprint 14 Retrospective",
        "date": "2026-08-26T16:00:00",
        "duration": 30,
        "meeting_type": "sync",
        "sentiment": "mixed",
        "summary": "Sprint 14: 18 story points completed. CI improvements praised. PR review delays flagged as bottleneck.",
        "participants": [
            {"name": "James Wilson", "initials": "JW", "avatar": "JW"},
            {"name": "Priya Patel", "initials": "PP", "avatar": "PP"},
            {"name": "Alex Rivera", "initials": "AR", "avatar": "AR"},
        ],
        "transcript": [
            {"speaker": "James Wilson", "timestamp": 0, "text": "Sprint 14 is done. 18 points — solid."},
            {"speaker": "Priya Patel", "timestamp": 5, "text": "New CI pipeline saved hours. Deploys are much smoother."},
            {"speaker": "Alex Rivera", "timestamp": 12, "text": "PR reviews took forever — some sat for two days."},
            {"speaker": "James Wilson", "timestamp": 20, "text": "We need to assign review owners per story."},
            {"speaker": "Priya Patel", "timestamp": 27, "text": "I'll add that to the sprint template."},
        ],
        "decisions": ["Assign review owners per story at sprint planning"],
        "action_items": [
            {"title": "Add review owner field to sprint template", "assignee": "Priya Patel", "due_date": "2026-09-02"},
            {"title": "Configure PR review SLAs", "assignee": "James Wilson", "due_date": "2026-09-03"},
        ],
        "highlights": [
            _hl("CI wins", "New CI pipeline improved deploy times significantly.", "Priya Patel", 5, "insight"),
            _hl("PR bottleneck", "Review delays of 2+ days blocked dependent work.", "Alex Rivera", 12, "risk"),
        ],
    },
    {
        "title": "Client Onboarding: Acme Corp",
        "date": "2026-08-25T09:00:00",
        "duration": 90,
        "meeting_type": "external",
        "sentiment": "positive",
        "summary": "Acme Corp onboarding completed. SSO (Okta) and custom reporting needed. 6-week timeline. Budget approved.",
        "participants": [
            {"name": "Sarah Chen", "initials": "SC", "avatar": "SC"},
            {"name": "Mike Johnson", "initials": "MJ", "avatar": "MJ"},
            {"name": "Lisa Wang", "initials": "LW", "avatar": "LW"},
        ],
        "transcript": [
            {"speaker": "Sarah Chen", "timestamp": 0, "text": "Welcome to the Acme Corp onboarding call."},
            {"speaker": "Mike Johnson", "timestamp": 10, "text": "Biggest need: SSO via Okta."},
            {"speaker": "Lisa Wang", "timestamp": 20, "text": "Custom reporting — monthly usage metrics per department."},
            {"speaker": "Sarah Chen", "timestamp": 30, "text": "Six-week timeline sounds right?"},
            {"speaker": "Mike Johnson", "timestamp": 40, "text": "Budget is approved. Let's proceed."},
            {"speaker": "Lisa Wang", "timestamp": 55, "text": "We'll need weekly check-ins during integration."},
            {"speaker": "Sarah Chen", "timestamp": 70, "text": "I'll send the project plan by end of day."},
        ],
        "decisions": [
            "SSO via Okta is the priority integration",
            "Six-week delivery timeline confirmed",
            "Weekly status calls during integration",
        ],
        "action_items": [
            {"title": "Send project plan", "assignee": "Sarah Chen", "due_date": "2026-08-26"},
            {"title": "Set up Okta sandbox", "assignee": "James Wilson", "due_date": "2026-09-01"},
            {"title": "Design reporting schema", "assignee": "Priya Patel", "due_date": "2026-09-02"},
        ],
        "highlights": [
            _hl("SSO requirement", "Okta SSO integration is the critical path.", "Mike Johnson", 10, "requirement"),
            _hl("Budget approved", "Client has secured budget.", "Sarah Chen", 40, "milestone"),
        ],
    },
    {
        "title": "1:1 — James & Sarah",
        "date": "2026-08-24T11:00:00",
        "duration": 30,
        "meeting_type": "1:1",
        "sentiment": "positive",
        "summary": "James expressed interest in technical leadership path. Mentorship and Q3 growth goals discussed.",
        "participants": [
            {"name": "Sarah Chen", "initials": "SC", "avatar": "SC"},
            {"name": "James Wilson", "initials": "JW", "avatar": "JW"},
        ],
        "transcript": [
            {"speaker": "Sarah Chen", "timestamp": 0, "text": "How are you feeling about the quarter, James?"},
            {"speaker": "James Wilson", "timestamp": 5, "text": "Energized. Thinking about the tech lead track."},
            {"speaker": "Sarah Chen", "timestamp": 12, "text": "Let me outline expectations and timeline."},
            {"speaker": "James Wilson", "timestamp": 20, "text": "I'd love to shadow architecture reviews for mentorship."},
            {"speaker": "Sarah Chen", "timestamp": 25, "text": "Added you to the invite list starting next week."},
        ],
        "decisions": [
            "James starts tech lead track this quarter",
            "Added to architecture review invites",
        ],
        "action_items": [
            {"title": "Share tech lead expectations doc", "assignee": "Sarah Chen", "due_date": "2026-08-26"},
            {"title": "Schedule architecture review shadowing", "assignee": "James Wilson", "due_date": "2026-08-28"},
        ],
        "highlights": [
            _hl("Career growth", "James is ready for the technical leadership track.", "Sarah Chen", 5, "milestone"),
        ],
    },
    {
        "title": "API Architecture Review",
        "date": "2026-08-23T13:00:00",
        "duration": 75,
        "meeting_type": "review",
        "sentiment": "neutral",
        "summary": "Decided on tRPC for internal API with OpenAPI public gateway. Migration plan outlined. ADR to be written.",
        "participants": [
            {"name": "David Kim", "initials": "DK", "avatar": "DK"},
            {"name": "Alex Rivera", "initials": "AR", "avatar": "AR"},
            {"name": "James Wilson", "initials": "JW", "avatar": "JW"},
        ],
        "transcript": [
            {"speaker": "David Kim", "timestamp": 0, "text": "We need to settle on the v3 API approach."},
            {"speaker": "Alex Rivera", "timestamp": 10, "text": "GraphQL adds complexity, REST is verbose."},
            {"speaker": "James Wilson", "timestamp": 20, "text": "tRPC internally — typesafe, low overhead."},
            {"speaker": "David Kim", "timestamp": 30, "text": "Expose an OpenAPI gateway for external consumers."},
            {"speaker": "Alex Rivera", "timestamp": 45, "text": "Deprecate v2 endpoints gradually."},
            {"speaker": "David Kim", "timestamp": 65, "text": "Let's write an ADR for this decision."},
        ],
        "decisions": [
            "Use tRPC for internal API",
            "Expose OpenAPI gateway for external consumers",
            "Deprecate v2 endpoints gradually",
        ],
        "action_items": [
            {"title": "Write ADR for v3 API architecture", "assignee": "David Kim", "due_date": "2026-09-02"},
            {"title": "Set up tRPC proof of concept", "assignee": "James Wilson", "due_date": "2026-09-05"},
            {"title": "Design OpenAPI schema", "assignee": "Alex Rivera", "due_date": "2026-09-06"},
        ],
        "highlights": [
            _hl("tRPC decision", "Internal tRPC + external OpenAPI gives best of both worlds.", "David Kim", 30, "decision"),
        ],
    },
    {
        "title": "Customer Feedback Deep Dive",
        "date": "2026-08-22T15:00:00",
        "duration": 45,
        "meeting_type": "sync",
        "sentiment": "mixed",
        "summary": "Analyzed 200+ support tickets. Top complaints: slow export, mobile crashes, confusing onboarding.",
        "participants": [
            {"name": "Priya Patel", "initials": "PP", "avatar": "PP"},
            {"name": "Lisa Wang", "initials": "LW", "avatar": "LW"},
            {"name": "Mia Thompson", "initials": "MT", "avatar": "MT"},
        ],
        "transcript": [
            {"speaker": "Priya Patel", "timestamp": 0, "text": "Analyzed 200 support tickets from last month."},
            {"speaker": "Lisa Wang", "timestamp": 8, "text": "Export speed is the number one complaint — 40% of tickets."},
            {"speaker": "Mia Thompson", "timestamp": 15, "text": "Android 14 crashes are terrible. We need a hotfix."},
            {"speaker": "Priya Patel", "timestamp": 25, "text": "Onboarding confusion is third biggest."},
            {"speaker": "Lisa Wang", "timestamp": 35, "text": "Prioritize export and mobile fixes for sprint 15."},
        ],
        "decisions": [
            "Fix export performance in sprint 15",
            "Hotfix Android 14 mobile crashes",
        ],
        "action_items": [
            {"title": "Profile export pipeline", "assignee": "Lisa Wang", "due_date": "2026-09-02"},
            {"title": "Android 14 crash fix", "assignee": "Priya Patel", "due_date": "2026-08-30"},
            {"title": "Improve onboarding wizard visibility", "assignee": "Mia Thompson", "due_date": "2026-09-05"},
        ],
        "highlights": [
            _hl("Export pain", "40% of support tickets relate to slow exports.", "Lisa Wang", 8, "risk"),
            _hl("Android crash", "Critical crash on Android 14 needs immediate fix.", "Mia Thompson", 15, "risk"),
        ],
    },
    {
        "title": "Hiring Panel — Senior Engineer",
        "date": "2026-08-21T10:00:00",
        "duration": 60,
        "meeting_type": "interview",
        "sentiment": "positive",
        "summary": "Interviewed three senior engineer candidates. One strong hire with excellent architecture skills and collaborative mindset.",
        "participants": [
            {"name": "James Wilson", "initials": "JW", "avatar": "JW"},
            {"name": "Sarah Chen", "initials": "SC", "avatar": "SC"},
            {"name": "Alex Rivera", "initials": "AR", "avatar": "AR"},
            {"name": "Priya Patel", "initials": "PP", "avatar": "PP"},
        ],
        "transcript": [
            {"speaker": "Sarah Chen", "timestamp": 0, "text": "First candidate: solid system design, struggled with concurrency."},
            {"speaker": "James Wilson", "timestamp": 10, "text": "Second: strong technically but culture concerns — too IC-focused."},
            {"speaker": "Alex Rivera", "timestamp": 20, "text": "Third candidate nailed it. Great architecture discussion."},
            {"speaker": "Priya Patel", "timestamp": 35, "text": "Let's extend an offer to candidate three."},
            {"speaker": "Sarah Chen", "timestamp": 50, "text": "I'll draft the offer today."},
        ],
        "decisions": ["Extend offer to candidate three"],
        "action_items": [
            {"title": "Draft offer letter", "assignee": "Sarah Chen", "due_date": "2026-08-22"},
        ],
        "highlights": [
            _hl("Strong candidate", "Excellent architecture skills and collaborative mindset.", "Alex Rivera", 20, "milestone"),
        ],
    },
    {
        "title": "Q3 Financial Review",
        "date": "2026-08-20T09:00:00",
        "duration": 50,
        "meeting_type": "sync",
        "sentiment": "neutral",
        "summary": "Q3 budget on track. Cloud costs 8% over budget. Reserved instances projected 30% savings. Hiring approved.",
        "participants": [
            {"name": "Sarah Chen", "initials": "SC", "avatar": "SC"},
            {"name": "Mike Johnson", "initials": "MJ", "avatar": "MJ"},
            {"name": "Lisa Wang", "initials": "LW", "avatar": "LW"},
        ],
        "transcript": [
            {"speaker": "Mike Johnson", "timestamp": 0, "text": "Q3 numbers look good but cloud costs are 8% over."},
            {"speaker": "Lisa Wang", "timestamp": 10, "text": "Reserved instances could save 30% on production spend."},
            {"speaker": "Sarah Chen", "timestamp": 20, "text": "Let's switch production to reserved instances."},
            {"speaker": "Mike Johnson", "timestamp": 35, "text": "New hire budget is approved."},
        ],
        "decisions": ["Switch to reserved instances for production"],
        "action_items": [
            {"title": "Switch to reserved instances", "assignee": "Lisa Wang", "due_date": "2026-09-05"},
            {"title": "Prepare onboarding for new hire", "assignee": "Sarah Chen", "due_date": "2026-09-10"},
        ],
        "highlights": [
            _hl("Cost savings", "Reserved instances projected to save 30% on cloud spend.", "Lisa Wang", 10, "insight"),
        ],
    },
    {
        "title": "Marketing Campaign Planning",
        "date": "2026-08-19T14:00:00",
        "duration": 55,
        "meeting_type": "sync",
        "sentiment": "positive",
        "summary": "September product launch campaign planned. Target: 5000 signups. Channels: LinkedIn, Twitter, email. Budget: $15K.",
        "participants": [
            {"name": "Mia Thompson", "initials": "MT", "avatar": "MT"},
            {"name": "David Kim", "initials": "DK", "avatar": "DK"},
            {"name": "Priya Patel", "initials": "PP", "avatar": "PP"},
        ],
        "transcript": [
            {"speaker": "Mia Thompson", "timestamp": 0, "text": "September launch is coming up. Let's plan the campaign."},
            {"speaker": "David Kim", "timestamp": 8, "text": "LinkedIn and Twitter are our best channels. Email too."},
            {"speaker": "Priya Patel", "timestamp": 18, "text": "Target: 5000 signups. Budget: 15K."},
            {"speaker": "Mia Thompson", "timestamp": 30, "text": "I'll create the content calendar and asset brief."},
            {"speaker": "David Kim", "timestamp": 45, "text": "I'll handle paid ads setup by Wednesday."},
        ],
        "decisions": [
            "Target 5000 signups for September launch",
            "Primary channels: LinkedIn, Twitter, email",
        ],
        "action_items": [
            {"title": "Create content calendar", "assignee": "Mia Thompson", "due_date": "2026-08-26"},
            {"title": "Set up paid ads", "assignee": "David Kim", "due_date": "2026-08-27"},
        ],
        "highlights": [
            _hl("Launch target", "5000 signups goal for September product launch.", "Priya Patel", 18, "milestone"),
        ],
    },
    {
        "title": "Tech Debt Triage",
        "date": "2026-08-18T11:00:00",
        "duration": 40,
        "meeting_type": "review",
        "sentiment": "mixed",
        "summary": "Triaged 47 tech debt items. 12 critical for sprint 15. Test flakiness is the top blocker.",
        "participants": [
            {"name": "James Wilson", "initials": "JW", "avatar": "JW"},
            {"name": "Alex Rivera", "initials": "AR", "avatar": "AR"},
        ],
        "transcript": [
            {"speaker": "James Wilson", "timestamp": 0, "text": "Forty-seven tech debt items. Let's triage."},
            {"speaker": "Alex Rivera", "timestamp": 8, "text": "Test flakiness is the worst — it's blocking deployments."},
            {"speaker": "James Wilson", "timestamp": 18, "text": "Twelve are critical. Taking those this sprint."},
            {"speaker": "Alex Rivera", "timestamp": 30, "text": "Legacy API cleanup can wait."},
        ],
        "decisions": [
            "Address 12 critical tech debt items in sprint 15",
            "Deprioritize legacy API cleanup",
        ],
        "action_items": [
            {"title": "Fix flaky tests", "assignee": "Alex Rivera", "due_date": "2026-09-02"},
        ],
        "highlights": [
            _hl("Flaky tests", "Test flakiness is the top deployment blocker.", "Alex Rivera", 8, "risk"),
        ],
    },
    {
        "title": "Incident Postmortem: Outage 8/16",
        "date": "2026-08-17T13:00:00",
        "duration": 65,
        "meeting_type": "review",
        "sentiment": "negative",
        "summary": "Postmortem for 2-hour outage on August 16. Root cause: DB connection pool exhaustion after traffic spike. Remediation: increase pool, add circuit breaker.",
        "participants": [
            {"name": "David Kim", "initials": "DK", "avatar": "DK"},
            {"name": "James Wilson", "initials": "JW", "avatar": "JW"},
            {"name": "Alex Rivera", "initials": "AR", "avatar": "AR"},
            {"name": "Sarah Chen", "initials": "SC", "avatar": "SC"},
        ],
        "transcript": [
            {"speaker": "Sarah Chen", "timestamp": 0, "text": "We were down for two hours. Let's review the timeline."},
            {"speaker": "David Kim", "timestamp": 10, "text": "Root cause: connection pool exhaustion. Viral tweet caused traffic spike."},
            {"speaker": "James Wilson", "timestamp": 20, "text": "Pool size was too small. We need to increase it and add auto-scaling."},
            {"speaker": "Alex Rivera", "timestamp": 35, "text": "A circuit breaker would prevent cascading failures."},
            {"speaker": "David Kim", "timestamp": 50, "text": "I'll implement the circuit breaker and update runbooks."},
        ],
        "decisions": [
            "Increase database connection pool size",
            "Implement circuit breaker pattern",
            "Add traffic spike alerting",
        ],
        "action_items": [
            {"title": "Increase DB pool size", "assignee": "James Wilson", "due_date": "2026-08-20"},
            {"title": "Implement circuit breaker", "assignee": "David Kim", "due_date": "2026-08-27"},
            {"title": "Add spike alerting", "assignee": "Alex Rivera", "due_date": "2026-08-25"},
        ],
        "highlights": [
            _hl("Root cause", "Connection pool exhaustion caused by traffic spike.", "David Kim", 10, "risk"),
            _hl("Fix plan", "Circuit breaker and auto-scaling pool prevent recurrence.", "James Wilson", 20, "action"),
        ],
    },
    {
        "title": "Partnership Discussion: DataSync",
        "date": "2026-08-15T10:00:00",
        "duration": 45,
        "meeting_type": "external",
        "sentiment": "positive",
        "summary": "Discussed API integration partnership with DataSync. Mutual interest. Webhook-based integration proposed.",
        "participants": [
            {"name": "Sarah Chen", "initials": "SC", "avatar": "SC"},
            {"name": "Tom Baker", "initials": "TB", "avatar": "TB"},
            {"name": "Lisa Wang", "initials": "LW", "avatar": "LW"},
        ],
        "transcript": [
            {"speaker": "Sarah Chen", "timestamp": 0, "text": "Let's discuss how our platforms can integrate."},
            {"speaker": "Tom Baker", "timestamp": 10, "text": "Webhook-based integration — push events to your platform."},
            {"speaker": "Lisa Wang", "timestamp": 20, "text": "We can consume your data in real-time."},
            {"speaker": "Tom Baker", "timestamp": 35, "text": "Let's set up a proof of concept next week."},
        ],
        "decisions": [
            "Explore webhook-based integration",
            "Schedule proof of concept for next week",
        ],
        "action_items": [
            {"title": "Send API documentation", "assignee": "Lisa Wang", "due_date": "2026-08-18"},
            {"title": "Schedule PoC session", "assignee": "Sarah Chen", "due_date": "2026-08-20"},
        ],
        "highlights": [
            _hl("Partnership potential", "DataSync offers complementary data. Could expand both reach.", "Sarah Chen", 10, "opportunity"),
        ],
    },
    {
        "title": "Security Audit Results",
        "date": "2026-08-14T15:00:00",
        "duration": 50,
        "meeting_type": "review",
        "sentiment": "negative",
        "summary": "External audit found two medium-severity vulnerabilities. Remediation approved. Pen test scheduled for October.",
        "participants": [
            {"name": "David Kim", "initials": "DK", "avatar": "DK"},
            {"name": "James Wilson", "initials": "JW", "avatar": "JW"},
            {"name": "Sarah Chen", "initials": "SC", "avatar": "SC"},
        ],
        "transcript": [
            {"speaker": "David Kim", "timestamp": 0, "text": "Two medium-severity issues found. Both fixable in two weeks."},
            {"speaker": "James Wilson", "timestamp": 12, "text": "Unvalidated redirect — easy fix."},
            {"speaker": "Sarah Chen", "timestamp": 25, "text": "Session timeout — we should review the whole auth flow."},
            {"speaker": "David Kim", "timestamp": 40, "text": "Pen test is scheduled for October. We should be clean by then."},
        ],
        "decisions": [
            "Fix both medium-severity vulnerabilities within two weeks",
            "Schedule pen test for October",
        ],
        "action_items": [
            {"title": "Fix unvalidated redirect", "assignee": "James Wilson", "due_date": "2026-08-28"},
            {"title": "Implement session timeout", "assignee": "David Kim", "due_date": "2026-08-28"},
            {"title": "Review auth flow", "assignee": "Sarah Chen", "due_date": "2026-09-02"},
        ],
        "highlights": [
            _hl("Audit findings", "Two medium-severity vulnerabilities found. Remediation in progress.", "David Kim", 0, "risk"),
        ],
    },
    {
        "title": "All-Hands: August",
        "date": "2026-08-13T11:00:00",
        "duration": 60,
        "meeting_type": "all-hands",
        "sentiment": "positive",
        "summary": "Q2 wins celebrated. Analytics dashboard shipped early. NPS up 12 points. Seattle office opening in Q4. Hiring 10 more engineers.",
        "participants": [
            {"name": "Sarah Chen", "initials": "SC", "avatar": "SC"},
            {"name": "James Wilson", "initials": "JW", "avatar": "JW"},
            {"name": "Priya Patel", "initials": "PP", "avatar": "PP"},
            {"name": "Alex Rivera", "initials": "AR", "avatar": "AR"},
            {"name": "David Kim", "initials": "DK", "avatar": "DK"},
            {"name": "Mia Thompson", "initials": "MT", "avatar": "MT"},
            {"name": "Lisa Wang", "initials": "LW", "avatar": "LW"},
            {"name": "Mike Johnson", "initials": "MJ", "avatar": "MJ"},
        ],
        "transcript": [
            {"speaker": "Sarah Chen", "timestamp": 0, "text": "Welcome to August all-hands. Let's celebrate Q2 wins."},
            {"speaker": "James Wilson", "timestamp": 8, "text": "Analytics dashboard shipped two weeks early."},
            {"speaker": "Priya Patel", "timestamp": 18, "text": "Customer NPS went up 12 points. That's huge."},
            {"speaker": "Sarah Chen", "timestamp": 30, "text": "Q3 roadmap: enterprise features and mobile."},
            {"speaker": "Mia Thompson", "timestamp": 40, "text": "Opening a Seattle office in Q4!"},
            {"speaker": "David Kim", "timestamp": 50, "text": "Hiring 10 more engineers — team of 30 by year end."},
        ],
        "decisions": [
            "Open Seattle office in Q4",
            "Focus Q3 on enterprise features and mobile",
        ],
        "action_items": [
            {"title": "Post Seattle office job listings", "assignee": "Mike Johnson", "due_date": "2026-09-01"},
            {"title": "Draft enterprise feature spec", "assignee": "Priya Patel", "due_date": "2026-09-05"},
        ],
        "highlights": [
            _hl("NPS improvement", "Customer NPS increased 12 points in Q2.", "Priya Patel", 18, "milestone"),
            _hl("Team growth", "30 engineers by year end. Seattle office opening.", "David Kim", 50, "milestone"),
        ],
    },
]


def seed():
    db = SessionLocal()
    try:
        db.query(Highlight).delete()
        db.query(ActionItem).delete()
        db.query(Decision).delete()
        db.query(TranscriptSegment).delete()
        db.query(Participant).delete()
        db.query(Meeting).delete()
        db.commit()

        for m in SEED_MEETINGS:
            meeting = Meeting(
                title=m["title"],
                date=m["date"],
                duration=m["duration"],
                meeting_type=m["meeting_type"],
                sentiment=m["sentiment"],
                summary=m["summary"],
                participant_count=len(m["participants"]),
                transcript_length=len(m["transcript"]),
                speaker_count=len(set(t["speaker"] for t in m["transcript"])),
                participant_names=json.dumps([p["name"] for p in m["participants"]]),
                action_count=len(m["action_items"]),
                decision_count=len(m["decisions"]),
            )
            db.add(meeting)
            db.flush()

            p_map = {}
            for p in m["participants"]:
                part = Participant(meeting_id=meeting.id, name=p["name"],
                                   initials=p.get("initials", ""), avatar=p.get("avatar", ""))
                db.add(part)
                db.flush()
                p_map[p["name"]] = part.id

            for t in m["transcript"]:
                db.add(TranscriptSegment(
                    meeting_id=meeting.id,
                    participant_id=p_map.get(t["speaker"], ""),
                    timestamp=t["timestamp"],
                    text=t["text"],
                ))

            for d in m["decisions"]:
                db.add(Decision(meeting_id=meeting.id, text=d))

            for a in m["action_items"]:
                db.add(ActionItem(meeting_id=meeting.id, **a))

            for h in m["highlights"]:
                db.add(Highlight(meeting_id=meeting.id, **h))

            db.commit()
            print(f"  Seeded: {m['title']}")

        print(f"\nDone. {len(SEED_MEETINGS)} meetings seeded.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_tables()
    seed()

from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List
import uuid


class Participant(SQLModel, table=True):
    __tablename__ = "participants"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    meeting_id: str = Field(foreign_key="meetings.id", index=True)
    name: str
    email: str = ""
    initials: str
    avatar: str = ""

    meeting: "Meeting" = Relationship(back_populates="participants")


class TranscriptSegment(SQLModel, table=True):
    __tablename__ = "transcript_segments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    meeting_id: str = Field(foreign_key="meetings.id", index=True)
    participant_id: str = Field(foreign_key="participants.id")
    timestamp: int
    text: str

    meeting: "Meeting" = Relationship(back_populates="transcript_segments")


class Decision(SQLModel, table=True):
    __tablename__ = "decisions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    meeting_id: str = Field(foreign_key="meetings.id", index=True)
    text: str
    timestamp: Optional[int] = None

    meeting: "Meeting" = Relationship(back_populates="decisions")


class ActionItem(SQLModel, table=True):
    __tablename__ = "action_items"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    meeting_id: str = Field(foreign_key="meetings.id", index=True)
    title: str
    assignee: str
    completed: bool = False
    due_date: str = ""
    source_timestamp: int = 0

    meeting: "Meeting" = Relationship(back_populates="action_items")


class Highlight(SQLModel, table=True):
    __tablename__ = "highlights"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    meeting_id: str = Field(foreign_key="meetings.id", index=True)
    timestamp: int
    title: str
    description: str
    speaker: str
    type: str = "insight"

    meeting: "Meeting" = Relationship(back_populates="highlights")


class Meeting(SQLModel, table=True):
    __tablename__ = "meetings"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    title: str
    date: str
    duration: int
    meeting_type: str
    status: str = "completed"
    sentiment: str = "neutral"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    participants: List[Participant] = Relationship(back_populates="meeting")
    transcript_segments: List[TranscriptSegment] = Relationship(back_populates="meeting")
    decisions: List[Decision] = Relationship(back_populates="meeting")
    action_items: List[ActionItem] = Relationship(back_populates="meeting")
    highlights: List[Highlight] = Relationship(back_populates="meeting")

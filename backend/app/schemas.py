from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class ParticipantRead(BaseModel):
    id: str
    name: str
    email: str
    initials: str
    avatar: str


class MeetingSummaryRead(BaseModel):
    executive: str
    keyTopics: List[str]
    decisions: List[str]
    discussionPoints: List[str]
    sentiment: str


class MeetingRead(BaseModel):
    id: str
    title: str
    date: str
    duration: int
    meeting_type: str
    status: str
    sentiment: str
    participants: List[ParticipantRead]
    summary: MeetingSummaryRead
    decisions: List[DecisionRead] = []
    actionItems: List[ActionItemRead] = []
    highlights: List[HighlightRead] = []


class TranscriptSegmentRead(BaseModel):
    id: str
    timestamp: int
    text: str
    participant_id: str


class DecisionRead(BaseModel):
    id: str
    text: str
    timestamp: Optional[int] = None


class ActionItemRead(BaseModel):
    id: str
    title: str
    assignee: str
    completed: bool
    due_date: str
    source_timestamp: int


class HighlightRead(BaseModel):
    id: str
    timestamp: int
    title: str
    description: str
    speaker: str
    type: str


class ActionItemUpdate(BaseModel):
    completed: bool


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    sources: List[dict] = []


class HealthResponse(BaseModel):
    status: str
    database: str

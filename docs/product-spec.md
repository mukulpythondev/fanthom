# Fathom Rebuild — Product Specification

## 1. Assignment

Rebuild the core experience of Fathom, an AI meeting notetaker, within a 24-hour engineering sprint.

The goal is not to reproduce every backend capability of Fathom.

The goal is to deliver a polished, convincing, functional meeting-intelligence product that demonstrates:

- Strong product judgment
- High-quality UX/UI
- A complete post-meeting workflow
- Realistic seeded meeting data
- A working deployed product
- Clear prioritization of what was built versus intentionally stubbed

The product should feel like a real SaaS product, not a hackathon CRUD dashboard.

---

# 2. Reference Product

Reference product:

Fathom — AI Meeting Notetaker

The `/screenshots` directory contains screenshots captured during product reconnaissance.

Treat these screenshots as UX/product references.

Do not blindly copy every visual detail.

Reproduce the important interaction patterns and information architecture while improving usability where appropriate.

---

# 3. Product Mental Model

The core product loop is:

    Meetings
        ↓
    Open a meeting
        ↓
    Understand what happened
        ↓
    Review transcript / recording
        ↓
    Read AI-generated summary
        ↓
    Review decisions
        ↓
    Review action items
        ↓
    Review highlights
        ↓
    Ask questions through AI chat
        ↓
    Share useful moments

The product should optimize for:

"After a meeting, help me understand what happened and what I need to do next."

---

# 4. Important Product Observation

Fathom does NOT need to be recreated as a traditional transcript-search application.

The reference product provides AI chat functionality for interacting with meeting content.

Therefore:

DO NOT build a conventional:

    Search transcript
    Search summary

feature as the primary interaction.

Instead implement:

    Ask AI about this meeting

The AI assistant should be able to answer questions using:

- Transcript
- Summary
- Decisions
- Action items
- Highlights
- Meeting metadata

Example questions:

    "What decisions were made?"

    "What did Sarah say about pricing?"

    "What are my action items?"

    "Why was the launch date changed?"

    "Give me a short summary of the discussion about onboarding."

The chat interface should feel like a natural extension of the meeting page.

---

# 5. Core User Experience

The main navigation should be approximately:

    Home
    Meetings
    AI / Meeting Assistant
    Settings

The most important screen is the Meeting Detail page.

---

# 6. Core Modules

## P0 — Required

These modules must work before polishing secondary features.

### Module 1 — Application Shell

Build:

- Authentication/access flow
- Main navigation
- Sidebar
- User profile area
- Responsive application shell
- Consistent design system

The application should feel like a production SaaS application.

---

### Module 2 — Meetings Dashboard

Create a dashboard showing realistic meetings.

The dashboard should contain:

- Recent meetings
- Meeting title
- Date/time
- Duration
- Participants
- Meeting type
- Summary preview
- Action-item count
- Meeting status

Example meetings:

- Product Strategy
- Weekly Engineering Sync
- Customer Discovery
- Sprint Planning
- Growth Review
- Q4 Planning
- Design Review
- Sales Review
- Investor Update
- Hiring Interview

The dashboard must NOT look empty.

Seed the application with realistic data.

---

### Module 3 — Meeting Detail

This is the most important screen.

The meeting page should include:

- Meeting title
- Date/time
- Duration
- Participants
- Meeting recording/playback
- Transcript
- AI summary
- Key topics
- Decisions
- Action items
- Highlights
- AI chat

The layout should make it easy to move between these pieces of information.

---

### Module 4 — Meeting Playback

Implement a convincing playback experience.

A real meeting recording/bot is NOT required.

Use seeded/mock audio or a simulated playback layer.

Required interactions:

- Play/pause
- Current timestamp
- Timeline
- Transcript timestamp
- Clicking transcript segment changes playback position
- Clicking a highlight jumps to its timestamp

The experience should communicate that transcript and recording are synchronized.

---

### Module 5 — Transcript

Display a realistic speaker-attributed transcript.

Each transcript segment should include:

- Speaker
- Timestamp
- Text

Example:

    10:04 Sarah
    I think the biggest issue with onboarding is...

    10:06 Mukul
    Agreed. We should simplify the first-time experience.

Transcript should visually distinguish speakers.

Transcript segments should be connected to playback timestamps.

---

### Module 6 — AI Summary

Every seeded meeting should have an AI-generated-style summary.

Include:

- Executive summary
- Key topics
- Decisions
- Important discussion points

Example:

    Summary

    The team reviewed the Q4 launch plan,
    discussed onboarding improvements,
    and agreed to move the beta release
    to October 14.

Key topics:

- Q4 launch
- Onboarding
- Pricing
- Infrastructure

Decisions:

- Beta launch moved to October 14
- Enterprise pricing remains unchanged

The content should feel realistic and specific to each meeting.

---

### Module 7 — Action Items

Display extracted action items.

Each action item should include:

- Task
- Assignee
- Due date
- Status
- Source/timestamp where appropriate

Example:

    Sarah
    Prepare onboarding copy
    Due Oct 8

    Alex
    Review infrastructure costs
    Due Oct 10

Users should be able to mark action items complete.

---

### Module 8 — Highlights

Allow important moments to be represented as highlights.

Each highlight should contain:

- Timestamp
- Short title
- Description/quote
- Speaker

Example:

    12:43
    Launch decision

    "Let's move the beta launch to October 14."

Clicking a highlight should move playback to that point.

---

### Module 9 — AI Meeting Chat

This is an important differentiating feature.

Build an AI chat panel for the current meeting.

UI:

    Ask anything about this meeting...

Suggested questions:

    What decisions were made?

    What are my action items?

    Summarize the pricing discussion.

    What did Sarah say about onboarding?

    Why was the launch date changed?

The assistant should answer based on the seeded meeting data.

For the assignment, a deterministic/mock AI layer is acceptable if it produces convincing contextual answers.

Do NOT build a fake generic chatbot.

Answers must be grounded in the current meeting's:

- Transcript
- Summary
- Decisions
- Action items
- Highlights

The user should feel like they are querying the meeting itself.

---

# 7. Sharing

Implement a lightweight meeting/clip sharing experience.

Users should be able to:

1. Select a meeting moment
2. Create a clip/highlight
3. Open sharing UI
4. Generate/copy a share link
5. View a read-only shared representation

The shared page should not expose editing controls.

A real external sharing infrastructure is not necessary.

---

# 8. Templates

Implement a lightweight template system.

Users should be able to switch the AI summary format.

Example templates:

- Standard
- Executive
- Sales Call
- 1:1
- Interview
- Customer Discovery

Changing templates should visibly change the structure/content presentation.

The implementation can be deterministic.

---

# 9. Calendar

The reference product integrates with calendars.

For this assignment:

A real Google Calendar integration is NOT required.

Implement a convincing calendar/integration surface.

Show:

- Connected calendar
- Upcoming meetings
- Integration status

If necessary, use mock data.

Do not spend significant time implementing OAuth.

---

# 10. Recording / Notetaker

A real Zoom/Google Meet/Teams bot is explicitly NOT required.

The assignment allows the capture layer to be faked or stubbed.

Therefore:

- Do not spend significant development time on meeting-bot infrastructure.
- Do not implement real-time audio capture.
- Do not implement production speech recognition.
- Do not implement Zoom/Teams automation.

Instead:

Use realistic seeded meetings and communicate clearly in the walkthrough that the recording/capture layer was intentionally stubbed to prioritize the post-meeting experience.

---

# 11. Seed Data

The application must launch with realistic data.

Minimum:

10 meetings

At least:

- 1 long meeting
- 1 meeting with approximately 8 participants
- Different durations
- Different meeting types
- Different speakers
- Different summaries
- Different action items
- Different highlights

The long meeting should represent approximately:

    50–60 minutes

The 8-person meeting should demonstrate that the interface remains usable with many participants.

---

# 12. Meeting Data Model

Use a structured model similar to:

Meeting

    id
    title
    date
    duration
    meetingType
    participants
    recording
    summary
    topics
    decisions
    transcript
    actionItems
    highlights
    template
    status

Participant

    id
    name
    email
    avatar

TranscriptSegment

    id
    meetingId
    speakerId
    timestamp
    text

ActionItem

    id
    meetingId
    title
    assignee
    dueDate
    status
    sourceTimestamp

Highlight

    id
    meetingId
    timestamp
    title
    description
    speaker

---

# 13. AI Architecture

Do not over-engineer the AI layer.

The assignment is primarily judged on:

- Product quality
- UX
- Working product
- Speed
- Product judgment

The AI layer can use deterministic/mock responses based on meeting data.

However, the architecture should make it possible to replace the mock implementation with a real LLM later.

Example:

    MeetingContext
          ↓
    AI Service Interface
          ↓
    Mock AI Provider

Future:

    MeetingContext
          ↓
    AI Service Interface
          ↓
    LLM Provider

Keep this boundary clean.

---

# 14. UI Principles

The UI should feel:

- Modern
- Calm
- Professional
- Information-dense without feeling cluttered
- Fast
- Consistent

Prioritize:

- Typography
- Spacing
- Hierarchy
- Clear navigation
- Strong empty/loading/error states
- Good hover states
- Responsive behavior

Avoid:

- Generic AI-dashboard aesthetics
- Excessive gradients
- Excessive cards
- Giant hero sections
- Fake marketing landing pages
- Unnecessary animations
- Excessive glassmorphism

This is a productivity application.

---

# 15. Design Direction

Use the Fathom screenshots as a reference for:

- Information architecture
- Layout
- Navigation
- Meeting detail structure
- Transcript presentation
- AI summary presentation
- AI chat
- Sharing interactions

Do not copy branding assets or claim to be the original Fathom product.

The implementation should be an independent rebuild inspired by the observed workflows.

---

# 16. Technical Priorities

Optimize for shipping speed.

Prefer:

- Simple architecture
- Reusable components
- Strong TypeScript types
- Minimal dependencies
- Simple data access
- Seeded data
- Clear separation between UI and data

Avoid:

- Premature microservices
- Complex event architecture
- Unnecessary backend services
- Over-engineered AI pipelines
- Real-time infrastructure unless required

---

# 17. Sprint Order

Build in this order:

Sprint 1:
Application shell + foundation

Sprint 2:
Meetings dashboard + seeded data

Sprint 3:
Meeting detail page

Sprint 4:
Transcript + playback

Sprint 5:
AI summary + decisions + topics

Sprint 6:
Action items + highlights

Sprint 7:
AI meeting chat

Sprint 8:
Sharing/clips

Sprint 9:
Templates + calendar surface

Sprint 10:
Polish + responsive UI + QA

Sprint 11:
Deployment + final verification

Do not move to the next sprint if the current sprint is fundamentally broken.

---

# 18. P0 / P1 / P2

## P0

Must ship:

- Application shell
- Dashboard
- Seeded meetings
- Meeting detail
- Transcript
- Playback
- Summary
- Decisions
- Action items
- Highlights
- AI meeting chat
- Deployment

## P1

Ship if time permits:

- Sharing/clips
- Templates
- Calendar integration surface
- Better playback
- More detailed participant views

## P2

Do not prioritize during the 24-hour sprint:

- Real Zoom bot
- Real Teams bot
- Real Google Meet bot
- Real-time transcription
- Production speech recognition
- Complex OAuth
- Billing
- Notifications
- Mobile application
- Advanced permissions
- Enterprise administration

---

# 19. Definition of Done

The product is considered ready when:

1. The application is deployed.
2. A new user can open the application.
3. Meetings are already seeded.
4. User can open a meeting.
5. User can see participants.
6. User can interact with playback.
7. User can read transcript.
8. User can read AI summary.
9. User can see decisions.
10. User can manage action items.
11. User can view highlights.
12. User can ask questions about the meeting through AI chat.
13. User can create/share a clip or highlight.
14. Templates work if implemented.
15. Calendar surface works if implemented.
16. The application works in an incognito browser.
17. No major console/runtime errors exist.
18. The UI looks polished.
19. `.agent-logs/` remains committed.
20. The repository is public.
21. The final walkthrough demonstrates the core journey.

---

# 20. Product Judgment

When forced to choose between:

    another feature

and

    improving the existing core experience

prefer improving the core experience.

The primary experience is:

    Meeting
      ↓
    Transcript
      ↓
    Summary
      ↓
    Decisions
      ↓
    Action Items
      ↓
    Highlights
      ↓
    Ask AI

The goal is a small but convincing product rather than a large collection of unfinished features.

---

# 21. Assignment Constraint

This is a 24-hour rebuild.

Optimize for:

    Working > theoretical
    Polished > feature-heavy
    Realistic data > empty states
    Product judgment > infrastructure complexity
    Complete flows > isolated components

The recording bot may be stubbed.

Make deliberate tradeoffs and document important ones.
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import create_tables, engine
from app.models import Meeting, Participant, TranscriptSegment, Decision, ActionItem, Highlight


def seed_database():
    if engine is None:
        raise RuntimeError("DATABASE_URL is not configured")
    create_tables()
    seed_data = get_seed_data()

    with Session(engine) as session:
        existing = session.execute(select(Meeting).limit(1)).scalar_one_or_none()
        if existing:
            meetings_by_id = {
                meeting.id: meeting
                for meeting in session.execute(select(Meeting)).scalars()
            }
            updated = 0
            for meeting_data in seed_data:
                meeting = meetings_by_id.get(meeting_data["id"])
                topics = meeting_data["summary"].get("keyTopics", [])
                if meeting is not None and not meeting.key_topics:
                    meeting.key_topics = json.dumps(topics)
                    updated += 1
            session.commit()
            print(f"Database already seeded. Updated topics for {updated} meetings.")
            return

        for m in seed_data:
            meeting = Meeting(
                id=m["id"],
                title=m["title"],
                date=m["date"],
                duration=m["duration"],
                meeting_type=m["meetingType"],
                status="completed",
                sentiment=m["summary"]["sentiment"],
                summary=m["summary"]["executive"],
                key_topics=json.dumps(m["summary"].get("keyTopics", [])),
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            session.add(meeting)
            session.flush()

            participant_ids = {}
            for p in m["participants"]:
                participant_id = f"{meeting.id}-{p['id']}"
                participant_ids[p["id"]] = participant_id
                participant = Participant(
                    id=participant_id,
                    meeting_id=meeting.id,
                    name=p["name"],
                    initials=p["initials"],
                    avatar=p.get("avatar", ""),
                )
                session.add(participant)
            session.flush()

            for t in m["transcript"]:
                segment = TranscriptSegment(
                    id=f"{meeting.id}-{t['id']}",
                    meeting_id=meeting.id,
                    participant_id=participant_ids[t["speakerId"]],
                    timestamp=t["timestamp"],
                    text=t["text"],
                )
                session.add(segment)

            for d in m["summary"]["decisions"]:
                decision = Decision(
                    id=str(uuid.uuid4()),
                    meeting_id=meeting.id,
                    text=d,
                    timestamp=None,
                )
                session.add(decision)

            for a in m["actionItems"]:
                action = ActionItem(
                    id=f"{meeting.id}-{a['id']}",
                    meeting_id=meeting.id,
                    title=a["title"],
                    assignee=a["assignee"],
                    completed=a.get("status", "pending") == "completed",
                    due_date=a.get("dueDate", ""),
                    source_timestamp=a.get("sourceTimestamp", 0),
                )
                session.add(action)

            for h in m["highlights"]:
                highlight = Highlight(
                    id=f"{meeting.id}-{h['id']}",
                    meeting_id=meeting.id,
                    timestamp=h["timestamp"],
                    title=h["title"],
                    description=h["description"],
                    speaker=h["speaker"],
                    highlight_type=h.get("type", "insight"),
                )
                session.add(highlight)

        session.commit()
        count = len(seed_data)
        print(f"Seeded {count} meetings into the database.")


def get_seed_data():
    """Return all 12 meetings in Python dict format for database seeding."""
    return [
        # Meeting 1: Q4 Product Strategy Review
        {
            "id": "1",
            "title": "Q4 Product Strategy Review",
            "date": "2026-09-20T14:00:00Z",
            "duration": 58,
            "meetingType": "strategy",
            "participants": [
                {"id": "p1", "name": "Sarah Chen", "email": "sarah@company.com", "initials": "SC", "avatar": "SC"},
                {"id": "p2", "name": "Alex Rivera", "email": "alex@company.com", "initials": "AR", "avatar": "AR"},
                {"id": "p3", "name": "Mukul Rana", "email": "mukul@company.com", "initials": "MR", "avatar": "MR"},
                {"id": "p4", "name": "Priya Sharma", "email": "priya@company.com", "initials": "PS", "avatar": "PS"},
                {"id": "p5", "name": "James Wilson", "email": "james@company.com", "initials": "JW", "avatar": "JW"},
                {"id": "p6", "name": "Elena Rodriguez", "email": "elena@company.com", "initials": "ER", "avatar": "ER"},
                {"id": "p7", "name": "David Kim", "email": "david@company.com", "initials": "DK", "avatar": "DK"},
                {"id": "p8", "name": "Lisa Thompson", "email": "lisa@company.com", "initials": "LT", "avatar": "LT"},
            ],
            "summary": {
                "executive": "The leadership team reviewed Q4 product strategy, analyzed Q3 performance metrics, and committed to three major initiatives: launching the enterprise tier, expanding the API platform, and improving onboarding conversion by 40%.",
                "sentiment": "positive",
                "keyTopics": ["Q3 Performance Review", "Enterprise Tier Launch", "API Platform Expansion", "Onboarding Optimization", "Budget Allocation", "Headcount Planning"],
                "decisions": [
                    "Enterprise tier pricing set at $49/user/month with annual commitment",
                    "API platform v2 targeted for November 15 release",
                    "Onboarding redesign approved with 40% conversion improvement goal",
                    "Engineering headcount increased by 25% (12 additional hires)",
                    "Mobile app development deprioritized until Q1 2027",
                ],
                "discussionPoints": [
                    "Q3 revenue exceeded target by 18%, driven primarily by enterprise sales",
                    "Customer churn rate improved from 4.2% to 3.1% after onboarding changes",
                    "API usage grew 3x in enterprise segment, validating platform investment",
                    "Concerns raised about competitor Movenant raising Series C at $2.4B valuation",
                    "Team discussed need for better analytics and observability tools",
                ],
            },
            "transcript": [
                {"id": "t1", "speakerId": "p1", "timestamp": 0, "text": "Good morning everyone. Let's get started with our Q4 strategy review. I want to cover our Q3 performance, discuss the three major initiatives, and nail down our budget for the quarter."},
                {"id": "t2", "speakerId": "p3", "timestamp": 8, "text": "Thanks Sarah. I've prepared the Q3 metrics. We exceeded our revenue target by 18%, which is strong. But more importantly, our enterprise segment is really accelerating."},
                {"id": "t3", "speakerId": "p1", "timestamp": 15, "text": "Can you share the specific numbers on enterprise growth?"},
                {"id": "t4", "speakerId": "p3", "timestamp": 18, "text": "Sure. Enterprise MRR grew from $340K to $520K. That's a 53% increase quarter over quarter. We also saw API usage triple in the enterprise segment, which tells us the platform investment is paying off."},
                {"id": "t5", "speakerId": "p4", "timestamp": 28, "text": "The onboarding improvements we shipped in August are showing real results too. Churn dropped from 4.2% to 3.1%. I think we can push this further in Q4."},
                {"id": "t6", "speakerId": "p2", "timestamp": 35, "text": "I agree. I'd like to propose we make onboarding optimization one of our three major Q4 initiatives. We have a clear path to 40% improvement in first-week activation."},
                {"id": "t7", "speakerId": "p5", "timestamp": 42, "text": "What's the plan for the enterprise tier launch? We've been talking about this for months."},
                {"id": "t8", "speakerId": "p1", "timestamp": 48, "text": "Good question. The enterprise tier is priced at $49 per user per month with an annual commitment. We're targeting November 1 for the launch. The feature set includes SSO, audit logs, and dedicated support."},
                {"id": "t9", "speakerId": "p6", "timestamp": 58, "text": "I have concerns about the pricing model. $49 might be too aggressive for the current market. We should consider a tiered approach."},
                {"id": "t10", "speakerId": "p3", "timestamp": 65, "text": "Elena raises a fair point. Our market research shows comparable products pricing between $35 and $55. I think $49 is defensible if we position it right."},
                {"id": "t11", "speakerId": "p7", "timestamp": 75, "text": "On the API platform side, we're targeting November 15 for v2. The new rate limiting, webhooks, and SDK improvements are ready for beta testing next week."},
                {"id": "t12", "speakerId": "p8", "timestamp": 85, "text": "I want to flag something important. Movenant just raised a Series C at a $2.4B valuation. They're hiring aggressively and their product is starting to overlap with ours in the SMB space."},
                {"id": "t13", "speakerId": "p1", "timestamp": 95, "text": "That's concerning. Let's make sure we're differentiating clearly. The enterprise tier and API platform should help, but we need to communicate our unique value proposition better."},
                {"id": "t14", "speakerId": "p2", "timestamp": 105, "text": "Agreed. I think we should also invest in better analytics and observability. Our customers are asking for it, and it would give us a defensibility moat."},
                {"id": "t15", "speakerId": "p4", "timestamp": 115, "text": "Let me outline the budget. We're requesting a 25% increase in engineering headcount — that's 12 additional hires across backend, frontend, and platform teams. Total Q4 budget is $2.8M."},
                {"id": "t16", "speakerId": "p3", "timestamp": 125, "text": "Given our Q3 performance and the pipeline we have, I think this investment is well justified. The enterprise pipeline alone could support $800K in additional ARR."},
                {"id": "t17", "speakerId": "p1", "timestamp": 135, "text": "One more decision we need to make — the mobile app. Do we prioritize it in Q4 or push to Q1?"},
                {"id": "t18", "speakerId": "p5", "timestamp": 142, "text": "I vote Q1. Our web experience still has gaps that need fixing. Let's not spread ourselves too thin."},
                {"id": "t19", "speakerId": "p6", "timestamp": 148, "text": "I agree. The mobile app can wait. Our users are primarily on desktop anyway."},
                {"id": "t20", "speakerId": "p1", "timestamp": 155, "text": "Alright, consensus. Mobile app moves to Q1. Let me summarize our decisions for the group."},
            ],
            "actionItems": [
                {"id": "a1", "title": "Finalize enterprise tier pricing page", "assignee": "Sarah Chen", "dueDate": "2026-09-25", "status": "pending", "sourceTimestamp": 48},
                {"id": "a2", "title": "Launch API platform v2 beta", "assignee": "David Kim", "dueDate": "2026-09-28", "status": "pending", "sourceTimestamp": 75},
                {"id": "a3", "title": "Prepare onboarding redesign specs", "assignee": "Alex Rivera", "dueDate": "2026-09-27", "status": "pending", "sourceTimestamp": 35},
                {"id": "a4", "title": "Submit hiring reqs for 12 new engineers", "assignee": "Priya Sharma", "dueDate": "2026-09-30", "status": "pending", "sourceTimestamp": 115},
                {"id": "a5", "title": "Competitive analysis of Movenant", "assignee": "Lisa Thompson", "dueDate": "2026-10-01", "status": "pending", "sourceTimestamp": 85},
                {"id": "a6", "title": "Q4 budget proposal to board", "assignee": "Sarah Chen", "dueDate": "2026-09-26", "status": "pending", "sourceTimestamp": 155},
            ],
            "highlights": [
                {"id": "h1", "timestamp": 18, "title": "Enterprise MRR Growth", "description": "Enterprise MRR grew from $340K to $520K — a 53% increase quarter over quarter.", "speaker": "Mukul Rana", "type": "milestone"},
                {"id": "h2", "timestamp": 48, "description": "Onboarding funnel shows 60% drop-off at integration step.", "title": "Onboarding Drop-off Identified", "speaker": "Elena Rodriguez", "type": "insight"},
                {"id": "h3", "timestamp": 120, "title": "API v2 November Target", "description": "API platform v2 targeted for November 15 with webhooks and batch operations.", "speaker": "Alex Rivera", "type": "decision"},
                {"id": "h4", "timestamp": 180, "title": "Mobile Deprioritized", "description": "Mobile app development moved to Q1 2027 to focus on core platform.", "speaker": "Sarah Chen", "type": "decision"},
            ],
        },
        # Meeting 2: Weekly Engineering Sync
        {
            "id": "2",
            "title": "Weekly Engineering Sync",
            "date": "2026-09-19T10:00:00Z",
            "duration": 32,
            "meetingType": "engineering",
            "participants": [
                {"id": "p2", "name": "Alex Rivera", "email": "alex@company.com", "initials": "AR", "avatar": "AR"},
                {"id": "p3", "name": "Mukul Rana", "email": "mukul@company.com", "initials": "MR", "avatar": "MR"},
                {"id": "p7", "name": "David Kim", "email": "david@company.com", "initials": "DK", "avatar": "DK"},
                {"id": "p9", "name": "Rachel Lee", "email": "rachel@company.com", "initials": "RL", "avatar": "RL"},
            ],
            "summary": {
                "executive": "Engineering sync covered sprint progress, identified two blocking issues, and aligned on priorities for the upcoming sprint. The team is on track for the API v2 release.",
                "sentiment": "positive",
                "keyTopics": ["Sprint Progress", "API v2 Beta", "Database Migration", "CI/CD Pipeline", "Blockers"],
                "decisions": [
                    "API v2 beta ships September 28",
                    "Database migration postponed to next sprint",
                    "CI/CD pipeline migration to GitHub Actions approved",
                ],
                "discussionPoints": [
                    "Sprint velocity is 15% above target",
                    "Two blockers identified: auth service refactor and database schema change",
                    "CI/CD pipeline migration will save approximately 4 hours per week in build times",
                    "Team requested additional monitoring tooling for the API platform",
                ],
            },
            "transcript": [
                {"id": "t1", "speakerId": "p2", "timestamp": 0, "text": "Hey team, let's run through our sprint progress. I think we're in good shape overall."},
                {"id": "t2", "speakerId": "p7", "timestamp": 8, "text": "API v2 is ready for beta. We've completed the rate limiting, webhooks, and the new SDK. Ready for testing next week."},
                {"id": "t3", "speakerId": "p3", "timestamp": 15, "text": "The database migration is still a blocker. We need to coordinate with the DBA team before we can proceed."},
                {"id": "t4", "speakerId": "p9", "timestamp": 22, "text": "I can help with that. I'll reach out to the DBA team today and get a timeline for the migration window."},
                {"id": "t5", "speakerId": "p2", "timestamp": 28, "text": "Good. Let's also talk about CI/CD. I want to migrate from our current pipeline to GitHub Actions."},
                {"id": "t6", "speakerId": "p7", "timestamp": 35, "text": "Makes sense. The current Jenkins setup is getting unwieldy. GitHub Actions would be cleaner."},
            ],
            "actionItems": [
                {"id": "a1", "title": "Contact DBA team for migration timeline", "assignee": "Rachel Lee", "dueDate": "2026-09-22", "status": "pending", "sourceTimestamp": 22},
                {"id": "a2", "title": "Begin GitHub Actions migration", "assignee": "Alex Rivera", "dueDate": "2026-09-30", "status": "pending", "sourceTimestamp": 28},
                {"id": "a3", "title": "Prepare API v2 beta test plan", "assignee": "David Kim", "dueDate": "2026-09-25", "status": "pending", "sourceTimestamp": 8},
            ],
            "highlights": [
                {"id": "h1", "timestamp": 8, "title": "API v2 Ready for Beta", "description": "Rate limiting, webhooks, and SDK complete — beta testing starts next week.", "speaker": "David Kim", "type": "milestone"},
                {"id": "h2", "timestamp": 28, "title": "CI/CD Migration Decision", "description": "Team approved migration to GitHub Actions for cleaner pipeline management.", "speaker": "Alex Rivera", "type": "decision"},
            ],
        },
        # Meeting 3: Enterprise Sales Discovery Call
        {
            "id": "3",
            "title": "Enterprise Sales Discovery Call",
            "date": "2026-09-18T16:00:00Z",
            "duration": 45,
            "meetingType": "sales",
            "participants": [
                {"id": "p5", "name": "James Wilson", "email": "james@company.com", "initials": "JW", "avatar": "JW"},
                {"id": "p6", "name": "Elena Rodriguez", "email": "elena@company.com", "initials": "ER", "avatar": "ER"},
                {"id": "p10", "name": "Michael Foster", "email": "michael@client.com", "initials": "MF", "avatar": "MF"},
                {"id": "p11", "name": "Anna Kowalski", "email": "anna@client.com", "initials": "AK", "avatar": "AK"},
            ],
            "summary": {
                "executive": "Discovery call with Meridian Corp revealed strong interest in the enterprise tier. Michael and Anna expressed need for SSO, audit logs, and dedicated support. Budget of $50K/year is approved. Proposal to be sent by end of week.",
                "sentiment": "positive",
                "keyTopics": ["Enterprise Requirements", "SSO & Security", "Budget Discussion", "Timeline", "Integration Needs"],
                "decisions": [
                    "Proposal for $49K/year enterprise plan to be sent by Friday",
                    "SSO with SAML 2.0 identified as critical requirement",
                    "Pilot program proposed for 30-day evaluation before full contract",
                ],
                "discussionPoints": [
                    "Meridian has 200 employees currently using the basic plan",
                    "Current pain point: lack of audit trails for compliance",
                    "Anna's team evaluated three competing products — we won on API flexibility",
                    "Michael wants to start with 50 seats and scale to 200 by Q1",
                    "Integration with their existing Salesforce instance is required",
                ],
            },
            "transcript": [
                {"id": "t1", "speakerId": "p10", "timestamp": 0, "text": "Thanks for taking the time today. We're looking to upgrade our entire team to an enterprise solution."},
                {"id": "t2", "speakerId": "p6", "timestamp": 8, "text": "We appreciate the interest, Michael. Can you tell us more about your current setup and pain points?"},
                {"id": "t3", "speakerId": "p11", "timestamp": 15, "text": "Right now we have about 50 people on the basic plan. The biggest issue is compliance — we need audit trails for every action in the system."},
                {"id": "t4", "speakerId": "p5", "timestamp": 22, "text": "That's exactly what our enterprise tier provides. Full audit logs, SSO through SAML 2.0, and dedicated support."},
                {"id": "t5", "speakerId": "p10", "timestamp": 30, "text": "We also looked at CompetitorX and CompetitorY. Your API flexibility is what stood out to us. We have complex integration needs with Salesforce."},
                {"id": "t6", "speakerId": "p6", "timestamp": 38, "text": "Our REST API and webhook system should handle that integration smoothly. I can connect you with our solutions engineer to map out the integration."},
            ],
            "actionItems": [
                {"id": "a1", "title": "Send enterprise proposal to Meridian Corp", "assignee": "Elena Rodriguez", "dueDate": "2026-09-22", "status": "pending", "sourceTimestamp": 38},
                {"id": "a2", "title": "Schedule solutions engineering call for Salesforce integration", "assignee": "James Wilson", "dueDate": "2026-09-25", "status": "pending", "sourceTimestamp": 38},
                {"id": "a3", "title": "Prepare custom SSO setup documentation", "assignee": "Elena Rodriguez", "dueDate": "2026-09-24", "status": "pending", "sourceTimestamp": 22},
            ],
            "highlights": [
                {"id": "h1", "timestamp": 15, "title": "Compliance Need Identified", "description": "Meridian needs full audit trails for compliance — enterprise tier addresses this directly.", "speaker": "Anna Kowalski", "type": "insight"},
                {"id": "h2", "timestamp": 30, "title": "Competitive Win on API", "description": "Meridian chose us over competitors due to superior API flexibility.", "speaker": "Michael Foster", "type": "insight"},
            ],
        },
        # Meeting 4: Customer Discovery: Onboarding Flow
        {
            "id": "4",
            "title": "Customer Discovery: Onboarding Flow",
            "date": "2026-09-17T11:00:00Z",
            "duration": 38,
            "meetingType": "customer",
            "participants": [
                {"id": "p4", "name": "Priya Sharma", "email": "priya@company.com", "initials": "PS", "avatar": "PS"},
                {"id": "p8", "name": "Lisa Thompson", "email": "lisa@company.com", "initials": "LT", "avatar": "LT"},
                {"id": "p12", "name": "Tom Henderson", "email": "tom@client.com", "initials": "TH", "avatar": "TH"},
                {"id": "p13", "name": "Nina Patel", "email": "nina@client.com", "initials": "NP", "avatar": "NP"},
            ],
            "summary": {
                "executive": "Customer discovery session with two power users revealed that the onboarding flow is too complex for non-technical users. Tom and Nina suggested a guided setup wizard and interactive tutorials. Both agreed to participate in a beta test of the redesigned onboarding.",
                "sentiment": "positive",
                "keyTopics": ["Onboarding Pain Points", "Guided Setup Wizard", "Interactive Tutorials", "Beta Testing", "User Experience"],
                "decisions": [
                    "Redesigned onboarding with guided wizard approved",
                    "Interactive tutorials to be added to first-time user flow",
                    "Tom and Nina to participate in beta test starting October 1",
                ],
                "discussionPoints": [
                    "Current onboarding has 7 steps — users drop off at step 3",
                    "Non-technical users struggle with API key configuration",
                    "Suggested adding a 'skip for now' option for advanced settings",
                    "Interactive demos could reduce support ticket volume by 30%",
                    "Both users requested mobile-responsive onboarding experience",
                ],
            },
            "transcript": [
                {"id": "t1", "speakerId": "p4", "timestamp": 0, "text": "Thanks for joining us today, Tom and Nina. We really value your feedback on the onboarding experience."},
                {"id": "t2", "speakerId": "p12", "timestamp": 8, "text": "Happy to help. I'll be honest — the onboarding felt overwhelming when I first signed up. Seven steps is a lot."},
                {"id": "t3", "speakerId": "p13", "timestamp": 15, "text": "I agree. The API key setup tripped me up. I'm not a developer, so having to generate and configure that was frustrating."},
                {"id": "t4", "speakerId": "p8", "timestamp": 22, "text": "That's really valuable feedback. We're exploring a guided setup wizard that walks users through each step. What would make that work better for you?"},
                {"id": "t5", "speakerId": "p12", "timestamp": 30, "text": "Maybe add a 'skip for now' option on the advanced settings. Let me get started with the basics first."},
                {"id": "t6", "speakerId": "p13", "timestamp": 38, "text": "And interactive tutorials would be great. Like a guided tour that shows me what each feature does as I encounter it."},
            ],
            "actionItems": [
                {"id": "a1", "title": "Design guided onboarding wizard mockups", "assignee": "Lisa Thompson", "dueDate": "2026-09-25", "status": "pending", "sourceTimestamp": 22},
                {"id": "a2", "title": "Plan beta test with Tom and Nina", "assignee": "Priya Sharma", "dueDate": "2026-09-29", "status": "pending", "sourceTimestamp": 38},
                {"id": "a3", "title": "Research interactive tutorial tools", "assignee": "Lisa Thompson", "dueDate": "2026-09-27", "status": "pending", "sourceTimestamp": 38},
            ],
            "highlights": [
                {"id": "h1", "timestamp": 15, "title": "Onboarding Drop-off Identified", "description": "Users drop off at step 3 of 7-step onboarding — needs simplification.", "speaker": "Tom Henderson", "type": "insight"},
                {"id": "h2", "timestamp": 30, "title": "Skip-for-Now Pattern", "description": "Users want ability to skip advanced settings and return later.", "speaker": "Tom Henderson", "type": "insight"},
            ],
        },
        # Meeting 5: Design Review: Dashboard Redesign
        {
            "id": "5",
            "title": "Design Review: Dashboard Redesign",
            "date": "2026-09-16T15:00:00Z",
            "duration": 28,
            "meetingType": "design",
            "participants": [
                {"id": "p8", "name": "Lisa Thompson", "email": "lisa@company.com", "initials": "LT", "avatar": "LT"},
                {"id": "p9", "name": "Rachel Lee", "email": "rachel@company.com", "initials": "RL", "avatar": "RL"},
                {"id": "p3", "name": "Mukul Rana", "email": "mukul@company.com", "initials": "MR", "avatar": "MR"},
            ],
            "summary": {
                "executive": "Design review of the dashboard redesign mockups. Lisa presented three layout options. The team selected Option B with minor modifications. Key feedback included improving data visualization density and adding customizable widgets.",
                "sentiment": "neutral",
                "keyTopics": ["Dashboard Layout", "Data Visualization", "Customizable Widgets", "Color Accessibility", "Mobile Responsiveness"],
                "decisions": [
                    "Option B selected as base layout",
                    "Customizable widget system approved for Q1",
                    "Color contrast improvements needed for accessibility compliance",
                ],
                "discussionPoints": [
                    "Option A was too sparse, Option C was too dense",
                    "Option B hits the right balance with room for customization",
                    "Team raised concerns about chart readability on smaller screens",
                    "Dark mode support was discussed as a priority",
                ],
            },
            "transcript": [
                {"id": "t1", "speakerId": "p8", "timestamp": 0, "text": "I've prepared three layout options for the dashboard redesign. Let me walk through each one."},
                {"id": "t2", "speakerId": "p3", "timestamp": 10, "text": "Option A feels too sparse. We need more information density for power users."},
                {"id": "t3", "speakerId": "p9", "timestamp": 15, "text": "Option C is overwhelming. Too much happening at once. Option B seems like the sweet spot."},
                {"id": "t4", "speakerId": "p8", "timestamp": 22, "text": "I agree. Let's go with Option B as the base, but I want to add customizable widgets so users can configure their own layout."},
            ],
            "actionItems": [
                {"id": "a1", "title": "Create Option B high-fidelity mockups", "assignee": "Lisa Thompson", "dueDate": "2026-09-23", "status": "pending", "sourceTimestamp": 22},
                {"id": "a2", "title": "Run accessibility audit on new color palette", "assignee": "Rachel Lee", "dueDate": "2026-09-26", "status": "pending", "sourceTimestamp": 22},
            ],
            "highlights": [
                {"id": "h1", "timestamp": 15, "title": "Layout Decision", "description": "Option B selected as the base dashboard layout with customizable widgets.", "speaker": "Lisa Thompson", "type": "decision"},
            ],
        },
        # Meeting 6: Sprint Planning
        {
            "id": "6",
            "title": "Sprint Planning — Week of Sep 15",
            "date": "2026-09-15T09:00:00Z",
            "duration": 25,
            "meetingType": "engineering",
            "participants": [
                {"id": "p2", "name": "Alex Rivera", "email": "alex@company.com", "initials": "AR", "avatar": "AR"},
                {"id": "p3", "name": "Mukul Rana", "email": "mukul@company.com", "initials": "MR", "avatar": "MR"},
                {"id": "p7", "name": "David Kim", "email": "david@company.com", "initials": "DK", "avatar": "DK"},
                {"id": "p9", "name": "Rachel Lee", "email": "rachel@company.com", "initials": "RL", "avatar": "RL"},
            ],
            "summary": {
                "executive": "Sprint planning for week of September 15. Team committed to 34 story points. Key deliverables: API v2 beta, database migration completion, and onboarding wizard design. No blockers anticipated.",
                "sentiment": "positive",
                "keyTopics": ["Sprint Capacity", "Story Points", "API v2 Beta", "Database Migration", "Onboarding Wizard"],
                "decisions": [
                    "34 story points committed for the sprint",
                    "API v2 beta is the top priority",
                    "Database migration scheduled for Wednesday",
                ],
                "discussionPoints": [
                    "Team capacity is 6 engineers this sprint",
                    "Rachel will focus on frontend for onboarding wizard",
                    "David leading API v2 beta with support from Mukul",
                    "Database migration requires maintenance window Wednesday night",
                ],
            },
            "transcript": [
                {"id": "t1", "speakerId": "p2", "timestamp": 0, "text": "Let's plan this sprint. We have six engineers available. What can we commit to?"},
                {"id": "t2", "speakerId": "p7", "timestamp": 8, "text": "API v2 beta is my top priority. I estimate 13 story points for that."},
                {"id": "t3", "speakerId": "p9", "timestamp": 15, "text": "I'll work on the onboarding wizard design. About 8 story points."},
                {"id": "t4", "speakerId": "p3", "timestamp": 22, "text": "I can support David on the API work and also handle the database migration. Maybe 10 points combined."},
            ],
            "actionItems": [
                {"id": "a1", "title": "Schedule Wednesday maintenance window for DB migration", "assignee": "David Kim", "dueDate": "2026-09-17", "status": "pending", "sourceTimestamp": 22},
                {"id": "a2", "title": "Create onboarding wizard design tickets", "assignee": "Rachel Lee", "dueDate": "2026-09-16", "status": "pending", "sourceTimestamp": 15},
            ],
            "highlights": [
                {"id": "h1", "timestamp": 8, "title": "API v2 Beta Commitment", "description": "13 story points committed for API v2 beta delivery.", "speaker": "David Kim", "type": "milestone"},
            ],
        },
        # Meeting 7: Product Roadmap Review
        {
            "id": "7",
            "title": "Product Roadmap Review",
            "date": "2026-09-14T13:00:00Z",
            "duration": 42,
            "meetingType": "product",
            "participants": [
                {"id": "p1", "name": "Sarah Chen", "email": "sarah@company.com", "initials": "SC", "avatar": "SC"},
                {"id": "p3", "name": "Mukul Rana", "email": "mukul@company.com", "initials": "MR", "avatar": "MR"},
                {"id": "p4", "name": "Priya Sharma", "email": "priya@company.com", "initials": "PS", "avatar": "PS"},
                {"id": "p8", "name": "Lisa Thompson", "email": "lisa@company.com", "initials": "LT", "avatar": "LT"},
            ],
            "summary": {
                "executive": "Product roadmap review covered Q4 priorities and Q1 planning. Team aligned on three pillars: enterprise growth, platform extensibility, and user experience. Each pillar has 2-3 concrete initiatives with owners assigned.",
                "sentiment": "positive",
                "keyTopics": ["Q4 Pillars", "Enterprise Growth", "Platform Extensibility", "User Experience", "Q1 Planning"],
                "decisions": [
                    "Enterprise growth is Q4 top priority",
                    "Platform extensibility (API v2, integrations) is second pillar",
                    "User experience improvements (onboarding, dashboard) is third pillar",
                    "Q1 planning to include mobile app evaluation",
                ],
                "discussionPoints": [
                    "Enterprise segment showing strongest growth trajectory",
                    "API platform needs better documentation and SDK improvements",
                    "Mobile app request is growing but deprioritized for now",
                    "Need to invest in better analytics for product decisions",
                ],
            },
            "transcript": [
                {"id": "t1", "speakerId": "p1", "timestamp": 0, "text": "Let's review the product roadmap. I want to make sure we're aligned on Q4 priorities before we finalize."},
                {"id": "t2", "speakerId": "p3", "timestamp": 10, "text": "I see three clear pillars: enterprise growth, platform extensibility, and user experience. Each needs dedicated focus."},
                {"id": "t3", "speakerId": "p4", "timestamp": 18, "text": "Enterprise is definitely our strongest opportunity right now. The pipeline is healthy."},
                {"id": "t4", "speakerId": "p8", "timestamp": 25, "text": "From a UX perspective, the onboarding and dashboard redesigns will make a huge difference in perceived value."},
                {"id": "t5", "speakerId": "p1", "timestamp": 35, "text": "Agreed. Let's lock in these three pillars and assign owners for each initiative."},
            ],
            "actionItems": [
                {"id": "a1", "title": "Draft detailed roadmap document", "assignee": "Mukul Rana", "dueDate": "2026-09-18", "status": "pending", "sourceTimestamp": 35},
                {"id": "a2", "title": "Set up OKR tracking for Q4 pillars", "assignee": "Priya Sharma", "dueDate": "2026-09-20", "status": "pending", "sourceTimestamp": 10},
            ],
            "highlights": [
                {"id": "h1", "timestamp": 10, "title": "Three Pillars Defined", "description": "Enterprise growth, platform extensibility, and user experience identified as Q4 pillars.", "speaker": "Mukul Rana", "type": "decision"},
            ],
        },
        # Meeting 8: Customer Success Check-in
        {
            "id": "8",
            "title": "Customer Success Check-in",
            "date": "2026-09-13T10:00:00Z",
            "duration": 20,
            "meetingType": "customer",
            "participants": [
                {"id": "p6", "name": "Elena Rodriguez", "email": "elena@company.com", "initials": "ER", "avatar": "ER"},
                {"id": "p12", "name": "Tom Henderson", "email": "tom@client.com", "initials": "TH", "avatar": "TH"},
            ],
            "summary": {
                "executive": "Quick check-in with Tom Henderson showed high satisfaction with the product. Tom reported that the recent onboarding improvements have reduced his team's time-to-value significantly. No escalations or issues reported.",
                "sentiment": "positive",
                "keyTopics": ["Product Satisfaction", "Onboarding Improvements", "Feature Requests", "Expansion Discussion"],
                "decisions": [
                    "Tom interested in expanding to 100 seats in Q1",
                    "Feature request for bulk export prioritized for next sprint",
                ],
                "discussionPoints": [
                    "Team onboarding time reduced from 3 days to 1 day",
                    "Tom requested bulk export functionality for reporting",
                    "No pain points with current feature set",
                    "Interested in early access to the enterprise tier",
                ],
            },
            "transcript": [
                {"id": "t1", "speakerId": "p6", "timestamp": 0, "text": "Hey Tom, just wanted to check in and see how things are going on your end."},
                {"id": "t2", "speakerId": "p12", "timestamp": 8, "text": "Really well, actually. The onboarding improvements you shipped last month made a huge difference. Our team is up and running in a day now instead of three."},
                {"id": "t3", "speakerId": "p6", "timestamp": 15, "text": "That's great to hear! Is there anything else you need from us?"},
            ],
            "actionItems": [
                {"id": "a1", "title": "Add bulk export to roadmap", "assignee": "Elena Rodriguez", "dueDate": "2026-09-20", "status": "pending", "sourceTimestamp": 15},
            ],
            "highlights": [
                {"id": "h1", "timestamp": 8, "title": "Onboarding Success", "description": "Customer reported onboarding time reduced from 3 days to 1 day.", "speaker": "Tom Henderson", "type": "milestone"},
            ],
        },
        # Meeting 9: Engineering Hiring Panel
        {
            "id": "9",
            "title": "Engineering Hiring Panel — Senior Backend",
            "date": "2026-09-12T14:00:00Z",
            "duration": 55,
            "meetingType": "hiring",
            "participants": [
                {"id": "p3", "name": "Mukul Rana", "email": "mukul@company.com", "initials": "MR", "avatar": "MR"},
                {"id": "p7", "name": "David Kim", "email": "david@company.com", "initials": "DK", "avatar": "DK"},
                {"id": "p14", "name": "Rachel Chen", "email": "rachel@company.com", "initials": "RC", "avatar": "RC"},
                {"id": "p15", "name": "Candidate: Jordan Lee", "email": "jordan@email.com", "initials": "JL", "avatar": "JL"},
            ],
            "summary": {
                "executive": "Interview with Jordan Lee for Senior Backend Engineer role. Strong technical skills in distributed systems and API design. Good culture fit. Recommendation: proceed to final round with system design exercise.",
                "sentiment": "positive",
                "keyTopics": ["Distributed Systems", "API Design", "System Design", "Culture Fit", "Compensation Expectations"],
                "decisions": [
                    "Proceed to final round with system design exercise",
                    "Salary range discussion: $180K-$220K is within expectations",
                    "Final round scheduled for September 18",
                ],
                "discussionPoints": [
                    "Jordan has 7 years of backend experience at two successful startups",
                    "Strong track record with Go and TypeScript",
                    "Led migration from monolith to microservices at previous company",
                    "Compensation expectations align with our senior band",
                    "Available to start within 2 weeks",
                ],
            },
            "transcript": [
                {"id": "t1", "speakerId": "p3", "timestamp": 0, "text": "Thanks for joining us today, Jordan. Let's start with your experience with distributed systems."},
                {"id": "t2", "speakerId": "p15", "timestamp": 8, "text": "I've spent the last four years building distributed systems at TechCorp. We went from a monolith handling 10K requests to a microservices architecture handling 500K requests per second."},
                {"id": "t3", "speakerId": "p7", "timestamp": 18, "text": "That's impressive. What was the most challenging part of that migration?"},
                {"id": "t4", "speakerId": "p15", "timestamp": 25, "text": "Managing data consistency across services. We ended up using event sourcing with Kafka, which gave us eventual consistency without sacrificing too much on read latency."},
                {"id": "t5", "speakerId": "p14", "timestamp": 35, "text": "How do you approach API design? We've been struggling with versioning as our API grows."},
                {"id": "t6", "speakerId": "p15", "timestamp": 42, "text": "I prefer URL versioning for public APIs and header versioning for internal ones. The key is never breaking existing contracts. We used OpenAPI specs extensively."},
            ],
            "actionItems": [
                {"id": "a1", "title": "Schedule system design final round", "assignee": "Rachel Chen", "dueDate": "2026-09-14", "status": "pending", "sourceTimestamp": 42},
                {"id": "a2", "title": "Send Jordan the system design problem statement", "assignee": "Mukul Rana", "dueDate": "2026-09-16", "status": "pending", "sourceTimestamp": 42},
            ],
            "highlights": [
                {"id": "h1", "timestamp": 25, "title": "Event Sourcing Expertise", "description": "Jordan led migration to event sourcing with Kafka, handling 500K RPS.", "speaker": "Jordan Lee", "type": "insight"},
                {"id": "h2", "timestamp": 42, "title": "API Versioning Philosophy", "description": "Prefers URL versioning for public APIs, header for internal — never break contracts.", "speaker": "Jordan Lee", "type": "insight"},
            ],
        },
        # Meeting 10: Design Systems Sync
        {
            "id": "10",
            "title": "Design Systems Sync",
            "date": "2026-09-11T11:00:00Z",
            "duration": 22,
            "meetingType": "design",
            "participants": [
                {"id": "p8", "name": "Lisa Thompson", "email": "lisa@company.com", "initials": "LT", "avatar": "LT"},
                {"id": "p9", "name": "Rachel Lee", "email": "rachel@company.com", "initials": "RL", "avatar": "RL"},
                {"id": "p13", "name": "Nina Patel", "email": "nina@client.com", "initials": "NP", "avatar": "NP"},
            ],
            "summary": {
                "executive": "Design systems sync reviewed component library status, discussed token system improvements, and planned the component audit for next month. Rachel presented progress on the new button and form components.",
                "sentiment": "neutral",
                "keyTopics": ["Component Library", "Design Tokens", "Accessibility", "Documentation", "Component Audit"],
                "decisions": [
                    "New token system to be implemented this quarter",
                    "Component audit scheduled for October",
                    "Storybook migration to Vite approved",
                ],
                "discussionPoints": [
                    "Current component library has 45 components",
                    "Token system needs better naming conventions",
                    "Accessibility audit revealed 3 components failing WCAG standards",
                    "Storybook migration will improve documentation workflow",
                ],
            },
            "transcript": [
                {"id": "t1", "speakerId": "p8", "timestamp": 0, "text": "Let's review the design system progress. Rachel, want to start with the new components?"},
                {"id": "t2", "speakerId": "p9", "timestamp": 8, "text": "Sure. I've rebuilt the button and form components with the new token system. They're much more flexible now."},
                {"id": "t3", "speakerId": "p8", "timestamp": 15, "text": "The token naming is still inconsistent though. Let's agree on a convention before we go further."},
                {"id": "t4", "speakerId": "p13", "timestamp": 22, "text": "I suggest we use semantic naming — color-primary, color-error, spacing-md. That's what works best in my experience."},
            ],
            "actionItems": [
                {"id": "a1", "title": "Finalize token naming convention", "assignee": "Lisa Thompson", "dueDate": "2026-09-18", "status": "pending", "sourceTimestamp": 15},
                {"id": "a2", "title": "Fix WCAG accessibility issues", "assignee": "Rachel Lee", "dueDate": "2026-09-22", "status": "pending", "sourceTimestamp": 8},
            ],
            "highlights": [
                {"id": "h1", "timestamp": 22, "title": "Token Naming Decision", "description": "Semantic naming convention agreed upon for the design token system.", "speaker": "Nina Patel", "type": "decision"},
            ],
        },
        # Meeting 11: Investor Update
        {
            "id": "11",
            "title": "Investor Update — Series B Metrics",
            "date": "2026-09-10T09:00:00Z",
            "duration": 62,
            "meetingType": "strategy",
            "participants": [
                {"id": "p1", "name": "Sarah Chen", "email": "sarah@company.com", "initials": "SC", "avatar": "SC"},
                {"id": "p3", "name": "Mukul Rana", "email": "mukul@company.com", "initials": "MR", "avatar": "MR"},
                {"id": "p4", "name": "Priya Sharma", "email": "priya@company.com", "initials": "PS", "avatar": "PS"},
                {"id": "p16", "name": "David Park", "email": "david@vc.com", "initials": "DP", "avatar": "DP"},
                {"id": "p17", "name": "Lisa Wang", "email": "lisa@vc.com", "initials": "LW", "avatar": "LW"},
            ],
            "summary": {
                "executive": "Quarterly investor update presented Series B metrics. ARR grew 85% YoY to $8.2M. NRR at 142%. Team plans to raise Series B in Q1 2027 targeting $25M-$30M. Investors expressed strong confidence in the trajectory.",
                "sentiment": "positive",
                "keyTopics": ["ARR Growth", "Net Revenue Retention", "Series B Timeline", "Market Opportunity", "Competitive Position"],
                "decisions": [
                    "Series B target: $25M-$30M in Q1 2027",
                    "Hiring plan approved: 40 new employees by end of Q4",
                    "International expansion to EU market approved for Q2",
                ],
                "discussionPoints": [
                    "ARR grew 85% YoY, now at $8.2M",
                    "NRR at 142% — top quartile for SaaS companies",
                    "Customer count grew from 1,200 to 2,800",
                    "Enterprise segment now represents 45% of ARR",
                    "Market opportunity estimated at $12B globally",
                ],
            },
            "transcript": [
                {"id": "t1", "speakerId": "p1", "timestamp": 0, "text": "Welcome David and Lisa. Let me walk you through our Q3 metrics and discuss the Series B timeline."},
                {"id": "t2", "speakerId": "p3", "timestamp": 10, "text": "ARR is now $8.2M, up 85% year over year. Our NRR is 142%, which puts us in the top quartile."},
                {"id": "t3", "speakerId": "p4", "timestamp": 20, "text": "Customer count grew from 1,200 to 2,800. Enterprise customers now represent 45% of our ARR."},
                {"id": "t4", "speakerId": "p16", "timestamp": 30, "text": "These are strong numbers. What's your Series B timeline?"},
                {"id": "t5", "speakerId": "p1", "timestamp": 38, "text": "We're targeting Q1 2027 for Series B. We're looking at $25M-$30M to fund international expansion and accelerate hiring."},
                {"id": "t6", "speakerId": "p17", "timestamp": 50, "text": "The market opportunity is substantial. Global TAM is $12B and you're well positioned in the enterprise segment."},
            ],
            "actionItems": [
                {"id": "a1", "title": "Prepare Series B pitch deck", "assignee": "Sarah Chen", "dueDate": "2026-10-15", "status": "pending", "sourceTimestamp": 38},
                {"id": "a2", "title": "Finalize EU expansion plan", "assignee": "Priya Sharma", "dueDate": "2026-10-01", "status": "pending", "sourceTimestamp": 50},
            ],
            "highlights": [
                {"id": "h1", "timestamp": 10, "title": "ARR Milestone", "description": "ARR reached $8.2M with 85% YoY growth — strong Series B positioning.", "speaker": "Mukul Rana", "type": "milestone"},
                {"id": "h2", "timestamp": 30, "title": "Series B Interest", "description": "Investors expressed strong interest in Series B opportunity.", "speaker": "David Park", "type": "insight"},
            ],
        },
        # Meeting 12: Weekly Team Standup
        {
            "id": "12",
            "title": "Weekly Team Standup",
            "date": "2026-09-19T09:00:00Z",
            "duration": 15,
            "meetingType": "team",
            "participants": [
                {"id": "p2", "name": "Alex Rivera", "email": "alex@company.com", "initials": "AR", "avatar": "AR"},
                {"id": "p3", "name": "Mukul Rana", "email": "mukul@company.com", "initials": "MR", "avatar": "MR"},
                {"id": "p7", "name": "David Kim", "email": "david@company.com", "initials": "DK", "avatar": "DK"},
                {"id": "p9", "name": "Rachel Lee", "email": "rachel@company.com", "initials": "RL", "avatar": "RL"},
                {"id": "p4", "name": "Priya Sharma", "email": "priya@company.com", "initials": "PS", "avatar": "PS"},
            ],
            "summary": {
                "executive": "Quick team standup. No blockers. Team is focused on API v2 beta, onboarding redesign, and dashboard improvements. All sprint goals on track.",
                "sentiment": "positive",
                "keyTopics": ["Sprint Status", "API v2 Beta", "Onboarding Redesign", "No Blockers"],
                "decisions": [
                    "All priorities remain unchanged",
                    "No new items added to sprint",
                ],
                "discussionPoints": [
                    "API v2 beta on track for September 28",
                    "Onboarding redesign mockups in progress",
                    "No blockers this week",
                ],
            },
            "transcript": [
                {"id": "t1", "speakerId": "p2", "timestamp": 0, "text": "Quick standup. API v2 beta is on track. No blockers on my end."},
                {"id": "t2", "speakerId": "p9", "timestamp": 5, "text": "Onboarding mockups are progressing well. Should have something to show by Wednesday."},
                {"id": "t3", "speakerId": "p7", "timestamp": 10, "text": "API v2 is ready for testing. I'll share the beta link in the engineering channel."},
            ],
            "actionItems": [],
            "highlights": [],
        },
    ]


if __name__ == "__main__":
    seed_database()

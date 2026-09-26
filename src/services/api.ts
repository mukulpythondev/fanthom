import type {
  Meeting, Participant, MeetingSummary, TranscriptSegment,
  ActionItem, Highlight, ChatMessage
} from '../types'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

function initials(name: string): string {
  return name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
}

function normalizeMeeting(raw: any): Meeting {
  const backendParticipants: any[] = raw.participants || []
  const names: string[] = raw.participant_names || []
  const nameToId = new Map<string, string>()
  const participants: Participant[] = backendParticipants.length > 0
    ? backendParticipants.map((p: any) => {
        nameToId.set(p.name, p.id)
        return {
          id: p.id,
          name: p.name,
          email: p.email || '',
          initials: p.initials || initials(p.name),
          avatar: p.avatar || initials(p.name),
        }
      })
    : names.map((name, i) => {
        nameToId.set(name, `p-${i}`)
        return {
          id: `p-${i}`,
          name,
          email: name.toLowerCase().replace(/ /g, '.') + '@company.com',
          initials: initials(name),
          avatar: initials(name),
        }
      })

  const backendSummary = raw.summary || raw
  const summary: MeetingSummary = typeof backendSummary === 'string'
    ? { executive: backendSummary, keyTopics: raw.key_topics || [], decisions: (raw.decisions || []).map((d: any) => d.text), discussionPoints: [], sentiment: raw.sentiment || 'neutral' }
    : {
        executive: backendSummary?.executive || backendSummary || '',
        keyTopics: backendSummary?.keyTopics || raw.key_topics || [],
        decisions: backendSummary?.decisions || (raw.decisions || []).map((d: any) => d.text),
        discussionPoints: backendSummary?.discussionPoints || [],
        sentiment: backendSummary?.sentiment || raw.sentiment || 'neutral',
      }

  const backendTranscript: any[] = raw.transcript || []
  const backendDecisions: any[] = raw.decisions || []
  const backendActions: any[] = raw.actionItems || raw.action_items || []
  const backendHighlights: any[] = raw.highlights || []

  const transcript: TranscriptSegment[] = backendTranscript.map((t: any, i: number) => ({
    id: t.id || `ts-${i}`,
    meetingId: raw.id,
    speakerId: nameToId.get(t.speaker || '') || t.participant_id || `p-0`,
    timestamp: t.timestamp || 0,
    text: t.text || '',
  }))

  const actionItems: ActionItem[] = backendActions.map((a: any) => ({
    id: a.id,
    meetingId: raw.id,
    title: a.title,
    assignee: a.assignee,
    dueDate: a.due_date || '',
    status: a.completed ? 'completed' : 'pending',
    sourceTimestamp: a.source_timestamp || 0,
  }))

  const highlights: Highlight[] = backendHighlights.map((h: any) => ({
    id: h.id,
    meetingId: raw.id,
    timestamp: h.timestamp || 0,
    title: h.title || h.description?.slice(0, 40) || 'Highlight',
    description: h.description || '',
    speaker: h.speaker || '',
    type: h.type || 'insight',
  }))

  const decisions: { id: string; text: string; timestamp?: number }[] = backendDecisions.map((d: any) => ({
    id: d.id,
    text: d.text,
    timestamp: d.timestamp,
  }))

  return {
    id: raw.id,
    title: raw.title,
    date: raw.date,
    duration: raw.duration,
    meetingType: raw.meeting_type,
    participants,
    recording: {
      thumbnail: raw.title.split(' ').slice(0, 2).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
      duration: raw.duration,
    },
    summary,
    transcript,
    actionItems,
    highlights,
    decisions,
    template: 'standard',
    status: raw.status || 'completed',
  }
}

export async function fetchMeetings(): Promise<Meeting[]> {
  const res = await fetch('/api/meetings')
  const data = await handleResponse<{ meetings: any[] }>(res)
  return data.meetings.map(normalizeMeeting)
}

export async function fetchMeeting(id: string): Promise<Meeting> {
  const res = await fetch(`/api/meetings/${id}`)
  const raw = await handleResponse<any>(res)
  return normalizeMeeting(raw)
}

export async function fetchTranscript(meetingId: string): Promise<TranscriptSegment[]> {
  const res = await fetch(`/api/meetings/${meetingId}/transcript`)
  const data = await handleResponse<any[]>(res)
  return data.map((t: any) => ({
    id: t.id,
    meetingId: t.meeting_id || meetingId,
    speakerId: t.speaker_id || '',
    timestamp: t.timestamp,
    text: t.text,
  }))
}

export async function fetchDecisions(meetingId: string): Promise<{ id: string; text: string; timestamp?: number }[]> {
  const res = await fetch(`/api/meetings/${meetingId}/decisions`)
  const data = await handleResponse<any[]>(res)
  return data.map((d: any) => ({
    id: d.id,
    text: d.text,
    timestamp: d.timestamp,
  }))
}

export async function fetchActions(meetingId: string): Promise<ActionItem[]> {
  const res = await fetch(`/api/meetings/${meetingId}/actions`)
  const data = await handleResponse<any[]>(res)
  return data.map((a: any) => ({
    id: a.id,
    meetingId,
    title: a.title,
    assignee: a.assignee,
    dueDate: a.due_date || '',
    status: a.completed ? 'completed' : 'pending',
    sourceTimestamp: a.source_timestamp || 0,
  }))
}

export async function fetchHighlights(meetingId: string): Promise<Highlight[]> {
  const res = await fetch(`/api/meetings/${meetingId}/highlights`)
  const data = await handleResponse<any[]>(res)
  return data.map((h: any) => ({
    id: h.id,
    meetingId,
    timestamp: h.timestamp,
    title: h.title || h.description?.slice(0, 40) || 'Highlight',
    description: h.description,
    speaker: h.speaker,
    type: h.type || 'insight',
  }))
}

export async function toggleActionItemApi(meetingId: string, actionId: string, completed: boolean): Promise<ActionItem> {
  const res = await fetch(`/api/actions/${actionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  })
  const data = await handleResponse<any>(res)
  return {
    id: data.id,
    meetingId,
    title: data.title,
    assignee: data.assignee,
    dueDate: data.due_date || '',
    status: data.completed ? 'completed' : 'pending',
    sourceTimestamp: data.source_timestamp || 0,
  }
}

export async function queryMeeting(
  meetingId: string, query: string, _history: ChatMessage[]
): Promise<{ answer: string; highlights: Highlight[] }> {
  try {
    const res = await fetch(`/api/meetings/${meetingId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: query }),
    })
    const data = await handleResponse<{ answer: string; sources: any[] }>(res)
    return {
      answer: data.answer,
      highlights: [],
    }
  } catch {
    return {
      answer: 'Sorry, I couldn\'t process your question right now. Please try again later.',
      highlights: [],
    }
  }
}

export async function searchMeetings(query: string): Promise<{ meetingId: string; excerpt: string; score: number }[]> {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
    const data = await handleResponse<{ results: any[] }>(res)
    return data.results.map((r: any) => ({
      meetingId: r.meetingId || r.meeting_id,
      excerpt: r.excerpt || r.summary || '',
      score: r.score || 0,
    }))
  } catch {
    return []
  }
}

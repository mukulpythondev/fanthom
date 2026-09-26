import type {
  ActionItem,
  ChatMessage,
  Highlight,
  Meeting,
  MeetingSummary,
  Participant,
  TranscriptSegment,
} from '../types'

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const apiUrl = (path: string) => `${apiBaseUrl}${path}`

type BackendParticipant = {
  id: string
  name: string
  email?: string
  initials?: string
  avatar?: string
}

type BackendTranscript = {
  id: string
  meeting_id?: string
  participant_id?: string
  speaker?: string
  timestamp: number
  text: string
}

type BackendDecision = {
  id: string
  text: string
  timestamp?: number
}

type BackendAction = {
  id: string
  title: string
  assignee: string
  completed: boolean
  due_date?: string
  source_timestamp?: number
}

type BackendHighlight = {
  id: string
  timestamp: number
  title?: string
  description?: string
  speaker?: string
  type?: Highlight['type']
}

type BackendSummary = {
  executive?: string
  keyTopics?: string[]
  decisions?: string[]
  discussionPoints?: string[]
  sentiment?: MeetingSummary['sentiment']
}

type BackendMeeting = {
  id: string
  title: string
  date: string
  duration: number
  meeting_type: Meeting['meetingType']
  status?: Meeting['status']
  sentiment?: MeetingSummary['sentiment']
  summary?: string | BackendSummary
  key_topics?: string[]
  participant_names?: string[]
  participants?: BackendParticipant[]
  transcript?: BackendTranscript[]
  decisions?: BackendDecision[]
  action_items?: BackendAction[]
  actionItems?: BackendAction[]
  highlights?: BackendHighlight[]
}

type MeetingsResponse = {
  meetings: BackendMeeting[]
}

type SearchResult = {
  meetingId?: string
  meeting_id?: string
  excerpt?: string
  summary?: string
  score?: number
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

function initials(name: string): string {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()
}

function normalizeMeeting(raw: BackendMeeting): Meeting {
  const backendParticipants = raw.participants ?? []
  const names = raw.participant_names ?? []
  const nameToId = new Map<string, string>()
  const participants: Participant[] = backendParticipants.length > 0
    ? backendParticipants.map(participant => {
        nameToId.set(participant.name, participant.id)
        return {
          id: participant.id,
          name: participant.name,
          email: participant.email ?? '',
          initials: participant.initials ?? initials(participant.name),
          avatar: participant.avatar ?? initials(participant.name),
        }
      })
    : names.map((name, index) => {
        nameToId.set(name, `p-${index}`)
        return {
          id: `p-${index}`,
          name,
          email: '',
          initials: initials(name),
          avatar: initials(name),
        }
      })

  const backendSummary = raw.summary ?? {}
  const summary: MeetingSummary = typeof backendSummary === 'string'
    ? {
        executive: backendSummary,
        keyTopics: raw.key_topics ?? [],
        decisions: (raw.decisions ?? []).map(decision => decision.text),
        discussionPoints: [],
        sentiment: raw.sentiment ?? 'neutral',
      }
    : {
        executive: backendSummary.executive ?? '',
        keyTopics: backendSummary.keyTopics ?? raw.key_topics ?? [],
        decisions: backendSummary.decisions ?? (raw.decisions ?? []).map(decision => decision.text),
        discussionPoints: backendSummary.discussionPoints ?? [],
        sentiment: backendSummary.sentiment ?? raw.sentiment ?? 'neutral',
      }

  const transcript: TranscriptSegment[] = (raw.transcript ?? []).map((segment, index) => ({
    id: segment.id || `ts-${index}`,
    meetingId: raw.id,
    speakerId: nameToId.get(segment.speaker ?? '') ?? segment.participant_id ?? 'p-0',
    timestamp: segment.timestamp || 0,
    text: segment.text || '',
  }))

  const actionItems: ActionItem[] = (raw.action_items ?? raw.actionItems ?? []).map(action => ({
    id: action.id,
    meetingId: raw.id,
    title: action.title,
    assignee: action.assignee,
    dueDate: action.due_date ?? '',
    status: action.completed ? 'completed' : 'pending',
    sourceTimestamp: action.source_timestamp ?? 0,
  }))

  const highlights: Highlight[] = (raw.highlights ?? []).map(highlight => ({
    id: highlight.id,
    meetingId: raw.id,
    timestamp: highlight.timestamp || 0,
    title: highlight.title ?? highlight.description?.slice(0, 40) ?? 'Highlight',
    description: highlight.description ?? '',
    speaker: highlight.speaker ?? '',
    type: highlight.type ?? 'insight',
  }))

  return {
    id: raw.id,
    title: raw.title,
    date: raw.date,
    duration: raw.duration,
    meetingType: raw.meeting_type,
    participants,
    recording: {
      thumbnail: raw.title.split(' ').slice(0, 2).map(word => word[0]).join('').slice(0, 2).toUpperCase(),
      duration: raw.duration,
    },
    summary,
    transcript,
    actionItems,
    highlights,
    decisions: (raw.decisions ?? []).map(decision => ({
      id: decision.id,
      text: decision.text,
      timestamp: decision.timestamp,
    })),
    template: 'standard',
    status: raw.status ?? 'completed',
  }
}

export async function fetchMeetings(): Promise<Meeting[]> {
  const response = await fetch(apiUrl('/api/meetings'))
  const data = await handleResponse<MeetingsResponse>(response)
  return data.meetings.map(normalizeMeeting)
}

export async function fetchMeeting(id: string): Promise<Meeting> {
  const response = await fetch(apiUrl(`/api/meetings/${id}`))
  return normalizeMeeting(await handleResponse<BackendMeeting>(response))
}

export async function fetchTranscript(meetingId: string): Promise<TranscriptSegment[]> {
  const response = await fetch(apiUrl(`/api/meetings/${meetingId}/transcript`))
  const data = await handleResponse<BackendTranscript[]>(response)
  return data.map(segment => ({
    id: segment.id,
    meetingId: segment.meeting_id ?? meetingId,
    speakerId: segment.participant_id ?? '',
    timestamp: segment.timestamp,
    text: segment.text,
  }))
}

export async function fetchDecisions(meetingId: string): Promise<{ id: string; text: string; timestamp?: number }[]> {
  const response = await fetch(apiUrl(`/api/meetings/${meetingId}/decisions`))
  return handleResponse<BackendDecision[]>(response)
}

export async function fetchActions(meetingId: string): Promise<ActionItem[]> {
  const response = await fetch(apiUrl(`/api/meetings/${meetingId}/actions`))
  const data = await handleResponse<BackendAction[]>(response)
  return data.map(action => ({
    id: action.id,
    meetingId,
    title: action.title,
    assignee: action.assignee,
    dueDate: action.due_date ?? '',
    status: action.completed ? 'completed' : 'pending',
    sourceTimestamp: action.source_timestamp ?? 0,
  }))
}

export async function fetchHighlights(meetingId: string): Promise<Highlight[]> {
  const response = await fetch(apiUrl(`/api/meetings/${meetingId}/highlights`))
  const data = await handleResponse<BackendHighlight[]>(response)
  return data.map(highlight => ({
    id: highlight.id,
    meetingId,
    timestamp: highlight.timestamp,
    title: highlight.title ?? highlight.description?.slice(0, 40) ?? 'Highlight',
    description: highlight.description ?? '',
    speaker: highlight.speaker ?? '',
    type: highlight.type ?? 'insight',
  }))
}

export async function toggleActionItemApi(meetingId: string, actionId: string, completed: boolean): Promise<ActionItem> {
  const response = await fetch(apiUrl(`/api/actions/${actionId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  })
  const data = await handleResponse<BackendAction>(response)
  return {
    id: data.id,
    meetingId,
    title: data.title,
    assignee: data.assignee,
    dueDate: data.due_date ?? '',
    status: data.completed ? 'completed' : 'pending',
    sourceTimestamp: data.source_timestamp ?? 0,
  }
}

export async function queryMeeting(
  meetingId: string,
  query: string,
  _history: ChatMessage[],
): Promise<{ answer: string; highlights: Highlight[] }> {
  const response = await fetch(apiUrl(`/api/meetings/${meetingId}/ask`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: query }),
  })
  const data = await handleResponse<{ answer: string; sources: unknown[] }>(response)
  return { answer: data.answer, highlights: [] }
}

export async function searchMeetings(query: string): Promise<{ meetingId: string; excerpt: string; score: number }[]> {
  const response = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(query)}`))
  const data = await handleResponse<{ results: SearchResult[] }>(response)
  return data.results.flatMap(result => {
    const meetingId = result.meetingId ?? result.meeting_id
    return meetingId
      ? [{ meetingId, excerpt: result.excerpt ?? result.summary ?? '', score: result.score ?? 0 }]
      : []
  })
}

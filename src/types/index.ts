export interface Participant {
  id: string
  name: string
  email: string
  avatar: string
  initials: string
}

export interface TranscriptSegment {
  id: string
  meetingId: string
  speakerId: string
  timestamp: number
  text: string
}

export interface ActionItem {
  id: string
  meetingId: string
  title: string
  assignee: string
  dueDate: string
  status: 'pending' | 'completed'
  sourceTimestamp: number
}

export interface Highlight {
  id: string
  meetingId: string
  timestamp: number
  title: string
  description: string
  speaker: string
  type: 'decision' | 'insight' | 'action' | 'milestone'
}

export interface MeetingSummary {
  executive: string
  keyTopics: string[]
  decisions: string[]
  discussionPoints: string[]
  sentiment: 'positive' | 'neutral' | 'mixed'
}

export interface Meeting {
  id: string
  title: string
  date: string
  duration: number
  meetingType: 'product' | 'engineering' | 'sales' | 'interview' | 'hiring' | 'strategy' | 'customer' | 'design' | 'team' | '1:1'
  participants: Participant[]
  recording: {
    thumbnail: string
    duration: number
  }
  summary: MeetingSummary
  transcript: TranscriptSegment[]
  actionItems: ActionItem[]
  highlights: Highlight[]
  template: string
  status: 'completed' | 'processing'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  duration: number
  type: string
  participants: string[]
}

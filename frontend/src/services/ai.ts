import type { ChatMessage, Highlight } from '../types'
import { queryMeeting as queryMeetingApi } from './api'

export function queryMeeting(
  meetingId: string,
  query: string,
  conversationHistory: ChatMessage[],
): Promise<{ answer: string; highlights: Highlight[] }> {
  return queryMeetingApi(meetingId, query, conversationHistory)
}

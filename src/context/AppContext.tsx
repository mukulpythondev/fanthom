import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Meeting, ChatMessage } from '../types'
import { fetchMeetings, fetchMeeting, toggleActionItemApi, queryMeeting } from '../services/api'

interface AppState {
  meetings: Meeting[]
  selectedMeeting: Meeting | null
  currentView: 'dashboard' | 'meeting' | 'search'
  searchQuery: string
  setSearchQuery: (q: string) => void
  aiMessages: Record<string, ChatMessage[]>
  aiLoading: boolean
  meetingViewTab: 'summary' | 'transcript' | 'actions'
  isSidebarOpen: boolean
  loading: boolean
  error: string | null
  selectMeeting: (id: string) => void
  goToDashboard: () => void
  goToSearch: (q?: string) => void
  setMeetingViewTab: (tab: 'summary' | 'transcript' | 'actions') => void
  toggleSidebar: () => void
  toggleActionItem: (meetingId: string, actionId: string) => void
  sendAiMessage: (meetingId: string, message: string) => Promise<void>
  refreshMeetings: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [currentView, setCurrentView] = useState<'dashboard' | 'meeting' | 'search'>('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [aiMessages, setAiMessages] = useState<Record<string, ChatMessage[]>>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [meetingViewTab, setMeetingViewTab] = useState<'summary' | 'transcript' | 'actions'>('summary')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshMeetings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMeetings()
      setMeetings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meetings')
    } finally {
      setLoading(false)
    }
  }, [])

  const selectMeeting = useCallback(async (id: string) => {
    const data = await fetchMeeting(id)
    if (data) {
      setSelectedMeeting(data)
      setCurrentView('meeting')
      setMeetingViewTab('summary')
    }
  }, [])

  const goToDashboard = useCallback(() => {
    setSelectedMeeting(null)
    setCurrentView('dashboard')
  }, [])

  const goToSearch = useCallback((q?: string) => {
    setSearchQuery(q || '')
    setCurrentView('search')
  }, [])

  const sendAiMessage = useCallback(async (meetingId: string, message: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }
    setAiMessages(prev => ({
      ...prev,
      [meetingId]: [...(prev[meetingId] || []), userMsg],
    }))
    setAiLoading(true)

    try {
      const history = aiMessages[meetingId] || []
      const { answer } = await queryMeeting(meetingId, message, [...history, userMsg])

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
      }
      setAiMessages(prev => ({
        ...prev,
        [meetingId]: [...(prev[meetingId] || []), assistantMsg],
      }))
    } catch {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your question. Please try again.',
        timestamp: Date.now(),
      }
      setAiMessages(prev => ({
        ...prev,
        [meetingId]: [...(prev[meetingId] || []), errorMsg],
      }))
    } finally {
      setAiLoading(false)
    }
  }, [aiMessages])

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(p => !p)
  }, [])

  const toggleActionItem = useCallback(async (meetingId: string, actionId: string) => {
    setMeetings(prev => prev.map(m => {
      if (m.id !== meetingId) return m
      return {
        ...m,
        actionItems: m.actionItems.map(a =>
          a.id === actionId ? { ...a, status: a.status === 'pending' ? 'completed' : 'pending' } : a
        )
      }
    }))
    if (selectedMeeting?.id === meetingId) {
      setSelectedMeeting(prev => prev ? {
        ...prev,
        actionItems: prev.actionItems.map(a =>
          a.id === actionId ? { ...a, status: a.status === 'pending' ? 'completed' : 'pending' } : a
        )
      } : null)
    }

    try {
      await toggleActionItemApi(meetingId, actionId, selectedMeeting?.actionItems.find(a => a.id === actionId)?.status !== 'pending')
    } catch (err) {
      console.error('Failed to toggle action item:', err)
    }
  }, [selectedMeeting])

  return (
    <AppContext.Provider value={{
      meetings, selectedMeeting, currentView, searchQuery, aiMessages, aiLoading,
      meetingViewTab, isSidebarOpen, loading, error,
      selectMeeting, goToDashboard, goToSearch, setSearchQuery, setMeetingViewTab,
      toggleSidebar, toggleActionItem, sendAiMessage, refreshMeetings,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

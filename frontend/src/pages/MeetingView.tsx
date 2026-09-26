import { useState, useRef, useEffect, type RefObject } from 'react'
import { useApp } from '../context/AppContext'
import type { ChatMessage, Meeting } from '../types'
import { formatDate, formatDuration, getMeetingTypeConfig, getSentimentConfig, formatTime } from '../lib/utils'
import { MeetingPlayer } from '../components/MeetingPlayer'
import {
  BarChart3, Type, CheckSquare, ThumbsUp, ThumbsDown, Meh,
  FileText, Loader2, Send, ChevronRight, ArrowLeft, Search, Check
} from 'lucide-react'

export function MeetingView() {
  const { selectedMeeting, meetingViewTab, setMeetingViewTab, sendAiMessage, aiMessages, aiLoading, toggleActionItem, goToDashboard } = useApp()
  const [localQuery, setLocalQuery] = useState('')
  const [playbackTime, setPlaybackTime] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages, meetingViewTab])

  useEffect(() => {
    setPlaybackTime(0)
  }, [selectedMeeting?.id])

      if (!selectedMeeting) return null
  const meeting = selectedMeeting
  const typeConfig = getMeetingTypeConfig(meeting.meetingType)
  const tabs = [
    { id: 'transcript' as const, label: 'Conversation', icon: Type },
    { id: 'summary' as const, label: 'Understanding', icon: BarChart3 },
    { id: 'actions' as const, label: 'Execution', icon: CheckSquare },
  ]

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-steno-bg/80 backdrop-blur-md border-b border-steno-border-subtle">
        <div className="px-8 py-4">
          <button onClick={goToDashboard} className="flex items-center gap-1.5 text-xs text-steno-text-tertiary hover:text-steno-accent transition-colors mb-3">
            <ArrowLeft size={14} /> Back to dashboard
          </button>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-steno-elevated border border-steno-border-subtle
                              flex items-center justify-center text-lg font-bold text-steno-text-secondary flex-shrink-0">
                {meeting.recording.thumbnail}
              </div>
              <div>
                <h1 className="text-xl font-bold text-steno-text-primary mb-1">{meeting.title}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${typeConfig.bg} ${typeConfig.color} font-medium`}>
                    {typeConfig.label}
                  </span>
                  <span className="text-sm text-steno-text-secondary">
                    {formatDate(meeting.date)} · {formatDuration(meeting.duration)}
                  </span>
                  <span className="text-sm text-steno-text-secondary">
                    {meeting.participants.length} participants
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-steno-surface rounded-xl p-1 w-fit mt-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setMeetingViewTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  meetingViewTab === tab.id
                    ? 'bg-steno-hover text-steno-text-primary'
                    : 'text-steno-text-tertiary hover:text-steno-text-secondary'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-[10px] uppercase tracking-[0.18em] text-steno-text-tertiary">
            <span className={meetingViewTab === 'transcript' ? 'text-steno-accent' : ''}>Conversation</span>
            <span>/</span>
            <span className={meetingViewTab === 'summary' ? 'text-steno-accent' : ''}>Understanding</span>
            <span>/</span>
            <span className={meetingViewTab === 'actions' ? 'text-steno-accent' : ''}>Execution</span>
          </div>
        </div>
      </div>

      <div className="p-8 pb-48">
        {meetingViewTab === 'summary' && (
          <SummaryView meeting={meeting} onSeek={setPlaybackTime} />
        )}
        {meetingViewTab === 'transcript' && (
          <TranscriptView meeting={meeting} playbackTime={playbackTime} onSeek={setPlaybackTime} />
        )}
        {meetingViewTab === 'actions' && (
          <ActionsView meeting={meeting} toggleActionItem={toggleActionItem} />
        )}
      </div>

      {meetingViewTab === 'summary' && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-steno-bg via-steno-bg to-transparent pt-8 pb-4 z-40">
          <div className="max-w-2xl mx-auto px-4">
            <ChatPanel
              meetingId={meeting.id}
              messages={aiMessages[meeting.id] || []}
              loading={aiLoading}
              onSend={sendAiMessage}
              localQuery={localQuery}
              setLocalQuery={setLocalQuery}
              endRef={chatEndRef}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryView({ meeting, onSeek }: { meeting: Meeting; onSeek: (t: number) => void }) {
  const sentimentConfig = getSentimentConfig(meeting.summary.sentiment)

  return (
    <div className="space-y-8 animate-slide-up">
      <MeetingPlayer duration={meeting.duration} onTimeUpdate={onSeek} />

      <section>
        <h3 className="text-xs font-medium text-steno-text-tertiary uppercase tracking-wider mb-3">Executive Summary</h3>
        <div className="bg-steno-surface border border-steno-border-subtle rounded-xl p-5">
          <p className="text-sm text-steno-text-primary leading-relaxed">{meeting.summary.executive}</p>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-medium text-steno-text-tertiary uppercase tracking-wider mb-3">Key Topics</h3>
        <div className="flex flex-wrap gap-2">
          {meeting.summary.keyTopics.map((topic, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full bg-steno-elevated border border-steno-border-subtle text-xs text-steno-text-secondary">
              {topic}
            </span>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <h3 className="text-xs font-medium text-steno-text-tertiary uppercase tracking-wider mb-3">Key Decisions</h3>
          <div className="space-y-2">
            {meeting.summary.decisions.map((decision, i) => (
              <div key={i} className="bg-steno-surface border border-steno-border-subtle rounded-xl p-4 hover:border-steno-accent/20 transition-colors">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-steno-accent-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-steno-accent">{i + 1}</span>
                  </div>
                  <p className="text-sm text-steno-text-primary leading-relaxed">{decision}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-medium text-steno-text-tertiary uppercase tracking-wider mb-3">Sentiment</h3>
          <div className="bg-steno-surface border border-steno-border-subtle rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full ${sentimentConfig.bg} flex items-center justify-center`}>
                {meeting.summary.sentiment === 'positive' ? (
                  <ThumbsUp size={20} className={sentimentConfig.color} />
                ) : meeting.summary.sentiment === 'neutral' ? (
                  <Meh size={20} className={sentimentConfig.color} />
                ) : (
                  <ThumbsDown size={20} className={sentimentConfig.color} />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${sentimentConfig.color}`}>{sentimentConfig.label}</p>
                <p className="text-xs text-steno-text-tertiary">Meeting tone</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-steno-text-secondary">Positive</span>
                <span className="text-steno-text-tertiary">
                  {meeting.summary.sentiment === 'positive' ? '85%' : meeting.summary.sentiment === 'mixed' ? '45%' : '30%'}
                </span>
              </div>
              <div className="h-2 bg-steno-bg rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${sentimentConfig.bar} transition-all duration-500`}
                  style={{ width: meeting.summary.sentiment === 'positive' ? '85%' : meeting.summary.sentiment === 'mixed' ? '45%' : '30%' }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {meeting.highlights.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-steno-text-tertiary uppercase tracking-wider mb-3">Highlights</h3>
          <div className="space-y-2">
            {meeting.highlights.map((highlight) => (
              <button
                key={highlight.id}
                onClick={() => onSeek(highlight.timestamp)}
                className="w-full text-left bg-steno-surface border border-steno-border-subtle rounded-xl p-4
                           hover:border-steno-accent/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <span className="text-xs font-mono text-steno-text-tertiary bg-steno-bg px-2 py-1 rounded">
                      {formatTime(highlight.timestamp)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-steno-text-primary">{highlight.title}</p>
                    <p className="text-xs text-steno-text-tertiary truncate">{highlight.speaker} — {highlight.description}</p>
                  </div>
                  <ChevronRight size={14} className="text-steno-text-tertiary group-hover:text-steno-accent transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-xs font-medium text-steno-text-tertiary uppercase tracking-wider mb-3">Discussion Points</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {meeting.summary.discussionPoints.map((point, i) => (
            <div key={i} className="bg-steno-surface border border-steno-border-subtle rounded-xl p-4">
              <p className="text-sm text-steno-text-secondary leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-medium text-steno-text-tertiary uppercase tracking-wider mb-3">Participants</h3>
        <div className="bg-steno-surface border border-steno-border-subtle rounded-xl p-5">
          <div className="flex items-center gap-3 flex-wrap">
            {meeting.participants.map(p => (
              <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-steno-elevated border border-steno-border-subtle">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-steno-accent/80 to-steno-purple flex items-center justify-center text-xs font-bold text-white">
                  {p.initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-steno-text-primary">{p.name}</p>
                  <p className="text-xs text-steno-text-tertiary">{p.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function TranscriptView({ meeting, playbackTime, onSeek }: { meeting: Meeting; playbackTime: number; onSeek: (t: number) => void }) {
  const [search, setSearch] = useState('')
  const speakerMap = new Map(meeting.participants.map(p => [p.id, p]))
  const filtered = meeting.transcript.filter(seg =>
    !search || seg.text.toLowerCase().includes(search.toLowerCase())
  )

  const activeSegmentId = playbackTime > 0
    ? [...meeting.transcript]
        .sort((a, b) => b.timestamp - a.timestamp)
        .find(seg => seg.timestamp <= playbackTime)?.id ?? null
    : null

  return (
    <div className="animate-slide-up">
      <div className="mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steno-text-tertiary" />
          <input
            type="text"
            placeholder="Search transcript..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-steno-surface border border-steno-border-subtle
                       text-sm text-steno-text-primary placeholder-steno-text-tertiary
                       focus:outline-none focus:border-steno-accent/50 transition-colors"
          />
        </div>
      </div>
      <div className="space-y-1">
        {filtered.map(seg => {
          const speaker = speakerMap.get(seg.speakerId)
          const isActive = seg.id === activeSegmentId
          return (
            <div
              key={seg.id}
              onClick={() => onSeek(seg.timestamp)}
              className={`flex gap-4 p-3 rounded-xl cursor-pointer transition-colors ${
                isActive
                  ? 'bg-steno-accent/10 border border-steno-accent/30'
                  : 'hover:bg-steno-hover border border-transparent'
              }`}
            >
              <div className="flex-shrink-0 w-16 text-right">
                <span className="text-xs text-steno-text-tertiary font-mono">{formatTime(seg.timestamp)}</span>
              </div>
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-steno-accent text-white' : 'bg-steno-elevated border border-steno-border-subtle text-steno-text-secondary'
                }`}>
                  {speaker?.initials || '??'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-steno-text-primary">{speaker?.name || 'Unknown'}</span>
                <p className="text-sm text-steno-text-secondary mt-1 leading-relaxed">{seg.text}</p>
              </div>
            </div>
          )
        })}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <FileText size={40} className="mx-auto text-steno-text-tertiary mb-3" />
          <p className="text-sm text-steno-text-tertiary">No transcript segments match your search.</p>
        </div>
      )}
    </div>
  )
}

function ActionsView({ meeting, toggleActionItem }: { meeting: Meeting; toggleActionItem: (mid: string, aid: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const filtered = meeting.actionItems.filter(a => filter === 'all' ? true : a.status === filter)

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'pending', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-steno-accent text-steno-bg'
                : 'bg-steno-surface border border-steno-border-subtle text-steno-text-secondary hover:text-steno-text-primary'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-steno-text-tertiary">
          {filtered.filter(a => a.status === 'pending').length} pending
        </span>
      </div>
      <div className="space-y-2">
        {filtered.map(action => (
          <div
            key={action.id}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
              action.status === 'completed'
                ? 'bg-steno-success-subtle border-steno-success/20'
                : 'bg-steno-surface border-steno-border-subtle hover:border-steno-border'
            }`}
          >
            <button
              onClick={() => toggleActionItem(meeting.id, action.id)}
              className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                action.status === 'completed'
                  ? 'bg-steno-success border-steno-success text-white'
                  : 'border-steno-border hover:border-steno-accent'
              }`}
            >
              {action.status === 'completed' && <Check size={12} />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${action.status === 'completed' ? 'text-steno-text-tertiary line-through' : 'text-steno-text-primary'}`}>
                {action.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-steno-text-tertiary">{action.assignee}</span>
                {action.dueDate && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-steno-border" />
                    <span className="text-xs text-steno-text-tertiary">Due {action.dueDate}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-steno-text-tertiary py-8 text-center">No {filter} action items.</p>
        )}
      </div>
    </div>
  )
}

function ChatPanel({ meetingId, messages, loading, onSend, localQuery, setLocalQuery, endRef }: {
  meetingId: string
  messages: ChatMessage[]
  loading: boolean
  onSend: (mid: string, q: string) => Promise<void>
  localQuery: string
  setLocalQuery: (v: string) => void
  endRef: RefObject<HTMLDivElement | null>
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!localQuery.trim() || loading) return
    onSend(meetingId, localQuery.trim())
    setLocalQuery('')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-steno-surface border border-steno-border-subtle rounded-2xl p-4">
      {messages.length > 0 && (
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm ${
                msg.role === 'user'
                  ? 'bg-steno-accent text-steno-bg rounded-br-md'
                  : 'bg-steno-elevated text-steno-text-primary rounded-bl-md border border-steno-border-subtle'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-steno-elevated border border-steno-border-subtle rounded-xl rounded-bl-md px-4 py-3">
                <Loader2 size={14} className="animate-spin text-steno-accent" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={localQuery}
          onChange={e => setLocalQuery(e.target.value)}
          placeholder="Ask about this meeting..."
          className="flex-1 bg-steno-bg border border-steno-border-subtle rounded-xl px-4 py-2.5 text-sm
                     text-steno-text-primary placeholder-steno-text-tertiary focus:outline-none focus:border-steno-accent/50 transition-colors"
        />
        <button type="submit" disabled={!localQuery.trim() || loading}
          className="p-2.5 rounded-xl bg-steno-accent hover:bg-steno-accent-hover text-white disabled:opacity-40 transition-colors">
          <Send size={16} />
        </button>
      </div>
    </form>
  )
}

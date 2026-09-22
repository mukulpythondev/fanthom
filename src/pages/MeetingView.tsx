import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { formatDate, formatDuration, getMeetingTypeConfig, getSentimentConfig, formatTime } from '../lib/utils'
import { MeetingPlayer } from '../components/MeetingPlayer'
import {
  Search,
  Copy, Check,
  BarChart3, Type, CheckSquare, ThumbsUp, ThumbsDown, Meh,
  FileText, Loader2, Send
} from 'lucide-react'
import type { Meeting } from '../types'

export function MeetingView() {
  const { selectedMeeting, meetingViewTab, setMeetingViewTab, sendAiMessage, aiMessages, aiLoading, toggleActionItem } = useApp()
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
    { id: 'summary' as const, label: 'Summary', icon: BarChart3 },
    { id: 'transcript' as const, label: 'Transcript', icon: Type },
    { id: 'actions' as const, label: 'Actions', icon: CheckSquare },
  ]

  const suggestedQuestions = [
    'What decisions were made?',
    'What are my action items?',
    'What were the main topics discussed?',
    'Summarize this meeting',
    `What did ${meeting.participants[0]?.name || 'someone'} say about ${meeting.summary.keyTopics[0]?.toLowerCase() || 'this'}?`,
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="p-8 pb-4 border-b border-fathom-border-subtle">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-fathom-elevated border border-fathom-border-subtle
                              flex items-center justify-center text-xl font-bold text-fathom-text-secondary flex-shrink-0">
                {meeting.recording.thumbnail}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-fathom-text-primary mb-1">{meeting.title}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${typeConfig.bg} ${typeConfig.color} font-medium`}>
                    {typeConfig.label}
                  </span>
                  <span className="text-sm text-fathom-text-secondary">
                    {formatDate(meeting.date)} · {formatDuration(meeting.duration)}
                  </span>
                  <span className="text-sm text-fathom-text-secondary">
                    {meeting.participants.length} participants
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setMeetingViewTab('summary')
                setTimeout(() => {
                  const input = document.querySelector('input[placeholder="Ask about this meeting..."]') as HTMLInputElement | null
                  input?.focus()
                }, 100)
              }}
              className="px-4 py-2 rounded-xl bg-fathom-accent hover:bg-fathom-accent-hover text-white
                         text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0"
            >
              <Search size={14} />
              Ask AI
            </button>
          </div>

          <div className="flex items-center gap-1 bg-fathom-surface rounded-xl p-1 w-fit">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setMeetingViewTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  meetingViewTab === tab.id
                    ? 'bg-fathom-hover text-fathom-text-primary'
                    : 'text-fathom-text-tertiary hover:text-fathom-text-secondary'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8">
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
      </div>

      {meetingViewTab === 'summary' && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-fathom-bg via-fathom-bg to-transparent pt-8 pb-4 z-40">
          <div className="max-w-2xl mx-auto px-4">
            <ChatPanel
              meetingId={meeting.id}
              messages={aiMessages[meeting.id] || []}
              loading={aiLoading}
              onSend={sendAiMessage}
              localQuery={localQuery}
              setLocalQuery={setLocalQuery}
              endRef={chatEndRef}
              suggestedQuestions={suggestedQuestions}
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
    <div className="space-y-8 animate-fade-in">
      <MeetingPlayer duration={meeting.duration} onTimeUpdate={onSeek} />

      <section>
        <h3 className="text-xs font-medium text-fathom-text-tertiary uppercase tracking-wider mb-3">Executive Summary</h3>
        <div className="bg-fathom-surface border border-fathom-border-subtle rounded-xl p-5">
          <p className="text-sm text-fathom-text-primary leading-relaxed">{meeting.summary.executive}</p>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-medium text-fathom-text-tertiary uppercase tracking-wider mb-3">Key Topics</h3>
        <div className="flex flex-wrap gap-2">
          {meeting.summary.keyTopics.map((topic, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full bg-fathom-elevated border border-fathom-border-subtle text-xs text-fathom-text-secondary">
              {topic}
            </span>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-6">
        <section className="col-span-2">
          <h3 className="text-xs font-medium text-fathom-text-tertiary uppercase tracking-wider mb-3">Key Decisions</h3>
          <div className="space-y-2">
            {meeting.summary.decisions.map((decision, i) => (
              <DecisionCard key={i} decision={decision} index={i} />
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-medium text-fathom-text-tertiary uppercase tracking-wider mb-3">Sentiment</h3>
          <div className="bg-fathom-surface border border-fathom-border-subtle rounded-xl p-5">
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
                <p className="text-xs text-fathom-text-tertiary">Meeting tone</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-fathom-text-secondary">Positive</span>
                <span className="text-fathom-text-tertiary">
                  {meeting.summary.sentiment === 'positive' ? '85%' : meeting.summary.sentiment === 'mixed' ? '45%' : '30%'}
                </span>
              </div>
              <div className="h-2 bg-fathom-bg rounded-full overflow-hidden">
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
          <h3 className="text-xs font-medium text-fathom-text-tertiary uppercase tracking-wider mb-3">Highlights</h3>
          <div className="space-y-2">
            {meeting.highlights.map((highlight) => (
              <button
                key={highlight.id}
                onClick={() => onSeek(highlight.timestamp)}
                className="w-full text-left bg-fathom-surface border border-fathom-border-subtle rounded-xl p-4
                           hover:border-fathom-accent/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <span className="text-xs font-mono text-fathom-text-tertiary bg-fathom-bg px-2 py-1 rounded">
                      {formatTime(highlight.timestamp)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fathom-text-primary">{highlight.title}</p>
                    <p className="text-xs text-fathom-text-tertiary truncate">{highlight.speaker} — {highlight.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-xs font-medium text-fathom-text-tertiary uppercase tracking-wider mb-3">Discussion Points</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {meeting.summary.discussionPoints.map((point, i) => (
            <div key={i} className="bg-fathom-surface border border-fathom-border-subtle rounded-xl p-4">
              <p className="text-sm text-fathom-text-secondary leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-medium text-fathom-text-tertiary uppercase tracking-wider mb-3">Participants</h3>
        <div className="bg-fathom-surface border border-fathom-border-subtle rounded-xl p-5">
          <div className="flex items-center gap-2 flex-wrap">
            {meeting.participants.map(p => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-fathom-elevated border border-fathom-border-subtle">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
                                flex items-center justify-center text-xs font-bold text-white">
                  {p.initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-fathom-text-primary">{p.name}</p>
                  <p className="text-xs text-fathom-text-tertiary">{p.email}</p>
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
  const [activeSpeaker] = useState<string | null>(null)
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
    <div className="animate-fade-in">
      <div className="mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fathom-text-tertiary" />
          <input
            type="text"
            placeholder="Search transcript..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-fathom-surface border border-fathom-border-subtle
                       text-sm text-fathom-text-primary placeholder-fathom-text-tertiary
                       focus:outline-none focus:border-fathom-accent/50 transition-colors"
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
                  ? 'bg-fathom-accent/10 border border-fathom-accent/30'
                  : activeSpeaker === seg.speakerId
                    ? 'bg-fathom-accent/5 border border-fathom-accent/20'
                    : 'hover:bg-fathom-hover border border-transparent'
              }`}
            >
              <div className="flex-shrink-0 w-20 text-right">
                <span className="text-xs text-fathom-text-tertiary font-mono">{formatTime(seg.timestamp)}</span>
              </div>
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-fathom-accent text-white' : 'bg-fathom-elevated border border-fathom-border-subtle text-fathom-text-secondary'
                }`}>
                  {speaker?.initials || '??'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-fathom-text-primary">{speaker?.name || 'Unknown'}</span>
                <p className="text-sm text-fathom-text-secondary mt-1 leading-relaxed">{seg.text}</p>
              </div>
            </div>
          )
        })}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <FileText size={40} className="mx-auto text-fathom-text-tertiary mb-3" />
          <p className="text-sm text-fathom-text-tertiary">No transcript segments match your search.</p>
        </div>
      )}
    </div>
  )
}

function ActionsView({ meeting, toggleActionItem }: { meeting: Meeting; toggleActionItem: (mid: string, aid: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const filtered = meeting.actionItems.filter(a => filter === 'all' ? true : a.status === filter)

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'pending', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-fathom-accent text-white'
                : 'bg-fathom-surface border border-fathom-border-subtle text-fathom-text-secondary hover:text-fathom-text-primary'
            }`}
          >
            {f} ({f === 'all' ? meeting.actionItems.length : meeting.actionItems.filter(a => a.status === f).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(item => (
          <div
            key={item.id}
            className={`bg-fathom-surface border rounded-xl p-4 transition-colors ${
              item.status === 'completed' ? 'border-fathom-border-subtle opacity-70' : 'border-fathom-border-subtle'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  item.status === 'completed'
                    ? 'border-fathom-success bg-fathom-success/20'
                    : 'border-fathom-border hover:border-fathom-accent cursor-pointer'
                }`}
                onClick={() => toggleActionItem(meeting.id, item.id)}
              >
                {item.status === 'completed' && <Check size={12} className="text-fathom-success" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.status === 'completed' ? 'text-fathom-text-tertiary line-through' : 'text-fathom-text-primary'}`}>
                  {item.title}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-fathom-text-tertiary">
                    Assigned to <span className="text-fathom-text-secondary">{item.assignee}</span>
                  </span>
                  <span className="text-fathom-border">·</span>
                  <span className="text-xs text-fathom-text-tertiary">Due {item.dueDate}</span>
                  <span className="text-fathom-border">·</span>
                  <span className="text-xs text-fathom-text-tertiary">From {formatTime(item.sourceTimestamp)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare size={40} className="mx-auto text-fathom-text-tertiary mb-3" />
          <p className="text-sm text-fathom-text-tertiary">
            No {filter === 'all' ? '' : filter} action items for this meeting.
          </p>
        </div>
      )}
    </div>
  )
}

function ChatPanel({
  meetingId, messages, loading, onSend, localQuery, setLocalQuery, endRef, suggestedQuestions
}: {
  meetingId: string
  messages: { id: string; role: string; content: string; timestamp: number }[]
  loading: boolean
  onSend: (id: string, msg: string) => Promise<void>
  localQuery: string
  setLocalQuery: (v: string) => void
  endRef: React.RefObject<HTMLDivElement | null>
  suggestedQuestions?: string[]
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!localQuery.trim() || loading) return
    onSend(meetingId, localQuery.trim())
    setLocalQuery('')
  }

  return (
    <div className="bg-fathom-surface border border-fathom-border rounded-2xl overflow-hidden shadow-2xl">
      {messages.length > 0 && (
        <div className="max-h-48 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-fathom-accent text-white'
                  : 'bg-fathom-elevated border border-fathom-border-subtle text-fathom-text-primary'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-fathom-elevated border border-fathom-border-subtle rounded-xl px-4 py-2.5">
                <Loader2 size={16} className="animate-spin text-fathom-accent" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {messages.length === 0 && suggestedQuestions && (
        <div className="p-4">
          <p className="text-xs font-medium text-fathom-text-tertiary uppercase tracking-wider mb-3">Suggested questions</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map(s => (
              <button
                key={s}
                onClick={() => { setLocalQuery(s); onSend(meetingId, s) }}
                className="px-3 py-2 rounded-xl bg-fathom-elevated border border-fathom-border-subtle
                           text-xs text-fathom-text-secondary hover:text-fathom-text-primary
                           hover:border-fathom-border transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-3 border-t border-fathom-border-subtle">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={localQuery}
            onChange={e => setLocalQuery(e.target.value)}
            placeholder="Ask about this meeting..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-fathom-bg border border-fathom-border-subtle
                       text-sm text-fathom-text-primary placeholder-fathom-text-tertiary
                       focus:outline-none focus:border-fathom-accent/50 transition-colors"
          />
          <button
            type="submit"
            disabled={!localQuery.trim() || loading}
            className="p-2.5 rounded-xl bg-fathom-accent hover:bg-fathom-accent-hover disabled:opacity-40
                       disabled:cursor-not-allowed text-white transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}

function DecisionCard({ decision, index }: { decision: string; index: number }) {
  const [copied, setCopied] = useState(false)

  return (
    <div
      className="bg-fathom-surface border border-fathom-border-subtle rounded-xl p-4
                 hover:border-fathom-accent/30 transition-all duration-200 group cursor-default"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-fathom-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold text-fathom-accent">{index + 1}</span>
        </div>
        <p className="text-sm text-fathom-text-primary leading-relaxed flex-1">{decision}</p>
        <button
          onClick={() => { navigator.clipboard.writeText(decision); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="p-1.5 rounded-lg hover:bg-fathom-hover text-fathom-text-tertiary hover:text-fathom-text-primary
                     transition-colors opacity-0 group-hover:opacity-100"
        >
          {copied ? <Check size={12} className="text-fathom-success" /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  )
}

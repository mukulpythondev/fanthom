import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { formatDate, formatDuration, getMeetingTypeConfig } from '../lib/utils'
import {
  Search, Loader2, TrendingUp, MessageSquare, ChevronDown, ChevronUp, ArrowRight, Sparkles
} from 'lucide-react'

const SUGGESTED_QUERIES = [
  'What were the main decisions?',
  'Who attended the meetings?',
  'What action items were created?',
  'Any budget discussions?',
  'What were the key insights?',
]

export function SearchView() {
  const { searchQuery, meetings } = useApp()
  const [query, setQuery] = useState(searchQuery)
  const [results, setResults] = useState<{ meetingId: string; excerpt: string; score: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [results])

  const doSearch = async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    try {
      const { searchMeetings } = await import('../services/ai')
      const res = await searchMeetings(q.trim())
      setResults(res)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    doSearch(query)
  }

  const handleSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    doSearch(suggestion)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Search size={20} className="text-fathom-accent" />
            <h1 className="text-2xl font-bold text-fathom-text-primary">Search Meetings</h1>
          </div>
          <p className="text-sm text-fathom-text-secondary">Ask anything about your meetings and get AI-powered insights.</p>
        </div>

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative">
            <Sparkles size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-fathom-accent" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="What would you like to know?"
              className="w-full pl-12 pr-24 py-4 rounded-2xl bg-fathom-surface border border-fathom-border-subtle
                         text-fathom-text-primary placeholder-fathom-text-tertiary text-base
                         focus:outline-none focus:border-fathom-accent/50 focus:shadow-lg focus:shadow-fathom-accent/5
                         transition-all"
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl
                         bg-fathom-accent hover:bg-fathom-accent-hover disabled:opacity-40
                         text-white text-sm font-medium transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
            </button>
          </div>
        </form>

        {results.length === 0 && !loading && (
          <div>
            <p className="text-xs font-medium text-fathom-text-tertiary uppercase tracking-wider mb-3">
              Suggested queries
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUERIES.map(s => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="px-4 py-2 rounded-xl bg-fathom-surface border border-fathom-border-subtle
                             text-sm text-fathom-text-secondary hover:text-fathom-text-primary
                             hover:border-fathom-border hover:bg-fathom-hover transition-all"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-10">
              <h3 className="text-xs font-medium text-fathom-text-tertiary uppercase tracking-wider mb-4">
                Browse recent meetings
              </h3>
              <div className="space-y-1">
                {meetings.slice(0, 5).map(m => {
                  const typeConfig = getMeetingTypeConfig(m.meetingType)
                  return (
                    <button
                      key={m.id}
                      onClick={() => {}}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-fathom-hover transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-fathom-elevated border border-fathom-border-subtle
                                      flex items-center justify-center text-xs font-bold text-fathom-text-secondary flex-shrink-0">
                        {m.recording.thumbnail}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fathom-text-primary truncate">{m.title}</p>
                        <p className="text-xs text-fathom-text-tertiary">
                          {formatDate(m.date)} · {formatDuration(m.duration)}
                        </p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeConfig.bg} ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-fathom-text-secondary">
                Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
              </p>
              <button
                onClick={() => { setResults([]); setQuery('') }}
                className="text-xs text-fathom-text-tertiary hover:text-fathom-text-primary transition-colors"
              >
                Clear
              </button>
            </div>
            {results.map(result => {
              const meeting = meetings.find(m => m.id === result.meetingId)!
              if (!meeting) return null
              const typeConfig = getMeetingTypeConfig(meeting.meetingType)
              const isExpanded = expandedId === result.meetingId

              return (
                <div
                  key={result.meetingId}
                  className="bg-fathom-surface border border-fathom-border-subtle rounded-xl overflow-hidden
                             hover:border-fathom-border transition-colors"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : result.meetingId)}
                    className="w-full text-left p-4 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-xl bg-fathom-elevated border border-fathom-border-subtle
                                    flex items-center justify-center text-sm font-bold text-fathom-text-secondary flex-shrink-0">
                      {meeting.recording.thumbnail}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-medium text-fathom-text-primary truncate">
                          {meeting.title}
                        </h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeConfig.bg} ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-fathom-text-tertiary">
                        {formatDate(meeting.date)} · {formatDuration(meeting.duration)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-fathom-accent/10 text-fathom-accent text-xs">
                        <TrendingUp size={12} />
                        {Math.round(result.score * 10)}%
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-fathom-text-tertiary" /> : <ChevronDown size={16} className="text-fathom-text-tertiary" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-fathom-border-subtle animate-fade-in">
                      <div className="pt-3 space-y-3">
                        <div className="bg-fathom-bg rounded-lg p-3">
                          <p className="text-xs font-medium text-fathom-text-tertiary mb-1">Match excerpt</p>
                          <p className="text-sm text-fathom-text-secondary">{result.excerpt}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                                             bg-fathom-accent hover:bg-fathom-accent-hover text-white text-xs
                                             font-medium transition-colors">
                            <MessageSquare size={12} />
                            Ask about this meeting
                            <ArrowRight size={12} />
                          </button>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-fathom-text-tertiary mb-2">Key insights</p>
                          <div className="space-y-1.5">
                            {meeting.summary.keyTopics.slice(0, 3).map((topic, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-fathom-text-secondary">
                                <div className="w-1.5 h-1.5 rounded-full bg-fathom-accent flex-shrink-0" />
                                {topic}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-fathom-text-tertiary mb-2">Decisions</p>
                          <div className="space-y-1">
                            {meeting.summary.decisions.slice(0, 3).map((d, i) => (
                              <div key={i} className="text-xs text-fathom-text-secondary bg-fathom-bg rounded-lg px-3 py-2">
                                {d}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-fathom-text-tertiary mb-2">Participants</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {meeting.participants.map(p => (
                              <span key={p.id} className="px-2 py-1 rounded-full bg-fathom-elevated text-xs text-fathom-text-secondary">
                                {p.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  )
}

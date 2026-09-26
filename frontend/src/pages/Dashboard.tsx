import { useApp } from '../context/AppContext'
import { MeetingCard } from '../components/MeetingCard'
import { Search, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { formatDuration, formatDate, getMeetingTypeConfig } from '../lib/utils'
import type { Meeting } from '../types'

export function Dashboard() {
  const { meetings, goToSearch } = useApp()
  const [filter, setFilter] = useState('all')

  const sorted = [...meetings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const recent = sorted.slice(0, 6)

  const filtered = filter === 'all' ? sorted : sorted.filter(m => m.meetingType === filter)

  const totalActions = meetings.reduce((sum, m) => sum + m.actionItems.filter(a => a.status === 'pending').length, 0)
  const totalDuration = meetings.reduce((sum, m) => sum + m.duration, 0)
  const totalParticipants = new Set(meetings.flatMap(m => m.participants.map(p => p.id))).size
  const completedActions = meetings.reduce((sum, m) => sum + m.actionItems.filter(a => a.status === 'completed').length, 0)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header bar */}
        <div className="sticky top-0 z-30 bg-steno-bg/80 backdrop-blur-md border-b border-steno-border-subtle">
          <div className="px-8 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-steno-text-primary tracking-tight">Dashboard</h1>
              <p className="text-sm text-steno-text-tertiary mt-0.5">Meeting intelligence at a glance</p>
            </div>
            <button
              onClick={() => goToSearch()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-steno-elevated border border-steno-border
                         text-sm text-steno-text-secondary hover:text-steno-text-primary hover:border-steno-accent/30 transition-all"
            >
              <Search size={14} />
              Search
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Metric strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <MetricTile label="Meetings" value={meetings.length.toString()} sub={`${filtered.length} in view`} />
            <MetricTile label="Pending Actions" value={totalActions.toString()} sub={`${completedActions} done`} accent />
            <MetricTile label="Hours Recorded" value={`${Math.round(totalDuration / 60)}h`} sub={`${totalDuration} min total`} />
            <MetricTile label="Unique People" value={totalParticipants.toString()} sub="Across all meetings" />
          </div>

          {/* Recent meetings - horizontal layout */}
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-steno-text-primary mb-4">Recent</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recent.map(meeting => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </div>

          {/* All meetings - organized by filter */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-steno-text-primary">All Meetings</h2>
              <div className="flex items-center gap-2">
                {['all', 'strategy', 'engineering', 'customer', 'design', 'hiring'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filter === f
                        ? 'bg-steno-accent text-steno-bg'
                        : 'text-steno-text-tertiary hover:text-steno-text-secondary hover:bg-steno-elevated'
                    }`}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              {filtered.map(meeting => (
                <MeetingRow key={meeting.id} meeting={meeting} />
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-steno-text-tertiary py-8 text-center">No meetings match this filter.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border transition-colors ${
      accent
        ? 'bg-steno-accent-subtle border-steno-accent/20'
        : 'bg-steno-surface border-steno-border-subtle'
    }`}>
      <p className="text-[11px] uppercase tracking-wider text-steno-text-tertiary mb-2">{label}</p>
      <p className={`text-3xl font-bold tracking-tight ${accent ? 'text-steno-accent' : 'text-steno-text-primary'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-steno-text-tertiary mt-1">{sub}</p>}
    </div>
  )
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const { selectMeeting } = useApp()
  const typeConfig = getMeetingTypeConfig(meeting.meetingType)
  const pendingCount = meeting.actionItems.filter(a => a.status === 'pending').length

  return (
    <button
      onClick={() => selectMeeting(meeting.id)}
      className="w-full text-left flex items-center gap-4 px-4 py-3 rounded-xl
                 hover:bg-steno-hover transition-colors group border border-transparent
                 hover:border-steno-border-subtle"
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg bg-steno-elevated border border-steno-border-subtle
                      flex items-center justify-center text-sm font-bold text-steno-text-secondary
                      group-hover:border-steno-accent/30 transition-colors flex-shrink-0">
        {meeting.recording.thumbnail}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-medium text-steno-text-primary truncate group-hover:text-steno-accent transition-colors">
            {meeting.title}
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeConfig.bg} ${typeConfig.color} flex-shrink-0`}>
            {typeConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-steno-text-tertiary">
          <span>{formatDate(meeting.date)}</span>
          <span className="w-1 h-1 rounded-full bg-steno-border" />
          <span>{formatDuration(meeting.duration)}</span>
          <span className="w-1 h-1 rounded-full bg-steno-border" />
          <span>{meeting.participants.map(p => p.name).join(', ')}</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {pendingCount > 0 && (
          <span className="px-2 py-1 rounded-md bg-steno-warning-subtle text-steno-warning text-xs font-medium">
            {pendingCount} pending
          </span>
        )}
        <div className="flex -space-x-1.5">
          {meeting.participants.slice(0, 3).map(p => (
            <div key={p.id} className="w-7 h-7 rounded-full bg-steno-hover border-2 border-steno-bg
                                        flex items-center justify-center text-[10px] text-steno-text-secondary"
                 title={p.name}>
              {p.initials}
            </div>
          ))}
          {meeting.participants.length > 3 && (
            <div className="w-7 h-7 rounded-full bg-steno-elevated border-2 border-steno-bg
                            flex items-center justify-center text-[10px] text-steno-text-tertiary">
              +{meeting.participants.length - 3}
            </div>
          )}
        </div>
        <ChevronRight size={16} className="text-steno-text-tertiary group-hover:text-steno-accent transition-colors" />
      </div>
    </button>
  )
}

import { useApp } from '../context/AppContext'
import { MeetingCard } from '../components/MeetingCard'
import { Search, TrendingUp, Clock, Users, Filter } from 'lucide-react'
import { useState } from 'react'
import { formatDuration, formatDate, getMeetingTypeConfig } from '../lib/utils'
import type { Meeting } from '../types'

const typeFilters = [
  { id: 'all', label: 'All Meetings' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'sales', label: 'Sales' },
  { id: 'customer', label: 'Customer' },
  { id: 'design', label: 'Design' },
  { id: 'hiring', label: 'Hiring' },
]

export function Dashboard() {
  const { meetings, goToSearch } = useApp()
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? meetings : meetings.filter(m => m.meetingType === filter)
  const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const recent = sorted.slice(0, 4)

  const totalActions = meetings.reduce((sum, m) => sum + m.actionItems.filter(a => a.status === 'pending').length, 0)
  const totalDuration = meetings.reduce((sum, m) => sum + m.duration, 0)
  const totalParticipants = new Set(meetings.flatMap(m => m.participants.map(p => p.id))).size

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-fathom-text-primary mb-1">Dashboard</h1>
          <p className="text-sm text-fathom-text-secondary">Your meeting intelligence, at a glance.</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Meetings" value={meetings.length.toString()} icon={<Users size={20} />} />
          <StatCard label="Pending Actions" value={totalActions.toString()} icon={<Clock size={20} />} accent />
          <StatCard label="Hours Recorded" value={`${Math.round(totalDuration / 60)}h`} icon={<TrendingUp size={20} />} />
          <StatCard label="Unique People" value={totalParticipants.toString()} icon={<Users size={20} />} />
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-fathom-text-primary">Recent Meetings</h2>
            <button
              onClick={() => goToSearch()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-fathom-surface border border-fathom-border-subtle
                         text-sm text-fathom-text-secondary hover:text-fathom-text-primary hover:border-fathom-border transition-colors"
            >
              <Search size={14} />
              Search
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recent.map(meeting => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-fathom-text-primary mb-4">All Meetings</h2>
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            <Filter size={14} className="text-fathom-text-tertiary flex-shrink-0" />
            {typeFilters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === f.id
                    ? 'bg-fathom-accent text-white'
                    : 'bg-fathom-surface border border-fathom-border-subtle text-fathom-text-secondary hover:text-fathom-text-primary hover:border-fathom-border'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            {sorted.map(meeting => (
              <MeetingItemRow key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className="bg-fathom-surface border border-fathom-border-subtle rounded-xl p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
        accent ? 'bg-fathom-accent/20 text-fathom-accent' : 'bg-fathom-elevated text-fathom-text-secondary'
      }`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-fathom-text-primary">{value}</p>
      <p className="text-xs text-fathom-text-tertiary mt-0.5">{label}</p>
    </div>
  )
}

function MeetingItemRow({ meeting }: { meeting: Meeting }) {
  const { selectMeeting } = useApp()
  const typeConfig = getMeetingTypeConfig(meeting.meetingType)

  return (
    <button
      onClick={() => selectMeeting(meeting.id)}
      className="w-full text-left flex items-center gap-4 p-3 rounded-xl
                 hover:bg-fathom-hover transition-colors group"
    >
      <div className="w-14 h-14 rounded-xl bg-fathom-elevated border border-fathom-border-subtle
                      flex items-center justify-center text-sm font-bold text-fathom-text-secondary
                      group-hover:border-fathom-accent/30 transition-colors flex-shrink-0">
        {meeting.recording.thumbnail}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-medium text-fathom-text-primary truncate group-hover:text-fathom-accent transition-colors">
            {meeting.title}
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeConfig.bg} ${typeConfig.color} flex-shrink-0`}>
            {typeConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-fathom-text-tertiary">
            {formatDate(meeting.date)} · {formatDuration(meeting.duration)}
          </span>
          <span className="text-xs text-fathom-text-tertiary">
            {meeting.participants.map(p => p.name).join(', ')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {meeting.actionItems.filter(a => a.status === 'pending').length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-fathom-warning/10 text-fathom-warning text-xs font-medium">
            {meeting.actionItems.filter(a => a.status === 'pending').length} actions
          </span>
        )}
        <div className="flex -space-x-1.5">
          {meeting.participants.slice(0, 3).map(p => (
            <div key={p.id} className="w-6 h-6 rounded-full bg-fathom-hover border border-fathom-surface
                                        flex items-center justify-center text-[10px] text-fathom-text-tertiary"
                 title={p.name}>
              {p.initials}
            </div>
          ))}
        </div>
      </div>
    </button>
  )
}

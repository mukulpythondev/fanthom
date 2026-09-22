import { useApp } from '../context/AppContext'
import { formatDuration, formatDate, getMeetingTypeConfig } from '../lib/utils'
import { Play, MoreVertical, ChevronRight, MessageSquare } from 'lucide-react'
import type { Meeting } from '../types'

interface MeetingCardProps {
  meeting: Meeting
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const { selectMeeting } = useApp()
  const typeConfig = getMeetingTypeConfig(meeting.meetingType)
  const participantNames = meeting.participants.slice(0, 3).map(p => p.name)
  const extraCount = meeting.participants.length - 3

  return (
    <button
      onClick={() => selectMeeting(meeting.id)}
      className="w-full text-left p-4 rounded-xl bg-fathom-surface border border-fathom-border-subtle
                 hover:border-fathom-border hover:bg-fathom-hover transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-fathom-text-primary truncate group-hover:text-fathom-accent transition-colors">
            {meeting.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeConfig.bg} ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
            <span className="text-xs text-fathom-text-tertiary">
              {formatDate(meeting.date)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <div className="w-10 h-10 rounded-lg bg-fathom-elevated border border-fathom-border-subtle
                          flex items-center justify-center text-xs font-semibold text-fathom-text-secondary
                          group-hover:border-fathom-accent/30 transition-colors">
            {meeting.recording.thumbnail}
          </div>
          <button className="p-1 rounded hover:bg-fathom-hover text-fathom-text-tertiary hover:text-fathom-text-primary transition-colors opacity-0 group-hover:opacity-100">
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2">
            {participantNames.map((_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-fathom-elevated border-2 border-fathom-surface
                           flex items-center justify-center text-[10px] font-medium text-fathom-text-secondary"
                title={meeting.participants[i]?.name}
              >
                {meeting.participants[i]?.initials}
              </div>
            ))}
            {extraCount > 0 && (
              <div className="w-6 h-6 rounded-full bg-fathom-hover border-2 border-fathom-surface
                              flex items-center justify-center text-[10px] text-fathom-text-tertiary">
                +{extraCount}
              </div>
            )}
          </div>
          <span className="text-xs text-fathom-text-tertiary">
            {meeting.participants.length} {meeting.participants.length === 1 ? 'participant' : 'participants'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-fathom-text-tertiary">
            <Play size={12} />
            {formatDuration(meeting.duration)}
          </div>
          {meeting.actionItems.filter(a => a.status === 'pending').length > 0 && (
            <div className="flex items-center gap-1 text-xs text-fathom-accent">
              <MessageSquare size={12} />
              {meeting.actionItems.filter(a => a.status === 'pending').length}
            </div>
          )}
          <ChevronRight size={16} className="text-fathom-text-tertiary group-hover:text-fathom-accent transition-colors" />
        </div>
      </div>
    </button>
  )
}

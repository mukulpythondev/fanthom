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
      className="w-full text-left p-4 rounded-xl bg-steno-surface border border-steno-border-subtle
                 hover:border-steno-border hover:bg-steno-hover transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-steno-text-primary truncate group-hover:text-steno-accent transition-colors">
            {meeting.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeConfig.bg} ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
            <span className="text-xs text-steno-text-tertiary">
              {formatDate(meeting.date)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <div className="w-10 h-10 rounded-lg bg-steno-elevated border border-steno-border-subtle
                          flex items-center justify-center text-xs font-semibold text-steno-text-secondary
                          group-hover:border-steno-accent/30 transition-colors">
            {meeting.recording.thumbnail}
          </div>
          <div className="p-1 rounded hover:bg-steno-hover text-steno-text-tertiary hover:text-steno-text-primary transition-colors opacity-0 group-hover:opacity-100">
            <MoreVertical size={14} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2">
            {participantNames.map((_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-steno-elevated border-2 border-steno-surface
                           flex items-center justify-center text-[10px] font-medium text-steno-text-secondary"
                title={meeting.participants[i]?.name}
              >
                {meeting.participants[i]?.initials}
              </div>
            ))}
            {extraCount > 0 && (
              <div className="w-6 h-6 rounded-full bg-steno-hover border-2 border-steno-surface
                              flex items-center justify-center text-[10px] text-steno-text-tertiary">
                +{extraCount}
              </div>
            )}
          </div>
          <span className="text-xs text-steno-text-tertiary">
            {meeting.participants.length} {meeting.participants.length === 1 ? 'participant' : 'participants'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-steno-text-tertiary">
            <Play size={12} />
            {formatDuration(meeting.duration)}
          </div>
          {meeting.actionItems.filter(a => a.status === 'pending').length > 0 && (
            <div className="flex items-center gap-1 text-xs text-steno-accent">
              <MessageSquare size={12} />
              {meeting.actionItems.filter(a => a.status === 'pending').length}
            </div>
          )}
          <ChevronRight size={16} className="text-steno-text-tertiary group-hover:text-steno-accent transition-colors" />
        </div>
      </div>
    </button>
  )
}

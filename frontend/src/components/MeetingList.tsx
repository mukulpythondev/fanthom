import { useApp } from '../context/AppContext'
import { formatDuration, groupMeetingsByDate } from '../lib/utils'
import type { Meeting } from '../types'

interface MeetingListProps {
  meetings: Meeting[]
  title?: string
}

export function MeetingList({ meetings, title }: MeetingListProps) {
  const grouped = groupMeetingsByDate(meetings)

  return (
    <div>
      {title && (
        <h2 className="text-lg font-semibold text-fathom-text-primary mb-4 px-1">{title}</h2>
      )}
      <div className="space-y-6">
        {Object.entries(grouped).map(([dateLabel, dayMeetings]) => (
          <div key={dateLabel}>
            <h3 className="text-xs font-medium text-fathom-text-tertiary uppercase tracking-wider mb-2 px-1">
              {dateLabel}
            </h3>
            <div className="space-y-2">
              {dayMeetings.map(meeting => (
                <MeetingItem key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MeetingItem({ meeting }: { meeting: Meeting }) {
  const { selectMeeting } = useApp()
  const isLive = false

  return (
    <button
      onClick={() => selectMeeting(meeting.id)}
      className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl
                 hover:bg-fathom-hover transition-colors group"
    >
      <div className="w-12 h-12 rounded-xl bg-fathom-elevated border border-fathom-border-subtle
                      flex items-center justify-center text-xs font-bold text-fathom-text-secondary
                      group-hover:border-fathom-accent/30 transition-colors flex-shrink-0">
        {meeting.recording.thumbnail}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-fathom-text-primary truncate group-hover:text-fathom-accent transition-colors">
            {meeting.title}
          </span>
          {isLive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse-glow" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-fathom-text-tertiary">
            {formatDuration(meeting.duration)}
          </span>
          <span className="text-fathom-border">·</span>
          <span className="text-xs text-fathom-text-tertiary">
            {meeting.participants.length} {meeting.participants.length === 1 ? 'person' : 'people'}
          </span>
        </div>
      </div>
    </button>
  )
}

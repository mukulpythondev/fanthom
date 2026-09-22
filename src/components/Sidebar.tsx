import { useApp } from '../context/AppContext'
import { MeetingList } from './MeetingList'
import {
  Search, MessageSquare, TrendingUp, Clock, BarChart3,
  Plus, RefreshCw
} from 'lucide-react'

export function Sidebar() {
  const {
    meetings, currentView,
    goToDashboard, selectMeeting, searchQuery, isSidebarOpen, toggleSidebar
  } = useApp()

  const pendingMeetings = meetings.filter(m => m.actionItems.some(a => a.status === 'pending')).slice(0, 5)
  const collapsed = !isSidebarOpen
  const widthClass = collapsed ? 'w-[60px]' : 'w-[260px]'

  return (
    <aside className={`${widthClass} h-full bg-fathom-bg border-r border-fathom-border-subtle flex-shrink-0 flex flex-col transition-all duration-200`}>
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <MessageSquare size={16} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-fathom-text-primary tracking-tight whitespace-nowrap">Fable</span>
          )}
        </div>
        {!collapsed && currentView === 'meeting' && (
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg hover:bg-fathom-hover text-fathom-text-tertiary hover:text-fathom-text-primary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
      </div>

      {/* Dashboard View */}
      {currentView === 'dashboard' && !collapsed && (
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-fathom-accent hover:bg-fathom-accent-hover text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            New Meeting
          </button>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fathom-text-tertiary" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={() => {}}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-fathom-surface border border-fathom-border-subtle text-sm text-fathom-text-primary placeholder-fathom-text-tertiary focus:outline-none focus:border-fathom-accent/50 transition-colors"
            />
          </div>

          {pendingMeetings.length > 0 && (
            <div>
              <h3 className="text-[11px] font-medium text-fathom-text-tertiary uppercase tracking-wider px-1 mb-1.5">
                Pending Actions
              </h3>
              <div className="space-y-1">
                {pendingMeetings.map(meeting => (
                  <button
                    key={meeting.id}
                    onClick={() => selectMeeting(meeting.id)}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-fathom-hover transition-colors flex items-center gap-2"
                  >
                    <div className="w-5 h-5 rounded bg-fathom-warning/20 flex items-center justify-center flex-shrink-0">
                      <Clock size={10} className="text-fathom-warning" />
                    </div>
                    {!collapsed && (
                      <span className="text-xs text-fathom-text-primary truncate">{meeting.title}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <MeetingList meetings={pendingMeetings} />
        </div>
      )}

      {currentView === 'dashboard' && collapsed && (
        <div className="flex-1 flex flex-col items-center py-4 gap-3">
          <button
            onClick={() => {}}
            className="p-2.5 rounded-lg bg-fathom-accent hover:bg-fathom-accent-hover text-white transition-colors"
            title="New Meeting"
          >
            <Plus size={18} />
          </button>
          {pendingMeetings.slice(0, 5).map(meeting => (
            <button
              key={meeting.id}
              onClick={() => selectMeeting(meeting.id)}
              className="p-2 rounded-lg hover:bg-fathom-hover transition-colors text-fathom-warning"
              title={meeting.title}
            >
              <Clock size={16} />
            </button>
          ))}
        </div>
      )}

      {/* Meeting View */}
      {(currentView === 'meeting') && !collapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <button
            onClick={goToDashboard}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-fathom-hover text-fathom-text-secondary hover:text-fathom-text-primary text-sm transition-colors"
          >
            <RefreshCw size={16} />
            All Meetings
          </button>
          <div className="border-t border-fathom-border-subtle pt-3">
            <h3 className="text-[11px] font-medium text-fathom-text-tertiary uppercase tracking-wider mb-2 px-1">
              Jump to
            </h3>
            <div className="space-y-1">
              {[
                { label: 'Summary', tab: 'summary' as const, icon: BarChart3 },
                { label: 'Transcript', tab: 'transcript' as const, icon: Clock },
                { label: 'Actions', tab: 'actions' as const, icon: TrendingUp },
              ].map(item => (
                <button key={item.tab} className="w-full text-left px-3 py-2 rounded-lg hover:bg-fathom-hover text-fathom-text-secondary hover:text-fathom-text-primary text-sm transition-colors flex items-center gap-2">
                  <item.icon size={14} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentView === 'meeting' && collapsed && (
        <div className="flex-1 flex flex-col items-center py-4 gap-2">
          <button onClick={goToDashboard} className="p-2 rounded-lg hover:bg-fathom-hover text-fathom-text-secondary transition-colors" title="All Meetings">
            <RefreshCw size={18} />
          </button>
          <div className="border-t border-fathom-border-subtle pt-3 w-full flex flex-col items-center gap-2">
            {[
              { label: 'Summary', tab: 'summary' as const, icon: BarChart3 },
              { label: 'Transcript', tab: 'transcript' as const, icon: Clock },
              { label: 'Actions', tab: 'actions' as const, icon: TrendingUp },
            ].map(item => (
              <button key={item.tab} className="p-2 rounded-lg hover:bg-fathom-hover text-fathom-text-secondary transition-colors" title={item.label}>
                <item.icon size={18} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User Profile Footer */}
      <div className={`border-t border-fathom-border-subtle ${collapsed ? 'p-2 flex justify-center' : 'p-4'}`}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              MR
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-fathom-text-primary truncate">Mukul Rana</p>
              <p className="text-xs text-fathom-text-tertiary truncate">mukul@company.com</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
            MR
          </div>
        )}
      </div>
    </aside>
  )
}

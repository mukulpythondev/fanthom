import { useApp } from '../context/AppContext'
import { Grid3X3, HelpCircle, Settings } from 'lucide-react'

export function Sidebar() {
  const { currentView, selectedMeeting, selectMeeting, goToDashboard, meetings } = useApp()

  const recent = [...meetings]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)

  return (
    <aside className="w-64 h-full flex flex-col bg-steno-bg border-r border-steno-border-subtle flex-shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-steno-border-subtle">
        <button onClick={goToDashboard} className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-steno-accent/15 flex items-center justify-center">
            <span className="text-steno-accent font-bold text-sm">S</span>
          </div>
          <div className="text-left">
            <h1 className="text-sm font-semibold text-steno-text-primary tracking-tight">Fable</h1>
            <p className="text-[10px] text-steno-text-tertiary -mt-0.5">Meeting clarity</p>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <div className="px-3 py-3 space-y-0.5">
        <NavItem
          icon={<Grid3X3 size={16} />}
          label="Dashboard"
          active={currentView === 'dashboard'}
          onClick={goToDashboard}
        />
        <NavItem
          icon={<Grid3X3 size={16} />}
          label="Meetings"
          active={currentView === 'search'}
          onClick={() => goToDashboard()}
        />
      </div>

      {/* Recent meetings */}
      <div className="px-3 py-3 flex-1 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-wider text-steno-text-tertiary px-2 mb-2 font-medium">
          Recent
        </p>
        <div className="space-y-0.5">
          {recent.map(m => (
            <button
              key={m.id}
              onClick={() => selectMeeting(m.id)}
              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                selectedMeeting?.id === m.id
                  ? 'bg-steno-accent-subtle text-steno-accent'
                  : 'text-steno-text-secondary hover:text-steno-text-primary hover:bg-steno-elevated'
              }`}
            >
              <div className="w-6 h-6 rounded bg-steno-elevated flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                {m.recording.thumbnail}
              </div>
              <span className="truncate">{m.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t border-steno-border-subtle space-y-0.5">
        <NavItem icon={<HelpCircle size={16} />} label="Help" onClick={() => {}} />
        <NavItem icon={<Settings size={16} />} label="Settings" onClick={() => {}} />
      </div>
    </aside>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
        active
          ? 'bg-steno-accent-subtle text-steno-accent'
          : 'text-steno-text-secondary hover:text-steno-text-primary hover:bg-steno-elevated'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

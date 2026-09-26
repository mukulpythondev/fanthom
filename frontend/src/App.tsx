import { AppProvider, useApp } from './context/AppContext'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { MeetingView } from './pages/MeetingView'
import { SearchView } from './pages/SearchView'
import { useEffect } from 'react'
import './index.css'

function AppContent() {
  const { currentView, refreshMeetings, loading, error } = useApp()

  useEffect(() => {
    refreshMeetings()
  }, [refreshMeetings])

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-steno-bg">
        <div className="text-steno-text-secondary text-sm">Loading meetings...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-steno-bg">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex bg-steno-bg overflow-hidden">
      <Sidebar />

      <main className="flex-1 h-full overflow-hidden">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'meeting' && <MeetingView />}
        {currentView === 'search' && <SearchView />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

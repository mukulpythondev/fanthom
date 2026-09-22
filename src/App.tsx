import { AppProvider, useApp } from './context/AppContext'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { MeetingView } from './pages/MeetingView'
import { SearchView } from './pages/SearchView'
import './index.css'

function AppContent() {
  const { currentView } = useApp()

  return (
    <div className="h-screen w-screen flex bg-fathom-bg overflow-hidden">
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

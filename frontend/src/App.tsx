import { useState } from 'react'
import UserPage from './pages/UserPage'
import OwnerPage from './pages/OwnerPage'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'user' | 'owner'>('user')

  return (
    <div className="app">
      <nav className="nav">
        <button
          className={activeTab === 'user' ? 'active' : ''}
          onClick={() => setActiveTab('user')}
        >
          Пользователь
        </button>
        <button
          className={activeTab === 'owner' ? 'active' : ''}
          onClick={() => setActiveTab('owner')}
        >
          Владелец
        </button>
      </nav>

      {activeTab === 'user' ? <UserPage /> : <OwnerPage />}
    </div>
  )
}

export default App

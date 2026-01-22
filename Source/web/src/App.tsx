import { CallPage } from './components/CallPage'
import { ToastProvider } from './components/Toast'

function App() {
  return (
    <ToastProvider>
      <div className="w-full h-screen bg-black flex justify-center items-center">
        {/* Mobile Constraints Container */}
        <div className="w-full h-full max-w-[430px] bg-slate-950 shadow-2xl overflow-hidden relative">
          <CallPage />
        </div>

        {/* Google Fonts & Icons Link */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0" />
      </div>
    </ToastProvider>
  )
}

export default App

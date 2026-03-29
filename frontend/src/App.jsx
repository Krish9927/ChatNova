 import { Route,Routes } from 'react-router'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import ChatPage from './pages/ChatPage'
import { useAuthStore } from './store/useAuthStore'
function App(){ 
const { authUser, login, isLoggedIn } = useAuthStore();
  console.log("auth user:", authUser);
  console.log("isLoggedIn:", isLoggedIn);
  return (
    <>
    <div className="min-h-screen bg-slate-950 text-white relative flex items-center justify-center overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />

  <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-purple-600 opacity-20 blur-[120px] rounded-full" />
  <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-cyan-500 opacity-20 blur-[120px] rounded-full" />

  <div className="relative z-10 w-full max-w-md p-6">
    <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6">
 <button onClick={login} className="z-10">
        login
      </button>

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </div>
  </div>
</div>
    </>
  )
}

export default App

import { signInWithPopup } from 'firebase/auth'
import React, { useEffect, useState } from 'react'

import { auth, googleProvider } from '../utils/firebase'
import api from '../utils/axios'
import Home from './pages/Home'
import getCurrentUser from './features/getCurrentUser'
import { useDispatch } from 'react-redux'
import { setUserdata } from './redux/userSlice'

function App() {
  const [authLoading, setAuthLoading] = useState(true)
  const dispatch = useDispatch()

  useEffect(() => {
    let isMounted = true
    const getUser = async () => {
      try {
        const data = await getCurrentUser()
        if (isMounted) {
          dispatch(setUserdata(data))
        }
      } catch (error) {
        console.error("User check failed", error)
      } finally {
        if (isMounted) {
          setAuthLoading(false)
        }
      }
    }
    getUser()
    return () => { isMounted = false }
  }, [dispatch])

  if (authLoading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-[#0d0f14] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
          <span className="text-xs text-slate-400 font-medium">Loading Hershey...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <Home />
    </>
  )
}


export default App

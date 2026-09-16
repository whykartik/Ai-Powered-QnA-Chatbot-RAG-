import { signInWithPopup } from 'firebase/auth'
import React from 'react'
import { useState } from 'react'
import { X } from 'lucide-react'
import { auth, googleProvider } from '../../utils/firebase'
import api from '../../utils/axios'
import { FcGoogle } from "react-icons/fc";
import { useDispatch, useSelector } from 'react-redux';
import { setUserdata } from '../redux/userSlice';
import SideBar from '../components/SideBar';
import ChatArea from '../components/ChatArea';
import Artifact from '../components/Artifact';
import RagChat from '../components/RagChat';

function Home() {
    const {userData}=useSelector(state=>state.user)
    const dispatch=useDispatch()
    const [ragOpen, setRagOpen] = useState(false)
    const handleLogin = async (token) => {
        try {
            const { data } = await api.post("/api/auth/login", { token })
            dispatch(setUserdata(data))
        } catch (error) {
            console.log(error)
        }
    }


    const googleLogin = async () => {
        const data = await signInWithPopup(auth, googleProvider)
        const token = await data.user.getIdToken()
        console.log(token)
        await handleLogin(token)
        console.log(data)
    }
    return (
        <div className='h-[100dvh] min-h-0 flex bg-[#0d0f14] text-white overflow-hidden'>

    {userData && <>
    <button onClick={() => setRagOpen(true)} className='fixed top-3 right-3 z-30 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium shadow-lg sm:right-5 sm:top-4'>Artifact Q&A</button>
    {ragOpen && <div className='fixed inset-x-2 bottom-2 top-14 z-40 overflow-hidden rounded-xl border border-white/[0.1] shadow-2xl sm:inset-y-4 sm:left-auto sm:right-4 sm:w-[min(92vw,440px)]'>
        <button aria-label='Close Artifact Q&A' onClick={() => setRagOpen(false)} className='absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-black/30 text-slate-300 hover:bg-black/50'>
            <X size={16} />
        </button>
        <RagChat />
    </div>}
    </>}

<SideBar/>
<ChatArea/>
<Artifact/>




{!userData &&   <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur'>
                <div className='w-[340px] bg-[#13151c] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5'>
                    <div className='flex flex-col gap-1'>
                        <h2 className='text-[17px] font-semibold text-slate-100 tracking-tight'>Welcome to Hershey</h2>
                        <p className='text-[13px] text-slate-500'>Please login to continue using the app.</p>
                    </div>

                    <button className='w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-black/90 bg-white hover:bg-gray-200  transition-all duration-150 cursor-pointer' onClick={googleLogin}>
                        <FcGoogle size={15} />
                        Continue With Google
                    </button>
                </div>
            </div>}
          
        </div>
    )
}

export default Home

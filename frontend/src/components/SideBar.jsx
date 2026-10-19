import React, { useState, useEffect } from 'react'
import { LogOut, Menu, MessageSquare, PanelLeftIcon, PanelRight, PenSquare, Plus, User, X } from "lucide-react"
import { getConversations } from '../features/getConversations'
import getMessages from '../features/getMessages'

import { useDispatch, useSelector } from 'react-redux'
import { addConversation, setConversations, setSelectedConversation } from '../redux/conversationSlice'
import { setMessages, setArtifacts } from '../redux/messageSlice'
import { createConversation } from '../features/createConversation'
import logOut from '../features/logOut'
import { setUserdata } from '../redux/userSlice'
import { cleanupPdfContext } from '../features/cleanupPdfContext'

function SideBar() {
    const [collapsed, setCollapsed] = useState(false)
    const [imageError, setImageError] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [isLoadingConversations, setIsLoadingConversations] = useState(false)

    const dispatch = useDispatch()
    const { conversations, selectedConversation } = useSelector(state => state.conversation)
    const { userData } = useSelector(state => state.user)

    useEffect(() => {
        if (!userData?._id) {
            dispatch(setConversations([]))
            return
        }

        let isMounted = true
        const getConv = async () => {
            if (isLoadingConversations) return
            setIsLoadingConversations(true)
            try {
                const data = await getConversations()
                if (isMounted && data) {
                    dispatch(setConversations(data))
                }
            } catch (error) {
                console.error("Failed to load conversations", error)
            } finally {
                if (isMounted) {
                    setIsLoadingConversations(false)
                }
            }
        }
        getConv()
        return () => { isMounted = false }
    }, [userData?._id])

    const handleNewChat = async () => {
        if (selectedConversation?._id) {
            await cleanupPdfContext(selectedConversation._id)
        }
        dispatch(setSelectedConversation(null))
        dispatch(setMessages([]))
        dispatch(setArtifacts([]))
        setMobileOpen(false)
    }

    const handleSelectConversation = async (conv) => {
        dispatch(setSelectedConversation(conv))
        setMobileOpen(false)
        if (conv?._id) {
            const data = await getMessages(conv._id)
            if (data && Array.isArray(data)) {
                dispatch(setMessages(data))
                const latestArtifact = [...data].reverse().find(msg => msg.artifacts && msg.artifacts.length > 0)
                dispatch(setArtifacts(latestArtifact?.artifacts || []))
            }
        }
    }

    const renderSidebarContent = (isMobile = false) => (
        <div className='flex flex-col h-full select-none'>
            <div className='flex items-center gap-2.5 px-4 py-3.5 border-b border-white/[0.06] shrink-0'>
                {!isMobile ? (
                    <button
                        className='hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors bg-transparent border-none cursor-pointer'
                        onClick={() => setCollapsed(true)}
                        title="Collapse sidebar"
                    >
                        <PanelLeftIcon size={16} />
                    </button>
                ) : (
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors bg-transparent border-none cursor-pointer"
                        title="Close sidebar"
                    >
                        <X size={16}/>
                    </button>
                )}

                <span className='text-[15px] font-semibold text-slate-100 tracking-tight flex-1 truncate'>
                    Hershey
                </span>

                <span className='text-[10px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full tracking-wide uppercase'>
                    {userData?.plan || "free"}
                </span>

                <button
                    className='flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors bg-transparent border-none cursor-pointer'
                    onClick={handleNewChat}
                    title="New Chat"
                >
                    <PenSquare size={14} />
                </button>
            </div>

            <div className='px-3 pt-3 pb-2 shrink-0'>
                <button
                    className='w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-linear-to-br from-indigo-500 to-violet-700 rounded-xl py-2.5 border-none cursor-pointer hover:opacity-95 shadow-md shadow-indigo-500/20 transition-all duration-150'
                    onClick={handleNewChat}
                >
                    <Plus size={15} />
                    New Chat
                </button>
            </div>

            <div className='px-4 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-widest text-slate-500 shrink-0'>
                {conversations?.length === 0 ? "No Recent Chats" : "Recents"}
            </div>

            <div className='flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-0.5'>
                {conversations?.map((conv, i) => {
                    const isActive = selectedConversation?._id === conv?._id
                    return (
                        <div
                            key={conv?._id || i}
                            onClick={() => handleSelectConversation(conv)}
                            className={`flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-xl border transition-colors duration-150 ${
                                isActive
                                    ? "bg-indigo-500/10 border-indigo-500/[0.22] text-white"
                                    : "bg-transparent border-transparent hover:bg-white/[0.04] text-slate-300"
                            }`}
                        >
                            <div className={`flex items-center justify-center shrink-0 w-6 h-6 rounded-lg transition-colors ${
                                isActive ? "bg-indigo-500/20 text-indigo-400" : "bg-white/[0.04] text-slate-500"
                            }`}>
                                <MessageSquare size={13} />
                            </div>
                            <span className='text-[13px] font-medium truncate flex-1'>
                                {conv?.title || "New Chat"}
                            </span>
                        </div>
                    )
                })}
            </div>

            <div className='mx-3 h-px bg-white/[0.06] shrink-0' />

            <div className='p-3 shrink-0'>
                {userData ? (
                    <div className='flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-white/[0.04] transition-colors'>
                        <div className='relative shrink-0'>
                            {userData?.avatar && !imageError ? (
                                <img
                                    className='w-8 h-8 rounded-lg object-cover border border-indigo-500/30'
                                    src={userData?.avatar}
                                    alt="Avatar"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className='w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-slate-400'>
                                    <User size={15} />
                                </div>
                            )}
                        </div>
                        <div className='flex-1 min-w-0'>
                            <p className='text-[13px] font-semibold text-slate-200 truncate leading-tight'>
                                {userData?.name || "User"}
                            </p>
                            <p className='text-[10px] text-slate-500 mt-0.5 truncate uppercase tracking-wider'>
                                {userData?.plan ? `${userData.plan} plan` : "Free plan"}
                            </p>
                        </div>
                        <button
                            className='flex items-center justify-center w-7 h-7 rounded-lg border-none bg-transparent text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer'
                            onClick={() => {
                                logOut()
                                dispatch(setUserdata(null))
                            }}
                            title="Log Out"
                        >
                            <LogOut size={15} />
                        </button>
                    </div>
                ) : (
                    <div className='text-xs text-slate-500 text-center py-2'>Not signed in</div>
                )}
            </div>
        </div>
    )

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                className='md:hidden fixed top-3 left-3 z-40 flex items-center justify-center w-9 h-9 rounded-xl bg-[#13151c] border border-white/10 text-slate-300 hover:text-white shadow-lg cursor-pointer'
                onClick={() => setMobileOpen(true)}
                title="Open menu"
            >
                <Menu size={16} />
            </button>

            {/* Mobile drawer */}
            {mobileOpen && (
                <>
                    <div
                        onClick={() => setMobileOpen(false)}
                        className='md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs'
                    />
                    <aside className='md:hidden fixed inset-y-0 left-0 z-50 w-[260px] h-full bg-[#0d0f14] border-r border-white/[0.08] shadow-2xl flex flex-col'>
                        {renderSidebarContent(true)}
                    </aside>
                </>
            )}

            {/* Desktop Sidebar: Collapsed view */}
            {collapsed && (
                <aside className='hidden md:flex flex-col items-center w-[56px] h-full bg-[#0d0f14] border-r border-white/[0.06] py-3.5 gap-2 shrink-0 z-20'>
                    <button
                        className='flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors bg-transparent border-none cursor-pointer'
                        onClick={() => setCollapsed(false)}
                        title="Expand sidebar"
                    >
                        <PanelRight size={16} />
                    </button>

                    <button
                        className='flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors bg-transparent border-none cursor-pointer'
                        onClick={handleNewChat}
                        title="New Chat"
                    >
                        <Plus size={16} />
                    </button>

                    <div className='flex-1 overflow-y-auto px-1.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-3 space-y-1'>
                        {conversations?.map((conv, i) => {
                            const isActive = selectedConversation?._id === conv?._id
                            return (
                                <button
                                    key={conv?._id || i}
                                    onClick={() => handleSelectConversation(conv)}
                                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer border ${
                                        isActive
                                            ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
                                            : "bg-transparent border-transparent hover:bg-white/[0.05] text-slate-500"
                                    }`}
                                    title={conv?.title || "Chat"}
                                >
                                    <MessageSquare size={13} />
                                </button>
                            )
                        })}
                    </div>

                    <div className='shrink-0 pt-2'>
                        {userData?.avatar && !imageError ? (
                            <img
                                className='w-8 h-8 rounded-lg object-cover border border-indigo-500/25'
                                src={userData?.avatar}
                                alt="User"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className='w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-slate-400'>
                                <User size={14} />
                            </div>
                        )}
                    </div>
                </aside>
            )}

            {/* Desktop Sidebar: Expanded view */}
            {!collapsed && (
                <aside className='hidden md:flex flex-col w-[260px] h-full bg-[#0d0f14] border-r border-white/[0.06] shrink-0 z-20'>
                    {renderSidebarContent(false)}
                </aside>
            )}
        </>
    )
}

export default SideBar

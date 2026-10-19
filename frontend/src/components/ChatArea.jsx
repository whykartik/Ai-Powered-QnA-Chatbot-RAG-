import { useEffect } from 'react'
import Nav from './Nav'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import { useDispatch, useSelector } from 'react-redux'
import getMessages from '../features/getMessages'
import { setArtifacts, setMessages } from '../redux/messageSlice'

function ChatArea() {
  const {selectedConversation}=useSelector(state=>state.conversation)
  const dispatch=useDispatch()

  useEffect(() => {
    let isMounted = true
    const getMesg = async () => {
      if (selectedConversation?._id && selectedConversation.title !== "New Chat") {
        const data = await getMessages(selectedConversation._id)
        if (isMounted && data && Array.isArray(data) && data.length > 0) {
          dispatch(setMessages(data))
          const latestArtifactMessage = [...data].reverse().find(msg => msg.artifacts && msg.artifacts.length > 0)
          dispatch(setArtifacts(latestArtifactMessage?.artifacts || []))
        }
      }
    }

    getMesg()
    return () => { isMounted = false }
  }, [dispatch, selectedConversation?._id, selectedConversation?.title])


  return (
    <div className='flex-1 flex min-h-0 min-w-0 flex-col'>
      <Nav/>
      <MessageList/>
      <ChatInput/>
    </div>
  )
}

export default ChatArea

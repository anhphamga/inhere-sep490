import { useEffect, useMemo, useState } from 'react'
import { sendChatMessageApi } from '../../services/chat.service'
import { useAuth } from '../../contexts/AuthContext'

const SESSION_KEY = 'inhere_chat_session_id'

const createSessionId = () => `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const resolveUserId = (user) => user?._id || user?.id || user?.userId || null

const AssistantPage = () => {
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [lang, setLang] = useState('vi')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const role = useMemo(() => (user?.role || 'customer').toLowerCase(), [user?.role])
  const userId = useMemo(() => resolveUserId(user), [user])

  useEffect(() => {
    const existing = localStorage.getItem(SESSION_KEY)
    if (existing) {
      setSessionId(existing)
      return
    }

    const generated = createSessionId()
    localStorage.setItem(SESSION_KEY, generated)
    setSessionId(generated)
  }, [])

  const handleSend = async (event) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || loading) return

    setError('')
    setLoading(true)
    setInput('')
    const userMessage = {
      _id: `u_${Date.now()}`,
      role: 'user',
      content: message,
    }
    setMessages((prev) => [...prev, userMessage])

    try {
      const response = await sendChatMessageApi({
        message,
        sessionId,
        userId: userId || undefined,
        pageContext: {
          page: '/assistant',
          lang,
          role,
        },
      })

      const assistantMessage = {
        _id: `a_${Date.now()}`,
        role: 'assistant',
        content: response?.data?.answer || (lang === 'en' ? 'No answer.' : 'Không có phản hồi.'),
        matchedLayer: response?.data?.matchedLayer || '',
        confidence: response?.data?.confidence ?? null,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Unable to send message')
      setMessages((prev) => prev.filter((item) => item._id !== userMessage._id))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-[300px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-900">AI Assistant</h1>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            >
              <option value="vi">VI</option>
              <option value="en">EN</option>
            </select>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <div>Session: {sessionId || '-'}</div>
            <div>Role: {role}</div>
            <div>Messages: {messages.length}</div>
          </div>
        </aside>

        <section className="flex min-h-[70vh] flex-col rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Conversation</h2>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((item) => (
              <div key={item._id} className={item.role === 'assistant' ? 'text-left' : 'text-right'}>
                <div
                  className={`inline-block max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    item.role === 'assistant' ? 'bg-slate-100 text-slate-800' : 'bg-blue-600 text-white'
                  }`}
                >
                  {item.content}
                </div>
                {item.role === 'assistant' && (
                  <div className="mt-1 text-xs text-slate-500">
                    Layer: {item.matchedLayer || '-'} | Confidence:{' '}
                    {typeof item.confidence === 'number' ? item.confidence.toFixed(2) : '-'}
                  </div>
                )}
              </div>
            ))}
            {messages.length === 0 && <p className="text-sm text-slate-500">Start a conversation.</p>}
          </div>
          <form onSubmit={handleSend} className="border-t border-slate-200 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={lang === 'en' ? 'Type your message...' : 'Nhap cau hoi...'}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </form>
        </section>
      </div>
    </div>
  )
}

export default AssistantPage

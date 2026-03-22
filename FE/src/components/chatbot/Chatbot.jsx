import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { sendChatMessage } from '../../api/chatbotApi'

const MAX_INPUT_LENGTH = 1200
const CHAT_HISTORY_KEY = 'inhere_chatbot_history_v1'
const MAX_HISTORY_ITEMS = 60

const initialMessages = [
  {
    id: 'welcome-bot',
    role: 'bot',
    text: 'Xin chao! Toi la tro ly INHERE. Ban co the hoi ve thong tin tai khoan, don hang, hoac goi y san pham.',
    type: 'TEXT',
    data: null,
  },
]

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY)
    if (!raw) return initialMessages

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return initialMessages
    }

    return parsed
      .filter((item) => item && typeof item === 'object')
      .slice(-MAX_HISTORY_ITEMS)
  } catch {
    return initialMessages
  }
}

function Chatbot() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState(loadHistory)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)
  const hadTokenRef = useRef(Boolean(token))

  const canSend = useMemo(() => {
    const trimmed = input.trim()
    return trimmed.length > 0 && trimmed.length <= MAX_INPUT_LENGTH && !loading
  }, [input, loading])

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }

  const addMessage = (role, text, options = {}) => {
    setMessages((prev) => ([
      ...prev,
      {
        id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role,
        text,
        type: options.type || 'TEXT',
        data: options.data || null,
      },
    ]))

    requestAnimationFrame(scrollToBottom)
  }

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-MAX_HISTORY_ITEMS)))
    } catch {
      // ignore storage write errors
    }
  }, [messages])

  useEffect(() => {
    const hadToken = hadTokenRef.current
    const hasTokenNow = Boolean(token)

    if (hadToken && !hasTokenNow) {
      localStorage.removeItem(CHAT_HISTORY_KEY)
      setMessages(initialMessages)
    }

    hadTokenRef.current = hasTokenNow
  }, [token])

  const onSubmit = async (event) => {
    event.preventDefault()

    const trimmed = input.trim()
    if (!trimmed) {
      setError('Vui long nhap cau hoi.')
      return
    }

    if (trimmed.length > MAX_INPUT_LENGTH) {
      setError(`Cau hoi qua dai. Gioi han ${MAX_INPUT_LENGTH} ky tu.`)
      return
    }

    setError('')
    setLoading(true)
    setInput('')
    addMessage('user', trimmed)

    try {
      const result = await sendChatMessage({ message: trimmed })
      const botPayload = result?.data || {}

      if (botPayload?.type === 'PRODUCT_LIST') {
        addMessage(
          'bot',
          botPayload?.message || 'Duoi day la mot so san pham ban co the tham khao:',
          {
            type: 'PRODUCT_LIST',
            data: Array.isArray(botPayload?.data) ? botPayload.data : [],
          }
        )
      } else if (botPayload?.type === 'ORDER') {
        addMessage(
          'bot',
          botPayload?.message || 'Duoi day la danh sach don hang cua ban:',
          {
            type: 'ORDER',
            data: Array.isArray(botPayload?.data) ? botPayload.data : [],
          }
        )
      } else {
        const answer = botPayload?.answer || 'Khong nhan duoc cau tra loi hop le.'
        addMessage('bot', answer)
      }
    } catch (apiError) {
      const message = apiError?.response?.data?.error?.message
        || apiError?.message
        || 'Chatbot tam thoi khong kha dung.'
      setError(message)
      addMessage('bot', `Loi: ${message}`)
    } finally {
      setLoading(false)
      requestAnimationFrame(scrollToBottom)
    }
  }

  if (!open) {
    return (
      <div className='fixed bottom-5 right-5 z-[60]'>
        <button
          type='button'
          className='cursor-pointer rounded-full bg-gradient-to-br from-teal-700 to-emerald-800 px-4 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(6,95,70,0.3)]'
          onClick={() => setOpen(true)}
        >
          Mo Chatbot
        </button>
      </div>
    )
  }

  return (
    <div className='fixed bottom-5 right-5 z-[60] font-sans'>
      <div
        className={`flex flex-col overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-teal-50 shadow-[0_20px_40px_rgba(15,118,110,0.2)] ${expanded ? 'h-[min(88vh,760px)] w-[min(92vw,760px)]' : 'h-[min(520px,calc(100vh-86px))] w-[min(360px,calc(100vw-24px))]'}`}
      >
        <div className='flex items-center justify-between bg-teal-700 px-3.5 py-3 font-bold text-white'>
          <span>InHere Chatbot</span>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              className='cursor-pointer rounded-md bg-white/15 px-2 py-1 text-xs font-semibold text-white hover:bg-white/25'
              onClick={() => setExpanded((prev) => !prev)}
              aria-label={expanded ? 'Thu nho khung chat' : 'Phong to khung chat'}
              title={expanded ? 'Thu nho' : 'Phong to'}
            >
              {expanded ? (
                <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                  <path d='M4 8V4h4M16 12v4h-4M8 16H4v-4M12 4h4v4' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              ) : (
                <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                  <rect x='4' y='4' width='12' height='12' rx='1.5' />
                </svg>
              )}
            </button>
            <button type='button' className='cursor-pointer bg-transparent text-xl leading-none text-white' onClick={() => setOpen(false)}>
              x
            </button>
          </div>
        </div>

        <div className='flex min-h-0 flex-1 flex-col'>
          <div className='min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain p-3' ref={listRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[92%] break-words rounded-xl border px-3 py-2.5 text-sm ${msg.role === 'user' ? 'ml-auto border-teal-900 bg-teal-900 text-white' : 'mr-auto border-emerald-100 bg-white text-slate-800'}`}
            >
              <div>{msg.text}</div>

              {msg.role === 'bot' && msg.type === 'PRODUCT_LIST' && Array.isArray(msg.data) && msg.data.length > 0 && (
                <div className='mt-2.5 flex flex-col gap-2'>
                  {msg.data.map((item, index) => (
                    <div className='flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-2' key={`${item.name}-${index}`}>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name || 'San pham'}
                          className='h-14 w-14 flex-shrink-0 rounded-md bg-slate-200 object-cover'
                        />
                      ) : (
                        <div className='flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md bg-slate-200 text-[10px] font-semibold text-slate-500'>No img</div>
                      )}

                      <div className='min-w-0'>
                        <div className='line-clamp-2 text-[13px] font-semibold text-slate-900'>{item.name || 'San pham'}</div>
                        <div className='mt-0.5 text-xs font-bold text-teal-700'>
                          {Number(item.price || 0).toLocaleString('vi-VN')} VND
                        </div>

                        {item.detailUrl && (
                          <a className='mt-1 inline-flex rounded-full bg-slate-700 px-2 py-1 text-[11px] font-bold text-white no-underline' href={item.detailUrl}>
                            Chi tiet
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {msg.role === 'bot' && msg.type === 'ORDER' && Array.isArray(msg.data) && msg.data.length > 0 && (
                <div className='mt-2.5 flex flex-col gap-2'>
                  {msg.data.map((item, index) => {
                    const isOrderCard = item && typeof item === 'object' && item.id && item.status
                    if (!isOrderCard) {
                      return null
                    }

                    const orderTypeLabel = item.orderType === 'rent' ? 'Don thue' : 'Don mua'
                    const defaultUrl = item.orderType === 'rent' ? `/rental/${item.id}` : null
                    const detailUrl = item.detailUrl || defaultUrl

                    return (
                      <div className='rounded-lg border border-slate-200 bg-slate-50 p-2.5' key={`${item.id}-${index}`}>
                        <div className='text-[12px] font-semibold uppercase tracking-wide text-slate-500'>{orderTypeLabel}</div>
                        <div className='mt-1 text-[13px] font-semibold text-slate-900'>Ma don: {String(item.id).slice(-8)}</div>
                        <div className='mt-0.5 text-[12px] text-slate-700'>Trang thai: {item.status || '-'}</div>
                        {item.createdAt && (
                          <div className='mt-0.5 text-[12px] text-slate-700'>Ngay tao: {new Date(item.createdAt).toLocaleDateString('vi-VN')}</div>
                        )}
                        {typeof item.totalAmount !== 'undefined' && (
                          <div className='mt-0.5 text-[12px] font-semibold text-teal-700'>Tong tien: {Number(item.totalAmount || 0).toLocaleString('vi-VN')} VND</div>
                        )}

                        {detailUrl && (
                          <button
                            type='button'
                            className='mt-2 inline-flex rounded-full bg-slate-700 px-2.5 py-1 text-[11px] font-bold text-white'
                            onClick={() => navigate(detailUrl)}
                          >
                            Xem chi tiet
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <div className='mx-3 mt-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700'>{error}</div>}
        {loading && <div className='px-3 pb-2 text-[13px] italic text-teal-700'>Dang xu ly...</div>}

        <form className='flex gap-2 border-t border-emerald-100 bg-white/80 p-2.5' onSubmit={onSubmit}>
          <input
            type='text'
            className='flex-1 rounded-xl border border-emerald-300 px-3 py-2.5 text-sm outline-none focus:border-teal-700'
            placeholder='Nhap cau hoi...'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={MAX_INPUT_LENGTH + 20}
          />
          <button
            type='submit'
            className='cursor-pointer rounded-xl bg-teal-700 px-3.5 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60'
            disabled={!canSend}
          >
            Gui
          </button>
        </form>
        </div>
      </div>
    </div>
  )
}

export default Chatbot

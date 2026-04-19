import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { sendChatMessage } from '../../api/chatbotApi'

const MAX_INPUT_LENGTH = 1200
const CHAT_HISTORY_KEY = 'inhere_chatbot_history_v1'
const MAX_HISTORY_ITEMS = 60

const ORDER_TYPE_LABELS = {
  rent: 'Đơn thuê',
  sale: 'Đơn mua',
}

const ORDER_STATUS_LABELS = {
  Draft: 'Nháp',
  PendingDeposit: 'Chờ đặt cọc',
  Deposited: 'Đã đặt cọc',
  Confirmed: 'Đã xác nhận',
  WaitingPickup: 'Chờ nhận đồ',
  Renting: 'Đang thuê',
  WaitingReturn: 'Chờ trả đồ',
  Returned: 'Đã trả đồ',
  Completed: 'Hoàn tất',
  NoShow: 'Không đến nhận',
  Late: 'Trễ hạn',
  Compensation: 'Bồi thường',
  Cancelled: 'Đã hủy',
  PendingPayment: 'Chờ thanh toán',
  PendingConfirmation: 'Chờ xác nhận',
  Paid: 'Đã thanh toán',
  Shipping: 'Đang giao hàng',
  Refunded: 'Đã hoàn tiền',
}

const getOrderTypeLabel = (type) => ORDER_TYPE_LABELS[type] || 'Đơn hàng'
const getOrderStatusLabel = (status) => ORDER_STATUS_LABELS[status] || status || '-'

const getProductRemainingQuantity = (item = {}) => {
  const availableQuantity = Number(item?.availableQuantity)
  if (Number.isFinite(availableQuantity)) {
    return availableQuantity
  }

  const stockCount = Number(item?.stockCount)
  if (Number.isFinite(stockCount)) {
    return stockCount
  }

  return 0
}

const getProductStockLabel = (item = {}) => {
  const remaining = getProductRemainingQuantity(item)
  return remaining > 0 ? `Còn ${remaining} sản phẩm` : 'Hết hàng'
}

const initialMessages = [
  {
    id: 'welcome-bot',
    role: 'bot',
    text: 'Xin chào! Tôi là trợ lý INHERE. Bạn có thể hỏi về thông tin tài khoản, đơn hàng, hoặc gợi ý sản phẩm.',
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
  const location = useLocation()
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
        meta: options.meta || null,
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

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('openChatbot') !== '1') return

    setOpen(true)

    params.delete('openChatbot')
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
        hash: location.hash,
      },
      { replace: true }
    )
  }, [location.hash, location.pathname, location.search, navigate])

  const onSubmit = async (event) => {
    event.preventDefault()

    const trimmed = input.trim()
    if (!trimmed) {
      setError('Vui lòng nhập câu hỏi.')
      return
    }

    if (trimmed.length > MAX_INPUT_LENGTH) {
      setError(`Câu hỏi quá dài. Giới hạn ${MAX_INPUT_LENGTH} ký tự.`)
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
          botPayload?.message || 'Dưới đây là một số sản phẩm bạn có thể tham khảo:',
          {
            type: 'PRODUCT_LIST',
            data: Array.isArray(botPayload?.data) ? botPayload.data : [],
            meta: botPayload?.meta || null,
          }
        )
      } else if (botPayload?.type === 'ORDER') {
        addMessage(
          'bot',
          botPayload?.message || 'Dưới đây là danh sách đơn hàng của bạn:',
          {
            type: 'ORDER',
            data: Array.isArray(botPayload?.data) ? botPayload.data : [],
          }
        )
      } else {
        const answer = botPayload?.answer || 'Không nhận được câu trả lời hợp lệ.'
        addMessage('bot', answer)
      }
    } catch (apiError) {
      const message = apiError?.response?.data?.error?.message
        || apiError?.message
        || 'Chatbot tạm thời không khả dụng.'
      setError(message)
      addMessage('bot', `Lỗi: ${message}`)
    } finally {
      setLoading(false)
      requestAnimationFrame(scrollToBottom)
    }
  }

  const handleLoadMoreProducts = async (meta = {}) => {
    if (loading) {
      return
    }

    const prompt = meta?.loadMorePrompt || 'xem thêm sản phẩm'
    setError('')
    setLoading(true)
    addMessage('user', 'Xem thêm sản phẩm')

    try {
      const result = await sendChatMessage({ message: prompt })
      const botPayload = result?.data || {}

      if (botPayload?.type === 'PRODUCT_LIST') {
        addMessage(
          'bot',
          botPayload?.message || 'Đã tải thêm sản phẩm.',
          {
            type: 'PRODUCT_LIST',
            data: Array.isArray(botPayload?.data) ? botPayload.data : [],
            meta: botPayload?.meta || null,
          }
        )
      } else {
        addMessage('bot', botPayload?.answer || 'Không nhận được kết quả hợp lệ.')
      }
    } catch (apiError) {
      const message = apiError?.response?.data?.error?.message
        || apiError?.message
        || 'Chatbot tạm thời không khả dụng.'
      setError(message)
      addMessage('bot', `Lỗi: ${message}`)
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
          Chatbot
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
                          alt={item.name || 'Sản phẩm'}
                          className='h-14 w-14 flex-shrink-0 rounded-md bg-slate-200 object-cover'
                        />
                      ) : (
                        <div className='flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md bg-slate-200 text-[10px] font-semibold text-slate-500'>Không có ảnh</div>
                      )}

                      <div className='min-w-0'>
                        <div className={`text-[11px] font-semibold ${getProductRemainingQuantity(item) > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {getProductStockLabel(item)}
                        </div>
                        <div className='line-clamp-2 text-[13px] font-semibold text-slate-900'>{item.name || 'Sản phẩm'}</div>
                        <div className='mt-0.5 text-xs font-bold text-teal-700'>
                          {Number(item.price || 0).toLocaleString('vi-VN')} VND
                        </div>

                        {item.detailUrl && (
                          <a className='mt-1 inline-flex rounded-full bg-slate-700 px-2 py-1 text-[11px] font-bold text-white no-underline' href={item.detailUrl}>
                            Chi tiết
                          </a>
                        )}
                      </div>
                    </div>
                  ))}

                  {msg?.meta?.canLoadMore && (
                    <button
                      type='button'
                      className='cursor-pointer rounded-full bg-teal-700 px-3 py-1.5 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60'
                      onClick={() => handleLoadMoreProducts(msg?.meta || {})}
                      disabled={loading}
                    >
                      Xem thêm
                    </button>
                  )}
                </div>
              )}

              {msg.role === 'bot' && msg.type === 'ORDER' && Array.isArray(msg.data) && msg.data.length > 0 && (
                <div className='mt-2.5 flex flex-col gap-2'>
                  {msg.data.map((item, index) => {
                    const isOrderCard = item && typeof item === 'object' && item.id && item.status
                    if (!isOrderCard) {
                      return null
                    }

                    const orderTypeLabel = getOrderTypeLabel(item.orderType)
                    const defaultUrl = item.orderType === 'rent' ? `/rental/${item.id}` : `/orders/${item.id}`
                    const detailUrl = item.detailUrl || defaultUrl

                    return (
                      <div className='rounded-lg border border-slate-200 bg-slate-50 p-2.5' key={`${item.id}-${index}`}>
                        <div className='text-[12px] font-semibold uppercase tracking-wide text-slate-500'>{orderTypeLabel}</div>
                        <div className='mt-1 text-[13px] font-semibold text-slate-900'>Mã đơn: {String(item.id).slice(-8)}</div>
                        <div className='mt-0.5 text-[12px] text-slate-700'>Trạng thái: {getOrderStatusLabel(item.status)}</div>
                        {item.createdAt && (
                          <div className='mt-0.5 text-[12px] text-slate-700'>Ngày tạo: {new Date(item.createdAt).toLocaleDateString('vi-VN')}</div>
                        )}
                        {typeof item.totalAmount !== 'undefined' && (
                          <div className='mt-0.5 text-[12px] font-semibold text-teal-700'>Tổng tiền: {Number(item.totalAmount || 0).toLocaleString('vi-VN')} VND</div>
                        )}

                        {detailUrl && (
                          <button
                            type='button'
                            className='mt-2 inline-flex rounded-full bg-slate-700 px-2.5 py-1 text-[11px] font-bold text-white'
                            onClick={() => navigate(detailUrl)}
                          >
                            Xem chi tiết
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
        {loading && <div className='px-3 pb-2 text-[13px] italic text-teal-700'>Đang xử lý...</div>}

        <form className='flex gap-2 border-t border-emerald-100 bg-white/80 p-2.5' onSubmit={onSubmit}>
          <input
            type='text'
            className='flex-1 rounded-xl border border-emerald-300 px-3 py-2.5 text-sm outline-none focus:border-teal-700'
            placeholder='Nhập câu hỏi...'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={MAX_INPUT_LENGTH + 20}
          />
          <button
            type='submit'
            className='cursor-pointer rounded-xl bg-teal-700 px-3.5 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60'
            disabled={!canSend}
          >
            Gửi
          </button>
        </form>
        </div>
      </div>
    </div>
  )
}

export default Chatbot

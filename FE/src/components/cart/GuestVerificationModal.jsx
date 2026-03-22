import { useEffect, useMemo, useState } from 'react'
import { Loader2, Mail, ShieldCheck, Smartphone, X } from 'lucide-react'
import {
  sendEmailCodeApi,
  sendPhoneOtpApi,
  verifyEmailCodeApi,
  verifyPhoneOtpApi
} from '../../services/guest.service'

const defaultSendState = {
  sent: false,
  resendCount: 0,
  maxResends: 3,
  expiresAt: ''
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+?[0-9]{9,15}$/

const getMethodLabel = (method) => (method === 'phone' ? 'số điện thoại' : 'email')

export default function GuestVerificationModal({
  open,
  initialVerification,
  onClose,
  onSuccess
}) {
  const [method, setMethod] = useState(initialVerification?.method || 'phone')
  const [phone, setPhone] = useState(initialVerification?.phone || '')
  const [email, setEmail] = useState(initialVerification?.email || '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [sendLoading, setSendLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [phoneState, setPhoneState] = useState(defaultSendState)
  const [emailState, setEmailState] = useState(defaultSendState)
  const [timeLeftLabel, setTimeLeftLabel] = useState('')

  useEffect(() => {
    if (!open) return

    setMethod(initialVerification?.method || 'phone')
    setPhone(initialVerification?.phone || '')
    setEmail(initialVerification?.email || '')
    setCode('')
    setError('')
    setInfo('')
    setPhoneState(defaultSendState)
    setEmailState(defaultSendState)
    setTimeLeftLabel('')
  }, [initialVerification?.email, initialVerification?.method, initialVerification?.phone, open])

  useEffect(() => {
    setCode('')
    setError('')
    setInfo('')
  }, [method])

  const activeState = method === 'phone' ? phoneState : emailState
  const normalizedPhone = phone.replace(/\s+/g, '').trim()
  const normalizedEmail = email.trim().toLowerCase()
  const canSendCode = method === 'phone'
    ? PHONE_REGEX.test(normalizedPhone)
    : EMAIL_REGEX.test(normalizedEmail)
  const canVerify = activeState.sent && code.trim().length > 0

  useEffect(() => {
    if (!open || !activeState.expiresAt) {
      setTimeLeftLabel('')
      return
    }

    const updateCountdown = () => {
      const diff = new Date(activeState.expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeftLabel('00:00')
        return
      }

      const totalSeconds = Math.floor(diff / 1000)
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
      const seconds = String(totalSeconds % 60).padStart(2, '0')
      setTimeLeftLabel(`${minutes}:${seconds}`)
    }

    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(timer)
  }, [activeState.expiresAt, open])

  const isVerified = useMemo(() => {
    if (method === 'phone') return Boolean(initialVerification?.phoneVerified)
    return Boolean(initialVerification?.emailVerified)
  }, [initialVerification?.emailVerified, initialVerification?.phoneVerified, method])

  if (!open) return null

  const handleSendCode = async () => {
    setError('')
    setInfo('')
    setCode('')

    if (!canSendCode) {
      setError(method === 'phone' ? 'Số điện thoại không hợp lệ.' : 'Email không hợp lệ.')
      return
    }

    setSendLoading(true)

    try {
      if (method === 'phone') {
        const response = await sendPhoneOtpApi({ phone: normalizedPhone })
        setPhoneState({
          sent: true,
          resendCount: response.data?.resendCount || 0,
          maxResends: response.data?.maxResends || 3,
          expiresAt: response.data?.expiresAt || ''
        })
        setInfo(response.message || 'Đã gửi OTP đến số điện thoại.')
      } else {
        const response = await sendEmailCodeApi({ email: normalizedEmail })
        setEmailState({
          sent: true,
          resendCount: response.data?.resendCount || 0,
          maxResends: response.data?.maxResends || 3,
          expiresAt: response.data?.expiresAt || ''
        })
        setInfo(response.message || 'Đã gửi mã xác minh đến email.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi mã xác minh.')
    } finally {
      setSendLoading(false)
    }
  }

  const handleVerify = async () => {
    setError('')
    setInfo('')

    if (!canVerify) {
      setError(method === 'phone' ? 'Vui lòng gửi OTP trước khi xác minh.' : 'Vui lòng gửi mã email trước khi xác minh.')
      return
    }

    setVerifyLoading(true)

    try {
      const response =
        method === 'phone'
          ? await verifyPhoneOtpApi({ phone: normalizedPhone, otp: code.trim() })
          : await verifyEmailCodeApi({ email: normalizedEmail, code: code.trim() })

      onSuccess?.({
        verificationToken: response.data?.verificationToken || '',
        guestVerification: response.data?.guestVerification || null
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xác minh mã.')
    } finally {
      setVerifyLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-3 py-6">
      <div className="w-full max-w-lg rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-500">Guest checkout</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Xác minh thông tin trước khi thanh toán</h2>
            <p className="mt-1 text-sm text-slate-500">Bạn chỉ cần xác minh một phương thức để tiếp tục.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMethod('phone')}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                method === 'phone' ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <Smartphone className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Xác minh bằng số điện thoại</p>
                  <p className="text-sm text-slate-500">Nhập số và nhận OTP.</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMethod('email')}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                method === 'email' ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                  <Mail className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Xác minh bằng email</p>
                  <p className="text-sm text-slate-500">Nhận mã xác minh qua Gmail.</p>
                </div>
              </div>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {method === 'phone' ? 'Số điện thoại' : 'Email'}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type={method === 'phone' ? 'tel' : 'email'}
                value={method === 'phone' ? phone : email}
                onChange={(event) => {
                  if (method === 'phone') {
                    setPhone(event.target.value)
                    setPhoneState(defaultSendState)
                  } else {
                    setEmail(event.target.value)
                    setEmailState(defaultSendState)
                  }
                }}
                placeholder={method === 'phone' ? 'Ví dụ: 0901234567' : 'you@gmail.com'}
                className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-slate-400"
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendLoading || !canSendCode || activeState.resendCount >= activeState.maxResends}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {sendLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : activeState.sent ? 'Gửi lại mã' : 'Gửi mã'}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>Mã hết hạn sau 5 phút.</span>
              {timeLeftLabel && <span>Còn lại: {timeLeftLabel}</span>}
              <span>Đã gửi: {activeState.resendCount}/{activeState.maxResends}</span>
              {activeState.expiresAt && <span>Hết hạn lúc: {new Date(activeState.expiresAt).toLocaleTimeString('vi-VN')}</span>}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {method === 'phone' ? 'Nhập OTP' : 'Nhập mã xác minh'}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={method === 'phone' ? '6 số OTP' : '6 số mã xác minh'}
                className="min-h-11 flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 tracking-[0.35em] outline-none transition focus:border-slate-400"
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifyLoading || !canVerify}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {verifyLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Xác minh
              </button>
            </div>
          </div>

          {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>}
          {info && <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-700">{info}</p>}

          {isVerified && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4" />
                <p>Bạn đã xác minh thành công bằng {getMethodLabel(method)}.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

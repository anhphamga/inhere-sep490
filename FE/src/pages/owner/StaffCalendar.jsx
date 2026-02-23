import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, UserMinus } from 'lucide-react'
import { getOwnerShiftsApi, getOwnerStaffApi } from '../../services/owner.service'
import { toArray } from './owner.utils'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const startOfWeek = (sourceDate) => {
    const date = new Date(sourceDate)
    const day = date.getDay()
    const diff = day === 0 ? -6 : 1 - day
    date.setDate(date.getDate() + diff)
    date.setHours(0, 0, 0, 0)
    return date
}

const formatDateRange = (from, to) => `${from.toLocaleDateString('vi-VN')} - ${to.toLocaleDateString('vi-VN')}`

const getWeekDates = (weekStart) => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    return date
})

const dayName = (date) => date.toLocaleDateString('en-US', { weekday: 'long' })

export default function StaffCalendar() {
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))
    const [shifts, setShifts] = useState([])
    const [staffMap, setStaffMap] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])

    const loadCalendarData = async () => {
        try {
            setLoading(true)
            setError('')

            const fromDate = weekDates[0]
            const toDate = new Date(weekDates[6])
            toDate.setHours(23, 59, 59, 999)

            const [staffRes, shiftsRes] = await Promise.all([
                getOwnerStaffApi(),
                getOwnerShiftsApi({ from: fromDate.toISOString(), to: toDate.toISOString() })
            ])

            const staffList = toArray(staffRes?.data)
            const map = staffList.reduce((acc, item) => {
                acc[item.id] = item
                return acc
            }, {})

            setStaffMap(map)
            setShifts(toArray(shiftsRes?.data))
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được lịch ca')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCalendarData()
    }, [weekStart])

    const shiftsByDay = useMemo(() => {
        const grouped = {}

        DAYS.forEach((day) => {
            grouped[day] = []
        })

        shifts.forEach((shift) => {
            const startAt = new Date(shift.startAt)
            if (Number.isNaN(startAt.getTime())) {
                return
            }

            const key = dayName(startAt)
            if (!grouped[key]) {
                grouped[key] = []
            }
            grouped[key].push(shift)
        })

        return grouped
    }, [shifts])

    const goPreviousWeek = () => {
        const next = new Date(weekStart)
        next.setDate(next.getDate() - 7)
        setWeekStart(next)
    }

    const goNextWeek = () => {
        const next = new Date(weekStart)
        next.setDate(next.getDate() + 7)
        setWeekStart(next)
    }

    if (loading) {
        return <div className="owner-card owner-loading">Đang tải lịch ca...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center bg-slate-100 rounded-lg p-1">
                    <button className="p-1 hover:bg-white rounded transition-all shadow-sm" onClick={goPreviousWeek}>
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 text-sm font-semibold">{formatDateRange(weekDates[0], weekDates[6])}</span>
                    <button className="p-1 hover:bg-white rounded transition-all shadow-sm" onClick={goNextWeek}>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {error ? <div className="owner-alert">{error}</div> : null}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-175">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50">
                    {DAYS.map((day, index) => {
                        const date = weekDates[index]
                        const isToday = new Date().toDateString() === date.toDateString()

                        return (
                            <div className={`p-4 text-center border-r border-slate-200 last:border-r-0 ${isToday ? 'bg-[#1975d2]/5' : ''}`} key={day}>
                                <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-[#1975d2]' : 'text-slate-500'}`}>
                                    {day}
                                </span>
                                <div className={`text-lg font-bold ${isToday ? 'text-[#1975d2]' : 'text-slate-900'}`}>
                                    {date.getDate()}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="grid grid-cols-7 flex-1">
                    {DAYS.map((day) => {
                        const dayShifts = shiftsByDay[day] || []

                        return (
                            <div className="p-3 space-y-3 border-r border-slate-200 last:border-r-0" key={day}>
                                {dayShifts.length > 0 ? (
                                    dayShifts.map((shift) => {
                                        const staffNames = toArray(shift.staffIds)
                                            .map((staffId) => staffMap[staffId]?.name || staffId)
                                            .filter(Boolean)
                                            .join(', ')

                                        return (
                                            <div className="p-3 rounded-lg transition-all shadow-sm border-l-4 bg-blue-50 border-[#1975d2] text-slate-900" key={shift.id}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-semibold truncate">{shift.title || 'Ca làm việc'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-[#1975d2]">
                                                    <Clock className="w-3 h-3" />
                                                    <span>
                                                        {new Date(shift.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                        {' - '}
                                                        {new Date(shift.endAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-[11px] text-slate-600">
                                                    {staffNames || 'Chưa gán staff'}
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60 italic text-sm text-center p-4">
                                        <UserMinus className="w-8 h-8 mb-1" />
                                        <span>No shifts assigned</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

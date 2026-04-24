import React from 'react'
import ShiftAnalyticsFilterBar from '../../components/shift-analytics/ShiftAnalyticsFilterBar'
import ShiftKpiCards from '../../components/shift-analytics/ShiftKpiCards'
import ShiftRevenueChartCard from '../../components/shift-analytics/ShiftRevenueChartCard'
import ShiftDailySummaryCard from '../../components/shift-analytics/ShiftDailySummaryCard'
import ShiftPeakShiftsTable from '../../components/shift-analytics/ShiftPeakShiftsTable'
import ShiftStaffPerformanceTable from '../../components/shift-analytics/ShiftStaffPerformanceTable'
import { useShiftAnalytics } from '../../hooks/useShiftAnalytics'

export default function OwnerShiftAnalyticsPage() {
  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    overview,
    revenueByShift,
    staffPerformance,
    peakShifts,
    dailySummary,
    loading,
    error,
    refresh,
  } = useShiftAnalytics()

  return (
    <div className="space-y-4">
      <ShiftAnalyticsFilterBar
        startDate={startDate}
        endDate={endDate}
        onChangeStartDate={setStartDate}
        onChangeEndDate={setEndDate}
        onRefresh={refresh}
        loading={loading}
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <ShiftKpiCards overview={overview} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ShiftRevenueChartCard items={revenueByShift} />
        <ShiftDailySummaryCard items={dailySummary} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ShiftPeakShiftsTable items={peakShifts} />
        <ShiftStaffPerformanceTable items={staffPerformance} />
      </div>
    </div>
  )
}


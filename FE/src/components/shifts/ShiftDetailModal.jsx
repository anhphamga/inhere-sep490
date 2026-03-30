import { ShiftRegistrationBadge, ShiftStatusBadge } from './ShiftStatusBadge'

export default function ShiftDetailModal({ open, shift, onClose }) {
  if (!open || !shift) return null

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Chi tiết ca làm</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Mã ca" value={shift.code} />
            <InfoRow label="Tên ca" value={shift.name} />
            <InfoRow label="Ngày làm" value={shift.workDate} />
            <InfoRow label="Giờ làm" value={`${shift.startTime} - ${shift.endTime}`} />
            <InfoRow label="Số lượng nhân viên" value={`${shift.assignedCount}/${shift.maxStaff}`} />
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Trạng thái</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <ShiftStatusBadge status={shift.status} />
                <ShiftRegistrationBadge allowRegistration={shift.allowRegistration} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Ghi chú</p>
            <p className="mt-2 text-sm text-slate-700">{shift.notes || 'Không có ghi chú'}</p>
          </div>

          <div className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3">
              <h4 className="text-sm font-semibold text-slate-900">Nhân viên trong ca</h4>
            </div>
            <div className="p-4">
              {Array.isArray(shift.staffMembers) && shift.staffMembers.length > 0 ? (
                <div className="space-y-2">
                  {shift.staffMembers.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-800">{staff.name}</span>
                      <span className="text-slate-500">{staff.phone || 'Không có số điện thoại'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Chưa có nhân viên nào trong ca</p>
              )}
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-800">{value || 'N/A'}</p>
    </div>
  )
}

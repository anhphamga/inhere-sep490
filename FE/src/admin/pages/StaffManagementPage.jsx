import SectionCard from '../components/SectionCard';
import { mockStaff } from '../mockData';

export default function StaffManagementPage() {
  return (
    <div className="space-y-6">
      <SectionCard eyebrow="Scheduling" title="Staff shifts">
        <div className="grid gap-4 xl:grid-cols-3">
          {mockStaff.map((staff) => (
            <div key={staff.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
              <p className="text-lg font-semibold text-slate-950">{staff.name}</p>
              <p className="mt-2 text-sm text-slate-500">{staff.shift} • {staff.schedule}</p>
              <p className="mt-1 text-sm text-slate-500">{staff.tasks} active tasks</p>
              <div className="mt-5 flex gap-2">
                <button type="button" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Assign shift</button>
                <button type="button" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">View schedule</button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

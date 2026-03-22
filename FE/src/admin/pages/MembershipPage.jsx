import SectionCard from '../components/SectionCard';
import { mockMembershipPlans } from '../mockData';

export default function MembershipPage() {
  return (
    <SectionCard eyebrow="Membership" title="Plans">
      <div className="grid gap-5 lg:grid-cols-2">
        {mockMembershipPlans.map((plan) => (
          <div key={plan.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <p className="text-xl font-semibold text-slate-950">{plan.name}</p>
            <p className="mt-2 text-sm text-slate-500">{plan.perks}</p>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold text-slate-950">{plan.price}</p>
                <p className="mt-1 text-sm text-slate-500">{plan.users} users enrolled</p>
              </div>
              <button type="button" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Edit plan</button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

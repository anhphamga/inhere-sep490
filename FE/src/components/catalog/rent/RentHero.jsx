import DatePicker from './DatePicker';

export default function RentHero({ startDate, endDate, onChangeStartDate, onChangeEndDate }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 p-6 text-white shadow-lg md:p-8">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          <p className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            Trải nghiệm thuê đồ tại INHERE
          </p>
          <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">Thuê trang phục theo dịp và thời gian</h1>
          <p className="max-w-2xl text-sm text-white/90 md:text-base">
            Chọn ngày nhận, ngày trả và khám phá bộ sưu tập được gợi ý sẵn theo nhu cầu chụp ảnh, lễ hội hoặc du lịch.
          </p>
        </div>

        <div className="rounded-2xl border border-white/30 bg-white/15 p-3">
          <DatePicker
            startDate={startDate}
            endDate={endDate}
            onChangeStartDate={onChangeStartDate}
            onChangeEndDate={onChangeEndDate}
          />
        </div>
      </div>
    </section>
  );
}

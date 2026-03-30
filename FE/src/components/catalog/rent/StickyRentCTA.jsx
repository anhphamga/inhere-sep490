export default function StickyRentCTA({ count = 0, onClick }) {
  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-2xl border border-amber-300 bg-white/95 p-3 shadow-xl backdrop-blur md:hidden">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white"
      >
        <span>Thuê ngay</span>
        <span>{count} sản phẩm phù hợp</span>
      </button>
    </div>
  );
}

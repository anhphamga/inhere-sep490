export default function ImageSection({
    imageItems = [],
    onUploadFiles,
    onDeleteImage,
    onSelectPrimaryImage,
    imageUrlDraft = '',
    onImageUrlChange,
    onAddImageUrl,
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Hình ảnh</h4>
            <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                    <label className="inline-flex h-10 items-center px-3 rounded-lg border border-slate-200 text-sm font-medium cursor-pointer hover:bg-slate-50">
                        Tải lên hình ảnh
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                                onUploadFiles(event.target.files)
                                event.target.value = ''
                            }}
                        />
                    </label>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Hoặc nhập đường dẫn ảnh</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 h-10 border border-slate-200 rounded-lg px-3 text-sm"
                        value={imageUrlDraft}
                        onChange={(event) => onImageUrlChange(event.target.value)}
                        onKeyPress={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault()
                                onAddImageUrl()
                            }
                        }}
                    />
                    <button
                        type="button"
                        className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50"
                        onClick={() => onAddImageUrl()}
                    >
                        Thêm
                    </button>
                </div>
            </div>

            {imageItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {imageItems.map((item, index) => (
                        <div key={item.id} className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                            <img src={item.previewUrl} alt={item.label} className="h-48 w-full object-contain" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/55 p-2 flex items-center justify-between gap-1.5">
                                <button
                                    type="button"
                                    className={`text-[10px] px-1.5 py-1 rounded border ${index === 0
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'bg-white/90 border-white text-slate-700 hover:bg-white'
                                        }`}
                                    onClick={() => onSelectPrimaryImage(item)}
                                >
                                    {index === 0 ? 'Chính' : 'Chính'}
                                </button>
                                <button
                                    type="button"
                                    className="text-[10px] px-1.5 py-1 rounded border border-rose-200 bg-white/90 text-rose-600 hover:bg-white"
                                    onClick={() => onDeleteImage(item)}
                                >
                                    Xóa
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-slate-500">Chưa tải lên hình ảnh nào.</p>
            )}
        </section>
    )
}

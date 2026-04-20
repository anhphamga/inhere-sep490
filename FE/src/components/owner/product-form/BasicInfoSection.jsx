import { getCategoryLevelOptions } from '../../../utils/categoryTree'

export default function BasicInfoSection({
    values,
    categoryTree = [],
    onChangeField,
    onCategoryChange,
    errors = {},
}) {
    const level1Options = getCategoryLevelOptions(categoryTree, values.categoryPath, 0)
    const level2Options = values.categoryPath[0]
        ? getCategoryLevelOptions(categoryTree, values.categoryPath, 1)
        : []
    const level3Options = values.categoryPath[1]
        ? getCategoryLevelOptions(categoryTree, values.categoryPath, 2)
        : []

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Thông tin cơ bản</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field
                    label="Tên sản phẩm"
                    value={values.name}
                    onChange={(value) => onChangeField('name', value)}
                    error={errors.name}
                />
                <Field
                    label="Màu sắc"
                    value={values.color}
                    onChange={(value) => onChangeField('color', value)}
                />
                <Field
                    label="Giá cho thuê"
                    type="number"
                    value={values.baseRentPrice}
                    onChange={(value) => onChangeField('baseRentPrice', value)}
                    error={errors.baseRentPrice}
                />
                <Field
                    label="Giá bán"
                    type="number"
                    value={values.baseSalePrice}
                    onChange={(value) => onChangeField('baseSalePrice', value)}
                    error={errors.baseSalePrice}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select
                    label="Danh mục cấp 1"
                    value={values.categoryPath[0] || ''}
                    options={level1Options}
                    onChange={(value) => onCategoryChange(0, value)}
                    placeholder="Chọn cấp 1"
                />
                <Select
                    label="Danh mục cấp 2"
                    value={values.categoryPath[1] || ''}
                    options={level2Options}
                    onChange={(value) => onCategoryChange(1, value)}
                    placeholder="Chọn cấp 2"
                    disabled={!values.categoryPath[0]}
                />
                <Select
                    label="Danh mục cấp 3"
                    value={values.categoryPath[2] || ''}
                    options={level3Options}
                    onChange={(value) => onCategoryChange(2, value)}
                    placeholder="Chọn cấp 3"
                    disabled={!values.categoryPath[1]}
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Mô tả</label>
                <textarea
                    rows={4}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    value={values.description}
                    onChange={(event) => onChangeField('description', event.target.value)}
                />
            </div>
        </section>
    )
}

function Field({ label, value, onChange, type = 'text', error = '' }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <input
                type={type}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </div>
    )
}

function Select({ label, value, onChange, options = [], placeholder = 'Select', disabled = false }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <select
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
            >
                <option value="">{placeholder}</option>
                {options.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                ))}
            </select>
        </div>
    )
}

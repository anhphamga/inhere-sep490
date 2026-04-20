import { useState } from 'react'
import { createOwnerProductApi } from '../../services/owner.service'
import ProductForm from './product-form/ProductForm'

export default function AddProductModal({ categoryTree = [], onClose, onCreated }) {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async ({ payload }) => {
        try {
            setSaving(true)
            setError('')
            const response = await createOwnerProductApi(payload)
            await onCreated?.(response?.data?._id || response?.data?.id)
            onClose?.()
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không thể lưu sản phẩm.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="w-full max-w-5xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900">Thêm sản phẩm</h3>
                    <button type="button" className="h-9 px-3 rounded-lg border border-slate-200 text-sm" onClick={onClose}>Hủy</button>
                </div>

                <div className="max-h-[calc(100vh-6rem)] overflow-y-auto p-4">
                    <ProductForm
                        categoryTree={categoryTree}
                        initialValues={{
                            name: '',
                            description: '',
                            categoryPath: [],
                            color: '',
                            baseSalePrice: '',
                            baseRentPrice: '',
                            hasSizes: false,
                            quantity: '1',
                            sizes: [{ size: 'M', quantity: 1 }],
                            images: [],
                            rentedCount: 0,
                        }}
                        submitting={saving}
                        errorMessage={error}
                        onSubmit={handleSubmit}
                        allowDraft
                        submitLabel="Lưu"
                        draftLabel="Lưu nháp"
                    />
                </div>
            </div>
        </div>
    )
}

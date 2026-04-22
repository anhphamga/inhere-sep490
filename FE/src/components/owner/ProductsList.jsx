import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Download, ImagePlus, LayoutGrid, LayoutList, Plus, Trash2, Upload, X } from 'lucide-react'
import {
    deleteOwnerProductApi,
    exportOwnerProductsApi,
    getOwnerProductsApi,
    importOwnerProductsApi
} from '../../services/owner.service'
import { currencyFormatter, toArray } from '../../utils/owner.utils'
import { flattenCategoryNames, normalizeCategoryTree } from '../../utils/categoryTree'
import AddProductModal from './AddProductModal'
import OwnerGlobalSizeGuideModal from './OwnerGlobalSizeGuideModal'
import { UI_IMAGE_FALLBACKS } from '../../constants/ui'

const lifecycleOptions = ['', 'Available', 'Rented', 'Washing', 'Repair', 'Lost']
const initialFilters = { category: '', size: '', color: '', lifecycleStatus: '' }
const pageSize = 10
const lifecycleLabelMap = {
    Available: 'Sẵn sàng',
    Rented: 'Đang cho thuê',
    Washing: 'Đang giặt',
    Repair: 'Đang sửa',
    Lost: 'Thất lạc'
}

const toDisplayText = (value) => {
    if (value === null || value === undefined) {
        return ''
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value).trim()
    }

    if (Array.isArray(value)) {
        return value.map((item) => toDisplayText(item)).find(Boolean) || ''
    }

    if (typeof value === 'object') {
        const preferredKeys = ['vi', 'en', 'name', 'label', 'value']
        for (const key of preferredKeys) {
            const normalized = toDisplayText(value[key])
            if (normalized) {
                return normalized
            }
        }
    }

    return ''
}

const getDisplaySizes = (product) => {
    const fromStock = Array.isArray(product?.sizeStock)
        ? product.sizeStock
            .filter((row) => row && Number(row.quantity || 0) > 0)
            .map((row) => toDisplayText(row.size))
            .filter(Boolean)
        : []

    if (fromStock.length > 0) {
        return [...new Set(fromStock)].join(', ')
    }
    // No fallback: only show actual sizes derived from ProductInstance -> sizeStock.
    return '—'
}

/** Tồn thực tế trong kho theo từng size (API owner: sizeStock), không tính đã bán */
const renderOwnerSizeStock = (product) => {
    const rows = Array.isArray(product?.sizeStock) ? product.sizeStock : []
    if (rows.length > 0) {
        const total = rows.reduce((sum, row) => sum + Number(row?.quantity || 0), 0)
        const available = rows.reduce((sum, row) => sum + Number(row?.available || 0), 0)
        const headline = total === 0
            ? 'Hết hàng'
            : (available === 0 ? 'Đang thuê hết' : null)
        return (
            <div className="flex flex-col gap-0.5 text-sm text-slate-800">
                <div className="text-slate-700">
                    {headline ? <span className="font-semibold">{headline} · </span> : null}
                    <span className="text-slate-600">Tổng:</span> <span className="font-semibold">{total}</span>
                    <span className="text-slate-400"> | </span>
                    <span className="text-slate-600">Có sẵn:</span> <span className="font-semibold">{available}</span>
                </div>
                {rows.map((row) => (
                    <div key={`${row.size}-${row.quantity}`}>
                        <span className="font-semibold text-slate-800">{row.size}</span>
                        <span className="text-slate-500"> — </span>
                        <span>{Number(row.quantity || 0)}</span>
                        <span className="text-slate-400"> (có sẵn {Number(row.available || 0)})</span>
                    </div>
                ))}
            </div>
        )
    }
    // No fallback: show actual inventory only (derived from ProductInstance -> sizeStock).
    return <span className="text-sm text-slate-600">Hết hàng · Tổng: 0 | Có sẵn: 0</span>
}

export default function ProductsList({ onSelectProduct, initialPage = 1 }) {
    const location = useLocation()
    const [products, setProducts] = useState([])
    const [viewMode, setViewMode] = useState('list')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [filters, setFilters] = useState(initialFilters)
    const [openCreateModal, setOpenCreateModal] = useState(false)
    const [openGlobalSizeGuideModal, setOpenGlobalSizeGuideModal] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importReport, setImportReport] = useState(null)
    const [exporting, setExporting] = useState(false)
    const [currentPage, setCurrentPage] = useState(Math.max(1, Number(initialPage) || 1))
    const [deletingProductId, setDeletingProductId] = useState('')
    const [selectedProductIds, setSelectedProductIds] = useState([])
    const [categoryTree, setCategoryTree] = useState([])
    const importInputRef = useRef(null)

    const loadProducts = useCallback(async (nextFilters) => {
        try {
            setLoading(true)
            setError('')

            const params = Object.entries(nextFilters).reduce((acc, [key, value]) => {
                if (value) {
                    acc[key] = value
                }
                return acc
            }, {})

            const response = await getOwnerProductsApi(params)
            setProducts(toArray(response?.data))
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được danh sách sản phẩm.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadProducts(initialFilters)
    }, [loadProducts])

    useEffect(() => {
        let mounted = true

        const loadCategories = async () => {
            try {
                const response = await fetch('/api/categories?lang=vi')
                const payload = response.ok ? await response.json() : { categories: [] }
                if (!mounted) {
                    return
                }
                setCategoryTree(normalizeCategoryTree(toArray(payload?.categories)))
            } catch {
                if (mounted) {
                    setCategoryTree([])
                }
            }
        }

        loadCategories()
        return () => {
            mounted = false
        }
    }, [])

    const categoryOptions = useMemo(() => flattenCategoryNames(categoryTree), [categoryTree])
    const sizeOptions = useMemo(() => {
        const set = new Set()
        products.forEach((item) => {
            toArray(item?.sizes).forEach((row) => {
                const value = toDisplayText(typeof row === 'object' ? row?.size : row)
                if (value) set.add(value)
            })
            toArray(item?.sizeOptions).forEach((size) => {
                const value = toDisplayText(size)
                if (value) set.add(value)
            })
            const fallback = toDisplayText(item.size)
            if (fallback) set.add(fallback)
        })
        return Array.from(set)
    }, [products])
    const colorOptions = useMemo(() => [...new Set(products.map((item) => toDisplayText(item.color)).filter(Boolean))], [products])
    const filteredProducts = useMemo(() => {
        const searchParams = new URLSearchParams(location.search)
        const query = (searchParams.get('q') || '').trim().toLowerCase()

        if (!query) {
            return products
        }

        return products.filter((item) => {
            const name = toDisplayText(item?.name).toLowerCase()
            const category = toDisplayText(item?.category).toLowerCase()
            const color = toDisplayText(item?.color).toLowerCase()
            const size = toDisplayText(item?.size).toLowerCase()
            const id = String(item?.id || item?._id || '').toLowerCase()

            return (
                name.includes(query)
                || category.includes(query)
                || color.includes(query)
                || size.includes(query)
                || id.includes(query)
            )
        })
    }, [location.search, products])

    const totalItems = filteredProducts.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const safeCurrentPage = Math.min(currentPage, totalPages)
    const startItemIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize
    const endItemIndex = Math.min(startItemIndex + pageSize, totalItems)
    const paginatedProducts = filteredProducts.slice(startItemIndex, endItemIndex)
    const paginatedProductIds = paginatedProducts.map((product) => String(product._id || product.id)).filter(Boolean)
    const isAllPageSelected = paginatedProductIds.length > 0 && paginatedProductIds.every((id) => selectedProductIds.includes(id))

    const didInitPageRef = useRef(false)
    useEffect(() => {
        if (!didInitPageRef.current) {
            didInitPageRef.current = true
            return
        }
        setCurrentPage(1)
    }, [location.search, filters])

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages)
        }
    }, [currentPage, totalPages])

    useEffect(() => {
        const validIds = new Set(products.map((product) => String(product._id || product.id)).filter(Boolean))
        setSelectedProductIds((prev) => prev.filter((id) => validIds.has(id)))
    }, [products])

    const pageItems = useMemo(() => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, index) => index + 1)
        }

        if (safeCurrentPage <= 3) {
            return [1, 2, 3, '...', totalPages]
        }

        if (safeCurrentPage >= totalPages - 2) {
            return [1, '...', totalPages - 2, totalPages - 1, totalPages]
        }

        return [1, '...', safeCurrentPage, '...', totalPages]
    }, [safeCurrentPage, totalPages])

    const handleFilterChange = async (field, value) => {
        const nextFilters = { ...filters, [field]: value }
        setFilters(nextFilters)
        await loadProducts(nextFilters)
    }

    const handleCloseCreateModal = () => {
        setOpenCreateModal(false)
    }

    const handleImportClick = () => {
        importInputRef.current?.click()
    }

    const downloadCsvTemplate = (mode = 'no-size') => {
        const fileName = mode === 'with-size'
            ? 'owner_product_import_template_with_size.csv'
            : 'owner_product_import_template.csv'

        const csvContent = mode === 'with-size'
            ? [
                'name,price,category,S,M,L,color,description',
                '"Ao dai truyen thong",300000,"Ao Dai",2,3,1,"Do","Mau template co size"',
                '"Ao dai su kien",450000,"Ao Dai",0,2,4,"Xanh","Mau template co size"',
            ].join('\n')
            : [
                'name,price,category,quantity,color,description',
                '"Ao dai truyen thong",300000,"Ao Dai",8,"Do","Mau template khong size"',
                '"Ao dai su kien",450000,"Ao Dai",5,"Xanh","Mau template khong size"',
            ].join('\n')

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
    }

    const handleImportProducts = async (event) => {
        const file = event.target.files?.[0]
        if (!file) {
            return
        }

        try {
            setImporting(true)
            setError('')
            const response = await importOwnerProductsApi(file)
            setImportReport({
                successCount: Number(response?.successCount || 0),
                failedCount: Number(response?.failedCount || 0),
                errors: Array.isArray(response?.errors) ? response.errors : [],
                message: response?.message || 'Import completed',
            })
            await loadProducts(filters)
        } catch (apiError) {
            setImportReport(null)
            setError(apiError?.response?.data?.message || apiError?.message || 'Không thể nhập danh sách sản phẩm.')
        } finally {
            setImporting(false)
            event.target.value = ''
        }
    }

    const handleExportProducts = async () => {
        try {
            setExporting(true)
            setError('')

            const response = await exportOwnerProductsApi({ ...filters, includeInstances: true })
            const contentDisposition = response.headers?.['content-disposition'] || ''
            const fileNameMatch = contentDisposition.match(/filename=([^;]+)/i)
            const fileName = (fileNameMatch?.[1] || 'owner_products.xlsx').replaceAll('"', '').trim()

            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', fileName)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không thể xuất danh sách sản phẩm.')
        } finally {
            setExporting(false)
        }
    }

    const handleDeleteProduct = async (productId) => {
        const confirmed = window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')
        if (!confirmed) {
            return
        }

        try {
            setDeletingProductId(productId)
            setError('')
            await deleteOwnerProductApi(productId)
            await loadProducts(filters)
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không thể xóa sản phẩm.')
        } finally {
            setDeletingProductId('')
        }
    }

    const handleToggleProductSelection = (productId) => {
        setSelectedProductIds((prev) => {
            if (prev.includes(productId)) {
                return prev.filter((id) => id !== productId)
            }
            return [...prev, productId]
        })
    }

    const handleToggleSelectAllPage = () => {
        setSelectedProductIds((prev) => {
            if (isAllPageSelected) {
                return prev.filter((id) => !paginatedProductIds.includes(id))
            }

            const next = new Set(prev)
            paginatedProductIds.forEach((id) => next.add(id))
            return Array.from(next)
        })
    }

    if (loading) {
        return <div className="owner-card owner-loading">Đang tải danh sách sản phẩm...</div>
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">

                        <select
                            className="h-10 min-w-40 text-sm bg-slate-50 border-slate-200 rounded-lg focus:ring-[#1975d2] focus:border-[#1975d2] px-3 outline-none"
                            value={filters.category}
                            onChange={(event) => handleFilterChange('category', event.target.value)}
                        >
                            <option value="">Tất cả danh mục</option>
                            {categoryOptions.map((option, index) => (
                                <option key={`category-${option}-${index}`} value={option}>{option}</option>
                            ))}
                        </select>

                        <select
                            className="h-10 min-w-28 text-sm bg-slate-50 border-slate-200 rounded-lg focus:ring-[#1975d2] focus:border-[#1975d2] px-3 outline-none"
                            value={filters.size}
                            onChange={(event) => handleFilterChange('size', event.target.value)}
                        >
                            <option value="">Kích cỡ</option>
                            {sizeOptions.map((option, index) => (
                                <option key={`size-${option}-${index}`} value={option}>{option}</option>
                            ))}
                        </select>

                        <select
                            className="h-10 min-w-32 text-sm bg-slate-50 border-slate-200 rounded-lg focus:ring-[#1975d2] focus:border-[#1975d2] px-3 outline-none"
                            value={filters.color}
                            onChange={(event) => handleFilterChange('color', event.target.value)}
                        >
                            <option value="">Màu sắc</option>
                            {colorOptions.map((option, index) => (
                                <option key={`color-${option}-${index}`} value={option}>{option}</option>
                            ))}
                        </select>

                        <select
                            className="h-10 min-w-32 text-sm bg-slate-50 border-slate-200 rounded-lg focus:ring-[#1975d2] focus:border-[#1975d2] px-3 outline-none"
                            value={filters.lifecycleStatus}
                            onChange={(event) => handleFilterChange('lifecycleStatus', event.target.value)}
                        >
                            <option value="">Trạng thái</option>
                            {lifecycleOptions.filter(Boolean).map((option) => (
                                <option key={option} value={option}>{lifecycleLabelMap[option] || option}</option>
                            ))}
                        </select>

                        <div className="h-8 w-px bg-slate-200 mx-2 hidden lg:block" />
                        <div className="flex bg-slate-100 rounded-lg p-1 h-10 items-center">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#1975d2]' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <LayoutList className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#1975d2]' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-start lg:justify-end gap-3">
                        <input
                            ref={importInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                            className="hidden"
                            onChange={handleImportProducts}
                        />

                        <button
                            type="button"
                            className="h-10 flex items-center gap-2 px-4 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                            onClick={handleImportClick}
                            disabled={importing}
                        >
                            <Upload className="w-4 h-4" />
                            {importing ? 'Đang nhập...' : 'Nhập Excel'}
                        </button>

                        <button
                            type="button"
                            className="h-10 flex items-center gap-2 px-4 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                            onClick={() => downloadCsvTemplate('no-size')}
                        >
                            <Download className="w-4 h-4" />
                            Mẫu CSV
                        </button>

                        <button
                            type="button"
                            className="h-10 flex items-center gap-2 px-4 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                            onClick={() => downloadCsvTemplate('with-size')}
                        >
                            <Download className="w-4 h-4" />
                            Mẫu CSV (S,M,L)
                        </button>

                        <button
                            type="button"
                            className="h-10 flex items-center gap-2 px-4 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                            onClick={handleExportProducts}
                            disabled={exporting}
                        >
                            <Download className="w-4 h-4" />
                            {exporting ? 'Đang xuất...' : 'Xuất Excel'}
                        </button>

                        <button
                            type="button"
                            className="h-10 flex items-center gap-2 px-4 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                            onClick={() => setOpenGlobalSizeGuideModal(true)}
                        >
                            Bảng size mặc định
                        </button>

                        <button
                            type="button"
                            className="h-10 flex items-center gap-2 px-4 bg-[#1975d2] text-white rounded-lg text-sm font-semibold hover:bg-[#1975d2]/90 transition-all shadow-md"
                            onClick={() => setOpenCreateModal(true)}
                        >
                            <Plus className="w-4 h-4" />
                            Thêm sản phẩm
                        </button>
                    </div>
                </div>
            </div>

            {error ? <div className="owner-alert">{error}</div> : null}
            {importReport ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <p className="font-semibold">{importReport.message}</p>
                    <p className="mt-1">Thành công: {importReport.successCount} | Thất bại: {importReport.failedCount}</p>
                    {importReport.errors.length > 0 ? (
                        <ul className="mt-2 max-h-36 list-disc overflow-auto pl-5 text-xs text-rose-700">
                            {importReport.errors.slice(0, 50).map((item, index) => (
                                <li key={`import-error-${index}`}>
                                    Dòng {item?.row || 'N/A'}: {item?.message || 'Lỗi không xác định'}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            ) : null}

            {viewMode === 'list' ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-4 py-4 w-12">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300 text-[#1975d2] focus:ring-[#1975d2]"
                                            checked={isAllPageSelected}
                                            onChange={handleToggleSelectAllPage}
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hình ảnh</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tên sản phẩm</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kích cỡ</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Màu sắc</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Giá thuê</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Giá bán</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tồn trong kho (theo size)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedProducts.map((product) => {
                                    const productId = product._id || product.id
                                    // Status must be derived from actual inventory (ProductInstance -> sizeStock),
                                    // not from computed/legacy quantity fields which can drift.
                                    const sizeStockRows = Array.isArray(product?.sizeStock) ? product.sizeStock : []
                                    const totalQuantity = sizeStockRows.reduce((sum, row) => sum + Number(row?.quantity || 0), 0)
                                    const availableQuantity = sizeStockRows.reduce((sum, row) => sum + Number(row?.available || 0), 0)
                                    const productStatus =
                                        availableQuantity > 0
                                            ? 'Còn bản trống'
                                            : totalQuantity > 0
                                              ? 'Đang phân bổ'
                                              : 'Chưa có tồn'
                                    const productName = toDisplayText(product.name) || 'Không có'
                                    const productCategory = toDisplayText(product.category) || 'Không có'
                                    const productSize = getDisplaySizes(product)
                                    const productColor = toDisplayText(product.color) || 'Không có'

                                    return (
                                        <tr
                                            key={productId}
                                            className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                            onClick={() => onSelectProduct(productId, { page: safeCurrentPage })}
                                        >
                                            <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-slate-300 text-[#1975d2] focus:ring-[#1975d2]"
                                                    checked={selectedProductIds.includes(productId)}
                                                    onChange={() => handleToggleProductSelection(productId)}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <img
                                                    src={product?.images?.[0] || UI_IMAGE_FALLBACKS.ownerProductCard}
                                                    alt={productName}
                                                    className="w-12 h-12 rounded-lg object-cover bg-slate-100"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900">{productName}</span>
                                                    <span className="text-xs text-slate-400 mt-0.5">{productCategory}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">{productSize}</td>
                                            <td className="px-6 py-4 text-sm">{productColor}</td>
                                            <td className="px-6 py-4 text-sm font-semibold">{currencyFormatter.format(Number(product.baseRentPrice || 0))}</td>
                                            <td className="px-6 py-4 text-sm font-semibold">{currencyFormatter.format(Number(product.baseSalePrice || 0))}</td>
                                            <td className="px-6 py-4 align-top">{renderOwnerSizeStock(product)}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${productStatus === 'Còn bản trống' ? 'bg-green-100 text-green-700' : productStatus === 'Đang phân bổ' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                                                    {productStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <button
                                                    type="button"
                                                    className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        handleDeleteProduct(productId)
                                                    }}
                                                    disabled={deletingProductId === productId}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}

                                {paginatedProducts.length === 0 ? (
                                    <tr>
                                        <td className="px-6 py-6 text-sm text-slate-500" colSpan={10}>
                                            Không có sản phẩm phù hợp.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {paginatedProducts.map((product) => (
                        <div
                            key={product._id || product.id}
                            onClick={() => onSelectProduct(product._id || product.id, { page: safeCurrentPage })}
                            className="group relative bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-lg cursor-pointer"
                        >
                            <div className="relative aspect-3/4 overflow-hidden bg-slate-100">
                                <img
                                    src={product?.images?.[0] || UI_IMAGE_FALLBACKS.ownerProductGrid}
                                    alt={toDisplayText(product.name) || 'Sản phẩm'}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            </div>
                            <div className="p-5">
                                <h3 className="font-bold text-slate-900 line-clamp-1">{toDisplayText(product.name) || 'Không có'}</h3>
                                <p className="text-sm text-slate-500 mb-2">{toDisplayText(product.category) || 'Không có'}</p>
                                <p className="text-sm text-slate-500 mb-3">{getDisplaySizes(product)} • {toDisplayText(product.color) || 'Không có'}</p>
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-400 font-medium">Giá thuê</span>
                                    <span className="text-lg font-bold text-[#1975d2]">{currencyFormatter.format(Number(product.baseRentPrice || 0))}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <p className="text-slate-600 font-medium">
                    Hiển thị {totalItems === 0 ? 0 : startItemIndex + 1}-{endItemIndex} trên tổng {totalItems} sản phẩm
                </p>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={safeCurrentPage === 1}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {pageItems.map((item, index) => (
                        item === '...'
                            ? <span key={`dots-${index}`} className="h-10 min-w-8 px-2 inline-flex items-center justify-center text-slate-400">...</span>
                            : (
                                <button
                                    key={`page-${item}`}
                                    type="button"
                                    className={`h-10 min-w-10 px-3 rounded-xl font-semibold ${safeCurrentPage === item ? 'bg-[#1975d2] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                                    onClick={() => setCurrentPage(Number(item))}
                                >
                                    {item}
                                </button>
                            )
                    ))}

                    <button
                        type="button"
                        className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={safeCurrentPage === totalPages}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {openCreateModal ? (
                <AddProductModal
                    categoryTree={categoryTree}
                    onClose={handleCloseCreateModal}
                    onCreated={async (createdId) => {
                        await loadProducts(filters)
                        if (createdId) {
                            onSelectProduct(createdId, { page: safeCurrentPage })
                        }
                    }}
                />
            ) : null}

            <OwnerGlobalSizeGuideModal
                open={openGlobalSizeGuideModal}
                onClose={() => setOpenGlobalSizeGuideModal(false)}
                onSaved={() => {
                    setError('')
                }}
            />
        </div>
    )
}



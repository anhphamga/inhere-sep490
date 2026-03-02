import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Download, ImagePlus, LayoutGrid, LayoutList, Plus, Trash2, Upload, X } from 'lucide-react'
import {
    createOwnerProductApi,
    deleteOwnerProductApi,
    exportOwnerProductsApi,
    getOwnerProductsApi,
    importOwnerProductsApi
} from '../../services/owner.service'
import { currencyFormatter, toArray } from './owner.utils'

const lifecycleOptions = ['', 'Available', 'Rented', 'Washing', 'Repair', 'Lost']
const initialFilters = { category: '', size: '', color: '', lifecycleStatus: '' }
const pageSize = 10

export default function ProductsList({ onSelectProduct }) {
    const location = useLocation()
    const [products, setProducts] = useState([])
    const [viewMode, setViewMode] = useState('list')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [filters, setFilters] = useState(initialFilters)
    const [openCreateModal, setOpenCreateModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState('')
    const [importing, setImporting] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [deletingProductId, setDeletingProductId] = useState('')
    const [selectedProductIds, setSelectedProductIds] = useState([])
    const [createForm, setCreateForm] = useState({
        name: '',
        category: '',
        size: '',
        color: '',
        quantity: '1',
        baseRentPrice: '',
        baseSalePrice: '',
        depositAmount: '',
        buyoutValue: '',
        imageFiles: [],
        description: ''
    })
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
            setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được danh sách sản phẩm')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadProducts(initialFilters)
    }, [loadProducts])

    const categoryOptions = useMemo(() => [...new Set(products.map((item) => item.category).filter(Boolean))], [products])
    const sizeOptions = useMemo(() => [...new Set(products.map((item) => item.size).filter(Boolean))], [products])
    const colorOptions = useMemo(() => [...new Set(products.map((item) => item.color).filter(Boolean))], [products])

    const filteredProducts = useMemo(() => {
        const searchParams = new URLSearchParams(location.search)
        const query = (searchParams.get('q') || '').trim().toLowerCase()

        if (!query) {
            return products
        }

        return products.filter((item) => {
            const name = String(item?.name || '').toLowerCase()
            const category = String(item?.category || '').toLowerCase()
            const color = String(item?.color || '').toLowerCase()
            const size = String(item?.size || '').toLowerCase()
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

    useEffect(() => {
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

    const resetCreateForm = () => {
        setCreateForm({
            name: '',
            category: '',
            size: '',
            color: '',
            quantity: '1',
            baseRentPrice: '',
            baseSalePrice: '',
            depositAmount: '',
            buyoutValue: '',
            imageFiles: [],
            description: ''
        })
        setCreateError('')
    }

    const handleCloseCreateModal = () => {
        setOpenCreateModal(false)
        resetCreateForm()
    }

    const handleCreateProduct = async (event) => {
        event.preventDefault()

        try {
            setCreating(true)
            setCreateError('')

            const payload = {
                name: createForm.name.trim(),
                category: createForm.category.trim(),
                size: createForm.size.trim(),
                color: createForm.color.trim(),
                quantity: Number(createForm.quantity),
                baseRentPrice: Number(createForm.baseRentPrice),
                baseSalePrice: Number(createForm.baseSalePrice),
                depositAmount: createForm.depositAmount === '' ? 0 : Number(createForm.depositAmount),
                buyoutValue: createForm.buyoutValue === '' ? 0 : Number(createForm.buyoutValue),
                imageFiles: createForm.imageFiles,
                description: createForm.description.trim()
            }

            if (!payload.name || !payload.category || !payload.size || !payload.color) {
                setCreateError('Vui lòng nhập đủ name, category, size, color')
                return
            }

            if (createForm.baseRentPrice === '' || createForm.baseSalePrice === '') {
                setCreateError('Vui lòng nhập giá thuê và giá bán cơ bản')
                return
            }

            if (createForm.quantity === '' || !Number.isInteger(payload.quantity) || payload.quantity <= 0) {
                setCreateError('Số lượng phải là số nguyên dương')
                return
            }

            if (
                Number.isNaN(payload.baseRentPrice)
                || Number.isNaN(payload.baseSalePrice)
                || Number.isNaN(payload.depositAmount)
                || Number.isNaN(payload.buyoutValue)
            ) {
                setCreateError('Giá thuê và giá bán phải là số hợp lệ')
                return
            }

            const response = await createOwnerProductApi(payload)
            const createdId = response?.data?.id || response?.data?._id

            handleCloseCreateModal()
            await loadProducts(filters)

            if (createdId) {
                onSelectProduct(createdId)
            }
        } catch (apiError) {
            setCreateError(apiError?.response?.data?.message || apiError?.message || 'Không tạo được sản phẩm')
        } finally {
            setCreating(false)
        }
    }

    const handleImportClick = () => {
        importInputRef.current?.click()
    }

    const handleImportProducts = async (event) => {
        const file = event.target.files?.[0]
        if (!file) {
            return
        }

        try {
            setImporting(true)
            setError('')
            await importOwnerProductsApi(file)
            await loadProducts(filters)
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không import được sản phẩm')
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
            setError(apiError?.response?.data?.message || apiError?.message || 'Không export được sản phẩm')
        } finally {
            setExporting(false)
        }
    }

    const handleDeleteProduct = async (productId) => {
        const confirmed = window.confirm('Bạn có chắc muốn xoá sản phẩm này?')
        if (!confirmed) {
            return
        }

        try {
            setDeletingProductId(productId)
            setError('')
            await deleteOwnerProductApi(productId)
            await loadProducts(filters)
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không xoá được sản phẩm')
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
                            <option value="">All Category</option>
                            {categoryOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>

                        <select
                            className="h-10 min-w-28 text-sm bg-slate-50 border-slate-200 rounded-lg focus:ring-[#1975d2] focus:border-[#1975d2] px-3 outline-none"
                            value={filters.size}
                            onChange={(event) => handleFilterChange('size', event.target.value)}
                        >
                            <option value="">size</option>
                            {sizeOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>

                        <select
                            className="h-10 min-w-32 text-sm bg-slate-50 border-slate-200 rounded-lg focus:ring-[#1975d2] focus:border-[#1975d2] px-3 outline-none"
                            value={filters.color}
                            onChange={(event) => handleFilterChange('color', event.target.value)}
                        >
                            <option value="">Color</option>
                            {colorOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>

                        <select
                            className="h-10 min-w-32 text-sm bg-slate-50 border-slate-200 rounded-lg focus:ring-[#1975d2] focus:border-[#1975d2] px-3 outline-none"
                            value={filters.lifecycleStatus}
                            onChange={(event) => handleFilterChange('lifecycleStatus', event.target.value)}
                        >
                            <option value="">Status</option>
                            {lifecycleOptions.filter(Boolean).map((option) => (
                                <option key={option} value={option}>{option}</option>
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
                            accept=".xlsx,.xls"
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
                            {importing ? 'Importing...' : 'Import'}
                        </button>

                        <button
                            type="button"
                            className="h-10 flex items-center gap-2 px-4 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
                            onClick={handleExportProducts}
                            disabled={exporting}
                        >
                            <Download className="w-4 h-4" />
                            {exporting ? 'Exporting...' : 'Export'}
                        </button>

                        <button
                            type="button"
                            className="h-10 flex items-center gap-2 px-4 bg-[#1975d2] text-white rounded-lg text-sm font-semibold hover:bg-[#1975d2]/90 transition-all shadow-md"
                            onClick={() => setOpenCreateModal(true)}
                        >
                            <Plus className="w-4 h-4" />
                            Add Product
                        </button>
                    </div>
                </div>
            </div>

            {error ? <div className="owner-alert">{error}</div> : null}

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
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Image</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Size</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Màu</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Giá thuê</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Giá bán</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Số lượng</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedProducts.map((product) => {
                                    const productId = product._id || product.id
                                    const totalQuantity = Number(product.totalQuantity || 0)
                                    const availableQuantity = Number(product.availableQuantity || 0)
                                    const productStatus = availableQuantity > 0 ? 'Còn hàng' : 'Hết hàng'

                                    return (
                                        <tr
                                            key={productId}
                                            className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                            onClick={() => onSelectProduct(productId)}
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
                                                    src={product?.images?.[0] || 'https://picsum.photos/seed/product-default/200/300'}
                                                    alt={product.name || 'Product'}
                                                    className="w-12 h-12 rounded-lg object-cover bg-slate-100"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900">{product.name || 'N/A'}</span>
                                                    <span className="text-xs text-slate-400 mt-0.5">{product.category || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">{product.size || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm">{product.color || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm font-semibold">{currencyFormatter.format(Number(product.baseRentPrice || 0))}</td>
                                            <td className="px-6 py-4 text-sm font-semibold">{currencyFormatter.format(Number(product.baseSalePrice || 0))}</td>
                                            <td className="px-6 py-4 text-sm">{totalQuantity}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${productStatus === 'Còn hàng' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
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
                            onClick={() => onSelectProduct(product._id || product.id)}
                            className="group relative bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-lg cursor-pointer"
                        >
                            <div className="relative aspect-3/4 overflow-hidden bg-slate-100">
                                <img
                                    src={product?.images?.[0] || 'https://picsum.photos/seed/product-grid/400/600'}
                                    alt={product.name || 'Product'}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            </div>
                            <div className="p-5">
                                <h3 className="font-bold text-slate-900 line-clamp-1">{product.name || 'N/A'}</h3>
                                <p className="text-sm text-slate-500 mb-2">{product.category || 'N/A'}</p>
                                <p className="text-sm text-slate-500 mb-3">{product.size || 'N/A'} • {product.color || 'N/A'}</p>
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
                    Showing {totalItems === 0 ? 0 : startItemIndex + 1} to {endItemIndex} of {totalItems} products
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
                <div
                    className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
                    onClick={handleCloseCreateModal}
                >
                    <div
                        className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col"
                        style={{ maxHeight: 'calc(100vh - 3rem)' }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-900">Thêm sản phẩm mới</h3>
                                <p className="text-sm text-slate-500 mt-0.5">Nhập thông tin cơ bản để tạo sản phẩm trong kho.</p>
                            </div>
                            <button
                                type="button"
                                className="p-1.5 text-slate-500 hover:text-slate-700"
                                onClick={handleCloseCreateModal}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form className="flex-1 flex flex-col overflow-hidden" onSubmit={handleCreateProduct}>
                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                <section className="rounded-xl border border-slate-200 p-4">
                                    <h4 className="text-sm font-semibold text-slate-800 mb-3">Thông tin cơ bản</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Tên sản phẩm</label>
                                            <input
                                                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/40"
                                                placeholder="Ví dụ: Váy dạ hội ren"
                                                value={createForm.name}
                                                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Category</label>
                                            <input
                                                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/40"
                                                placeholder="Ví dụ: Evening Dress"
                                                value={createForm.category}
                                                onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Size</label>
                                            <input
                                                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/40"
                                                placeholder="Ví dụ: S / M / L"
                                                value={createForm.size}
                                                onChange={(event) => setCreateForm((prev) => ({ ...prev, size: event.target.value }))}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Màu sắc</label>
                                            <input
                                                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/40"
                                                placeholder="Ví dụ: Đỏ đô"
                                                value={createForm.color}
                                                onChange={(event) => setCreateForm((prev) => ({ ...prev, color: event.target.value }))}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Số lượng sản phẩm</label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/40"
                                                placeholder="Ví dụ: 5"
                                                value={createForm.quantity}
                                                onChange={(event) => setCreateForm((prev) => ({ ...prev, quantity: event.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-xl border border-slate-200 p-4">
                                    <h4 className="text-sm font-semibold text-slate-800 mb-3">Giá & tài chính</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Giá thuê cơ bản</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/40"
                                                placeholder="Ví dụ: 250000"
                                                value={createForm.baseRentPrice}
                                                onChange={(event) => setCreateForm((prev) => ({ ...prev, baseRentPrice: event.target.value }))}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Giá bán cơ bản</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/40"
                                                placeholder="Ví dụ: 900000"
                                                value={createForm.baseSalePrice}
                                                onChange={(event) => setCreateForm((prev) => ({ ...prev, baseSalePrice: event.target.value }))}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Tiền cọc (tuỳ chọn)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/40"
                                                placeholder="Ví dụ: 300000"
                                                value={createForm.depositAmount}
                                                onChange={(event) => setCreateForm((prev) => ({ ...prev, depositAmount: event.target.value }))}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Buyout value (tuỳ chọn)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/40"
                                                placeholder="Ví dụ: 1200000"
                                                value={createForm.buyoutValue}
                                                onChange={(event) => setCreateForm((prev) => ({ ...prev, buyoutValue: event.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-xl border border-slate-200 p-4">
                                    <h4 className="text-sm font-semibold text-slate-800 mb-3">Media & mô tả</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Ảnh sản phẩm (tuỳ chọn)</label>
                                            <input
                                                id="create-product-images"
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={(event) => {
                                                    const files = Array.from(event.target.files || [])
                                                    setCreateForm((prev) => ({ ...prev, imageFiles: files }))
                                                }}
                                            />
                                            <label
                                                htmlFor="create-product-images"
                                                className="w-full h-11 border border-slate-200 rounded-lg px-3 text-sm text-slate-700 cursor-pointer hover:border-[#1975d2]/50 hover:bg-slate-50 flex items-center justify-between gap-2"
                                            >
                                                <span className="inline-flex items-center gap-2 min-w-0">
                                                    <ImagePlus className="w-4 h-4 text-[#1975d2] shrink-0" />
                                                    <span className="truncate">{createForm.imageFiles.length > 0 ? `Đã chọn ${createForm.imageFiles.length} ảnh` : 'Chọn ảnh sản phẩm'}</span>
                                                </span>
                                                <span className="text-xs font-medium text-slate-500 shrink-0">Tải lên</span>
                                            </label>
                                            {createForm.imageFiles.length > 0 ? (
                                                <p className="text-xs text-slate-500">Đã chọn {createForm.imageFiles.length} ảnh</p>
                                            ) : null}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Mô tả</label>
                                            <textarea
                                                rows={4}
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/40"
                                                placeholder="Mô tả ngắn về chất liệu, kiểu dáng, lưu ý bảo quản..."
                                                value={createForm.description}
                                                onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </section>

                                {createError ? <div className="owner-alert">{createError}</div> : null}
                            </div>

                            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                                <button
                                    type="button"
                                    className="h-10 px-4 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50"
                                    onClick={handleCloseCreateModal}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-10 px-4 rounded-lg bg-[#1975d2] text-white text-sm font-semibold hover:bg-[#1975d2]/90 disabled:opacity-60"
                                    disabled={creating}
                                >
                                    {creating ? 'Creating...' : 'Create Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

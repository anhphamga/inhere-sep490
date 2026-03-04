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
import { currencyFormatter, toArray } from '../../utils/owner.utils'
import AddProductModal from './AddProductModal'

const lifecycleOptions = ['', 'Available', 'Rented', 'Washing', 'Repair', 'Lost']
const initialFilters = { category: '', size: '', color: '', lifecycleStatus: '' }
const pageSize = 10
const commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'FREE SIZE']
const commonColors = ['Red', 'Pink', 'Yellow', 'Blue', 'Green', 'Black', 'White', 'Cream', 'Brown', 'Purple']

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

const normalizeCategoryTree = (nodes = []) => {
    return nodes
        .map((node) => ({
            name: String(node?.displayName || '').trim(),
            children: toArray(node?.children)
                .map((child) => String(child?.displayName || '').trim())
                .filter(Boolean),
        }))
        .filter((item) => item.name)
}

const uniqValues = (values = []) => {
    const seen = new Set()
    const result = []

    values.forEach((item) => {
        const normalized = String(item || '').trim()
        if (!normalized) {
            return
        }
        const key = normalized.toLowerCase()
        if (seen.has(key)) {
            return
        }
        seen.add(key)
        result.push(normalized)
    })

    return result
}

const normalizeSizeToken = (value) => String(value || '').trim().toUpperCase()

const buildVariantMatrix = (sizes = [], colors = [], seed = []) => {
    const seedMap = new Map(
        (Array.isArray(seed) ? seed : []).map((item) => [`${item.size}::${item.color}`, item])
    )

    const rows = []
    sizes.forEach((size) => {
        colors.forEach((color) => {
            const key = `${size}::${color}`
            const prev = seedMap.get(key)
            rows.push({
                size,
                color,
                rentPrice: prev?.rentPrice ?? '',
                salePrice: prev?.salePrice ?? '',
                quantity: prev?.quantity ?? '',
            })
        })
    })

    return rows
}

const flattenCategoryNames = (tree = []) => {
    const names = []
    tree.forEach((node) => {
        if (node?.name) {
            names.push(node.name)
        }
        if (Array.isArray(node?.children) && node.children.length > 0) {
            names.push(...node.children)
        }
    })
    return uniqValues(names)
}

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
    const [categoryTree, setCategoryTree] = useState([])
    const [parentCategory, setParentCategory] = useState('')
    const [childCategory, setChildCategory] = useState('')
    const [createSizeValues, setCreateSizeValues] = useState([])
    const [createColorValues, setCreateColorValues] = useState([])
    const [createColorBlocks, setCreateColorBlocks] = useState([])
    const [createColorDraft, setCreateColorDraft] = useState('')
    const [createTab, setCreateTab] = useState('basic')
    const [createPricingMode, setCreatePricingMode] = useState('common')
    const [createVariantMatrix, setCreateVariantMatrix] = useState([])
    const [createDirty, setCreateDirty] = useState(false)
    const [createForm, setCreateForm] = useState({
        name: '',
        category: '',
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
            setError(apiError?.response?.data?.message || apiError?.message || 'Unable to load products list.')
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
                const response = await fetch('/api/categories')
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
    const sizeOptions = useMemo(() => [...new Set(products.map((item) => toDisplayText(item.size)).filter(Boolean))], [products])
    const colorOptions = useMemo(() => [...new Set(products.map((item) => toDisplayText(item.color)).filter(Boolean))], [products])
    const selectedParentChildren = categoryTree.find((item) => item.name === parentCategory)?.children || []

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

    const markCreateDirty = () => setCreateDirty(true)

    const updateCreateSizes = (nextValues) => {
        const normalized = uniqValues(nextValues.map((item) => normalizeSizeToken(item)).filter(Boolean))
        setCreateSizeValues(normalized)
        setCreateVariantMatrix((prev) => buildVariantMatrix(normalized, createColorValues, prev))
        markCreateDirty()
    }

    const updateCreateColors = (nextValues) => {
        const normalized = uniqValues(nextValues.map((item) => String(item || '').trim()).filter(Boolean))
        setCreateColorValues(normalized)
        setCreateVariantMatrix((prev) => buildVariantMatrix(createSizeValues, normalized, prev))
        markCreateDirty()
    }

    const addCreateColorBlock = () => {
        const name = String(createColorDraft || '').trim()
        if (!name) return
        if (createColorBlocks.some((block) => block.name.toLowerCase() === name.toLowerCase())) {
            setCreateError('Color already exists.')
            return
        }

        const nextBlocks = [...createColorBlocks, { name, images: [], urlDraft: '' }]
        setCreateColorBlocks(nextBlocks)
        setCreateColorDraft('')
        setCreateError('')
        updateCreateColors(nextBlocks.map((item) => item.name))
    }

    const removeCreateColorBlock = (name) => {
        const nextBlocks = createColorBlocks.filter((item) => item.name !== name)
        setCreateColorBlocks(nextBlocks)
        updateCreateColors(nextBlocks.map((item) => item.name))
    }

    const addCreateColorImageUrl = (name) => {
        setCreateColorBlocks((prev) => prev.map((block) => {
            if (block.name !== name) return block
            const nextUrl = String(block.urlDraft || '').trim()
            if (!nextUrl) return block
            if (block.images.some((img) => img.url === nextUrl)) return { ...block, urlDraft: '' }
            return {
                ...block,
                images: [...block.images, { id: `${Date.now()}-${Math.random()}`, url: nextUrl, file: null }],
                urlDraft: '',
            }
        }))
        markCreateDirty()
    }

    const removeCreateColorImage = (name, imageId) => {
        setCreateColorBlocks((prev) => prev.map((block) => {
            if (block.name !== name) return block
            return { ...block, images: block.images.filter((image) => image.id !== imageId) }
        }))
        markCreateDirty()
    }

    const addCreateColorFiles = (name, files = []) => {
        const prepared = Array.from(files || [])
            .filter((file) => file?.type?.startsWith('image/'))
            .map((file) => ({
                id: `${Date.now()}-${Math.random()}`,
                url: URL.createObjectURL(file),
                file,
            }))

        if (prepared.length === 0) return

        setCreateColorBlocks((prev) => prev.map((block) => {
            if (block.name !== name) return block
            return { ...block, images: [...block.images, ...prepared] }
        }))

        setCreateForm((prev) => ({ ...prev, imageFiles: [...prev.imageFiles, ...prepared.map((item) => item.file)] }))
        markCreateDirty()
    }

    const handleDropMainImages = (event) => {
        event.preventDefault()
        const files = Array.from(event.dataTransfer?.files || []).filter((file) => file?.type?.startsWith('image/'))
        if (files.length === 0) return
        setCreateForm((prev) => ({ ...prev, imageFiles: [...prev.imageFiles, ...files] }))
        markCreateDirty()
    }

    const resetCreateForm = () => {
        setCreateForm({
            name: '',
            category: '',
            quantity: '1',
            baseRentPrice: '',
            baseSalePrice: '',
            depositAmount: '',
            buyoutValue: '',
            imageFiles: [],
            description: ''
        })
        setParentCategory('')
        setChildCategory('')
        setCreateSizeValues([])
        setCreateColorValues([])
        setCreateColorBlocks([])
        setCreateColorDraft('')
        setCreateTab('basic')
        setCreatePricingMode('common')
        setCreateVariantMatrix([])
        setCreateDirty(false)
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
                category: String(childCategory || parentCategory || '').trim(),
                size: uniqValues(createSizeValues).join(', '),
                color: uniqValues(createColorValues).join(', '),
                categoryParent: parentCategory,
                categoryChild: childCategory,
                sizes: uniqValues(createSizeValues),
                colorVariants: createColorBlocks.map((block) => ({
                    name: block.name,
                    images: block.images.filter((img) => !img.file).map((img) => img.url),
                })),
                quantity: Number(createForm.quantity),
                baseRentPrice: Number(createForm.baseRentPrice),
                baseSalePrice: Number(createForm.baseSalePrice),
                depositAmount: createForm.depositAmount === '' ? 0 : Number(createForm.depositAmount),
                buyoutValue: createForm.buyoutValue === '' ? 0 : Number(createForm.buyoutValue),
                imageFiles: createForm.imageFiles,
                description: createForm.description.trim(),
                pricingMode: createPricingMode,
                commonRentPrice: createForm.baseRentPrice === '' ? 0 : Number(createForm.baseRentPrice),
                variantMatrix: createVariantMatrix.map((item) => ({
                    size: item.size,
                    color: item.color,
                    rentPrice: item.rentPrice === '' ? 0 : Number(item.rentPrice),
                    salePrice: item.salePrice === '' ? Number(createForm.baseSalePrice || 0) : Number(item.salePrice),
                    quantity: item.quantity === '' ? 0 : Number(item.quantity),
                })),
                isDraft: false,
            }

            if (!payload.name || !payload.category || !payload.size || !payload.color) {
                setCreateError('Please provide name, category, size, and color.')
                return
            }

            if ((payload.imageFiles || []).length === 0 && payload.colorVariants.every((item) => (item.images || []).length === 0)) {
                setCreateError('At least one product image is required.')
                return
            }

            if (createForm.baseRentPrice === '' || createForm.baseSalePrice === '') {
                setCreateError('Please provide base rent price and base sale price.')
                return
            }

            if (createForm.quantity === '' || !Number.isInteger(payload.quantity) || payload.quantity <= 0) {
                setCreateError('Quantity must be a positive integer.')
                return
            }

            if (
                Number.isNaN(payload.baseRentPrice)
                || Number.isNaN(payload.baseSalePrice)
                || Number.isNaN(payload.depositAmount)
                || Number.isNaN(payload.buyoutValue)
            ) {
                setCreateError('Price fields must be valid numbers.')
                return
            }

            if (
                payload.baseRentPrice < 0
                || payload.baseSalePrice < 0
                || payload.depositAmount < 0
                || payload.buyoutValue < 0
            ) {
                setCreateError('Price values cannot be negative.')
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
            setCreateError(apiError?.response?.data?.message || apiError?.message || 'Unable to create product.')
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
            setError(apiError?.response?.data?.message || apiError?.message || 'Unable to import products.')
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
            setError(apiError?.response?.data?.message || apiError?.message || 'Unable to export products.')
        } finally {
            setExporting(false)
        }
    }

    const handleDeleteProduct = async (productId) => {
        const confirmed = window.confirm('Are you sure you want to delete this product?')
        if (!confirmed) {
            return
        }

        try {
            setDeletingProductId(productId)
            setError('')
            await deleteOwnerProductApi(productId)
            await loadProducts(filters)
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Unable to delete product.')
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
        return <div className="owner-card owner-loading">Loading products...</div>
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
                            {categoryOptions.map((option, index) => (
                                <option key={`category-${option}-${index}`} value={option}>{option}</option>
                            ))}
                        </select>

                        <select
                            className="h-10 min-w-28 text-sm bg-slate-50 border-slate-200 rounded-lg focus:ring-[#1975d2] focus:border-[#1975d2] px-3 outline-none"
                            value={filters.size}
                            onChange={(event) => handleFilterChange('size', event.target.value)}
                        >
                            <option value="">size</option>
                            {sizeOptions.map((option, index) => (
                                <option key={`size-${option}-${index}`} value={option}>{option}</option>
                            ))}
                        </select>

                        <select
                            className="h-10 min-w-32 text-sm bg-slate-50 border-slate-200 rounded-lg focus:ring-[#1975d2] focus:border-[#1975d2] px-3 outline-none"
                            value={filters.color}
                            onChange={(event) => handleFilterChange('color', event.target.value)}
                        >
                            <option value="">Color</option>
                            {colorOptions.map((option, index) => (
                                <option key={`color-${option}-${index}`} value={option}>{option}</option>
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
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Color</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rent Price</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sale Price</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedProducts.map((product) => {
                                    const productId = product._id || product.id
                                    const totalQuantity = Number(product.totalQuantity || 0)
                                    const availableQuantity = Number(product.availableQuantity || 0)
                                    const productStatus = availableQuantity > 0 ? 'In stock' : 'Out of stock'
                                    const productName = toDisplayText(product.name) || 'N/A'
                                    const productCategory = toDisplayText(product.category) || 'N/A'
                                    const productSize = toDisplayText(product.size) || 'N/A'
                                    const productColor = toDisplayText(product.color) || 'N/A'

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
                                            <td className="px-6 py-4 text-sm">{totalQuantity}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${productStatus === 'In stock' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
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
                                            No matching products.
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
                                    alt={toDisplayText(product.name) || 'Product'}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            </div>
                            <div className="p-5">
                                <h3 className="font-bold text-slate-900 line-clamp-1">{toDisplayText(product.name) || 'N/A'}</h3>
                                <p className="text-sm text-slate-500 mb-2">{toDisplayText(product.category) || 'N/A'}</p>
                                <p className="text-sm text-slate-500 mb-3">{toDisplayText(product.size) || 'N/A'} â€¢ {toDisplayText(product.color) || 'N/A'}</p>
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-400 font-medium">Rent Price</span>
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
                <AddProductModal
                    categoryTree={categoryTree}
                    onClose={handleCloseCreateModal}
                    onCreated={async (createdId) => {
                        await loadProducts(filters)
                        if (createdId) {
                            onSelectProduct(createdId)
                        }
                    }}
                />
            ) : null}
        </div>
    )
}



/**
 * PRODUCT CONTROLLER - Owner quản lý sản phẩm trang phục
 */

const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const Product = require('../model/Product.model');
const ProductInstance = require('../model/ProductInstance.model');
const { hasCloudinaryConfig, uploadImageBuffer } = require('../utils/cloudinary');

const sanitizeProduct = (product) => ({
    id: product._id,
    name: product.name,
    category: product.category,
    size: product.size,
    color: product.color,
    description: product.description,
    images: product.images,
    baseRentPrice: product.baseRentPrice,
    baseSalePrice: product.baseSalePrice,
    depositAmount: product.depositAmount,
    buyoutValue: product.buyoutValue,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
});

const buildProductMatch = (query) => {
    const match = {};

    if (query.category) {
        match.category = query.category;
    }

    if (query.size) {
        match.size = query.size;
    }

    if (query.color) {
        match.color = query.color;
    }

    return match;
};

const normalizeProductKeyPart = (value) => String(value || '')
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizeProductKey = (value) => {
    const normalized = String(value || '').normalize('NFC').trim().toLowerCase();

    if (!normalized) {
        return '';
    }

    return normalized
        .split('|')
        .map((part) => part.trim().replace(/\s+/g, ' '))
        .filter((part) => part.length > 0)
        .join('|');
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildNameCategoryKey = (source) => [source?.name, source?.category]
    .map((value) => normalizeProductKeyPart(value))
    .join('|');

const buildProductKey = (source) => [
    source.name,
    source.category,
    source.size,
    source.color
]
    .map((value) => normalizeProductKeyPart(value))
    .join('|');

const buildProductAttrKey = (source) => [
    source.category,
    source.size,
    source.color
]
    .map((value) => normalizeProductKeyPart(value))
    .join('|');

const parseImages = (value) => {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const parseInstances = (value) => {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    return [];
};

const getImageRowNumber = (range) => {
    const topLeftAnchor = range?.tl || {};
    const zeroBasedRow = topLeftAnchor.nativeRow ?? topLeftAnchor.row;

    if (typeof zeroBasedRow !== 'number') {
        return null;
    }

    return Math.floor(zeroBasedRow) + 1;
};

const extractEmbeddedImagesByRow = async (fileBuffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.getWorksheet('Products') || workbook.worksheets[0];
    if (!worksheet || typeof worksheet.getImages !== 'function') {
        return new Map();
    }

    const images = worksheet.getImages();
    const imageBuffersByRow = new Map();

    images.forEach((image, index) => {
        const rowNumber = getImageRowNumber(image.range);
        if (!rowNumber) {
            return;
        }

        const media = workbook.model?.media?.find((item) => item.index === image.imageId);
        if (!media || !Buffer.isBuffer(media.buffer)) {
            return;
        }

        if (!imageBuffersByRow.has(rowNumber)) {
            imageBuffersByRow.set(rowNumber, []);
        }

        imageBuffersByRow.get(rowNumber).push({
            buffer: media.buffer,
            index
        });
    });

    return imageBuffersByRow;
};

const listOwnerProducts = async (req, res) => {
    try {
        const match = buildProductMatch(req.query);
        const { conditionLevel, lifecycleStatus } = req.query;

        const instancePipeline = [
            {
                $match: {
                    $expr: { $eq: ['$productId', '$$productId'] }
                }
            }
        ];

        const aggregatePipeline = [
            { $match: match },
            {
                $lookup: {
                    from: 'productinstances',
                    let: { productId: '$_id' },
                    pipeline: instancePipeline,
                    as: 'instances'
                }
            },
            {
                $addFields: {
                    totalQuantity: { $size: '$instances' },
                    availableQuantity: {
                        $size: {
                            $filter: {
                                input: '$instances',
                                as: 'item',
                                cond: { $eq: ['$$item.lifecycleStatus', 'Available'] }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    instances: 0
                }
            },
            { $sort: { createdAt: -1 } }
        ];

        if (conditionLevel) {
            aggregatePipeline.splice(2, 0, {
                $match: { 'instances.conditionLevel': conditionLevel }
            });
        }

        if (lifecycleStatus) {
            aggregatePipeline.splice(2, 0, {
                $match: { 'instances.lifecycleStatus': lifecycleStatus }
            });
        }

        const products = await Product.aggregate(aggregatePipeline);

        return res.status(200).json({
            success: true,
            message: 'Get product list successfully',
            data: products
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting product list',
            error: error.message
        });
    }
};

const getOwnerProductDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const instances = await ProductInstance.find({ productId: product._id }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Get product detail successfully',
            data: {
                product: sanitizeProduct(product),
                instances,
                totalQuantity: instances.length,
                availableQuantity: instances.filter((item) => item.lifecycleStatus === 'Available').length
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting product detail',
            error: error.message
        });
    }
};

const createOwnerProduct = async (req, res) => {
    try {
        const {
            name,
            category,
            size,
            color,
            description,
            images,
            baseRentPrice,
            baseSalePrice,
            depositAmount,
            buyoutValue,
            quantity,
            instances
        } = req.body;

        if (!name || !category || !size || !color || baseRentPrice == null || baseSalePrice == null) {
            return res.status(400).json({
                success: false,
                message: 'name, category, size, color, baseRentPrice, baseSalePrice are required'
            });
        }

        let uploadedImageUrls = [];
        if (Array.isArray(req.files) && req.files.length > 0) {
            if (!hasCloudinaryConfig()) {
                return res.status(500).json({
                    success: false,
                    message: 'Cloudinary is not configured'
                });
            }

            const uploadResults = await Promise.all(
                req.files.map((file, index) => uploadImageBuffer(file.buffer, {
                    folder: 'inhere/products',
                    public_id: `product_${Date.now()}_${index}`,
                    resource_type: 'image'
                }))
            );

            uploadedImageUrls = uploadResults.map((result) => result.secure_url).filter(Boolean);
        }

        const bodyImages = parseImages(images);
        const normalizedInstances = parseInstances(instances);
        const parsedQuantity = quantity == null || quantity === '' ? 0 : Number(quantity);

        if (quantity != null && quantity !== '') {
            if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'quantity must be a non-negative integer'
                });
            }
        }

        const product = await Product.create({
            name,
            category,
            size,
            color,
            description: description || '',
            images: [...bodyImages, ...uploadedImageUrls],
            baseRentPrice,
            baseSalePrice,
            depositAmount: depositAmount ?? 0,
            buyoutValue: buyoutValue ?? 0
        });

        const instanceDocsFromPayload = normalizedInstances.map((instance) => ({
            productId: product._id,
            conditionLevel: instance.conditionLevel || 'New',
            conditionScore: instance.conditionScore ?? 100,
            lifecycleStatus: instance.lifecycleStatus || 'Available',
            currentRentPrice: instance.currentRentPrice ?? baseRentPrice,
            currentSalePrice: instance.currentSalePrice ?? baseSalePrice,
            note: instance.note || ''
        }));

        const instanceDocsFromQuantity = parsedQuantity > 0
            ? Array.from({ length: parsedQuantity }, () => ({
                productId: product._id,
                conditionLevel: 'New',
                conditionScore: 100,
                lifecycleStatus: 'Available',
                currentRentPrice: baseRentPrice,
                currentSalePrice: baseSalePrice,
                note: ''
            }))
            : [];

        const instanceDocs = instanceDocsFromPayload.length > 0
            ? instanceDocsFromPayload
            : instanceDocsFromQuantity;

        if (instanceDocs.length > 0) {

            await ProductInstance.insertMany(instanceDocs);
        }

        return res.status(201).json({
            success: true,
            message: 'Create product successfully',
            data: sanitizeProduct(product)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error creating product',
            error: error.message
        });
    }
};

const updateOwnerProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const hasQuantityField = Object.prototype.hasOwnProperty.call(req.body, 'quantity');
        const parsedQuantity = hasQuantityField ? Number(req.body.quantity) : 0;

        if (hasQuantityField && (!Number.isInteger(parsedQuantity) || parsedQuantity < 0)) {
            return res.status(400).json({
                success: false,
                message: 'quantity must be a non-negative integer'
            });
        }

        const allowedFields = [
            'name',
            'category',
            'size',
            'color',
            'description',
            'baseRentPrice',
            'baseSalePrice',
            'depositAmount',
            'buyoutValue'
        ];

        const payload = {};
        allowedFields.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                payload[field] = req.body[field];
            }
        });

        let uploadedImageUrls = [];
        if (Array.isArray(req.files) && req.files.length > 0) {
            if (!hasCloudinaryConfig()) {
                return res.status(500).json({
                    success: false,
                    message: 'Cloudinary is not configured'
                });
            }

            const uploadResults = await Promise.all(
                req.files.map((file, index) => uploadImageBuffer(file.buffer, {
                    folder: 'inhere/products',
                    public_id: `product_update_${Date.now()}_${index}`,
                    resource_type: 'image'
                }))
            );

            uploadedImageUrls = uploadResults.map((result) => result.secure_url).filter(Boolean);
        }

        const hasImagesField = Object.prototype.hasOwnProperty.call(req.body, 'images');
        if (hasImagesField || uploadedImageUrls.length > 0) {
            const bodyImages = parseImages(req.body.images);
            payload.images = [...bodyImages, ...uploadedImageUrls];
        }

        const shouldCreateInstances = hasQuantityField && parsedQuantity > 0;

        if (Object.keys(payload).length === 0 && !shouldCreateInstances) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        let product;

        if (Object.keys(payload).length > 0) {
            product = await Product.findByIdAndUpdate(id, payload, {
                new: true,
                runValidators: true
            });
        } else {
            product = await Product.findById(id);
        }

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (shouldCreateInstances) {
            const instanceDocs = Array.from({ length: parsedQuantity }, () => ({
                productId: product._id,
                conditionLevel: 'New',
                conditionScore: 100,
                lifecycleStatus: 'Available',
                currentRentPrice: product.baseRentPrice,
                currentSalePrice: product.baseSalePrice,
                note: ''
            }));

            await ProductInstance.insertMany(instanceDocs);
        }

        return res.status(200).json({
            success: true,
            message: 'Update product successfully',
            data: sanitizeProduct(product)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error updating product',
            error: error.message
        });
    }
};

const updateOwnerProductCollateral = async (req, res) => {
    try {
        const { id } = req.params;
        const { depositAmount, buyoutValue } = req.body;

        if (depositAmount == null && buyoutValue == null) {
            return res.status(400).json({
                success: false,
                message: 'depositAmount or buyoutValue is required'
            });
        }

        const updates = {};
        if (depositAmount != null) {
            updates.depositAmount = depositAmount;
        }
        if (buyoutValue != null) {
            updates.buyoutValue = buyoutValue;
        }

        const product = await Product.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Update collateral settings successfully',
            data: sanitizeProduct(product)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error updating collateral settings',
            error: error.message
        });
    }
};

const deleteOwnerProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findByIdAndDelete(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        await ProductInstance.deleteMany({ productId: id });

        return res.status(200).json({
            success: true,
            message: 'Delete product successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error deleting product',
            error: error.message
        });
    }
};

const exportOwnerProducts = async (req, res) => {
    try {
        const match = buildProductMatch(req.query);
        const includeInstances = req.query.includeInstances === 'true';

        if (req.query.format === 'json') {
            const products = await Product.find(match).sort({ createdAt: -1 });

            if (!includeInstances) {
                return res.status(200).json({
                    success: true,
                    message: 'Export products successfully',
                    data: products.map(sanitizeProduct)
                });
            }

            const productIds = products.map((product) => product._id);
            const instances = await ProductInstance.find({ productId: { $in: productIds } });

            const instanceMap = new Map();
            instances.forEach((instance) => {
                const key = instance.productId.toString();
                if (!instanceMap.has(key)) {
                    instanceMap.set(key, []);
                }
                instanceMap.get(key).push(instance);
            });

            const data = products.map((product) => ({
                ...sanitizeProduct(product),
                instances: instanceMap.get(product._id.toString()) || []
            }));

            return res.status(200).json({
                success: true,
                message: 'Export products successfully',
                data
            });
        }

        const products = await Product.find(match).sort({ createdAt: -1 });
        const productIds = products.map((product) => product._id);
        const quantityAgg = await ProductInstance.aggregate([
            { $match: { productId: { $in: productIds } } },
            { $group: { _id: '$productId', quantity: { $sum: 1 } } }
        ]);
        const quantityMap = new Map(quantityAgg.map((item) => [item._id.toString(), item.quantity]));

        const productRows = products.map((product) => ({
            name: product.name,
            category: product.category,
            size: product.size,
            color: product.color,
            description: product.description || '',
            images: (product.images || []).join(', '),
            quantity: quantityMap.get(product._id.toString()) || 0,
            baseRentPrice: product.baseRentPrice,
            baseSalePrice: product.baseSalePrice,
            depositAmount: product.depositAmount ?? 0,
            buyoutValue: product.buyoutValue ?? 0
        }));

        const workbook = xlsx.utils.book_new();
        const productSheet = xlsx.utils.json_to_sheet(productRows);
        xlsx.utils.book_append_sheet(workbook, productSheet, 'Products');

        if (includeInstances) {
            const productIds = products.map((product) => product._id);
            const instances = await ProductInstance.find({ productId: { $in: productIds } });
            const productKeyById = new Map(
                products.map((product) => [product._id.toString(), buildProductKey(product)])
            );

            const instanceRows = instances.map((instance) => ({
                productKey: productKeyById.get(instance.productId.toString()) || '',
                conditionLevel: instance.conditionLevel,
                conditionScore: instance.conditionScore,
                lifecycleStatus: instance.lifecycleStatus,
                currentRentPrice: instance.currentRentPrice,
                currentSalePrice: instance.currentSalePrice,
                note: instance.note || ''
            }));

            const instanceSheet = xlsx.utils.json_to_sheet(instanceRows);
            xlsx.utils.book_append_sheet(workbook, instanceSheet, 'Instances');
        }

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const timestamp = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=products_${timestamp}.xlsx`);
        return res.status(200).send(buffer);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error exporting products',
            error: error.message
        });
    }
};

const importOwnerProducts = async (req, res) => {
    try {
        if (req.file) {
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const productSheet = workbook.Sheets.Products || workbook.Sheets[workbook.SheetNames[0]];
            const instanceSheet = workbook.Sheets.Instances;

            const productRows = xlsx.utils.sheet_to_json(productSheet, { defval: '' });
            const embeddedImageUrlsByRow = new Map();

            const embeddedImagesByRow = await extractEmbeddedImagesByRow(req.file.buffer);
            if (embeddedImagesByRow.size > 0) {
                if (!hasCloudinaryConfig()) {
                    return res.status(500).json({
                        success: false,
                        message: 'Cloudinary is not configured'
                    });
                }

                for (const [rowNumber, imageItems] of embeddedImagesByRow.entries()) {
                    const uploadedImages = await Promise.all(
                        imageItems.map((item) => uploadImageBuffer(item.buffer, {
                            folder: 'inhere/products/import',
                            public_id: `product_import_r${rowNumber}_${Date.now()}_${item.index}`,
                            resource_type: 'image'
                        }))
                    );

                    embeddedImageUrlsByRow.set(
                        rowNumber,
                        uploadedImages.map((result) => result.secure_url).filter(Boolean)
                    );
                }
            }

            if (!productRows.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Products sheet is empty'
                });
            }

            const preparedProducts = [];
            const productIndexByKeyMap = new Map();
            const productIndexesByAttrMap = new Map();

            for (let rowIndex = 0; rowIndex < productRows.length; rowIndex += 1) {
                const row = productRows[rowIndex];
                const excelRowNumber = rowIndex + 2;
                const embeddedImageUrls = embeddedImageUrlsByRow.get(excelRowNumber) || [];
                const productData = {
                    name: row.name || row.Name,
                    category: row.category || row.Category,
                    size: row.size || row.Size,
                    color: row.color || row.Color,
                    description: row.description || row.Description || '',
                    images: [...new Set([...parseImages(row.images || row.Images), ...embeddedImageUrls])],
                    baseRentPrice: row.baseRentPrice ?? row.BaseRentPrice,
                    baseSalePrice: row.baseSalePrice ?? row.BaseSalePrice,
                    depositAmount: row.depositAmount ?? row.DepositAmount ?? 0,
                    buyoutValue: row.buyoutValue ?? row.BuyoutValue ?? 0,
                    quantity: row.quantity ?? row.Quantity ?? 0
                };

                if (!productData.name || !productData.category || !productData.size || !productData.color || productData.baseRentPrice == null || productData.baseSalePrice == null) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each product requires name, category, size, color, baseRentPrice, baseSalePrice'
                    });
                }

                const normalizedProduct = {
                    ...productData,
                    baseRentPrice: Number(productData.baseRentPrice),
                    baseSalePrice: Number(productData.baseSalePrice),
                    depositAmount: Number(productData.depositAmount || 0),
                    buyoutValue: Number(productData.buyoutValue || 0),
                    quantity: Number(productData.quantity || 0)
                };

                if (!Number.isInteger(normalizedProduct.quantity) || normalizedProduct.quantity < 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'quantity must be a non-negative integer'
                    });
                }

                preparedProducts.push(normalizedProduct);

                const key = normalizeProductKey(row.productKey || row.ProductKey || buildProductKey(normalizedProduct));
                productIndexByKeyMap.set(key, rowIndex);

                const attrKey = buildProductAttrKey(normalizedProduct);
                if (!productIndexesByAttrMap.has(attrKey)) {
                    productIndexesByAttrMap.set(attrKey, []);
                }
                productIndexesByAttrMap.get(attrKey).push(rowIndex);
            }

            const preparedInstanceDocs = [];

            if (instanceSheet) {
                const instanceRows = xlsx.utils.sheet_to_json(instanceSheet, { defval: '' });
                const unresolvedRows = [];
                let resolvedCount = 0;

                for (const row of instanceRows) {
                    const rawProductKey = row.productKey || row.ProductKey || '';
                    const rowKey = normalizeProductKey(rawProductKey);
                    let resolvedProductIndex = rowKey ? productIndexByKeyMap.get(rowKey) : null;

                    if (resolvedProductIndex == null && rowKey.includes('|')) {
                        const keyParts = rowKey.split('|');

                        if (keyParts.length >= 4) {
                            const fallbackAttrKey = [keyParts[1], keyParts[2], keyParts[3]]
                                .map((value) => normalizeProductKeyPart(value))
                                .join('|');

                            const matchedIndexes = productIndexesByAttrMap.get(fallbackAttrKey) || [];
                            if (matchedIndexes.length === 1) {
                                [resolvedProductIndex] = matchedIndexes;
                            }
                        }
                    }

                    const normalizedInstanceData = {
                        rawProductKey,
                        rowKey,
                        conditionLevel: row.conditionLevel || row.ConditionLevel || 'New',
                        conditionScore: row.conditionScore ?? row.ConditionScore ?? 100,
                        lifecycleStatus: row.lifecycleStatus || row.LifecycleStatus || 'Available',
                        currentRentPrice: row.currentRentPrice ?? row.CurrentRentPrice,
                        currentSalePrice: row.currentSalePrice ?? row.CurrentSalePrice,
                        note: row.note || row.Note || ''
                    };

                    if (resolvedProductIndex == null) {
                        unresolvedRows.push(normalizedInstanceData);
                        continue;
                    }

                    const baseProduct = preparedProducts[resolvedProductIndex];
                    preparedInstanceDocs.push({
                        productIndex: resolvedProductIndex,
                        conditionLevel: normalizedInstanceData.conditionLevel,
                        conditionScore: normalizedInstanceData.conditionScore,
                        lifecycleStatus: normalizedInstanceData.lifecycleStatus,
                        currentRentPrice: normalizedInstanceData.currentRentPrice ?? baseProduct?.baseRentPrice ?? 0,
                        currentSalePrice: normalizedInstanceData.currentSalePrice ?? baseProduct?.baseSalePrice ?? 0,
                        note: normalizedInstanceData.note
                    });
                    resolvedCount += 1;
                }

                if (unresolvedRows.length > 0) {
                    if (resolvedCount === 0) {
                        const keyOrderMap = new Map();

                        unresolvedRows.forEach((item) => {
                            if (!item.rowKey || keyOrderMap.has(item.rowKey)) {
                                return;
                            }

                            keyOrderMap.set(item.rowKey, keyOrderMap.size);
                        });

                        for (const item of unresolvedRows) {
                            if (!item.rowKey || !keyOrderMap.has(item.rowKey)) {
                                return res.status(400).json({
                                    success: false,
                                    message: `Instance row has invalid productKey: ${item.rawProductKey || 'empty'}`
                                });
                            }

                            const fallbackIndex = keyOrderMap.get(item.rowKey);
                            const baseProduct = preparedProducts[fallbackIndex];

                            if (!baseProduct) {
                                return res.status(400).json({
                                    success: false,
                                    message: `Instance row has invalid productKey: ${item.rawProductKey || 'empty'}`
                                });
                            }

                            preparedInstanceDocs.push({
                                productIndex: fallbackIndex,
                                conditionLevel: item.conditionLevel,
                                conditionScore: item.conditionScore,
                                lifecycleStatus: item.lifecycleStatus,
                                currentRentPrice: item.currentRentPrice ?? baseProduct.baseRentPrice,
                                currentSalePrice: item.currentSalePrice ?? baseProduct.baseSalePrice,
                                note: item.note
                            });
                        }
                    } else {
                        const firstInvalid = unresolvedRows[0];
                        return res.status(400).json({
                            success: false,
                            message: `Instance row has invalid productKey: ${firstInvalid.rawProductKey || 'empty'}`
                        });
                    }
                }
            }

            const instanceDocsByProductIndex = new Map();
            preparedInstanceDocs.forEach((instance) => {
                if (!instanceDocsByProductIndex.has(instance.productIndex)) {
                    instanceDocsByProductIndex.set(instance.productIndex, []);
                }
                instanceDocsByProductIndex.get(instance.productIndex).push(instance);
            });

            const createdProducts = [];
            const affectedProducts = [];
            const productIdByRowIndex = new Map();
            const productByNameCategoryKey = new Map();

            for (let index = 0; index < preparedProducts.length; index += 1) {
                const productData = preparedProducts[index];
                const nameCategoryKey = buildNameCategoryKey(productData);

                let targetProduct = productByNameCategoryKey.get(nameCategoryKey);

                if (!targetProduct) {
                    targetProduct = await Product.findOne({
                        name: { $regex: `^${escapeRegex(productData.name)}$`, $options: 'i' },
                        category: { $regex: `^${escapeRegex(productData.category)}$`, $options: 'i' }
                    });
                }

                if (!targetProduct) {
                    targetProduct = await Product.create({
                        name: productData.name,
                        category: productData.category,
                        size: productData.size,
                        color: productData.color,
                        description: productData.description || '',
                        images: Array.isArray(productData.images) ? productData.images : [],
                        baseRentPrice: productData.baseRentPrice,
                        baseSalePrice: productData.baseSalePrice,
                        depositAmount: productData.depositAmount ?? 0,
                        buyoutValue: productData.buyoutValue ?? 0
                    });
                    createdProducts.push(targetProduct);
                }

                productByNameCategoryKey.set(nameCategoryKey, targetProduct);
                productIdByRowIndex.set(index, targetProduct._id);
            }

            const allInstanceDocs = [];

            for (let index = 0; index < preparedProducts.length; index += 1) {
                const productData = preparedProducts[index];
                const productId = productIdByRowIndex.get(index);

                if (!productId) {
                    continue;
                }

                const productInstancesFromSheet = instanceDocsByProductIndex.get(index) || [];

                if (productInstancesFromSheet.length > 0) {
                    productInstancesFromSheet.forEach((instance) => {
                        allInstanceDocs.push({
                            productId,
                            conditionLevel: instance.conditionLevel,
                            conditionScore: instance.conditionScore,
                            lifecycleStatus: instance.lifecycleStatus,
                            currentRentPrice: instance.currentRentPrice,
                            currentSalePrice: instance.currentSalePrice,
                            note: instance.note
                        });
                    });
                } else if (productData.quantity > 0) {
                    for (let quantityIndex = 0; quantityIndex < productData.quantity; quantityIndex += 1) {
                        allInstanceDocs.push({
                            productId,
                            conditionLevel: 'New',
                            conditionScore: 100,
                            lifecycleStatus: 'Available',
                            currentRentPrice: productData.baseRentPrice,
                            currentSalePrice: productData.baseSalePrice,
                            note: ''
                        });
                    }
                }
            }

            if (allInstanceDocs.length > 0) {
                await ProductInstance.insertMany(allInstanceDocs);
            }

            const affectedProductIds = Array.from(new Set(Array.from(productIdByRowIndex.values()).map((value) => value.toString())));
            if (affectedProductIds.length > 0) {
                const products = await Product.find({ _id: { $in: affectedProductIds } });
                affectedProducts.push(...products);
            }

            return res.status(201).json({
                success: true,
                message: 'Import products successfully',
                data: affectedProducts.map(sanitizeProduct)
            });
        }

        const payload = Array.isArray(req.body) ? req.body : req.body?.products;

        if (!Array.isArray(payload) || payload.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'products array is required'
            });
        }

        const createdProducts = [];
        const affectedProducts = [];
        const productByNameCategoryKey = new Map();

        for (const item of payload) {
            if (!item.name || !item.category || !item.size || !item.color || item.baseRentPrice == null || item.baseSalePrice == null) {
                return res.status(400).json({
                    success: false,
                    message: 'Each product requires name, category, size, color, baseRentPrice, baseSalePrice'
                });
            }

            const nameCategoryKey = buildNameCategoryKey(item);
            let product = productByNameCategoryKey.get(nameCategoryKey);

            if (!product) {
                product = await Product.findOne({
                    name: { $regex: `^${escapeRegex(item.name)}$`, $options: 'i' },
                    category: { $regex: `^${escapeRegex(item.category)}$`, $options: 'i' }
                });
            }

            if (!product) {
                product = await Product.create({
                    name: item.name,
                    category: item.category,
                    size: item.size,
                    color: item.color,
                    description: item.description || '',
                    images: Array.isArray(item.images) ? item.images : [],
                    baseRentPrice: item.baseRentPrice,
                    baseSalePrice: item.baseSalePrice,
                    depositAmount: item.depositAmount ?? 0,
                    buyoutValue: item.buyoutValue ?? 0
                });
                createdProducts.push(product);
            }

            productByNameCategoryKey.set(nameCategoryKey, product);

            if (Array.isArray(item.instances) && item.instances.length > 0) {
                const instanceDocs = item.instances.map((instance) => ({
                    productId: product._id,
                    conditionLevel: instance.conditionLevel || 'New',
                    conditionScore: instance.conditionScore ?? 100,
                    lifecycleStatus: instance.lifecycleStatus || 'Available',
                    currentRentPrice: instance.currentRentPrice ?? product.baseRentPrice,
                    currentSalePrice: instance.currentSalePrice ?? product.baseSalePrice,
                    note: instance.note || ''
                }));

                await ProductInstance.insertMany(instanceDocs);
            } else {
                const parsedQuantity = Number(item.quantity || 0);

                if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'quantity must be a non-negative integer'
                    });
                }

                if (parsedQuantity > 0) {
                    const quantityInstances = Array.from({ length: parsedQuantity }, () => ({
                        productId: product._id,
                        conditionLevel: 'New',
                        conditionScore: 100,
                        lifecycleStatus: 'Available',
                        currentRentPrice: product.baseRentPrice,
                        currentSalePrice: product.baseSalePrice,
                        note: ''
                    }));

                    await ProductInstance.insertMany(quantityInstances);
                }
            }

            affectedProducts.push(product);
        }

        return res.status(201).json({
            success: true,
            message: 'Import products successfully',
            data: Array.from(new Map(affectedProducts.map((product) => [product._id.toString(), product])).values()).map(sanitizeProduct),
            createdCount: createdProducts.length
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error importing products',
            error: error.message
        });
    }
};

module.exports = {
    listOwnerProducts,
    getOwnerProductDetail,
    createOwnerProduct,
    updateOwnerProduct,
    updateOwnerProductCollateral,
    deleteOwnerProduct,
    exportOwnerProducts,
    importOwnerProducts
};

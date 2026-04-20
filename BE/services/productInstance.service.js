// CONTROLLER ENHANCEMENTS FOR PRODUCT INSTANCE REFACTORING

const ProductInstance = require('../model/ProductInstance.model');

/**
 * Generate unique instance code
 * Example: "M-001", "L-002"
 */
const generateInstanceCode = async (productId, size, sequenceNum) => {
  const sizePrefix = String(size || '').toUpperCase().substring(0, 3);
  const paddedNum = String(sequenceNum).padStart(3, '0');
  const baseCode = `${sizePrefix}-${paddedNum}`;
  
  // Ensure uniqueness
  let code = baseCode;
  let counter = 1;
  while (await ProductInstance.findOne({ code })) {
    code = `${baseCode}-${counter}`;
    counter++;
  }
  return code;
};

/**
 * Create instances when adding a product with sizes
 */
const createSizeInstances = async ({ productId, sizes, baseRentPrice, baseSalePrice }) => {
  if (!Array.isArray(sizes) || sizes.length === 0) return;

  const instances = [];
  
  for (const sizeItem of sizes) {
    const size = String(sizeItem.size || '').trim().toUpperCase();
    const quantity = Math.max(Number(sizeItem.quantity) || 0, 0);
    
    if (!size || quantity === 0) continue;
    
    for (let i = 1; i <= quantity; i++) {
      const code = await generateInstanceCode(productId, size, i);
      instances.push({
        productId,
        size,
        code,
        conditionLevel: 'New',
        conditionScore: 100,
        lifecycleStatus: 'Available',
        currentRentPrice: baseRentPrice,
        currentSalePrice: baseSalePrice,
      });
    }
  }
  
  if (instances.length > 0) {
    await ProductInstance.insertMany(instances);
  }
};

/**
 * Create instances for non-sized products
 */
const createSimpleInstances = async ({ productId, quantity, baseRentPrice, baseSalePrice }) => {
  if (!Number.isInteger(quantity) || quantity <= 0) return;
  
  const instances = [];
  for (let i = 1; i <= quantity; i++) {
    const code = await generateInstanceCode(productId, 'ONE', i);
    instances.push({
      productId,
      size: 'ONE',
      code,
      conditionLevel: 'New',
      conditionScore: 100,
      lifecycleStatus: 'Available',
      currentRentPrice: baseRentPrice,
      currentSalePrice: baseSalePrice,
    });
  }
  
  if (instances.length > 0) {
    await ProductInstance.insertMany(instances);
  }
};

/**
 * Handle size quantity changes during product update
 */
const updateSizeInstances = async ({
  productId,
  oldSizes,
  newSizes,
  baseRentPrice = 0,
  baseSalePrice = 0,
}) => {
  const sizeMap = new Map();
  
  // Map old sizes
  if (Array.isArray(oldSizes)) {
    for (const item of oldSizes) {
      const size = String(item.size || '').trim().toUpperCase();
      sizeMap.set(size, { old: Number(item.quantity) || 0, new: 0 });
    }
  }
  
  // Update with new quantities
  if (Array.isArray(newSizes)) {
    for (const item of newSizes) {
      const size = String(item.size || '').trim().toUpperCase();
      if (!size) continue;
      const newQty = Math.max(Number(item.quantity) || 0, 0);
      sizeMap.set(size, { 
        old: sizeMap.get(size)?.old || 0, 
        new: newQty 
      });
    }
  }
  
  // Process changes
  for (const [size, { old: oldQty, new: newQty }] of sizeMap.entries()) {
    if (newQty > oldQty) {
      // Need to create additional instances
      const difference = newQty - oldQty;
      const instances = [];
      
      // Get next sequence number for this size
      const lastInstance = await ProductInstance.findOne(
        { productId, size },
        { code: 1 }
      ).sort({ createdAt: -1 });
      
      const startNum = oldQty + 1;
      
      for (let i = 0; i < difference; i++) {
        const code = await generateInstanceCode(productId, size, startNum + i);
        instances.push({
          productId,
          size,
          code,
          conditionLevel: 'New',
          conditionScore: 100,
          lifecycleStatus: 'Available',
          currentRentPrice: baseRentPrice,
          currentSalePrice: baseSalePrice,
        });
      }
      
      if (instances.length > 0) {
        await ProductInstance.insertMany(instances);
      }
    } else if (newQty < oldQty) {
      // Remove AVAILABLE instances only
      const toRemove = oldQty - newQty;
      const availableInstances = await ProductInstance.find(
        { 
          productId, 
          size, 
          lifecycleStatus: 'Available' 
        },
        { _id: 1 }
      ).limit(toRemove);
      
      if (availableInstances.length > 0) {
        const ids = availableInstances.map(doc => doc._id);
        await ProductInstance.deleteMany({ _id: { $in: ids } });
      }
    }
  }
};

/**
 * Get inventory statistics for a product
 */
const getProductInventory = async (productId, options = {}) => {
  const query = { productId };
  if (options.excludeSold) {
    query.lifecycleStatus = { $ne: 'Sold' };
  }

  const instances = await ProductInstance.find(query).lean();
  
  const stats = {
    total: instances.length,
    available: 0,
    rented: 0,
    washing: 0,
    reserved: 0,
    repair: 0,
    lost: 0,
    sold: 0,
    bySize: {}
  };
  
  instances.forEach((instance) => {
    const lifecycle = String(instance.lifecycleStatus || 'Available');
    const statusKey = lifecycle.toLowerCase();
    stats[statusKey] = (stats[statusKey] || 0) + 1;

    const sizeKey = String(instance.size || 'ONE').trim().toUpperCase() || 'ONE';
    if (!stats.bySize[sizeKey]) {
      stats.bySize[sizeKey] = {
        total: 0,
        available: 0,
        rented: 0,
        washing: 0,
        reserved: 0,
        repair: 0,
        lost: 0,
        sold: 0,
      };
    }

    stats.bySize[sizeKey].total++;
    stats.bySize[sizeKey][statusKey] = (stats.bySize[sizeKey][statusKey] || 0) + 1;
  });
  
  return { instances, stats };
};

/**
 * Get instances by product with detailed info
 */
const getInstancesByProduct = async (productId, options = {}) => {
  if (options.excludeSold && options.status === 'Sold') {
    return [];
  }

  const query = { productId };
  
  if (options.size) {
    query.size = String(options.size).toUpperCase();
  }
  if (options.status) {
    query.lifecycleStatus = options.status;
  } else if (options.excludeSold) {
    query.lifecycleStatus = { $ne: 'Sold' };
  }
  
  const instances = await ProductInstance.find(query)
    .sort({ createdAt: 1 })
    .lean();
  
  return instances.map(instance => ({
    id: instance._id,
    size: instance.size,
    code: instance.code,
    status: instance.lifecycleStatus,
    condition: instance.conditionScore,
    conditionLevel: instance.conditionLevel,
    rentPrice: instance.currentRentPrice,
    salePrice: instance.currentSalePrice,
    createdAt: instance.createdAt,
  }));
};

module.exports = {
  generateInstanceCode,
  createSizeInstances,
  createSimpleInstances,
  updateSizeInstances,
  getProductInventory,
  getInstancesByProduct,
};

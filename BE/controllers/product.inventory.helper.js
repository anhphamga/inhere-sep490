/**
 * INVENTORY HELPER - Single source of truth: ProductInstance
 * 
 * Functions to:
 * 1. Group instances by size
 * 2. Compute sizes array from instances
 * 3. Calculate totals from instances (NOT product.sizes)
 */

/**
 * Group instances by size
 * 
 * Input: [{ size: "M", lifecycleStatus: "Available" }, { size: "M", lifecycleStatus: "Rented" }, { size: "L" }]
 * Output: [{ size: "M", quantity: 2 }, { size: "L", quantity: 1 }]
 */
const groupInstancesBySize = (instances = [], options = {}) => {
  const excludedStatuses = new Set(
    Array.isArray(options.excludeStatuses) ? options.excludeStatuses : []
  );
  const sizeMap = new Map();

  instances.forEach((instance) => {
    const status = String(instance.lifecycleStatus || '').trim();
    if (excludedStatuses.has(status)) return;
    const size = String(instance.size || '').trim().toUpperCase();
    if (!size) return;
    
    sizeMap.set(size, (sizeMap.get(size) || 0) + 1);
  });

  // Sort alphabetically for consistency
  return Array.from(sizeMap.entries())
    .sort(([sizeA], [sizeB]) => sizeA.localeCompare(sizeB))
    .map(([size, quantity]) => ({ size, quantity }));
};

/**
 * Compute sizes from instances (ProductInstance = source of truth)
 * 
 * - Do NOT use product.sizes.quantity
 * - Always derive from actual instances
 */
const computeSizesFromInstances = (instances = [], options = {}) => {
  return groupInstancesBySize(instances, options);
};

/**
 * Get inventory totals from instances
 */
const getInventoryTotals = (instances = [], options = {}) => {
  const excludedStatuses = new Set(
    Array.isArray(options.excludeStatuses) ? options.excludeStatuses : []
  );
  const totals = {
    total: 0,
    available: 0,
    rented: 0,
    reserved: 0,
    washing: 0,
    repair: 0,
    lost: 0,
    sold: 0,
  };

  instances.forEach((instance) => {
    const status = instance.lifecycleStatus || 'Available';
    if (excludedStatuses.has(status)) return;

    totals.total += 1;

    const statusKey = String(status).toLowerCase();
    if (
      statusKey !== 'total' &&
      Object.prototype.hasOwnProperty.call(totals, statusKey)
    ) {
      totals[statusKey] += 1;
    }
  });

  // Rentable = total - (lost + sold)
  totals.rentable = totals.total - (totals.lost + totals.sold);

  return totals;
};

/**
 * Compare old vs new sizes and determine changes
 * 
 * Returns: {
 *   sizesToCreate: [{ size: "XL", count: 2 }],
 *   sizesToRemove: [{ size: "S", count: 1 }]
 * }
 */
const computeSizeChanges = (oldSizes = [], newSizes = []) => {
  const oldMap = new Map();
  const newMap = new Map();

  // Build maps from size arrays
  oldSizes.forEach((item) => {
    const size = String(item.size || '').trim().toUpperCase();
    if (size) oldMap.set(size, Math.max(Number(item.quantity) || 0, 0));
  });

  newSizes.forEach((item) => {
    const size = String(item.size || '').trim().toUpperCase();
    if (size) newMap.set(size, Math.max(Number(item.quantity) || 0, 0));
  });

  const sizesToCreate = [];
  const sizesToRemove = [];

  // Check new sizes for increases
  newMap.forEach((newQty, size) => {
    const oldQty = oldMap.get(size) || 0;
    if (newQty > oldQty) {
      sizesToCreate.push({ size, count: newQty - oldQty });
    }
  });

  // Check old sizes for decreases
  oldMap.forEach((oldQty, size) => {
    const newQty = newMap.get(size) || 0;
    if (newQty < oldQty) {
      sizesToRemove.push({ size, count: oldQty - newQty });
    }
  });

  return { sizesToCreate, sizesToRemove };
};

module.exports = {
  groupInstancesBySize,
  computeSizesFromInstances,
  getInventoryTotals,
  computeSizeChanges,
};

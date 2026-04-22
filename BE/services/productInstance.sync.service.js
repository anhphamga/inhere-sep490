const { updateSizeInstances } = require('./productInstance.service');

/**
 * Backward-compatible adapter used by product.controller.js.
 * Keeps old call-sites working while delegating to the current service.
 */
const reconcileInstancesToSizeRows = async (
  productId,
  oldSizes = [],
  newSizes = [],
  options = {}
) => {
  return updateSizeInstances({
    productId,
    oldSizes,
    newSizes,
    baseRentPrice: Number(options.baseRentPrice) || 0,
    baseSalePrice: Number(options.baseSalePrice) || 0,
  });
};

module.exports = {
  reconcileInstancesToSizeRows,
};

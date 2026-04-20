const { updateSizeInstances } = require('./productInstance.service');

/**
 * Backward-compatible adapter used by product.controller.js.
 * Keeps old call-sites working while delegating to the current service.
 */
const reconcileInstancesToSizeRows = async (productId, oldSizes = [], newSizes = []) => {
  return updateSizeInstances({
    productId,
    oldSizes,
    newSizes,
  });
};

module.exports = {
  reconcileInstancesToSizeRows,
};

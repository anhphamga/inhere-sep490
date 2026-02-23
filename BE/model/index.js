const Alert = require('./Alert.model');
const Blog = require('./Blog.model');
const Collateral = require('./Collateral.model');
const Deposit = require('./Deposit.model');
const FittingBooking = require('./FittingBooking.model');
const InventoryHistory = require('./InventoryHistory.model');
const Payment = require('./Payment.model');
const PricingRule = require('./PricingRule.model');
const Product = require('./Product.model');
const ProductInstance = require('./ProductInstance.model');
const RentOrder = require('./RentOrder.model');
const RentOrderItem = require('./RentOrderItem.model');
const ReturnRecord = require('./ReturnRecord.model');
const SaleOrder = require('./SaleOrder.model');
const SaleOrderItem = require('./SaleOrderItem.model');
const Shift = require('./Shift.model');
const User = require('./User.model');
const Voucher = require('./Voucher.model');

const syncModelIndexes = async () => {
    await Promise.all([
        Alert.syncIndexes(),
        Blog.syncIndexes(),
        Collateral.syncIndexes(),
        Deposit.syncIndexes(),
        FittingBooking.syncIndexes(),
        InventoryHistory.syncIndexes(),
        Payment.syncIndexes(),
        PricingRule.syncIndexes(),
        Product.syncIndexes(),
        ProductInstance.syncIndexes(),
        RentOrder.syncIndexes(),
        RentOrderItem.syncIndexes(),
        ReturnRecord.syncIndexes(),
        SaleOrder.syncIndexes(),
        SaleOrderItem.syncIndexes(),
        Shift.syncIndexes(),
        User.syncIndexes(),
        Voucher.syncIndexes(),
    ]);
};

module.exports = {
    Alert,
    Blog,
    Collateral,
    Deposit,
    FittingBooking,
    InventoryHistory,
    Payment,
    PricingRule,
    Product,
    ProductInstance,
    RentOrder,
    RentOrderItem,
    ReturnRecord,
    SaleOrder,
    SaleOrderItem,
    Shift,
    User,
    Voucher,
    syncModelIndexes,
};

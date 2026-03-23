const Alert = require('./Alert.model');
const AuditLog = require('./AuditLog.model');
const Blog = require('./Blog.model');
const Category = require('./Category.model');
const Collateral = require('./Collateral.model');
const Deposit = require('./Deposit.model');
const FittingBooking = require('./FittingBooking.model');
const GuestVerification = require('./GuestVerification.model');
const InventoryHistory = require('./InventoryHistory.model');
const Payment = require('./Payment.model');
const PricingRule = require('./PricingRule.model');
const Product = require('./Product.model');
const ProductInstance = require('./ProductInstance.model');
const RentOrder = require('./RentOrder.model');
const RentOrderItem = require('./RentOrderItem.model');
const Role = require('./Role.model');
const ReturnRecord = require('./ReturnRecord.model');
const Review = require('./Review.model');
const SaleOrder = require('./SaleOrder.model');
const SaleOrderItem = require('./SaleOrderItem.model');
const Shift = require('./Shift.model');
const ShiftAssignment = require('./ShiftAssignment.model');
const User = require('./User.model');
const Voucher = require('./Voucher.model');

const syncModelIndexes = async () => {
    await Promise.all([
        Alert.syncIndexes(),
        AuditLog.syncIndexes(),
        Blog.syncIndexes(),
        Category.syncIndexes(),
        Collateral.syncIndexes(),
        Deposit.syncIndexes(),
        FittingBooking.syncIndexes(),
        GuestVerification.syncIndexes(),
        InventoryHistory.syncIndexes(),
        Payment.syncIndexes(),
        PricingRule.syncIndexes(),
        Product.syncIndexes(),
        ProductInstance.syncIndexes(),
        RentOrder.syncIndexes(),
        RentOrderItem.syncIndexes(),
        Role.syncIndexes(),
        ReturnRecord.syncIndexes(),
        Review.syncIndexes(),
        SaleOrder.syncIndexes(),
        SaleOrderItem.syncIndexes(),
        Shift.syncIndexes(),
        ShiftAssignment.syncIndexes(),
        User.syncIndexes(),
        Voucher.syncIndexes(),
    ]);
};

module.exports = {
    Alert,
    AuditLog,
    Blog,
    Category,
    Collateral,
    Deposit,
    FittingBooking,
    GuestVerification,
    InventoryHistory,
    Payment,
    PricingRule,
    Product,
    ProductInstance,
    RentOrder,
    RentOrderItem,
    Role,
    ReturnRecord,
    Review,
    SaleOrder,
    SaleOrderItem,
    Shift,
    ShiftAssignment,
    User,
    Voucher,
    syncModelIndexes,
};

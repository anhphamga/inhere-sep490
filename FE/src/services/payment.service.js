import {
    createDepositPaymentLinkRequest,
    createExtraDuePaymentLinkRequest,
    createSalePaymentLinkRequest,
    checkPayosStatusRequest,
} from '../api/payment.api';

export const createDepositPaymentLinkApi = async (orderId) => {
    const res = await createDepositPaymentLinkRequest(orderId);
    return res.data;
};

export const createExtraDuePaymentLinkApi = async (orderId, amount) => {
    const res = await createExtraDuePaymentLinkRequest(orderId, amount);
    return res.data;
};

export const createSalePaymentLinkApi = async (orderId) => {
    const res = await createSalePaymentLinkRequest(orderId);
    return res.data;
};

export const checkPayosStatusApi = async (orderCode) => {
    const res = await checkPayosStatusRequest(orderCode);
    return res.data;
};

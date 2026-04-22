import {
    createDepositPaymentLinkRequest,
    createGuestDepositPaymentLinkRequest,
    createExtraDuePaymentLinkRequest,
    createSalePaymentLinkRequest,
    createPaypalDepositOrderRequest,
    capturePaypalDepositOrderRequest,
    createPaypalSaleOrderRequest,
    capturePaypalSaleOrderRequest,
    cancelPaypalOrderRequest,
    checkPayosStatusRequest,
    checkPaypalStatusRequest,
} from '../api/payment.api';

export const createDepositPaymentLinkApi = async (orderId, provider = 'payos') => {
    const res = await createDepositPaymentLinkRequest(orderId, provider);
    return res.data;
};

export const createGuestDepositPaymentLinkApi = async (orderId, email, provider = 'payos') => {
    const res = await createGuestDepositPaymentLinkRequest(orderId, email, provider);
    return res.data;
};

export const createExtraDuePaymentLinkApi = async (orderId, amount) => {
    const res = await createExtraDuePaymentLinkRequest(orderId, amount);
    return res.data;
};

export const createSalePaymentLinkApi = async (orderId, provider = 'payos') => {
    const res = await createSalePaymentLinkRequest(orderId, provider);
    return res.data;
};

export const createPaypalDepositOrderApi = async (orderId) => {
    const res = await createPaypalDepositOrderRequest(orderId);
    return res.data;
};

export const capturePaypalDepositOrderApi = async (orderId, paypalOrderId) => {
    const res = await capturePaypalDepositOrderRequest(orderId, paypalOrderId);
    return res.data;
};

export const createPaypalSaleOrderApi = async (orderId) => {
    const res = await createPaypalSaleOrderRequest(orderId);
    return res.data;
};

export const capturePaypalSaleOrderApi = async (orderId, paypalOrderId) => {
    const res = await capturePaypalSaleOrderRequest(orderId, paypalOrderId);
    return res.data;
};

export const cancelPaypalOrderApi = async (payload) => {
    const res = await cancelPaypalOrderRequest(payload);
    return res.data;
};

export const checkPayosStatusApi = async (orderCode) => {
    const res = await checkPayosStatusRequest(orderCode);
    return res.data;
};

export const checkPaypalStatusApi = async (paypalOrderId) => {
    const res = await checkPaypalStatusRequest(paypalOrderId);
    return res.data;
};

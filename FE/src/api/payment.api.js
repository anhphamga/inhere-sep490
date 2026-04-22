import axiosClient from '../config/axios';

export const createDepositPaymentLinkRequest = (orderId, provider = 'payos') =>
    axiosClient.post(`/payments/rent-deposit/${orderId}`, { provider });

// Tạo link PayOS cho đơn guest (yêu cầu email khớp với đơn)
export const createGuestDepositPaymentLinkRequest = (orderId, email, provider = 'payos') =>
    axiosClient.post(`/payments/rent-deposit/guest/${orderId}`, { email, provider });

export const createExtraDuePaymentLinkRequest = (orderId, amount) =>
    axiosClient.post(`/payments/rent-extra-due/${orderId}`, { amount });

export const createSalePaymentLinkRequest = (orderId, provider = 'payos') =>
    axiosClient.post(`/payments/sale-order/${orderId}`, { provider });

export const createPaypalDepositOrderRequest = (orderId) =>
    axiosClient.post(`/payments/paypal/rent-deposit/${orderId}/create-order`);

export const capturePaypalDepositOrderRequest = (orderId, paypalOrderId) =>
    axiosClient.post(`/payments/paypal/rent-deposit/${orderId}/capture`, { paypalOrderId });

export const createPaypalSaleOrderRequest = (orderId) =>
    axiosClient.post(`/payments/paypal/sale-order/${orderId}/create-order`);

export const capturePaypalSaleOrderRequest = (orderId, paypalOrderId) =>
    axiosClient.post(`/payments/paypal/sale-order/${orderId}/capture`, { paypalOrderId });

export const cancelPaypalOrderRequest = (payload) =>
    axiosClient.post('/payments/paypal/cancel', payload);

export const checkPayosStatusRequest = (orderCode) =>
    axiosClient.get(`/payments/payos-status/${orderCode}`);

export const checkPaypalStatusRequest = (paypalOrderId) =>
    axiosClient.get(`/payments/paypal-status/${paypalOrderId}`);

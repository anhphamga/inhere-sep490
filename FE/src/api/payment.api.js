import axiosClient from '../config/axios';

export const createDepositPaymentLinkRequest = (orderId) =>
    axiosClient.post(`/payments/rent-deposit/${orderId}`);

export const createExtraDuePaymentLinkRequest = (orderId, amount) =>
    axiosClient.post(`/payments/rent-extra-due/${orderId}`, { amount });

export const createSalePaymentLinkRequest = (orderId) =>
    axiosClient.post(`/payments/sale-order/${orderId}`);

export const checkPayosStatusRequest = (orderCode) =>
    axiosClient.get(`/payments/payos-status/${orderCode}`);

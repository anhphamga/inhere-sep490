import axiosClient from '../config/axios';

export const getCollectionBySlugRequest = (slug) =>
  axiosClient.get(`/collections/${encodeURIComponent(String(slug || '').trim())}`);


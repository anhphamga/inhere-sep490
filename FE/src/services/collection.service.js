import { getCollectionBySlugRequest } from '../api/collection.api';

export const getCollectionBySlugApi = async (slug) => {
  const response = await getCollectionBySlugRequest(slug);
  return response.data;
};


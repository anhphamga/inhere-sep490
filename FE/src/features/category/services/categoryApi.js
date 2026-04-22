import {
  createOwnerCategoryApi,
  deleteOwnerCategoryApi,
  getOwnerCategoriesApi,
  updateOwnerCategoryApi,
} from '../../../services/owner.service';

export const fetchCategories = async () => {
  const response = await getOwnerCategoriesApi();
  return Array.isArray(response?.categories) ? response.categories : [];
};

export const createCategory = async (payload) => {
  const response = await createOwnerCategoryApi(payload);
  return response?.data || null;
};

export const updateCategory = async (id, payload) => {
  const response = await updateOwnerCategoryApi(id, payload);
  return response?.data || null;
};

export const removeCategory = async (id) => {
  const response = await deleteOwnerCategoryApi(id);
  return response?.data || null;
};

import {
  approveBlogRequest,
  createBlogRequest,
  deleteBlogRequest,
  getBlogBySlugRequest,
  getMyBlogsRequest,
  getPendingBlogsRequest,
  getPublishedBlogsRequest,
  publishBlogRequest,
  rejectBlogRequest,
  submitBlogRequest,
  updateBlogRequest,
  uploadBlogThumbnailRequest,
} from '../api/blog.api';

export const getPublishedBlogsApi = async (params) => {
  const response = await getPublishedBlogsRequest(params);
  return response.data;
};

export const getBlogBySlugApi = async (slug) => {
  const response = await getBlogBySlugRequest(slug);
  return response.data;
};

export const createBlogApi = async (payload) => {
  const response = await createBlogRequest(payload);
  return response.data;
};

export const updateBlogApi = async (id, payload) => {
  const response = await updateBlogRequest(id, payload);
  return response.data;
};

export const getMyBlogsApi = async (params) => {
  const response = await getMyBlogsRequest(params);
  return response.data;
};

export const submitBlogApi = async (id) => {
  const response = await submitBlogRequest(id);
  return response.data;
};

export const deleteBlogApi = async (id) => {
  const response = await deleteBlogRequest(id);
  return response.data;
};

export const getPendingBlogsApi = async () => {
  const response = await getPendingBlogsRequest();
  return response.data;
};

export const approveBlogApi = async (id) => {
  const response = await approveBlogRequest(id);
  return response.data;
};

export const rejectBlogApi = async (id) => {
  const response = await rejectBlogRequest(id);
  return response.data;
};

export const publishBlogApi = async (id) => {
  const response = await publishBlogRequest(id);
  return response.data;
};

export const uploadBlogThumbnailApi = async (file) => {
  const response = await uploadBlogThumbnailRequest(file);
  return response.data;
};

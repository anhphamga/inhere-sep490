import axiosClient from '../config/axios';

export const getPublishedBlogsRequest = (params = {}) => axiosClient.get('/blogs', { params });
export const getBlogBySlugRequest = (slug) => axiosClient.get(`/blogs/${encodeURIComponent(String(slug || '').trim())}`);

export const createBlogRequest = (payload) => axiosClient.post('/blogs', payload);
export const updateBlogRequest = (id, payload) => axiosClient.put(`/blogs/${id}`, payload);
export const getMyBlogsRequest = (params = {}) => axiosClient.get('/blogs/my', { params });
export const submitBlogRequest = (id) => axiosClient.post(`/blogs/${id}/submit`);
export const deleteBlogRequest = (id) => axiosClient.delete(`/blogs/${id}`);

export const getPendingBlogsRequest = () => axiosClient.get('/blogs/pending');
export const approveBlogRequest = (id) => axiosClient.post(`/blogs/${id}/approve`);
export const rejectBlogRequest = (id) => axiosClient.post(`/blogs/${id}/reject`);
export const publishBlogRequest = (id) => axiosClient.post(`/blogs/${id}/publish`);

export const uploadBlogThumbnailRequest = (file) => {
  const formData = new FormData();
  formData.append('thumbnail', file);
  return axiosClient.post('/blogs/upload-thumbnail', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

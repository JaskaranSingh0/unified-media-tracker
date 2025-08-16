import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

const getAuthHeaders = (token) => token ? { Authorization: `Bearer ${token}` } : {};

export const authRegister = (payload) => axios.post(`${API_BASE}/auth/register`, payload).then(r => r.data);
export const authLogin = (payload) => axios.post(`${API_BASE}/auth/login`, payload).then(r => r.data);
export const authMe = (token) => axios.get(`${API_BASE}/auth/me`, { headers: getAuthHeaders(token) }).then(r => r.data);
export const updateUserPassword = (token, payload) => axios.put(`${API_BASE}/auth/me/password`, payload, { headers: getAuthHeaders(token) }).then(r => r.data);
export const deleteUserAccount = (token) => axios.delete(`${API_BASE}/auth/me`, { headers: getAuthHeaders(token) }).then(r => r.data);

export const addListItem = (token, payload) => axios.post(`${API_BASE}/list/add`, payload, { headers: getAuthHeaders(token) }).then(r => r.data);
export const updateListItem = (token, itemId, payload) => axios.put(`${API_BASE}/list/update/${itemId}`, payload, { headers: getAuthHeaders(token) }).then(r => r.data);
export const toggleSeason = (token, itemId, seasonNumber, totalSeasons = null) => {
  const payload = { seasonNumber };
  if (totalSeasons) payload.totalSeasons = totalSeasons;
  return axios.put(`${API_BASE}/list/toggle-season/${itemId}`, payload, { headers: getAuthHeaders(token) }).then(r => r.data);
};
export const deleteListItem = (token, itemId) => axios.delete(`${API_BASE}/list/${itemId}`, { headers: getAuthHeaders(token) }).then(r => r.data);
export const getLists = (token) => axios.get(`${API_BASE}/list`, { headers: getAuthHeaders(token) }).then(r => r.data);
export const getFilteredLists = (token, filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  return axios.get(`${API_BASE}/list/filtered?${params.toString()}`, { headers: getAuthHeaders(token) }).then(r => r.data);
};
export const getStats = (token) => axios.get(`${API_BASE}/list/stats`, { headers: getAuthHeaders(token) }).then(r => r.data);

export const discoverSearch = (q, type) => axios.get(`${API_BASE}/discover/search`, { params: { q, type } }).then(r => r.data);
export const discoverTrending = (type) => axios.get(`${API_BASE}/discover/trending`, { params: { type } }).then(r => r.data);
export const discoverDetails = (type, id) => axios.get(`${API_BASE}/discover/details/${type}/${id}`).then(r => r.data);

export const getDashboardStats = (token) => axios.get(`${API_BASE}/dashboard/stats`, { headers: getAuthHeaders(token) }).then(r => r.data);

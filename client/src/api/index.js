import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api', // Adjust if backend runs on different port
});

// Add Interceptor for Token (if needed later)
API.interceptors.request.use((req) => {
    if (localStorage.getItem('token')) {
        req.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
    }
    return req;
});

export const fetchPosts = () => API.get('/community');
export const createPost = (newPost) => API.post('/community', newPost);
export const fetchNews = () => API.get('/news');
export const sendContact = (data) => API.post('/contact', data);
export const fetchReports = () => API.get('/reports');
export const createReport = (reportData) => API.post('/reports', reportData);
export const updateReport = (id, data) => API.put(`/reports/${id}`, data);
export const analyzeArea = (data) => API.post('/reports/analyze', data); // Trigger Python analysis

// Auth
export const login = (formData) => API.post('/auth/login', formData);
export const signup = (formData) => API.post('/auth/signup', formData);
export const verifyOTP = (formData) => API.post('/auth/verify-otp', formData); // If implemented

export default API;

// fix(client): correct axios baseURL port

// fix(client): add updateReport and analyzeArea exports

// fix(client): correct /community endpoint path casing

// fix(client): add missing request timeout

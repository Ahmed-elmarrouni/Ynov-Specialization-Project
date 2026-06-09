import api from './api';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });

  if (response.data && response.data.requires_2fa === false) {
    localStorage.setItem('access_token', response.data.access_token);
  }

  return response.data;
};

export const verify2FA = async (email, code) => {
  const response = await api.post('/auth/verify-2fa', { email, code });

  if (response.data && response.data.access_token) {
    localStorage.setItem('access_token', response.data.access_token);
  }

  return response.data;
};


export const forgotPassword = async (email) => {
  return await api.post('/auth/forgot-password', { email });
};

export const resetPassword = async (email, password, code) => {
  return await api.post('/auth/reset-password', {
    email: email,
    token: code,
    new_password: password
  });
};
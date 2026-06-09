import api from './api';

export const getUserProfile = async () => {
  const response = await api.get('/users/me');
  return response.data;
};

export const updateUserProfile = async (data) => {
  const response = await api.put('/users/me', data);
  return response.data;
};

export const sendPassword2FA = async () => {
  const response = await api.post('/users/me/send-password-2fa');
  return response.data;
};

export const changePassword = async (data) => {
  const response = await api.post('/users/me/change-password', data);
  return response.data;
};

export const deleteAccount = async (password) => {
  const response = await api.delete('/users/me', { data: { password } });
  return response.data;
};

export const toggle2FA = async (enabled) => {
  const response = await api.post('/auth/toggle-2fa', { enabled });
  return response.data;
};

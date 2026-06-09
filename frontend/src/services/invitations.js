import api from './api';

export const inviteUser = async (email, role) => {
  const response = await api.post('/invitations/invite', { email, role });
  return response.data;
};

import api from './api';

export const fetchStudents = async (page = 1, size = 20, search = '', filters = {}) => {
  const params = {
    page,
    size,
    search: search || undefined,
    cohort_id: filters.cohort_id || undefined,
    status: filters.status || undefined,
  };
  const response = await api.get('/students/', { params });
  return response.data;
};

export const fetchStudentDetails = async (id) => {
  const response = await api.get(`/students/${id}`);
  return response.data;
};

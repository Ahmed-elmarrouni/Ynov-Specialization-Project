import api from './api';

const moduleService = {
  getModules: async () => {
    const response = await api.get('/modules/');
    return response.data;
  },

  getEvaluationStats: async () => {
    const response = await api.get('/modules/evaluations-stats');
    return response.data;
  },

  getCohortBreakdown: async (moduleId) => {
    const response = await api.get(`/modules/${moduleId}/cohort-breakdown`);
    return response.data;
  },

  getAdvancedStats: async (moduleId) => {
    const response = await api.get(`/modules/${moduleId}/advanced-stats`);
    return response.data;
  }

};

export default moduleService;

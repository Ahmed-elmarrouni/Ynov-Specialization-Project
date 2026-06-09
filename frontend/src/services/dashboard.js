import api from './api';

const dashboardService = {
  getKPIs: async () => {
    const response = await api.get('/dashboard/kpis');
    return response.data;
  },

  getRadarStats: async () => {
    const response = await api.get('/dashboard/radar-stats');
    return response.data;
  },

  getActivityTimeline: async () => {
    const response = await api.get('/dashboard/activity-timeline');
    return response.data;
  },

  getRecentUsers: async (search = '', role = '') => {
    const params = {};
    if (search) params.search = search;
    if (role) params.role = role;
    
    const response = await api.get('/dashboard/recent-users', { params });
    return response.data;
  },
};

export default dashboardService;

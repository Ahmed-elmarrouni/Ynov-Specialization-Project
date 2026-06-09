import api from './api';


export const fetchGlobalStats = async () => {
    const response = await api.get('/analytics/global-stats');
    return response.data;
};

export const fetchClassComparison = async () => {
    const response = await api.get('/analytics/class-comparison');
    return response.data;
};

export const fetchGradeDistribution = async () => {
    const response = await api.get('/analytics/grade-distribution');
    return response.data;
};
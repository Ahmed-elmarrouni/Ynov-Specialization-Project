import api from './api';

const importService = {
  uploadCSV: async (file, targetTable, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_table', targetTable);

    const response = await api.post('/imports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          onUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      },
    });
    return response.data;
  },
};

export default importService;
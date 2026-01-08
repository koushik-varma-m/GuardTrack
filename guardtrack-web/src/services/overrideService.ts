import api from './api';

export const overrideService = {
  async overrideCheckIn(id: string, note: string) {
    const response = await api.put(`/checkins/${id}/override`, { note });
    return response.data;
  },
};

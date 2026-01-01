import api from './api';

export interface Assignment {
  id: string;
  guardId: string;
  premiseId: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
  guard?: {
    id: string;
    name: string;
    email: string;
  };
  premise?: {
    id: string;
    name: string;
    address?: string;
  };
}

export const assignmentService = {
  async getAll(params?: { guardId?: string; premiseId?: string; date?: string }): Promise<Assignment[]> {
    const queryParams = new URLSearchParams();
    if (params?.guardId) queryParams.append('guardId', params.guardId);
    if (params?.premiseId) queryParams.append('premiseId', params.premiseId);
    if (params?.date) queryParams.append('date', params.date);
    
    const response = await api.get<Assignment[]>(`/assignments?${queryParams.toString()}`);
    return response.data;
  },

  async create(data: {
    guardId: string;
    premiseId: string;
    startTime: string;
    endTime: string;
  }): Promise<Assignment> {
    const response = await api.post<Assignment>('/assignments', data);
    return response.data;
  },

  async update(id: string, data: Partial<Assignment>): Promise<Assignment> {
    const response = await api.put<Assignment>(`/assignments/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/assignments/${id}`);
  },
};

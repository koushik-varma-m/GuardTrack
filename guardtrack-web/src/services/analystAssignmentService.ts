import api from './api';

export interface AnalystAssignment {
  id: string;
  analystId: string;
  premiseId: string;
  createdAt: string;
  updatedAt: string;
  analyst: {
    id: string;
    name: string;
    email: string;
  };
  premise: {
    id: string;
    name: string;
    address?: string;
  };
}

export const analystAssignmentService = {
  async getAll(): Promise<AnalystAssignment[]> {
    const response = await api.get<AnalystAssignment[]>('/analyst-assignments');
    return response.data;
  },

  async create(data: { analystId: string; premiseId: string }): Promise<AnalystAssignment> {
    const response = await api.post<AnalystAssignment>('/analyst-assignments', data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/analyst-assignments/${id}`);
  },

  async getMyAssignedPremises(): Promise<any[]> {
    const response = await api.get('/analyst-assignments/my/premises');
    return response.data;
  },
};


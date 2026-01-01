import api from './api';

export interface Alert {
  id: string;
  type: 'ORANGE' | 'RED';
  guardId: string;
  checkpointId: string;
  assignmentId: string;
  triggeredAt: string;
  status: 'OPEN' | 'RESOLVED';
  message?: string;
  createdAt: string;
  guard: {
    id: string;
    name: string;
    email: string;
  };
  checkpoint: {
    id: string;
    name: string;
  };
  assignment: {
    id: string;
    premise: {
      id: string;
      name: string;
    };
  };
}

export const alertService = {
  async getAlerts(params?: {
    status?: 'OPEN' | 'RESOLVED';
    premiseId?: string;
    guardId?: string;
  }): Promise<Alert[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.premiseId) queryParams.append('premiseId', params.premiseId);
    if (params?.guardId) queryParams.append('guardId', params.guardId);
    
    const query = queryParams.toString();
    const response = await api.get<Alert[]>(`/alerts${query ? `?${query}` : ''}`);
    return response.data;
  },

  async resolveAlert(id: string): Promise<Alert> {
    const response = await api.patch<Alert>(`/alerts/${id}/resolve`);
    return response.data;
  },
};

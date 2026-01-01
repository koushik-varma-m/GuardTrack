import api from './api';

export interface PremiseStatusItem {
  checkpointId: string;
  checkpointName: string;
  guardId: string;
  guardName: string;
  lastScan: string;
  nextDueTime: string;
  status: 'GREEN' | 'ORANGE' | 'RED';
}

export const dashboardService = {
  async getPremiseStatus(premiseId: string): Promise<PremiseStatusItem[]> {
    const response = await api.get<PremiseStatusItem[]>(`/dashboard/premises/${premiseId}/status`);
    return response.data;
  },
};


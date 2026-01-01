import api from './api';

export interface Checkpoint {
  id: string;
  name: string;
  description?: string;
  xCoord: number;
  yCoord: number;
  sequence: number;
  qrCodeValue: string;
  createdAt: string;
  updatedAt: string;
}

export interface NextCheckpointResponse {
  nextCheckpoint: {
    id: string;
    name: string;
    description?: string;
    sequence: number | null;
  } | null;
  remaining: number;
  total: number;
  lapsCompleted: number;
  lapNumber: number;
  assignmentId: string;
  premiseId: string;
  premiseName: string;
}

export interface ActiveAssignment {
  id: string;
  premise: {
    id: string;
    name: string;
    address?: string;
    mapImageUrl?: string;
  };
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckIn {
  id: string;
  checkpointId: string;
  assignmentId: string;
  scannedAt: string;
  isOnTime: boolean;
  createdAt: string;
  checkpoint?: {
    id: string;
    name: string;
    description?: string;
  };
  assignment?: {
    id: string;
    premise: {
      id: string;
      name: string;
    };
  };
}

export interface CheckInResponse {
  success: boolean;
  checkpointName: string;
  scannedAt: string;
  isOnTime: boolean;
  status: 'GREEN' | 'ORANGE' | 'RED';
  message: string;
}

export const guardService = {
  async getMyProfile() {
    const response = await api.get('/me/profile');
    return response.data;
  },

  async getMyActiveAssignment(): Promise<ActiveAssignment> {
    const response = await api.get<ActiveAssignment>('/me/assignments/active');
    return response.data;
  },

  async getMyCheckpoints(): Promise<Checkpoint[]> {
    const response = await api.get<Checkpoint[]>('/me/checkpoints');
    return response.data;
  },

  async getNextCheckpoint(): Promise<NextCheckpointResponse> {
    const response = await api.get<NextCheckpointResponse>('/me/checkpoints/next');
    return response.data;
  },

  async canScanCheckpoint(checkpointId: string): Promise<{
    canScan: boolean;
    error?: string;
    code?: string;
    checkpointName?: string;
    premiseName?: string;
    message?: string;
  }> {
    const response = await api.get(`/me/checkpoints/can-scan?checkpointId=${checkpointId}`);
    return response.data;
  },

  async createMyCheckIn(checkpointId: string, token?: string): Promise<CheckInResponse> {
    const payload: { checkpointId: string; token?: string } = { checkpointId };
    if (token) {
      payload.token = token;
    }
    const response = await api.post<CheckInResponse>('/me/checkins', payload);
    return response.data;
  },

  async getMyHistory(date: string): Promise<CheckIn[]> {
    const response = await api.get<CheckIn[]>(`/me/checkins/history?date=${date}`);
    return response.data;
  },
};

import api from './api';

export interface Premise {
  id: string;
  name: string;
  address?: string;
  mapImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Checkpoint {
  id: string;
  premiseId: string;
  name: string;
  description?: string;
  xCoord: number;
  yCoord: number;
  sequence: number;
  intervalMinutes?: number | null; // Checkpoint-specific scanning interval (minutes)
  qrCodeValue: string;
  orangeAlertSent: boolean;
  redAlertSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PremiseWithCheckpoints extends Premise {
  checkpoints: Checkpoint[];
}

export const premiseService = {
  async getAll(): Promise<Premise[]> {
    const response = await api.get<Premise[]>('/premises');
    return response.data;
  },

  async getById(id: string): Promise<PremiseWithCheckpoints> {
    const response = await api.get<PremiseWithCheckpoints>(`/premises/${id}`);
    return response.data;
  },

  async create(data: { name: string; address?: string; mapImageUrl?: string }): Promise<Premise> {
    const response = await api.post<Premise>('/premises', data);
    return response.data;
  },

  async update(id: string, data: Partial<Premise>): Promise<Premise> {
    const response = await api.put<Premise>(`/premises/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/premises/${id}`);
  },

  async uploadPremiseMap(id: string, file: File): Promise<Premise> {
    const formData = new FormData();
    formData.append('mapImage', file);
    
    // Note: Backend endpoint /premises/:id/map may need to be created
    // This will upload the file and return updated premise with mapImageUrl
    const response = await api.put<Premise>(`/premises/${id}/map`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getCheckpoints(premiseId: string): Promise<Checkpoint[]> {
    const response = await api.get<Checkpoint[]>(`/checkpoints/premise/${premiseId}`);
    return response.data;
  },

  async createCheckpoint(premiseId: string, data: {
    name: string;
    description?: string;
    xCoord: number;
    yCoord: number;
    sequence?: number;
    intervalMinutes?: number | null;
  }): Promise<Checkpoint> {
    const response = await api.post<Checkpoint>('/checkpoints', {
      premiseId,
      ...data,
    });
    return response.data;
  },

  async updateCheckpoint(id: string, data: Partial<Checkpoint>): Promise<Checkpoint> {
    const response = await api.put<Checkpoint>(`/checkpoints/${id}`, data);
    return response.data;
  },

  async deleteCheckpoint(id: string): Promise<void> {
    await api.delete(`/checkpoints/${id}`);
  },

  async getCheckpointQr(id: string): Promise<string> {
    const response = await api.get(`/checkpoints/${id}/qr`, {
      responseType: 'blob',
    });
    const blob = response.data;
    return URL.createObjectURL(blob);
  },
};

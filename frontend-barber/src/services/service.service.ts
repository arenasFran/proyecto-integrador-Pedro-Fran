import api from './api';
import type { Service } from '../types/booking';

type ServicesResponse = {
  services: Service[];
};

export const serviceService = {
  list: async (): Promise<Service[]> => {
    const response = await api.get<ServicesResponse>('/api/services');
    return response.data.services;
  },
};

export default serviceService;

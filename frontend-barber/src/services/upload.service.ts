import api from './api';

export const uploadAvatar = async (file: File, oldPhotoUrl?: string): Promise<string> => {
  const formData = new FormData();
  formData.append('avatar', file);
  if (oldPhotoUrl) formData.append('oldPhotoUrl', oldPhotoUrl);

  const response = await api.post<{ photoUrl: string }>('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.photoUrl;
};

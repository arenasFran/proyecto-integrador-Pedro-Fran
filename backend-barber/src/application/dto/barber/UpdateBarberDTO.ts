export type UpdateBarberDTO = {
  email?: string;
  password?: string;
  name?: string;
  lastname?: string;
  phone?: string;
  specialties?: string[];
  age?: number | null;
  photoUrl?: string | null;
  isActive?: boolean;
  slotDuration?: number;
};

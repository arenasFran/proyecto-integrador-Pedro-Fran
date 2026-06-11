export type UpdateBarberDTO = {
  email?: string;
  password?: string;
  name?: string;
  lastname?: string;
  phone?: string;
  services?: string[];
  age?: number | null;
  photoUrl?: string | null;
  isActive?: boolean;
  slotDuration?: number;
};

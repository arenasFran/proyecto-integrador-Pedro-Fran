export type CreateAppointmentDTO = {
  barberId: string;
  serviceId: string;
  date: string;
  startTime: string;
  clientId?: string;
  clientName: string;
  clientLastname: string;
  clientPhone?: string;
  clientEmail?: string;
};

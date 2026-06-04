export type BarberDTOBreak = {
  startTime: string;
  endTime: string;
};

export type BarberDTODay = {
  startTime: string | null;
  endTime: string | null;
  breaks: BarberDTOBreak[];
};

export type BarberDTOSchedule = {
  monday: BarberDTODay;
  tuesday: BarberDTODay;
  wednesday: BarberDTODay;
  thursday: BarberDTODay;
  friday: BarberDTODay;
  saturday: BarberDTODay;
  sunday: BarberDTODay;
};

export type BarberDTOKind = 'Admin' | 'Empleado';

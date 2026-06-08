export type TempLockData = {
  barberId: string;
  date: string;
  startTime: string;
  clientId?: string;
};

export interface ITempLockRepository {
  create(data: TempLockData): Promise<void>;
  deleteMany(filter: { barberId: string }): Promise<void>;
  deleteOne(barberId: string, date: string, startTime: string): Promise<void>;
  findByBarberAndDate(barberId: string, date: string): Promise<TempLockData[]>;
}
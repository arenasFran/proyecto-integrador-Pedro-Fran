import mongoose from 'mongoose';
import { ClientSession } from 'mongoose';

export type TempLockData = {
  barberId: string;
  date: string;
  startTime: string;
  clientId?: string;
};

export type TempLockWithId = TempLockData & { id: string };

export interface ITempLockRepository {
  create(data: TempLockData): Promise<string>;
  deleteMany(filter: { barberId: string }): Promise<void>;
  deleteOne(barberId: string, date: string, startTime: string, session?: ClientSession): Promise<void>;
  deleteById(id: string): Promise<void>;
  findByBarberAndDate(barberId: string, date: string): Promise<TempLockData[]>;
  findById(id: string, session?: ClientSession): Promise<TempLockWithId | null>;
}
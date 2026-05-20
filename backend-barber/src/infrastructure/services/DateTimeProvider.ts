import { IDateTimeProvider } from '../../application/ports/IDateTimeProvider';

export class DateTimeProvider implements IDateTimeProvider {
  now(): Date {
    return new Date();
  }
}

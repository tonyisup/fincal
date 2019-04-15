import { Account } from './account';
import { ForecastEvent } from './forecast-event';
export class Forecast {
  start: Date;
  end: Date;
  account: Account;
  events: ForecastEvent[];
}
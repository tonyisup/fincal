import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Calendar } from '../calendar-select/calendar-select.component';

@Component({
  selector: 'fincal-forecast-settings',
  template: `
		<div>
			<fincal-calendar-select 
				type="credit"
				[selected]="credit"
				(selectedChange)="this.creditChange.emit($event)"
				[calendars]="calendars"
			></fincal-calendar-select>
			<fincal-calendar-select 
				type="debit"
				[selected]="debit"
				(selectedChange)="debitChange.emit($event)"
				[calendars]="calendars"
			></fincal-calendar-select>
			<mat-form-field>
				<input matInput 
					type="number" 
					placeholder="Current balance" 
					[ngModel]="balance"
					(ngModelChange)="balanceChange.emit($event)">
			</mat-form-field>
			<mat-form-field>
				<input matInput 
					type="date" 
					placeholder="Forecast end date" 
					[ngModel]="date | date:'yyyy-MM-dd'" 
					(ngModelChange)="dateChange.emit($event)">
			</mat-form-field>
		</div>
  `,
  styles: [
  ]
})
export class ForecastSettingsComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

	@Input() credit: string | null = null;
	@Input() debit: string | null = null;
	@Input() calendars: Calendar[] = [];
	@Input() balance: number | null = null;
	@Input() date: Date | null = null;

	@Output() creditChange = new EventEmitter<string>();
	@Output() debitChange = new EventEmitter<string>();
	@Output() balanceChange = new EventEmitter<number>();
	@Output() dateChange = new EventEmitter<Date>();
}

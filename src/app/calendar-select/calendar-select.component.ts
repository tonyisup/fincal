import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

export interface Calendar {
	id: string;
	summary: string;
}

@Component({
  selector: 'fincal-calendar-select',
  template: `
		<mat-form-field appearance="fill">
			<mat-label>Select a {{type}} account</mat-label>
			<mat-select [value]="selected" (valueChange)="this.selectedChange.emit($event)">
				<mat-option>None</mat-option>
				<mat-option *ngFor="let calendar of calendars;" 
					[value]="calendar.id">{{calendar.summary}}</mat-option>
			</mat-select>
		</mat-form-field>
  `,
  styles: [
  ]
})
export class CalendarSelectComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

	@Input() type: string = 'Unknown';
	@Input() selected: string | null = null;
	@Input() calendars: Calendar[] = [];

	@Output() selectedChange = new EventEmitter<string>();
}

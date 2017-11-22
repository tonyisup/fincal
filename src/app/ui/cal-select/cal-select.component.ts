import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Calendar } from '../../data/calendar';

@Component({
  selector: 'fincal-cal-select',
  templateUrl: './cal-select.component.html',
  styleUrls: ['./cal-select.component.scss']
})
export class CalSelectComponent implements OnInit {

  constructor() { }

  @Input()
  selected: Calendar;
  @Output()
  selectedChanged: EventEmitter<Calendar> = new EventEmitter();

  label: string;
  calendars: any[];
  ngOnInit() {
  }
}

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CalSelectComponent } from './cal-select.component';

describe('CalSelectComponent', () => {
  let component: CalSelectComponent;
  let fixture: ComponentFixture<CalSelectComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CalSelectComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CalSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

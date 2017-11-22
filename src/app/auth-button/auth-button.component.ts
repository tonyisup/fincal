import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'fincal-auth-button',
  templateUrl: './auth-button.component.html',
  styleUrls: ['./auth-button.component.scss']
})
export class AuthButtonComponent implements OnInit {

  constructor() { }

  @Input()
  authorized: boolean;

  @Output()
  authorizedChanged: EventEmitter<boolean> = new EventEmitter();

  @Output()
  authorize = new EventEmitter();

  @Output('de-authorize')
  deAuthorize = new EventEmitter();
  
  ngOnInit() {
  }

  signIn() {
    this.authorize.emit("");
  }

  signOut() {
    this.deAuthorize.emit("");
  }
}

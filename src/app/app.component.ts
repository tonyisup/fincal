import { Component, OnInit } from '@angular/core';
import { SocialUser } from 'angularx-social-login';
import { GoogleApiService } from 'ng-gapi';
import { Calendar } from './calendar-select/calendar-select.component';
import { ForecastResultsItem } from './forecast-results/forecast-results-datasource';
import { TransactionsService } from './transactions.service';

@Component({
  selector: 'fincal-root',
  template: `
    <!--The content below is only a placeholder and can be replaced.-->
    <div style="text-align:center" class="content">
			<form>
				<fincal-login (userSignedIn)="signedIn($event)"></fincal-login>
				<fincal-forecast-settings
					[calendars]="calendars"
					[(credit)]="calCredit"
					[(debit)]="calDebit"
					[(balance)]="curBalance"
					[(date)]="tarDate"
				></fincal-forecast-settings>
				<button type="button" 
					mat-flat-button 
					color="primary"
					(click)="runForecast()"
				>Run Forecast</button>
			</form>
			<fincal-forecast-results *ngIf="results" [results]="results"></fincal-forecast-results>
    </div>    
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

	constructor(
		private _transactions: TransactionsService,
		private _gapi: GoogleApiService
	) {
		this.user = null;
	}

	ngOnInit(): void {
	}

  title = 'fincal';
	user: gapi.auth2.GoogleUser | null;
	results: ForecastResultsItem[] | null = [];
	calendars: Calendar[] = [];

	calCredit  : string | null = null; //= JSON.parse(localStorage.getItem("calCredit"));
  calDebit   : string | null = null; //= JSON.parse(localStorage.getItem("calDebit"));
  curBalance : number = 0; //= parseFloat(localStorage.getItem("curBalance") || '0.00');
  tarDate : Date | null = null; //= new Date(parseInt(localStorage.getItem("tarDate") ||  (new Date()).getTime().toString()));
	
	async signedIn(user: gapi.auth2.GoogleUser) {
		if (user) {
			this.user = user;
		}
		this.calendars = await this._transactions.getCalendars();
		this.loadSettings();
	}

	async runForecast() {		
		if (!this.calCredit) return;
		if (!this.calDebit) return;
		if (!this.tarDate) return;

		this.saveSettings();
		
		let sDate = this.tarDate.toString().split('T')[0].split('-');
		let tarDate = new Date(Date.UTC(+sDate[0], +sDate[1]-1, +sDate[2]));

		this.results = await this._transactions.getForecastResults(
			this.calCredit,
			this.calDebit,
			this.curBalance,
			tarDate
		);
	}

	loadSettings() {		
		let curBalance = localStorage.getItem("curBalance");
		if (curBalance != null) {
			this.curBalance = JSON.parse(curBalance);
		} else {
			this.curBalance = 0.0;
		}

		let tarDate = localStorage.getItem("tarDate");
		if (tarDate != null) {
			this.tarDate = JSON.parse(tarDate);
		} else {
			this.tarDate = new Date();
		}

		let storedCal = localStorage.getItem("calCredit");
		if (storedCal && (storedCal != 'undefined')) {
			this.calCredit = JSON.parse(storedCal);
		}

		storedCal = localStorage.getItem("calDebit");
		if (storedCal && (storedCal != 'undefined')) {
			this.calDebit = JSON.parse(storedCal);
		}
	}
	saveSettings() {
		localStorage.setItem("calCredit", JSON.stringify(this.calCredit));
		localStorage.setItem("calDebit", JSON.stringify(this.calDebit));
		localStorage.setItem("curBalance", JSON.stringify(this.curBalance));
		localStorage.setItem("tarDate", JSON.stringify(this.tarDate));
	}
	l(m: any) {
		console.log('Main log:', m);
	}
}

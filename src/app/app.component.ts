import { Component } from '@angular/core';
import { GapiService } from './gapi.service';
import { OnInit } from '@angular/core/src/metadata/lifecycle_hooks';
import { DataSource } from '@angular/cdk/collections';
import { CollectionViewer } from '@angular/cdk/collections';
import { Observable } from 'rxjs/Observable';
const { version: appVersion } = require('../../package.json')

@Component({
  selector: 'fincal-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(private gapiService:GapiService) {		
		this.version = appVersion;
  }
	title = 'FinCal';
	version: string;
  subtitle = 'Easy zero-sum accounting forecast';
  
  calCredit  : any; //= JSON.parse(localStorage.getItem("calCredit"));
  calDebit   : any; //= JSON.parse(localStorage.getItem("calDebit"));
  calBalance : any; //= JSON.parse(localStorage.getItem("calBalance"));
  curBalance : number; //= parseFloat(localStorage.getItem("curBalance") || '0.00');
  tarDate : Date; //= new Date(parseInt(localStorage.getItem("tarDate") ||  (new Date()).getTime().toString()));
  accessAuthorized = false;
  calendars = [];
  results: TransactionDataSource | null;
  
	ngOnInit(): void {
		let curBalance = localStorage.getItem("curBalance");
		let tarDate = localStorage.getItem("tarDate");
		
		if (curBalance != null) {
			this.curBalance = JSON.parse(curBalance);
		} else {
			this.curBalance = 0.0;
		}

		if (tarDate != null) {
			this.tarDate = JSON.parse(tarDate);
		} else {
			this.tarDate = new Date();
		}
	}

	signOut() {
		this.gapiService.signOut();
		this.accessAuthorized = false;
	}

	handleAuthClick() {
		this.gapiService.authorize().then(authResult => this.handleAuthResult(), error => console.log('handleAuthClick error', error));
	}

	handleAuthResult() {
		this.accessAuthorized = true;
		this.gapiService.loadCalendars().then(items => {
			this.calendars = items;
			let calCredit = JSON.parse(localStorage.getItem("calCredit"));
			this.calCredit = this.calendars.find(c => c.id == calCredit.id);

			let calDebit = JSON.parse(localStorage.getItem("calDebit"));
			this.calDebit = this.calendars.find(c => c.id == calDebit.id);
		});
	}

	updateResults() {
		localStorage.setItem("calCredit", JSON.stringify(this.calCredit));
		localStorage.setItem("calDebit", JSON.stringify(this.calDebit));
		localStorage.setItem("calBalance", JSON.stringify(this.calBalance));
		localStorage.setItem("curBalance", JSON.stringify(this.curBalance));
		localStorage.setItem("tarDate", JSON.stringify(this.tarDate));
		let sDate = this.tarDate.toString().split('T')[0].split('-');
		let tarDate = new Date(Date.UTC(+sDate[0], +sDate[1]-1, +sDate[2]));

		this.gapiService.getUpcomingEvents(this.calCredit.id, tarDate).then(creditResponse => {
			let credits = creditResponse.result.items;
			this.gapiService.getUpcomingEvents(this.calDebit.id, tarDate).then(debitResponse => {
				let debits = debitResponse.result.items;
				this.processData(credits, debits, this.curBalance).then(transactions => {
					this.results = new TransactionDataSource(transactions);
				})
			})
		});
	}

	processData(credits, debits, currentBalance): Promise<Transaction[]> {
		return new Promise((resolve, error) => {
			let results: Transaction[] = [];

			var currentDate =  new Date();

			var transactions = [];

			for (var i = 0; i< credits.length ; i++ )
			{
				var transaction = this.getTransactionFromEvent(credits[i], true);
				if(!transaction) continue;

				transactions.push(transaction);
			}

			for (i = 0; i< debits.length ; i++ )
			{
				var transaction = this.getTransactionFromEvent(debits[i], false);
				if(!transaction) continue;

				transactions.push(transaction);
			}

			transactions.sort(function(a, b) {
				return a.when.getTime() - b.when.getTime();
			});

			var dailyBalances = [];
			for (i = 0; i < transactions.length; i++)
			{
				var t = transactions[i];
				var newBalance = currentBalance + ((t.credit ? 1 : -1) * t.amount)
				results.push(
					{ 
						Balance: currentBalance,
						Summary: t.summary,
						When: t.when, 
						Type: t.credit ? TransactionType.Credit : TransactionType.Debit
					}
				);
				currentBalance = newBalance;
			}
			resolve(results);
		});
	}

	getTransactionFromEvent(event, isCredit) {
		var a = this.getAmountFromEvent(event);
		if(!a) return false;

		var t = 
		{ 
			amount: a, 
			when: new Date(event.start.date + 'T08:00:00'),
			summary: event.summary,
			credit: isCredit 
		};

		return t;
	}

	getAmountFromEvent(event) {
		var amount = /\$([0-9\.]+)/.exec(event.summary);
		if(amount && amount.length > 1)
			return parseFloat(amount[1]);
		else
			return false;
	}
}

export enum TransactionType {
	Credit,
	Debit
}
export class Transaction {
	Balance: number;
	Summary: string;
	When: string;
	Type: TransactionType;
}
export class TransactionDataSource extends DataSource<Transaction> {
	constructor(private _data: Transaction[]) {
		super();
	}
	connect(collectionViewer: CollectionViewer): Observable<Transaction[]> {
		return Observable.of(this._data);
	}
	disconnect(collectionViewer: CollectionViewer): void {
		//Not sure
	}
}

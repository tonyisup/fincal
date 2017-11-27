import { Component, NgZone } from '@angular/core';
import { GapiService } from './gapi.service';
import { OnInit } from '@angular/core/src/metadata/lifecycle_hooks';
import { DataSource } from '@angular/cdk/collections';
import { CollectionViewer } from '@angular/cdk/collections';
import { FincalFilterConfig } from './data/fincal-filter-config';
import { FincalTransaction } from './data/fincal-transaction';
import { FincalTransactionType } from './data/fincal-transaction-type';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
const { version: appVersion } = require('../../package.json')

@Component({
  selector: 'fincal-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(
		private gapiService: GapiService,
		private zone: NgZone
	) {		
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
	results = new TransactionDataSource([]);
	
	filterConfig = new FincalFilterConfig();

	ngOnInit(): void {
		let curBalance = localStorage.getItem("curBalance");
		let tarDate = localStorage.getItem("tarDate");
		this.filterConfig.loadFromJsonString(localStorage.getItem("filterConfig"))
		
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

    const run = fn => r => this.zone.run(() => fn(r));
		this.gapiService.signedIn$.subscribe(run(isSignedIn => {
			this.accessAuthorized = isSignedIn
		}));
		this.gapiService.calendars$.subscribe(run(items => {
			this.calendars = items;
			var storedCal = localStorage.getItem("calCredit");
			if (storedCal && (storedCal != 'undefined')) {
				let calCredit = JSON.parse(storedCal);
				this.calCredit = this.calendars.find(c => c.id == calCredit.id);
			}
			storedCal = localStorage.getItem("calDebit");
			if (storedCal && (storedCal != 'undefined')) {
				let calDebit = JSON.parse(localStorage.getItem("calDebit"));
				this.calDebit = this.calendars.find(c => c.id == calDebit.id);
			}
		}));
	}

	signOut() {
		this.gapiService.signOut();
	}

	handleAuthClick() {
		this.gapiService.signIn();
	}

	updateResults() {
		localStorage.setItem("calCredit", JSON.stringify(this.calCredit));
		localStorage.setItem("calDebit", JSON.stringify(this.calDebit));
		localStorage.setItem("calBalance", JSON.stringify(this.calBalance));
		localStorage.setItem("curBalance", JSON.stringify(this.curBalance));
		localStorage.setItem("tarDate", JSON.stringify(this.tarDate));
		localStorage.setItem("filterConfig", JSON.stringify(this.filterConfig));
		let sDate = this.tarDate.toString().split('T')[0].split('-');
		let tarDate = new Date(Date.UTC(+sDate[0], +sDate[1]-1, +sDate[2]));

		this.results.load([]);

		this.gapiService.getUpcomingEvents(this.calCredit.id, tarDate).then(creditResponse => {
			let credits = creditResponse.result.items;
			this.gapiService.getUpcomingEvents(this.calDebit.id, tarDate).then(debitResponse => {
				let debits = debitResponse.result.items;
				this.processData(credits, debits, this.curBalance).then(transactions => {
					this.results.load(transactions);
				})
			})
		});
	}

	processData(credits: any[], debits: any[], currentBalance): Promise<FincalTransaction[]> {
		return new Promise((resolve, error) => {
			var transactions = [];
			var dailyBalances = [];
			var currentDate =  new Date();
			let results: FincalTransaction[] = [];

			transactions.push(...credits.map(credit => this.getTransactionFromEvent(credit, true)).filter(c => c != null));
			transactions.push(...debits.map(debit => this.getTransactionFromEvent(debit, false)).filter(d => d != null));

			transactions.sort(function(a, b) {
				var res = (a.when.getTime() - b.when.getTime());
				if (res) return res;
				res = b.credit - a.credit;
				if (res) return res;
				res = b.amount - a.amount;
				return res;
			});

			transactions.forEach(t => {
				results.push(<FincalTransaction> { 
					Balance: currentBalance,
					Summary: t.summary,
					When: t.when, 
					Type: t.credit ? FincalTransactionType.Credit : FincalTransactionType.Debit
				});
				currentBalance += (t.credit ? 1 : -1) * t.amount;
			});

			resolve(results);
		});
	}

	getTransactionFromEvent(event, isCredit) {
		var a = this.getAmountFromEvent(event);
		if(!a) return null;

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

	filterChanged(event) {
		this.results.filter(this.filterConfig);
	}
}
export class TransactionDataSource extends DataSource<FincalTransaction> {

	constructor(private _data: FincalTransaction[]) {
		super();
		this.load(_data);
	}
	_transactions= new BehaviorSubject<FincalTransaction[]>([]);

	public load(fincalTransactions: FincalTransaction[]) {
		this._data = fincalTransactions;
		this._transactions.next(fincalTransactions);
	}

	public filter(filterConfig:FincalFilterConfig) {
		this._transactions.next(this._data.filter(d => filterConfig.IsDisplayed(d)));
	}
	connect(collectionViewer: CollectionViewer): Observable<FincalTransaction[]> {
		return this._transactions;
	}
	disconnect(collectionViewer: CollectionViewer): void {
		//Not sure
	}
}

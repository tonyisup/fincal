import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SocialUser } from 'angularx-social-login';
import { GoogleApiService } from 'ng-gapi';
import { ReplaySubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Calendar } from './calendar-select/calendar-select.component';
import { FincalTransactionType, ForecastResultsItem } from './forecast-results/forecast-results-datasource';

export interface ForecastEvent {
	id: string;
	summary: string;
	start: {
		date: string;
	};
}

export interface ForecastTransaction {
	amount: number;
	when: Date;
	summary: string;
	credit: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionsService {

  constructor(
		private _http: HttpClient,
		private _gapi: GoogleApiService
	) {
	 }

	private readonly API_URL: string = 'https://www.googleapis.com/calendar/v3';

	public calendars$ = new ReplaySubject<Calendar[]>();

  async getForecastResults(
		calCreditId: string, 
		calDebitId: string, 
		curBalance: number, 
		tarDate: Date): Promise<ForecastResultsItem[]> {
			
			let credits  = await this.getEvents(calCreditId, tarDate);
			let debits = await this.getEvents(calDebitId, tarDate);
			let results =  await this.processData(credits, debits, curBalance);
			
			return results;
		}

	getCalendars(): Promise<any> {
		let creds = gapi.auth2.getAuthInstance().currentUser.get();
		return this._http.get(this.API_URL + '/users/me/calendarList',
			{
				headers: new HttpHeaders({
					Authorization: `Bearer ${creds.getAuthResponse().access_token}`
				})
			}).pipe(map((r: any) => r.items)).toPromise();
	}
		
	getEvents(id: string, tarDate: Date): Promise<ForecastEvent[]> {
		let creds = gapi.auth2.getAuthInstance().currentUser.get();
		let minDate = new Date();
		let maxDate  = new Date(tarDate);
		maxDate.setDate(maxDate.getDate() + 1 );
		id = id || 'primary';

		return this._http.get(`${this.API_URL}/calendars/${id}/events`,
			{
				params: new HttpParams({
					fromObject: {
						"timeMin": minDate.toISOString(),
						"timeMax": maxDate.toISOString(),
						'showDeleted': false,
						'singleEvents': true,
						'maxResults': 1000,
						'orderBy': 'startTime'
					}
				}),
				headers: new HttpHeaders({
					Authorization: `Bearer ${creds.getAuthResponse().access_token}`
				})
			}).pipe(map((r: any) => r.items)).toPromise();
  }

	getResults(): ForecastResultsItem[] {
		return  [
			{
				amount: 1.23,
				balance: 456.78,
				summary: 'test credit positive balance 2',
				when: new Date('04/05/2020'),
				type: FincalTransactionType.credit
			},
			{
				amount: 1.23,
				balance: 432.10,
				summary: 'test debit positive balance 2',
				when: new Date('04/05/2020'),
				type: FincalTransactionType.debit
			},
			{
				amount: 1.23,
				balance: -456.78,
				summary: 'test credit negative balance 2',
				when: new Date('04/05/2020'),
				type: FincalTransactionType.credit
			},
			{
				amount: 1.23,
				balance: -432.10,
				summary: 'test debit negative balance 2',
				when: new Date('04/05/2020'),
				type: FincalTransactionType.debit
			},
		];
	}
	
	processData(
		credits: (ForecastEvent | null)[], 
		debits: (ForecastEvent | null)[], 
		currentBalance: number): Promise<ForecastResultsItem[]> {
		return new Promise((resolve, error) => {
			let transactions: (ForecastTransaction | null)[] = [];
			let dailyBalances = [];
			let currentDate =  new Date();
			let results: ForecastResultsItem[] = [];

			transactions.push(...credits.map(credit => this.getTransactionFromEvent(credit, true)).filter(c => c != null));
			transactions.push(...debits.map(debit => this.getTransactionFromEvent(debit, false)).filter(d => d != null));

			transactions.sort((a: ForecastTransaction | null, b: ForecastTransaction | null) => {
				if (!a) return 0;
				if (!b) return 0;
				let res = (a.when.getTime() - b.when.getTime());
				if (res) return res;
				res = b.credit && !a.credit ? 1 : -1;
				if (res) return res;
				res = b.amount - a.amount;
				return res;
			});

			transactions.forEach(t => {
				if (!t) return;
				results.push(<ForecastResultsItem> { 
					amount: t?.amount,
					balance: currentBalance,
					summary: t.summary,
					when: t.when, 
					type: t.credit ? FincalTransactionType.credit : FincalTransactionType.debit
				});
				currentBalance += (t.credit ? 1 : -1) * t.amount;
			});

			resolve(results);
		});
	}

	getTransactionFromEvent(event: ForecastEvent | null, isCredit: boolean): ForecastTransaction | null {
		if (!event) return null;

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

	getAmountFromEvent(event: ForecastEvent): number | null {
		var amount = /\$([0-9\.]+)/.exec(event.summary);
		if(amount && amount.length > 1)
			return parseFloat(amount[1]);
		else
			return null;
	}

}

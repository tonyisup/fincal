import { DataSource } from '@angular/cdk/collections';
import { MatSort } from '@angular/material/sort';
import { debounceTime, map } from 'rxjs/operators';
import { Observable, of as observableOf, merge } from 'rxjs';

export enum FincalTransactionType {
	credit,
	debit
}

// TODO: Replace this with your own data model type
export interface ForecastResultsItem {
	amount: number;
	balance: number;
	summary: string;
	when: Date;
	type: FincalTransactionType;
}

// TODO: replace this with real data from your application
// const EXAMPLE_DATA: ForecastResultsItem[] = [
//   {
// 		amount: 1.23,
// 		balance: 456.78,
// 		summary: 'test credit positive balance 1',
// 		when: '04/05/2020',
// 		type: FincalTransactionType.credit
// 	},
// 	{
// 		amount: 1.23,
// 		balance: 432.10,
// 		summary: 'test debit positive balance 1',
// 		when: '04/05/2020',
// 		type: FincalTransactionType.debit
// 	},
// 	{
// 		amount: 1.23,
// 		balance: -456.78,
// 		summary: 'test credit negative balance 1',
// 		when: '04/05/2020',
// 		type: FincalTransactionType.credit
// 	},
// 	{
// 		amount: 1.23,
// 		balance: -432.10,
// 		summary: 'test debit negative balance 1',
// 		when: '04/05/2020',
// 		type: FincalTransactionType.debit
// 	},
// ];

/**
 * Data source for the ForecastResults view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class ForecastResultsDataSource extends DataSource<ForecastResultsItem> {
  data: ForecastResultsItem[] = [];
  sort: MatSort | undefined;

  constructor() {
    super();
  }

	load(d: ForecastResultsItem[]) {
		this.data = d;
	}
  /**
   * Connect this data source to the table. The table will only update when
   * the returned stream emits new items.
   * @returns A stream of the items to be rendered.
   */
  connect(): Observable<ForecastResultsItem[]> {
    if (this.sort) {
      // Combine everything that affects the rendered data into one update
      // stream for the data-table to consume.
      return merge(observableOf(this.data), this.sort.sortChange)
        .pipe(map(() => {
          return this.getSortedData([...this.data ]);
        }));
    } else {
      throw Error('Please set the paginator and sort on the data source before connecting.');
    }
  }

  /**
   *  Called when the table is being destroyed. Use this function, to clean up
   * any open connections or free any held resources that were set up during connect.
   */
  disconnect(): void {}

  /**
   * Paginate the data (client-side). If you're using server-side pagination,
   * this would be replaced by requesting the appropriate data from the server.
   */
  // private getPagedData(data: ForecastResultsItem[]): ForecastResultsItem[] {
  //   if (this.paginator) {
  //     const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
  //     return data.splice(startIndex, this.paginator.pageSize);
  //   } else {
  //     return data;
  //   }
  // }

  /**
   * Sort the data (client-side). If you're using server-side sorting,
   * this would be replaced by requesting the appropriate data from the server.
   */
  private getSortedData(data: ForecastResultsItem[]): ForecastResultsItem[] {
    if (!this.sort || !this.sort.active || this.sort.direction === '') {
      return data;
    }

    return data.sort((a, b) => {
      const isAsc = this.sort?.direction === 'asc';
      switch (this.sort?.active) {
        case 'amount': return compare(a.amount, b.amount, isAsc);
        case 'balance': return compare(+a.balance, +b.balance, isAsc);
        case 'when': return compareWhen(a.when, b.when, isAsc);
        default: return 0;
      }
    });
  }
}

/** Simple sort comparator for example ID/Name columns (for client-side sorting). */
function compare(a: string | number, b: string | number, isAsc: boolean): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
function compareWhen(a: Date, b: Date, isAsc: boolean): number {  // With Date object we can compare dates them using the >, <, <= or >=.
  // The ==, !=, ===, and !== operators require to use date.getTime(),
  // so we need to create a new instance of Date with 'new Date()'
  // Check if the first is greater than second
  if (a > b) return 1 * (isAsc ? 1 : -1);
 
  // Check if the first is less than second
  if (a < b) return -1 * (isAsc ? 1 : -1);

	return 0;
}

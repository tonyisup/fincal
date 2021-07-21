import { AfterViewInit, Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { TransactionsService } from '../transactions.service';
import { ForecastResultsDataSource, ForecastResultsItem } from './forecast-results-datasource';

@Component({
  selector: 'fincal-forecast-results',
  template: `
    <div class="mat-elevation-z8">
      <table mat-table class="full-width-table" matSort aria-label="Elements">
				
        <!-- Name Column -->
        <ng-container matColumnDef="balance">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Balance</th>
          <td mat-cell *matCellDef="let row">{{row.balance}}</td>
        </ng-container>

        <!-- Id Column -->
        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Amount</th>
          <td mat-cell *matCellDef="let row" [style.color]="row.type == 0 ? 'green' : 'red'">{{row.amount}}</td>
        </ng-container>

        <!-- Name Column -->
        <ng-container matColumnDef="summary">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Summary</th>
          <td mat-cell *matCellDef="let row">{{row.summary}}</td>
        </ng-container>

				<ng-container matColumnDef="when">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>When</th>
          <td mat-cell *matCellDef="let row">{{row.when | date:'MM-dd-yyyy'}}</td>
        </ng-container>
    
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;" [style.background]="row.balance < 0 ? 'pink' : ''"></tr>
      </table>
    </div>
    
  `,
  styles: [`
    .full-width-table {
      width: 100%;
    }
    
  `]
})
export class ForecastResultsComponent implements AfterViewInit, OnChanges {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatTable) table!: MatTable<ForecastResultsItem>;
  dataSource: ForecastResultsDataSource;

	@Input() results: ForecastResultsItem[] = [];

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns = [
		'balance',
		'amount', 
		'summary',
		'when'
	];

  constructor(
	) {
    this.dataSource = new ForecastResultsDataSource();
  }

	ngOnChanges(changes: SimpleChanges): void {
		if(changes.results) {
			this.dataSource.load(this.results);
		}
	}

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.table.dataSource = this.dataSource;
  }
}

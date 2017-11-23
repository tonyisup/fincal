import { FincalTransactionType } from "./fincal-transaction-type";

export class FincalTransaction { 
	Balance: number;
	Summary: string;
	When: string;
	Type: FincalTransactionType;
}

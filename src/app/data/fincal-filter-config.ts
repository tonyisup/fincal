import { FincalTransaction } from "./fincal-transaction";

export class FincalFilterConfig {
	public NegativeBalance: boolean = false;

	public IsDisplayed(fincalTransaction:FincalTransaction): boolean {
		let result = true;

		if(this.NegativeBalance && (fincalTransaction.Balance >= 0)) result = false;

		return result;
	}

	public loadFromJsonString(jsonString: string) {
		if (jsonString == null) return;		
		let o = JSON.parse(jsonString);
		if (o == null) return;
		if (o.NegativeBalance != undefined) this.NegativeBalance = o.NegativeBalance;
	}
}

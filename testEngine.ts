import { processCaseRecords, detectColumnNames } from './src/utils/billingEngine';
import { SAMPLE_CASES_RAW, DEFAULT_MAP, DEFAULT_RATES } from './src/constants/defaultData';

const cols = detectColumnNames(SAMPLE_CASES_RAW[0]);
const result = processCaseRecords(SAMPLE_CASES_RAW, cols, DEFAULT_MAP, DEFAULT_RATES);

console.log(`Total: ${result.allCases.length}`);
console.log(`Billable: ${result.billable.length}`);
console.log(`Exceptions: ${result.exceptions.length}`);
console.log(`Cancelled: ${result.cancelled.length}`);
if (result.exceptions.length > 0) {
  console.log("Exception reasons:");
  result.exceptions.forEach(c => console.log(c.remarks));
}

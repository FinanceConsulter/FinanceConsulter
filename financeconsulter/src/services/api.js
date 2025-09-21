// Simple test API
import { MOCK_TRANSACTIONS, TABLE_HEADER } from '../data/transactions';

export async function fetchTransactions() {
  return Promise.resolve({ header: TABLE_HEADER, data: MOCK_TRANSACTIONS });
}

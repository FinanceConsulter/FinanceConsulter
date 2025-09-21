// Simple test API
import { MOCK_TRANSACTIONS, TABLE_HEADER } from '../data/transactions';

export async function fetchTransactions() {
  return Promise.resolve({ header: TABLE_HEADER, data: MOCK_TRANSACTIONS });
}
/* New function to simulate receipt upload */
export async function uploadReceipt(fileOrDataUrl) {
  return Promise.resolve({ ok: true, id: Date.now(), type: typeof fileOrDataUrl === 'string' ? 'image' : (fileOrDataUrl?.type || 'unknown') });
}
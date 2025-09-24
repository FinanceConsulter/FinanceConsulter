// Simple test API
import { MOCK_TRANSACTIONS, TABLE_HEADER } from '../data/transactions';
import axios from 'axios';

export async function fetchTransactions() {
  return Promise.resolve({ header: TABLE_HEADER, data: MOCK_TRANSACTIONS });
}
/* New function to simulate receipt upload */
export async function uploadReceipt(fileOrDataUrl) {
  return Promise.resolve({ ok: true, id: Date.now(), type: typeof fileOrDataUrl === 'string' ? 'image' : (fileOrDataUrl?.type || 'unknown') });
}

export async function getHelloWorld() {
  try {
    const response = await axios.get('http://127.0.0.1:8000/');
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
}
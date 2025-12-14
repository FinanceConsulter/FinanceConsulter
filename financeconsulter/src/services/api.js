// Simple test API
import { MOCK_TRANSACTIONS, TABLE_HEADER } from '../data/transactions';
import axios from 'axios';

export const API_URL = 'http://127.0.0.1:8000';

export async function fetchTransactions() {
  return Promise.resolve({ header: TABLE_HEADER, data: MOCK_TRANSACTIONS });
}

export async function scanReceipt(file) {
  const formData = new FormData();
  
  if (typeof file === 'string') {
    // Convert base64/dataURL to Blob
    const res = await fetch(file);
    const blob = await res.blob();
    formData.append('file', blob, 'capture.jpg');
  } else {
    formData.append('file', file);
  }

  // Get token from localStorage if you have auth
  const token = localStorage.getItem('authToken'); 
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  };

  const response = await axios.post(`${API_URL}/receipt/scan`, formData, config);
  return response.data;
}

export async function createReceipt(receiptData) {
  const token = localStorage.getItem('authToken');
  const config = {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` })
    }
  };
  const response = await axios.post(`${API_URL}/receipt/`, receiptData, config);
  return response.data;
}

/* Deprecated mock function */
export async function uploadReceipt(fileOrDataUrl) {
  return scanReceipt(fileOrDataUrl);
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
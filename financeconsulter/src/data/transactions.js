// Mock data separated for future DB/API integration
export const TABLE_HEADER = {
  date: 'Date',
  amount: 'Amount',
  actions: 'Actions',
};

export const MOCK_TRANSACTIONS = [
  {
    id: 1,
    date: '20.09.2025',
    amount: '19.50',
    actions: 'RUD',
    items: [
      { id: '1-a', label: 'Coffee beans', amount: '7.50', note: '250g pack' },
      { id: '1-b', label: 'Milk', amount: '2.00' },
    ],
  },
  {
    id: 2,
    date: '21.09.2025',
    amount: '19.50',
    actions: 'RUD',
    items: [
      { id: '2-a', label: 'Bread', amount: '3.20' },
      { id: '2-b', label: 'Cheese', amount: '4.80' },
    ],
  },
  {
    id: 3,
    date: '22.09.2025',
    amount: '19.50',
    actions: 'RUD',
    items: [],
  },
];

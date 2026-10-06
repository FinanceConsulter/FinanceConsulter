import { render, screen } from '@testing-library/react';
import App from './App';

// axios ships ESM only (CRA's jest cannot parse it)
jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), interceptors: { response: { use: jest.fn() } } } }));

test('shows the login page when no token is stored', () => {
  localStorage.removeItem('authToken');
  render(<App />);
  expect(screen.getByText(/Sign in to explore/i)).toBeInTheDocument();
});

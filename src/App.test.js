import { render, screen } from '@testing-library/react';
import App from './App';

test('renders DeepWork app header', () => {
  render(<App />);
  const titleElements = screen.getAllByText(/DeepWork/i);
  expect(titleElements.length).toBeGreaterThan(0);
});

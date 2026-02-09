import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

describe('LandingPage', () => {
  it('renders the main headline', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Find Your Perfect Sound/i)).toBeInTheDocument();
  });

  it('contains a start button link', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );
    const link = screen.getByRole('link', { name: /Contribute Your Data/i });
    expect(link).toHaveAttribute('href', '/wizard');
  });
});

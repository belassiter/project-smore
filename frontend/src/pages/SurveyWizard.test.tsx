/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SurveyWizard from './SurveyWizard';

// Mock fetch
const mockMouthpieces = [
    { 
        id: '1', 
        manufacturer: 'Selmer', 
        model: 'Concept', 
        tip_openings: [
             { id: 't1', label: 'Standard', opening_inch: 0.05, facing_length: '20mm' }
        ] 
    }
];
const mockReeds = [
    { id: '1', manufacturer: 'Vandoren', model: 'Blue', strength_label: '3.0' }
];

globalThis.fetch = vi.fn() as any;

function createFetchResponse(data: any) {
    return { ok: true, json: () => Promise.resolve(data) };
}

describe('SurveyWizard', () => {
  beforeEach(() => {
    (globalThis.fetch as any).mockReset();
     // We expect two calls: 1 for mouthpieces, 1 for reeds
     // Order is not guaranteed by Promise.all strictly, but usually it maintains order of args.
     // Better simplifiction: return correct data based on URL
    (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes('mouthpieces')) return Promise.resolve(createFetchResponse(mockMouthpieces));
        if (url.includes('reeds')) return Promise.resolve(createFetchResponse(mockReeds));
        return Promise.resolve(createFetchResponse([]));
    });
  });

  it('renders loading state initially', () => {
    // Override implementation to never resolve (simulating loading)
    (globalThis.fetch as any).mockImplementation(() => new Promise(() => {}));
    
    render(
      <BrowserRouter>
        <SurveyWizard />
      </BrowserRouter>
    );
    expect(screen.getByText(/Loading survey options/i)).toBeInTheDocument();
  });

  it('renders step 1 after loading', async () => {
    render(
      <BrowserRouter>
        <SurveyWizard />
      </BrowserRouter>
    );

    await waitFor(() => {
        expect(screen.getByText(/About Your Playing/i)).toBeInTheDocument();
    });
    
    // Check for specific fields
    expect(screen.getAllByText(/Instrument/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Primary Genre/i)[0]).toBeInTheDocument();
  });
});

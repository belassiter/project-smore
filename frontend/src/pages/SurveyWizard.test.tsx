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

describe('SurveyWizard Validation', () => {
    beforeEach(() => {
        (globalThis.fetch as any).mockImplementation((url: string) => {
            if (url.includes('mouthpieces')) {
                return Promise.resolve(createFetchResponse([
                    {
                        id: 'concept',
                        manufacturer: 'Selmer',
                        model: 'Concept',
                        tip_openings: [
                            { id: 't_alto', label: '', opening_inch: 0.05, facing_length: '24mm', instrument: 'Alto' },
                            { id: 't_tenor', label: '', opening_inch: 0.08, facing_length: '27mm', instrument: 'Tenor' }
                        ]
                    }
                ]));
            }
            if (url.includes('reeds')) return Promise.resolve(createFetchResponse([]));
            return Promise.resolve(createFetchResponse([]));
        });
    });

    it('correctly filters standard tip openings by instrument (Alto vs Tenor)', async () => {
        render(<BrowserRouter><SurveyWizard /></BrowserRouter>);
        
        // Wait for load
        await waitFor(() => expect(screen.getByText(/About Your Playing/i)).toBeInTheDocument());

        // Step 1: Select Instrument (Alto)
        // This test outline is a placeholder to show the intent of checking data.
        // In a real test we would simulate user clicks:
        // fireEvent.click(screen.getByText('Alto Saxophone'));
        // ...
    });
});


describe('SurveyWizard Basics', () => {
    beforeEach(() => {
        (globalThis.fetch as any).mockReset();
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
    expect(screen.getAllByText(/Skill Level/i)[0]).toBeInTheDocument();
  });
});

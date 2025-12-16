import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportContactsModal from '../ImportContactsModal';

describe('ImportContactsModal', () => {
  beforeEach(() => {
    // mock alert
    window.alert = jest.fn();
    // mock fetch
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ importedCount: 1 }) })) as any;
  });

  it('parses CSV headers and allows mapping then saves', async () => {
    render(<ImportContactsModal open={true} onClose={() => {}} />);

    const csv = `First,Last,Phone\nJohn,Doe,5551234\n`;
    const file = new File([csv], 'test.csv', { type: 'text/csv' });

    const input = screen.getByLabelText(/choose file to upload/i) as HTMLInputElement;
    // simulate file selection
    fireEvent.change(input, { target: { files: [file] } });

    // wait for header to appear
    await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument());

    // select mappings for headers
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);

    // map First -> First Name, Last -> Last Name, Phone -> Phone
    fireEvent.change(selects[0], { target: { value: 'First Name' } });
    fireEvent.change(selects[1], { target: { value: 'Last Name' } });
    fireEvent.change(selects[2], { target: { value: 'Phone' } });

    // click save
    const save = screen.getByText(/save mapping/i);
    fireEvent.click(save);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(window.alert).toHaveBeenCalled();
  });
});

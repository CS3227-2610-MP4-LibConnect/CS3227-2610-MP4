import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TicketCreatePage from '../src/tickets/TicketCreatePage';
import TicketDetailPage from '../src/tickets/TicketDetailPage';

const jsonResponse = (status: number, body: unknown) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});

describe('Student ticket help chat public UI contract', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('create chat opens with its local prompt and does not call the provider or submit the ticket', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, {
      ticket: { ticketId: 'ticket-1', title: 'Example issue', status: 'OPEN', language: 'Python', conceptTags: [] },
      replies: [],
    }));
    global.fetch = fetchMock as typeof fetch;
    render(<TicketCreatePage />);

    const open = await screen.findByRole('button', { name: /ticket help bot/i });
    fireEvent.click(open);
    expect(open.closest('.ticket-create-card')).toBeNull();
    expect(screen.getByText('What help do you need?')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /submit ticket|create ticket/i })).toBeInTheDocument();
  });

  test('create chat sends the current complete draft snapshot and keeps suggestions out of form values', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'synthetic-csrf' }))
      .mockResolvedValueOnce(jsonResponse(200, { reply: { type: 'REFINEMENT', suggestions: [{ field: 'title', suggestion: 'Clarify the symptom' }] } }))
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'synthetic-csrf' }))
      .mockResolvedValueOnce(jsonResponse(200, { reply: { type: 'CLARIFICATION', question: 'Which input causes this?' } }));
    global.fetch = fetchMock as typeof fetch;
    render(<TicketCreatePage />);

    fireEvent.click(await screen.findByRole('button', { name: /ticket help bot/i }));
    const title = screen.getByRole('textbox', { name: /^title$/i });
    fireEvent.change(title, { target: { value: 'Map fails' } });
    fireEvent.change(screen.getByRole('textbox', { name: /expected behaviour/i }), { target: { value: '' } });
    fireEvent.change(screen.getByRole('textbox', { name: /actual behaviour/i }), { target: { value: 'KeyError' } });
    fireEvent.change(screen.getByRole('textbox', { name: /attempted/i }), { target: { value: 'Tried lookup' } });
    fireEvent.change(screen.getByRole('combobox', { name: /language/i }), { target: { value: 'Python' } });
    fireEvent.change(screen.getByRole('textbox', { name: /error output/i }), { target: { value: 'KeyError: missing' } });
    fireEvent.change(screen.getByRole('textbox', { name: /concept tags/i }), { target: { value: 'maps, lookup' } });
    fireEvent.change(screen.getByRole('textbox', { name: /public github url/i }), { target: { value: 'https://github.com/example/repo' } });
    fireEvent.change(screen.getByRole('textbox', { name: /relevant file paths/i }), { target: { value: 'src/main.py' } });
    fireEvent.change(screen.getByLabelText(/code files/i), { target: { files: [new File(['lookup[key]'], 'main.py', { type: 'text/plain' })] } });
    expect(await screen.findByText('main.py')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: /your question|ask a question/i }), { target: { value: 'Can you suggest clearer wording?' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, init] = fetchMock.mock.calls[1];
    expect(init?.method).toBe('POST');
    const sent = JSON.parse(String(init?.body));
    expect(sent).toMatchObject({
      question: 'Can you suggest clearer wording?',
      draft: {
        title: 'Map fails', language: 'Python', expectedBehaviour: '', actualBehaviour: 'KeyError',
        attempted: 'Tried lookup', errorOutput: 'KeyError: missing', conceptTags: 'maps, lookup',
        files: [{ filename: 'main.py', content: 'lookup[key]' }],
        repoUrl: 'https://github.com/example/repo', repoFilePaths: 'src/main.py',
      },
    });
    expect(fetchMock.mock.calls[1][0]).toBe('/api/tickets/help-chat');
    expect(init?.headers).toMatchObject({ 'X-CSRF-Token': 'synthetic-csrf' });
    await screen.findByText(/clarify the symptom/i);
    expect(title).toHaveValue('Map fails');
    expect(screen.getByRole('button', { name: /submit ticket|create ticket/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close ticket help bot/i }));
    expect(screen.getByRole('button', { name: /open ticket help bot/i })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: /open ticket help bot/i }));
    expect(screen.getByText(/clarify the symptom/i)).toBeInTheDocument();
    fireEvent.change(title, { target: { value: 'Updated map issue' } });
    fireEvent.change(screen.getByRole('textbox', { name: /your question|ask a question/i }), { target: { value: 'What about the updated draft?' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await screen.findByText(/which input causes this/i);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const secondSent = JSON.parse(String(fetchMock.mock.calls[3][1]?.body));
    expect(secondSent.draft.title).toBe('Updated map issue');
    expect(secondSent.draft.expectedBehaviour).toBe('');
    expect(secondSent.draft.files).toEqual([{ filename: 'main.py', content: 'lookup[key]' }]);
    expect(secondSent.history).toEqual([
      { role: 'STUDENT', text: 'Can you suggest clearer wording?' },
      { role: 'BOT', text: 'title: Clarify the symptom' },
    ]);
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/tickets')).toBe(false);
  });

  test('captures the draft before the CSRF wait so edits apply only to the next turn', async () => {
    let resolveCsrf: ((response: ReturnType<typeof jsonResponse>) => void) | undefined;
    const fetchMock = jest.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveCsrf = resolve; }))
      .mockResolvedValueOnce(jsonResponse(200, { reply: { type: 'CLARIFICATION', question: 'What changed?' } }));
    global.fetch = fetchMock as typeof fetch;
    render(<TicketCreatePage />);
    fireEvent.click(await screen.findByRole('button', { name: /ticket help bot/i }));
    const title = screen.getByRole('textbox', { name: /^title$/i });
    fireEvent.change(title, { target: { value: 'Draft at send' } });
    fireEvent.change(screen.getByRole('textbox', { name: /your question|ask a question/i }), { target: { value: 'Check this draft' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.change(title, { target: { value: 'Later edit' } });
    resolveCsrf?.(jsonResponse(200, { csrfToken: 'synthetic-csrf' }));
    await screen.findByText(/what changed/i);
    const sent = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(sent.draft.title).toBe('Draft at send');
    expect(title).toHaveValue('Later edit');
  });

  test('detail chat is available after owned ticket load, sends no draft, and does not submit ticket changes', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(200, {
      ticket: { ticketId: 'ticket-1', title: 'Map lookup', status: 'OPEN', language: 'Python', conceptTags: [], expectedBehaviour: 'Find entry', actualBehaviour: 'KeyError', attempted: 'Used dict lookup' },
      replies: [{ replyId: 'reply-1', author: { name: 'Student', role: 'STUDENT' }, message: 'Indexing raises KeyError.', createdAt: '2026-01-01' }],
    })).mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'synthetic-csrf' }))
      .mockResolvedValueOnce(jsonResponse(200, { reply: { type: 'HINT', concept: 'Dictionary lookup', explanation: 'Check key membership.', hints: ['What does the key contain?'] } }));
    global.fetch = fetchMock as typeof fetch;
    render(<TicketDetailPage ticketId="ticket-1" />);

    expect(await screen.findByRole('heading', { name: 'Map lookup' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /ticket help bot/i }));
    expect(screen.getByRole('button', { name: /close ticket help bot/i }).closest('.ticket-detail-card')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: /your question|ask a question/i }), { target: { value: 'What should I inspect?' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toBe('/api/tickets/ticket-1/help-chat');
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({ question: 'What should I inspect?' });
    expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({ 'X-CSRF-Token': 'synthetic-csrf' });
    expect(await screen.findByText(/dictionary lookup/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply|update ticket|use suggestion/i })).not.toBeInTheDocument();
  });

  test('detail chat is absent when the ticket is unavailable or not owned', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(404, { error: { code: 'NOT_FOUND' } }));
    global.fetch = fetchMock as typeof fetch;
    render(<TicketDetailPage ticketId="unavailable-ticket" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load this ticket/i);
    expect(screen.queryByRole('button', { name: /ticket help bot/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/tickets/unavailable-ticket');
  });

  test('detail chat history clears when the ticket ID changes', async () => {
    const firstTicket = { ticketId: 'ticket-1', title: 'First ticket', status: 'OPEN', language: 'Python', conceptTags: [] };
    const secondTicket = { ticketId: 'ticket-2', title: 'Second ticket', status: 'OPEN', language: 'Java', conceptTags: [] };
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(jsonResponse(200, { ticket: firstTicket, replies: [] }))
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'synthetic-csrf' }))
      .mockResolvedValueOnce(jsonResponse(200, { reply: { type: 'CLARIFICATION', question: 'Which part is confusing?' } }))
      .mockResolvedValueOnce(jsonResponse(200, { ticket: secondTicket, replies: [] }));
    global.fetch = fetchMock as typeof fetch;
    const view = render(<TicketDetailPage ticketId="ticket-1" />);
    await screen.findByRole('heading', { name: 'First ticket' });
    fireEvent.click(await screen.findByRole('button', { name: /ticket help bot/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /your question|ask a question/i }), { target: { value: 'First ticket question' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await screen.findByText(/which part is confusing/i);

    view.rerender(<TicketDetailPage ticketId="ticket-2" />);
    await screen.findByRole('heading', { name: 'Second ticket' });
    expect(screen.queryByText('First ticket question')).not.toBeInTheDocument();
    expect(screen.queryByText(/which part is confusing/i)).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[3][0]).toBe('/api/tickets/ticket-2');
  });

  test('chat stays page-local and exposes focusable, announced controls', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, { reply: { type: 'CLARIFICATION', question: 'What did you expect?' } })) as typeof fetch;
    const { unmount } = render(<TicketCreatePage />);
    const toggle = await screen.findByRole('button', { name: /ticket help bot/i });
    toggle.focus();
    expect(toggle).toHaveFocus();
    fireEvent.click(toggle);
    expect(toggle).toHaveFocus();
    expect(screen.getByText('What help do you need?')).toBeInTheDocument();
    expect(document.querySelector('[aria-live="polite"], [role="status"]')).toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    unmount();
    render(<TicketCreatePage />);
    expect(screen.getByText('What help do you need?').closest('[hidden]')).toBeInTheDocument();
  });

  test('create chat errors are safe and preserve the question and draft', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('private prompt secret provider body'));
    global.fetch = fetchMock as typeof fetch;
    render(<TicketCreatePage />);
    fireEvent.click(await screen.findByRole('button', { name: /ticket help bot/i }));
    const title = screen.getByRole('textbox', { name: /^title$/i });
    fireEvent.change(title, { target: { value: 'Keep this draft' } });
    const question = screen.getByRole('textbox', { name: /your question|ask a question/i });
    fireEvent.change(question, { target: { value: 'Why does it fail?' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t answer|try again|temporarily unavailable/i);
    expect(screen.getByRole('alert')).not.toHaveTextContent(/private prompt|secret provider body/i);
    expect(question).toHaveValue('Why does it fail?');
    expect(title).toHaveValue('Keep this draft');
  });

});

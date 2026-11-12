import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentHelpChat from '../src/tickets/StudentHelpChat';

const jsonResponse = (status: number, body: unknown) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

describe('StudentHelpChat page-local component', () => {
  const originalFetch = global.fetch;
  const originalSetItem = Storage.prototype.setItem;

  afterEach(() => {
    global.fetch = originalFetch;
    Storage.prototype.setItem = originalSetItem;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  test('opens a fixed popup, closes with Escape or close button, and restores opener focus', () => {
    render(<StudentHelpChat endpoint="/api/tickets/help-chat" />);
    const opener = screen.getByRole('button', { name: /open ticket help bot/i });
    const panel = document.getElementById('student-help-chat-panel');
    expect(panel).toHaveAttribute('hidden');
    expect(opener).toHaveAttribute('aria-controls', 'student-help-chat-panel');
    fireEvent.click(opener);
    expect(panel).not.toHaveAttribute('hidden');
    screen.getByRole('textbox', { name: /your question/i }).focus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(panel).toHaveAttribute('hidden');
    expect(opener).toHaveFocus();
    fireEvent.click(opener);
    screen.getByRole('button', { name: /close chat/i }).focus();
    fireEvent.click(screen.getByRole('button', { name: /close chat/i }));
    expect(panel).toHaveAttribute('hidden');
    expect(opener).toHaveFocus();
    expect(document.querySelector('.student-help-chat-float')).toContainElement(panel);
  });

  test('uses a stable messaging header, labelled left and right messages, and multiline bottom composer', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'synthetic-csrf' }))
      .mockResolvedValueOnce(jsonResponse(200, { reply: { type: 'CLARIFICATION', question: 'Which value is missing?' } }));
    global.fetch = fetchMock as typeof fetch;
    render(<StudentHelpChat endpoint="/api/tickets/help-chat" introduction="Start with a hint." />);
    fireEvent.click(screen.getByRole('button', { name: /open ticket help bot/i }));

    const header = screen.getByRole('heading', { name: 'Ticket help bot' }).parentElement;
    expect(header).toContainElement(screen.getByRole('button', { name: /clear chat/i }));
    expect(header).toContainElement(screen.getByRole('button', { name: /close chat/i }));
    expect(screen.getByRole('group', { name: 'Ticket help bot message' })).toHaveClass('student-help-chat__message--bot');
    expect(screen.getByRole('textbox', { name: /your question/i })).toHaveAttribute('rows', '3');
    expect(document.querySelector('.student-help-chat__messages')).toHaveClass('student-help-chat__messages');
    expect(document.querySelector('.student-help-chat__composer')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: /your question/i }), { target: { value: 'Check this value' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await screen.findByText('Which value is missing?');
    const studentMessage = screen.getByRole('group', { name: 'Your message' });
    const botMessages = screen.getAllByRole('group', { name: 'Ticket help bot message' });
    expect(studentMessage).toHaveClass('student-help-chat__message--student');
    expect(botMessages[botMessages.length - 1]).toHaveClass('student-help-chat__message--bot');
    expect(botMessages[0].compareDocumentPosition(studentMessage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(studentMessage.compareDocumentPosition(botMessages[botMessages.length - 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(studentMessage).toHaveTextContent('You');
    expect(botMessages[botMessages.length - 1]).toHaveTextContent('Ticket help bot');
  });

  test('sends only the supplied endpoint, renders response as text, and keeps history in component memory', async () => {
    const setItem = jest.fn();
    Storage.prototype.setItem = setItem;
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'synthetic-csrf' }))
      .mockResolvedValueOnce(jsonResponse(200, { reply: { type: 'HINT', concept: 'Mapping', explanation: '<img src=x onerror=alert(1)>', hints: ['Check the key.'] } }));
    global.fetch = fetchMock as typeof fetch;
    const view = render(<StudentHelpChat endpoint="/api/tickets/ticket-1/help-chat" introduction="Hints only." />);
    fireEvent.click(screen.getByRole('button', { name: /open ticket help bot/i }));

    fireEvent.change(screen.getByRole('textbox', { name: /your question/i }), { target: { value: 'What should I check?' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText(/<img src=x onerror=alert\(1\)>/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/csrf');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/tickets/ticket-1/help-chat');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST', cache: 'no-store', headers: { 'X-CSRF-Token': 'synthetic-csrf' } });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ question: 'What should I check?' });
    expect(screen.getByText(/<img src=x onerror=alert\(1\)>/).tagName).toBe('P');
    expect(setItem).not.toHaveBeenCalled();

    view.unmount();
    render(<StudentHelpChat endpoint="/api/tickets/ticket-1/help-chat" />);
    expect(screen.queryByText('What should I check?')).not.toBeInTheDocument();
  });

  test('retains failed question and prior turns, maps raw errors safely, and permits retry', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'synthetic-csrf' }))
      .mockResolvedValueOnce(jsonResponse(200, { reply: { type: 'CLARIFICATION', question: 'Which value is missing?' } }))
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'synthetic-csrf' }))
      .mockResolvedValueOnce(jsonResponse(503, { error: { code: 'AI_UNAVAILABLE', providerMessage: 'private provider response' } }))
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'synthetic-csrf' }))
      .mockResolvedValueOnce(jsonResponse(200, { reply: { type: 'REFUSAL', message: 'I can offer a hint.' } }));
    global.fetch = fetchMock as typeof fetch;
    render(<StudentHelpChat endpoint="/api/tickets/help-chat" />);
    fireEvent.click(screen.getByRole('button', { name: /open ticket help bot/i }));

    const input = screen.getByRole('textbox', { name: /your question/i });
    fireEvent.change(input, { target: { value: 'First question' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText(/Which value is missing/);
    fireEvent.change(input, { target: { value: 'Retry this question' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByRole('alert');
    expect(input).toHaveValue('Retry this question');
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/private provider response/)).not.toBeInTheDocument();
    const failedRequest = JSON.parse(String(fetchMock.mock.calls[3][1]?.body));
    expect(failedRequest).toEqual({ question: 'Retry this question', history: [
      { role: 'STUDENT', text: 'First question' }, { role: 'BOT', text: 'Which value is missing?' },
    ] });

    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText(/I can offer a hint/);
    expect(input).toHaveValue('');
  });

  test('sends no more than eight prior turns and clear removes visible history', async () => {
    const fetchMock = jest.fn();
    for (let turn = 0; turn < 5; turn += 1) {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'synthetic-csrf' }));
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { reply: { type: 'CLARIFICATION', question: `Bot reply ${turn}` } }));
    }
    global.fetch = fetchMock as typeof fetch;
    render(<StudentHelpChat endpoint="/api/tickets/help-chat" />);
    fireEvent.click(screen.getByRole('button', { name: /open ticket help bot/i }));
    const input = screen.getByRole('textbox', { name: /your question/i });
    for (let turn = 0; turn < 5; turn += 1) {
      fireEvent.change(input, { target: { value: `Student question ${turn}` } });
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      await screen.findByText(`Bot reply ${turn}`);
    }
    const fifthRequest = JSON.parse(String(fetchMock.mock.calls[9][1]?.body));
    expect(fifthRequest.history).toHaveLength(8);
    expect(fifthRequest.history[0]).toEqual({ role: 'STUDENT', text: 'Student question 0' });
    expect(fifthRequest.history[7]).toEqual({ role: 'BOT', text: 'Bot reply 3' });
    fireEvent.click(screen.getByRole('button', { name: /clear chat/i }));
    expect(screen.queryByText(/Student question [0-4]/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bot reply [0-4]/)).not.toBeInTheDocument();
  });

  test('disables duplicate submission while pending and exposes an announced status', async () => {
    let resolveReply: ((response: ReturnType<typeof jsonResponse>) => void) | undefined;
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'synthetic-csrf' }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveReply = resolve; }));
    global.fetch = fetchMock as typeof fetch;
    render(<StudentHelpChat endpoint="/api/tickets/help-chat" />);
    fireEvent.click(screen.getByRole('button', { name: /open ticket help bot/i }));
    const input = screen.getByRole('textbox', { name: /your question/i });
    fireEvent.change(input, { target: { value: 'Wait for reply' } });
    const send = screen.getByRole('button', { name: /send/i });
    fireEvent.click(send);
    expect(screen.getByRole('status')).toHaveTextContent(/waiting/i);
    expect(send).toBeDisabled();
    fireEvent.click(send);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    resolveReply?.(jsonResponse(200, { reply: { type: 'CLARIFICATION', question: 'Done.' } }));
    await screen.findByText('Done.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

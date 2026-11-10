// T06 (spec ai-ta-assist R5, R6; scenarios 1, 10): the "Draft with AI" button on /ta/tickets/:ticketId.
// fetch is mocked; no network. Assumed UI contracts are listed in the coverage report.
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import TATicketPage from '../src/TATicketPage';

const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const source = (name: string) => readFileSync(resolve(__dirname, '../src', name), 'utf8');
const DRAFT_PATH = '/api/ta/tickets/t-1/fix-note-draft';
const NOTE = 'AI draft. Review and edit before resolving.';

const view = (over: Record<string, unknown> = {}) => ({
  ticketId: 't-1', title: 'Loop crashes', language: 'Python', conceptTags: ['loops'],
  files: [{ name: 'main.py', content: 'print(1)' }], repoUrl: null, repoFilePaths: [],
  errorOutput: 'IndexError', expectedBehaviour: 'Prints all', actualBehaviour: 'Crashes', attempted: 'Changed bounds',
  status: 'CLAIMED', fixNote: null, createdAt: '2026-11-09T09:00:00.000Z', updatedAt: '2026-11-09T09:00:00.000Z',
  resolvedAt: null, studentName: 'Sam Student', claimedByMe: true, claimedByName: 'Alice TA', replies: [], ...over,
});
const CLAIMED_BY_ME = view();

interface Posted { path: string; body: unknown; csrf: string | null }
function mockApi(ticket: ReturnType<typeof view>, draftReply: () => ReturnType<typeof response> | Promise<ReturnType<typeof response>>) {
  const posted: Posted[] = [];
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init?.method || 'GET').toUpperCase();
    if (url.pathname === '/api/ta/tickets/t-1' && method === 'GET') return Promise.resolve(response(ticket));
    if (url.pathname === '/api/auth/csrf') return Promise.resolve(response({ csrfToken: 'csrf-token-value' }));
    if (method === 'POST') {
      const headers = (init?.headers || {}) as Record<string, string>;
      posted.push({ path: url.pathname, body: init?.body ? JSON.parse(String(init.body)) : undefined, csrf: headers['X-CSRF-Token'] ?? null });
      if (url.pathname === DRAFT_PATH) return Promise.resolve(draftReply());
      return Promise.resolve(response({}, 500));
    }
    if (url.pathname === '/api/auth/session') return Promise.resolve(response({ accountType: 'TA' }));
    return Promise.resolve(response({ unreadCount: 0 }));
  }) as jest.Mock;
  return posted;
}

const draftButton = () => screen.queryByRole('button', { name: /draft with ai/i });
const noteBox = () => screen.getByLabelText(/fix note/i) as HTMLTextAreaElement;
async function ready() {
  await screen.findByRole('heading', { name: 'Loop crashes' });
}

describe('Draft with AI: visibility (scenario 1)', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each([
    ['CLAIMED by me', {}, true],
    ['OPEN', { status: 'OPEN', claimedByMe: false, claimedByName: null }, false],
    ['CLAIMED by another TA', { claimedByMe: false, claimedByName: 'Bob TA' }, false],
    ['RESOLVED', { status: 'RESOLVED', fixNote: 'done', resolvedAt: '2026-11-09T10:00:00.000Z' }, false],
    ['CLOSED', { status: 'CLOSED', claimedByMe: false, claimedByName: null }, false],
  ])('%s', async (_name, over, shown) => {
    mockApi(view(over), () => response({ draft: 'x' }));
    render(<TATicketPage ticketId="t-1" />);
    await ready();
    expect(!!draftButton()).toBe(shown);
  });

  test('the button sits in the resolve form next to the fix-note text area, and the panel is labelled "AI suggestion"', async () => {
    mockApi(CLAIMED_BY_ME, () => response({ draft: 'Draft text.' }));
    render(<TATicketPage ticketId="t-1" />);
    await ready();
    expect((draftButton() as HTMLElement).closest('form')).toBe(noteBox().closest('form'));
    fireEvent.click(draftButton() as HTMLElement);
    await waitFor(() => expect(noteBox().value).toBe('Draft text.'));
    expect(screen.getAllByText(/AI suggestion/i).length).toBeGreaterThan(0);
  });
});

describe('Draft with AI: fill without submit (scenario 1)', () => {
  afterEach(() => jest.restoreAllMocks());

  test('posts to the draft endpoint with the CSRF token and no body, fills the text area, and shows the AI note', async () => {
    const posted = mockApi(CLAIMED_BY_ME, () => response({ draft: 'The loop ran one step too far.' }));
    render(<TATicketPage ticketId="t-1" />);
    await ready();
    fireEvent.click(draftButton() as HTMLElement);
    await waitFor(() => expect(noteBox().value).toBe('The loop ran one step too far.'));
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    expect(posted).toEqual([{ path: DRAFT_PATH, body: undefined, csrf: 'csrf-token-value' }]);
  });

  test('never submits: no resolve request and no confirm step is shown', async () => {
    const posted = mockApi(CLAIMED_BY_ME, () => response({ draft: 'Draft only.' }));
    render(<TATicketPage ticketId="t-1" />);
    await ready();
    fireEvent.click(draftButton() as HTMLElement);
    await waitFor(() => expect(noteBox().value).toBe('Draft only.'));
    expect(posted.some((p) => p.path.endsWith('/resolve'))).toBe(false);
    expect(screen.queryByRole('button', { name: /confirm resolve/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/closes this ticket/i)).not.toBeInTheDocument();
  });

  test('shows a loading state while the draft is pending', async () => {
    let release: (value: ReturnType<typeof response>) => void = () => undefined;
    mockApi(CLAIMED_BY_ME, () => new Promise((res) => { release = res; }));
    render(<TATicketPage ticketId="t-1" />);
    await ready();
    fireEvent.click(draftButton() as HTMLElement);
    await waitFor(() => {
      const button = draftButton() as HTMLButtonElement | null;
      expect((button ? button.disabled : false) || !!screen.queryByText(/drafting|generating|working|loading/i)).toBe(true);
    });
    release(response({ draft: 'Done.' }));
    await waitFor(() => expect(noteBox().value).toBe('Done.'));
  });
});

describe('Draft with AI: replace confirmation', () => {
  afterEach(() => jest.restoreAllMocks());

  // The spec says "the page asks before replacing" without naming the mechanism, so the helper
  // accepts either window.confirm or an inline replace/keep control.
  async function askAndAnswer(accept: boolean, confirmSpy: jest.SpyInstance) {
    await waitFor(() => {
      const asked = confirmSpy.mock.calls.length > 0 || !!screen.queryByRole('button', { name: /replace|overwrite|yes/i });
      expect(asked).toBe(true);
    });
    if (confirmSpy.mock.calls.length === 0) {
      const name = accept ? /replace|overwrite|yes/i : /keep|cancel|no\b/i;
      fireEvent.click(screen.getByRole('button', { name }));
    }
  }

  test('existing text is kept when the TA declines', async () => {
    mockApi(CLAIMED_BY_ME, () => response({ draft: 'New AI draft.' }));
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(<TATicketPage ticketId="t-1" />);
    await ready();
    fireEvent.change(noteBox(), { target: { value: 'My own note' } });
    fireEvent.click(draftButton() as HTMLElement);
    await askAndAnswer(false, confirmSpy);
    await waitFor(() => expect(noteBox().value).toBe('My own note'));
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  test('existing text is replaced only after the TA agrees', async () => {
    mockApi(CLAIMED_BY_ME, () => response({ draft: 'New AI draft.' }));
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<TATicketPage ticketId="t-1" />);
    await ready();
    fireEvent.change(noteBox(), { target: { value: 'My own note' } });
    fireEvent.click(draftButton() as HTMLElement);
    await askAndAnswer(true, confirmSpy);
    await waitFor(() => expect(noteBox().value).toBe('New AI draft.'));
    expect(screen.getByText(NOTE)).toBeInTheDocument();
  });

  test('an empty text area is filled without asking', async () => {
    mockApi(CLAIMED_BY_ME, () => response({ draft: 'Fresh draft.' }));
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(<TATicketPage ticketId="t-1" />);
    await ready();
    fireEvent.click(draftButton() as HTMLElement);
    await waitFor(() => expect(noteBox().value).toBe('Fresh draft.'));
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});

describe('Draft with AI: errors (R5) and plain text (scenario 10)', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each([
    [503, 'AI_UNAVAILABLE', 'AI help is unavailable right now. You can still write the note yourself.'],
    [429, 'AI_RATE_LIMITED', 'AI limit reached. Please try again in a minute.'],
    [422, 'AI_INPUT_TOO_LARGE', 'This ticket is too long for an AI draft.'],
    [502, 'AI_INVALID_OUTPUT', 'The AI reply could not be used. Please try again or write the note yourself.'],
  ])('%i %s shows the fixed message inline and leaves the text area alone', async (status, code, message) => {
    mockApi(CLAIMED_BY_ME, () => response({ code, message: 'server text is not trusted' }, status));
    render(<TATicketPage ticketId="t-1" />);
    await ready();
    fireEvent.change(noteBox(), { target: { value: 'Typed by the TA' } });
    fireEvent.click(draftButton() as HTMLElement);
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(noteBox().value).toBe('Typed by the TA');
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
    // The rest of the workflow still works.
    expect(screen.getByRole('button', { name: /^resolve/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^unclaim$/i })).toBeInTheDocument();
  });

  test('a network failure shows an inline error rather than throwing', async () => {
    mockApi(CLAIMED_BY_ME, () => Promise.reject(new Error('offline')) as never);
    render(<TATicketPage ticketId="t-1" />);
    await ready();
    fireEvent.click(draftButton() as HTMLElement);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(noteBox().value).toBe('');
  });

  test('HTML, script, and javascript: text in a draft is shown literally and creates no elements', async () => {
    const hostile = '<b>bold</b><script>alert(1)</script><a href="javascript:alert(1)">x</a> [y](javascript:alert(1)) <img src=x onerror=alert(1)>';
    mockApi(CLAIMED_BY_ME, () => response({ draft: hostile }));
    const { container } = render(<TATicketPage ticketId="t-1" />);
    await ready();
    fireEvent.click(draftButton() as HTMLElement);
    await waitFor(() => expect(noteBox().value).toBe(hostile));
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('main b')).toBeNull();
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  test('the page never uses dangerouslySetInnerHTML for AI text', () => {
    expect(source('TATicketPage.tsx')).not.toMatch(/dangerouslySetInnerHTML|innerHTML/);
  });

  test('the Draft with AI button exists in the source and styles keep the 320 px rules', () => {
    expect(source('TATicketPage.tsx')).toMatch(/Draft with AI/);
    const css = source('TATicketPage.css');
    expect(css).toMatch(/var\(--lc-color-/);
    expect(css).toMatch(/@media\s*\(max-width:\s*\d+px\)/);
    expect(css).not.toMatch(/min-width:\s*(?:[4-9]\d{2}|\d{4,})px/);
  });
});

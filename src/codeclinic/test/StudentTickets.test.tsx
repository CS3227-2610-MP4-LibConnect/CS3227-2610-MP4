import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AppHeader from '../src/AppHeader';
import { StudentDashboard } from '../src/StudentDashboard';

let mockAppTree: React.ReactNode;
beforeAll(() => {
  document.body.innerHTML = '<div id="root"></div>';
  jest.doMock('react-dom/client', () => ({
    createRoot: () => ({ render: (tree: React.ReactNode) => { mockAppTree = tree; } }),
  }));
  require('../src/index');
  jest.dontMock('react-dom/client');
});

const response = (status: number, body: unknown = {}) => ({
  status, ok: status >= 200 && status < 300, json: async () => body,
});

describe('student ticket entry points', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(response(200, { unreadCount: 0 })) as typeof fetch;
  });
  afterEach(() => { global.fetch = originalFetch; });

  test('dashboard offers Ask for Help and links to the protected create page', () => {
    render(<StudentDashboard onLogoutConfirmed={jest.fn()} />);
    expect(screen.getByRole('region', { name: /ask for help/i })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: /ask for help/i })).getByRole('link', { name: /create ticket/i })).toHaveAttribute('href', '/student/tickets/new');
    expect(screen.queryByText(/ticket created|successfully created/i)).not.toBeInTheDocument();
  });

  test('the authenticated header offers ticket creation only to Students', () => {
    const logout = jest.fn();
    const { unmount } = render(<AppHeader accountType="STUDENT" activePath="/student/dashboard" onLogout={logout} />);
    expect(screen.getByRole('link', { name: /create ticket/i })).toHaveAttribute('href', '/student/tickets/new');
    unmount();
    render(<AppHeader accountType="TA" activePath="/ta/dashboard" onLogout={logout} />);
    expect(screen.queryByRole('link', { name: /create ticket/i })).not.toBeInTheDocument();
  });
});

describe('protected ticket creation page and form', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    window.history.replaceState({}, '', '/');
    window.localStorage.clear();
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  function renderAppAt(path: string, fetchMock: jest.Mock) {
    window.history.replaceState({}, '', path);
    global.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (input === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      return fetchMock(input, init);
    }) as typeof fetch;
    return render(mockAppTree as React.ReactElement);
  }

  test('direct entry waits for server session validation before showing the form', async () => {
    let resolveSession!: (result: ReturnType<typeof response>) => void;
    const pending = new Promise<ReturnType<typeof response>>((resolve) => { resolveSession = resolve; });
    const fetchMock = jest.fn().mockReturnValue(pending);
    renderAppAt('/student/tickets/new', fetchMock);
    expect(await screen.findByText(/checking your session/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /title/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /main navigation/i })).not.toBeInTheDocument();
    await act(async () => { resolveSession(response(200, { accountType: 'STUDENT' })); });
    expect(await screen.findByRole('heading', { name: /create ticket/i })).toBeInTheDocument();
    const navigation = screen.getByRole('navigation', { name: /main navigation/i });
    expect(within(navigation).getByRole('link', { name: /create ticket/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', expect.anything());
  });

  test('visitor is returned to sign-in and TA receives denial without a form', async () => {
    const visitorFetch = jest.fn().mockResolvedValue(response(401));
    renderAppAt('/student/tickets/new', visitorFetch);
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.queryByRole('textbox', { name: /title/i })).not.toBeInTheDocument();

    document.body.innerHTML = '<div id="root"></div>';
    window.history.replaceState({}, '', '/student/tickets/new');
    const taFetch = jest.fn().mockResolvedValue(response(200, { accountType: 'TA' }));
    renderAppAt('/student/tickets/new', taFetch);
    expect(await screen.findByRole('heading', { name: /access denied/i })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /title/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /main navigation/i })).not.toBeInTheDocument();
  });

  test('required fields are labeled; whitespace submit is blocked with associated errors', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response(200, { accountType: 'STUDENT' }));
    renderAppAt('/student/tickets/new', fetchMock);
    const submit = await screen.findByRole('button', { name: /submit ticket|create ticket/i });
    fireEvent.click(submit);
    for (const name of ['Title', 'Expected behaviour', 'Actual behaviour', 'Attempted']) {
      const field = screen.getByRole('textbox', { name: new RegExp(name, 'i') });
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveAccessibleDescription(/required|enter/i);
    }
    const language = screen.getByRole('combobox', { name: /language/i });
    expect(language).toHaveAttribute('aria-invalid', 'true');
    expect(language).toHaveAccessibleDescription(/required|select/i);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /title/i }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('language is a fixed-choice selector with the Other note and revised length limits', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response(200, { accountType: 'STUDENT' }));
    renderAppAt('/student/tickets/new', fetchMock);
    const language = await screen.findByRole('combobox', { name: /language/i });
    expect(language).toHaveValue('');
    expect((language as HTMLSelectElement).options[0]).toBeDisabled();
    expect(screen.queryByRole('textbox', { name: /language/i })).not.toBeInTheDocument();
    expect(Array.from((language as HTMLSelectElement).options).map((option) => option.value)).toEqual([
      '', 'Python', 'Java', 'JavaScript', 'TypeScript', 'C', 'C++', 'Other',
    ]);
    fireEvent.change(language, { target: { value: 'Other' } });
    expect(screen.getByText((text) => /other/i.test(text) && /language/i.test(text) && /title|ticket detail/i.test(text))).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /title/i })).toHaveAttribute('maxLength', '510');
    expect(screen.getByRole('textbox', { name: /expected behaviour/i })).toHaveAttribute('maxLength', '10000');
    expect(screen.getByRole('textbox', { name: /actual behaviour/i })).toHaveAttribute('maxLength', '10000');
    expect(screen.getByRole('textbox', { name: /attempted/i })).toHaveAttribute('maxLength', '10000');
    expect(screen.getByRole('textbox', { name: /error output/i })).toHaveAttribute('maxLength', '10000');
    expect(language).toHaveValue('Other');
  });

  test('valid submission sends trimmed required fields with CSRF and pending state blocks duplicates', async () => {
    let resolveCreate!: (result: ReturnType<typeof response>) => void;
    const createPending = new Promise<ReturnType<typeof response>>((resolve) => { resolveCreate = resolve; });
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(response(200, { accountType: 'STUDENT' }))
      .mockResolvedValueOnce(response(200, { csrfToken: 'synthetic-csrf' }))
      .mockReturnValueOnce(createPending);
    renderAppAt('/student/tickets/new', fetchMock);
    const fields = [
      ['Title', '  Boundary issue  '],
      ['Expected behaviour', '  Expected  '], ['Actual behaviour', '  Actual  '], ['Attempted', '  Tried  '],
    ] as const;
    for (const [name, value] of fields) fireEvent.change(await screen.findByRole('textbox', { name: new RegExp(name, 'i') }), { target: { value } });
    fireEvent.change(await screen.findByRole('combobox', { name: /language/i }), { target: { value: 'TypeScript' } });
    fireEvent.change(screen.getByRole('textbox', { name: /concept tags/i }), { target: { value: '  ARRAYS  ' } });
    const submit = await screen.findByRole('button', { name: /submit ticket|create ticket/i });
    fireEvent.click(submit);
    expect(await screen.findByRole('status')).toHaveTextContent(/submitting|creating/i);
    fireEvent.click(submit);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const [, options] = fetchMock.mock.calls[2];
    expect(options.headers['X-CSRF-Token']).toBe('synthetic-csrf');
    expect(JSON.parse(options.body)).toMatchObject({
      title: 'Boundary issue', language: 'TypeScript', expectedBehaviour: 'Expected',
      actualBehaviour: 'Actual', attempted: 'Tried',
      conceptTags: ['arrays'],
    });
    await act(async () => { resolveCreate(response(201, { ticketId: 'server-ticket' })); });
    await waitFor(() => expect(window.location.pathname).toBe('/student/dashboard'));
    expect(await screen.findByText(/ticket created|ticket has been created|successfully created/i)).toBeInTheDocument();
  });

  test('uses Unicode code-point limits for title and rejects the next character', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response(200, { accountType: 'STUDENT' }));
    renderAppAt('/student/tickets/new', fetchMock);
    const title = await screen.findByRole('textbox', { name: /^title$/i });
    fireEvent.change(title, { target: { value: '😀'.repeat(255) } });
    expect(title).toHaveValue('😀'.repeat(255));
    fireEvent.change(title, { target: { value: '😀'.repeat(256) } });
    for (const [name, value] of [['Expected behaviour', 'Expected'], ['Actual behaviour', 'Actual'], ['Attempted', 'Tried']]) {
      fireEvent.change(await screen.findByRole('textbox', { name: new RegExp(name, 'i') }), { target: { value } });
    }
    fireEvent.change(await screen.findByRole('combobox', { name: /language/i }), { target: { value: 'Python' } });
    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }));
    expect(await screen.findByText(/no more than 255 characters/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('rejects more than five concept tags in the UI before requesting CSRF', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response(200, { accountType: 'STUDENT' }));
    renderAppAt('/student/tickets/new', fetchMock);
    const fields = [
      ['Title', 'Issue'], ['Expected behaviour', 'Expected'],
      ['Actual behaviour', 'Actual'], ['Attempted', 'Tried'],
    ] as const;
    for (const [name, value] of fields) fireEvent.change(await screen.findByRole('textbox', { name: new RegExp(name, 'i') }), { target: { value } });
    fireEvent.change(await screen.findByRole('combobox', { name: /language/i }), { target: { value: 'Python' } });
    fireEvent.change(screen.getByRole('textbox', { name: /concept tags/i }), { target: { value: 'a,b,c,d,e,f' } });
    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }));
    expect(await screen.findByText(/up to five unique tags/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('rejects query markers and unsafe repository paths before requesting CSRF', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response(200, { accountType: 'STUDENT' }));
    renderAppAt('/student/tickets/new', fetchMock);
    for (const [name, value] of [['Title', 'Issue'], ['Expected behaviour', 'Expected'],
      ['Actual behaviour', 'Actual'], ['Attempted', 'Tried']]) {
      fireEvent.change(await screen.findByRole('textbox', { name: new RegExp(name, 'i') }), { target: { value } });
    }
    fireEvent.change(await screen.findByRole('combobox', { name: /language/i }), { target: { value: 'Python' } });
    fireEvent.change(screen.getByRole('textbox', { name: /public github url/i }), { target: { value: 'https://github.com/owner/repo?' } });
    fireEvent.change(screen.getByRole('textbox', { name: /relevant file paths/i }), { target: { value: 'src/../secret.ts' } });
    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/github url|relative file paths/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('blocks a serialized request larger than 128 KiB before CSRF or create requests', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response(200, { accountType: 'STUDENT' }));
    renderAppAt('/student/tickets/new', fetchMock);
    for (const [name, value] of [['Title', 'Issue'], ['Expected behaviour', '😀'.repeat(5000)],
      ['Actual behaviour', '😀'.repeat(5000)], ['Attempted', '😀'.repeat(5000)], ['Error output', '😀'.repeat(5000)]]) {
      fireEvent.change(await screen.findByRole('textbox', { name: new RegExp(name, 'i') }), { target: { value } });
    }
    fireEvent.change(await screen.findByRole('combobox', { name: /language/i }), { target: { value: 'Python' } });
    const picker = screen.getByLabelText(/code files/i) as HTMLInputElement;
    fireEvent.change(picker, { target: { files: [
      new File(['x'.repeat(24576)], 'file0.txt', { type: 'text/plain' }),
      new File(['x'.repeat(24576)], 'file1.txt', { type: 'text/plain' }),
      new File(['x'.repeat(24576)], 'file2.txt', { type: 'text/plain' }),
    ] } });
    await screen.findByText('file2.txt');
    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }));
    expect(await screen.findByText(/too large to submit/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('selects UTF-8 files into the existing JSON files contract and supports removal', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(response(200, { accountType: 'STUDENT' }))
      .mockResolvedValueOnce(response(200, { csrfToken: 'synthetic-csrf' }))
      .mockResolvedValueOnce(response(201, { ticketId: 'synthetic-ticket' }));
    renderAppAt('/student/tickets/new', fetchMock);
    const picker = await screen.findByLabelText(/code files/i);
    expect(screen.queryByRole('textbox', { name: /filename|code file contents/i })).not.toBeInTheDocument();
    fireEvent.change(picker, { target: { files: [
      new File(['print("first")'], 'first.py', { type: 'text/plain' }),
      new File(['console.log(2)'], 'second.ts', { type: 'text/plain' }),
    ] } });
    expect(await screen.findByText('first.py')).toBeInTheDocument();
    expect(await screen.findByText('second.ts')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remove second\.ts/i }));
    for (const [name, value] of [['Title', 'Issue'], ['Expected behaviour', 'Expected'], ['Actual behaviour', 'Actual'], ['Attempted', 'Tried']]) {
      fireEvent.change(screen.getByRole('textbox', { name: new RegExp(name, 'i') }), { target: { value } });
    }
    fireEvent.change(screen.getByRole('combobox', { name: /language/i }), { target: { value: 'Python' } });
    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === '/api/tickets')).toBe(true));
    const createCall = fetchMock.mock.calls.find(([url]) => url === '/api/tickets');
    expect(JSON.parse(String(createCall?.[1]?.body)).files).toEqual([{ filename: 'first.py', content: 'print("first")' }]);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  test.each([
    ['oversized', () => new File(['x'.repeat(24577)], 'large.py')],
    ['invalid basename', () => new File(['x'], '..')],
    ['invalid UTF-8', () => new File([new Uint8Array([0xc3, 0x28])], 'bad.py')],
  ])('rejects %s selection accessibly and preserves an earlier accepted file', async (_kind, invalidFile) => {
    const fetchMock = jest.fn().mockResolvedValue(response(200, { accountType: 'STUDENT' }));
    renderAppAt('/student/tickets/new', fetchMock);
    const picker = await screen.findByLabelText(/code files/i);
    fireEvent.change(picker, { target: { files: [new File(['keep'], 'keep.py')] } });
    expect(await screen.findByText('keep.py')).toBeInTheDocument();
    fireEvent.change(picker, { target: { files: [invalidFile()] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/file|UTF-8|24 KiB|basename/i);
    expect(screen.getByText('keep.py')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('rejects a fourth file and blocks files together with repository source', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response(200, { accountType: 'STUDENT' }));
    renderAppAt('/student/tickets/new', fetchMock);
    const picker = await screen.findByLabelText(/code files/i);
    fireEvent.change(picker, { target: { files: ['a.py', 'b.py', 'c.py'].map((name) => new File(['x'], name)) } });
    expect(await screen.findByText('c.py')).toBeInTheDocument();
    fireEvent.change(picker, { target: { files: [new File(['x'], 'd.py')] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/three|3|up to/i);
    expect(screen.getByText('a.py')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /public github url/i }), { target: { value: 'https://github.com/example/repo' } });
    fireEvent.change(screen.getByRole('textbox', { name: /relevant file paths/i }), { target: { value: 'src/main.py' } });
    for (const [name, value] of [['Title', 'Issue'], ['Expected behaviour', 'Expected'], ['Actual behaviour', 'Actual'], ['Attempted', 'Tried']]) {
      fireEvent.change(screen.getByRole('textbox', { name: new RegExp(name, 'i') }), { target: { value } });
    }
    fireEvent.change(screen.getByRole('combobox', { name: /language/i }), { target: { value: 'Python' } });
    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }));
    expect(await screen.findByText(/choose files or a repository reference, not both/i)).toBeInTheDocument();
    expect(picker).toHaveFocus();
    expect(picker).toHaveAttribute('aria-invalid', 'true');
    expect(picker).toHaveAttribute('aria-describedby', 'ticket-source-error');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('does not submit a ticket or send create help chat while a file read is pending', async () => {
    const readers: FileReader[] = [];
    const readSpy = jest.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(function (this: FileReader) {
      readers.push(this);
    });
    const fetchMock = jest.fn().mockResolvedValue(response(200, { accountType: 'STUDENT' }));
    renderAppAt('/student/tickets/new', fetchMock);
    const picker = await screen.findByLabelText(/code files/i);
    fireEvent.change(picker, { target: { files: [new File([new Uint8Array([0xc3, 0x28])], 'invalid.py'), new File(['pending'], 'pending.py')] } });
    expect(screen.getAllByRole('status').some((status) => /reading selected files/i.test(status.textContent ?? ''))).toBe(true);
    for (const [name, value] of [['Title', 'Issue'], ['Expected behaviour', 'Expected'], ['Actual behaviour', 'Actual'], ['Attempted', 'Tried']]) {
      fireEvent.change(screen.getByRole('textbox', { name: new RegExp(name, 'i') }), { target: { value } });
    }
    fireEvent.change(screen.getByRole('combobox', { name: /language/i }), { target: { value: 'Python' } });
    fireEvent.submit(screen.getByRole('heading', { name: /create ticket/i }).closest('section')!.querySelector('form')!);
    fireEvent.click(screen.getByRole('button', { name: /open ticket help bot/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /your question/i }), { target: { value: 'Help with this draft' } });
    fireEvent.submit(screen.getByRole('textbox', { name: /your question/i }).closest('form')!);
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/tickets' || url === '/api/tickets/help-chat')).toBe(false);
    expect(readSpy).toHaveBeenCalledTimes(2);
    await act(async () => {
      Object.defineProperty(readers[0], 'result', { configurable: true, value: new Uint8Array([0xc3, 0x28]).buffer });
      readers[0].onload?.(new ProgressEvent('load'));
    });
    expect(screen.getAllByRole('status').some((status) => /reading selected files/i.test(status.textContent ?? ''))).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/tickets' || url === '/api/tickets/help-chat')).toBe(false);
    await act(async () => {
      Object.defineProperty(readers[1], 'result', { configurable: true, value: new Uint8Array([112, 101, 110, 100, 105, 110, 103]).buffer });
      readers[1].onload?.(new ProgressEvent('load'));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/UTF-8 text/i);
    expect(screen.queryByText('pending.py')).not.toBeInTheDocument();
    readSpy.mockRestore();
  });

  test.each([
    ['network error', 'network'], ['service error', 503], ['malformed success', 'malformed'],
  ])('stays on the form after %s and shows no success', async (_label, failure) => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(response(200, { accountType: 'STUDENT' }))
      .mockResolvedValueOnce(response(200, { csrfToken: 'synthetic-csrf' }));
    if (failure === 'network') fetchMock.mockRejectedValueOnce(new TypeError('synthetic network failure'));
    else if (failure === 'malformed') fetchMock.mockResolvedValueOnce({ status: 201, ok: true, json: async () => ({}) });
    else fetchMock.mockResolvedValueOnce(response(503, { message: '<script>unsafe</script>' }));
    renderAppAt('/student/tickets/new', fetchMock);
    for (const [name, value] of [['Title', 'Issue'], ['Expected behaviour', 'Expected'],
      ['Actual behaviour', 'Actual'], ['Attempted', 'Tried']]) {
      fireEvent.change(await screen.findByRole('textbox', { name: new RegExp(name, 'i') }), { target: { value } });
    }
    fireEvent.change(await screen.findByRole('combobox', { name: /language/i }), { target: { value: 'JavaScript' } });
    fireEvent.click(await screen.findByRole('button', { name: /submit ticket|create ticket/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/student/tickets/new');
    expect(screen.queryByText(/ticket created|successfully created/i)).not.toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});

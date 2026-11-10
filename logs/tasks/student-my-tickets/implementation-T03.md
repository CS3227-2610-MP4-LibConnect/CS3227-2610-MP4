
> codeclinic@0.1.0 test
> react-scripts test --roots test --testMatch "**/test/**/*.test.*" --watchAll=false --runInBand --runTestsByPath test/StudentMyTickets.test.tsx test/StudentTicketActivity.test.tsx test/StudentTicketCard.test.tsx test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js

(node:19436) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
PASS test/student-ticket-activity.contract.test.js (5.59 s)
PASS test/StudentTicketActivity.test.tsx (5.273 s)
PASS test/student-my-tickets.contract.test.js
FAIL test/StudentMyTickets.test.tsx (5.536 s)
  ● Console

    console.error
      An update to MyTicketsPage inside a test was not wrapped in act(...).
      
      When testing, code that causes React state updates should be wrapped into act(...):
      
      act(() => {
        /* fire events that update state */
      });
      /* assert on the output */
      
      This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

      71 |       setLoadState('loaded');
      72 |     } catch {
    > 73 |       if (generation.current === requestGeneration) setLoadState('error');
         |                                                     ^
      74 |     }
      75 |   }, []);
      76 |

      at node_modules/react-dom/cjs/react-dom-client.development.js:20466:19
      at runWithFiberInDEV (node_modules/react-dom/cjs/react-dom-client.development.js:1048:13)
      at warnIfUpdatesNotWrappedWithActDEV (node_modules/react-dom/cjs/react-dom-client.development.js:20465:9)
      at scheduleUpdateOnFiber (node_modules/react-dom/cjs/react-dom-client.development.js:17920:11)
      at dispatchSetStateInternal (node_modules/react-dom/cjs/react-dom-client.development.js:9556:13)
      at setLoadState (node_modules/react-dom/cjs/react-dom-client.development.js:9513:7)
      at src/tickets/MyTicketsPage.tsx:73:53

    console.error
      An update to NotificationBell inside a test was not wrapped in act(...).
      
      When testing, code that causes React state updates should be wrapped into act(...):
      
      act(() => {
        /* fire events that update state */
      });
      /* assert on the output */
      
      This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

      53 |       const body = await response.json() as { unreadCount?: unknown };
      54 |       if (typeof body.unreadCount !== 'number' || !Number.isFinite(body.unreadCount)) throw new Error('Unread count unavailable.');
    > 55 |       if (mounted.current) setCount(Math.min(99, Math.max(0, Math.floor(body.unreadCount))));
         |                            ^
      56 |     } catch { if (mounted.current) setCount(null); }
      57 |   }, []);
      58 |   useEffect(() => {

      at node_modules/react-dom/cjs/react-dom-client.development.js:20466:19
      at runWithFiberInDEV (node_modules/react-dom/cjs/react-dom-client.development.js:1048:13)
      at warnIfUpdatesNotWrappedWithActDEV (node_modules/react-dom/cjs/react-dom-client.development.js:20465:9)
      at scheduleUpdateOnFiber (node_modules/react-dom/cjs/react-dom-client.development.js:17920:11)
      at dispatchSetStateInternal (node_modules/react-dom/cjs/react-dom-client.development.js:9556:13)
      at setCount (node_modules/react-dom/cjs/react-dom-client.development.js:9513:7)
      at src/notifications/Notifications.tsx:55:28

  ● Student My Tickets page › shows Open by default, renders exact statuses and links each card to ticket detail

    TestingLibraryElementError: Unable to find an element with the text: Claimed. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.

    Ignored nodes: comments, script, style
    <body>
      <div>
        <header
          class="app-header"
        >
          <a
            class="app-header__brand"
            href="/student/dashboard"
          >
            CodeClinic
          </a>
          <div
            class="app-header__actions"
          >
            <nav
              aria-label="Main navigation"
              class="app-header__nav"
            >
              <a
                href="/student/tickets/new"
              >
                Create Ticket
              </a>
              <a
                href="/student/tickets"
              >
                My Tickets
              </a>
              <a
                aria-label="Notifications"
                class="notification-bell"
                href="/notifications"
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                  />
                </svg>
                <span>
                  Notifications
                </span>
              </a>
              <a
                href="/student/account"
              >
                Account
              </a>
            </nav>
            <button
              class="app-header__logout"
              type="button"
            >
              Log out
            </button>
          </div>
        </header>
        <main
          class="dashboard-page student-dashboard my-tickets-page"
        >
          <h1>
            My Tickets
          </h1>
          <section
            aria-labelledby="my-tickets-heading"
            class="dashboard-panel my-tickets-panel"
          >
            <div
              class="my-tickets-heading-row"
            >
              <h2
                id="my-tickets-heading"
              >
                Your tickets
              </h2>
              <div
                aria-label="Ticket status view"
                class="my-tickets-toggle"
                role="group"
              >
                <button
                  aria-pressed="true"
                  type="button"
                >
                  Open
                </button>
                <button
                  aria-pressed="false"
                  type="button"
                >
                  Closed
                </button>
              </div>
            </div>
            <ul
              aria-label="open tickets"
              class="student-active-ticket-list my-tickets-list"
            >
              <li>
                <a
                  class="student-active-ticket-card"
                  href="/student/tickets/open-1"
                >
                  <span
                    class="student-active-ticket-title"
                  >
                    Title open-1
                  </span>
                  <span
                    class="student-active-ticket-meta"
                  >
                    TypeScript
                     · 
                    Open
                  </span>
                  <span
                    class="student-active-ticket-tags"
                  >
                    loops
                  </span>
                </a>
              </li>
              <li>
                <a
                  class="student-active-ticket-card"
                  href="/student/tickets/claimed-1"
                >
                  <span
                    class="student-active-ticket-title"
                  >
                    Title claimed-1
                  </span>
                  <span
                    class="student-active-ticket-meta"
                  >
                    TypeScript
                     · 
                    Claimed
                  </span>
                  <span
                    class="student-active-ticket-tags"
                  >
                    loops
                  </span>
                </a>
              </li>
            </ul>
          </section>
        </main>
      </div>
    </body>

      23 |     expect(screen.getByRole('button', { name: 'Closed' })).toHaveAttribute('aria-pressed', 'false');
      24 |     expect(await screen.findByRole('link', { name: /Title open-1/ })).toHaveAttribute('href', '/student/tickets/open-1');
    > 25 |     expect(screen.getByText('Claimed')).toBeInTheDocument();
         |                   ^
      26 |     expect(global.fetch).toHaveBeenCalledWith('/api/tickets?view=open', expect.anything());
      27 |   });
      28 |

      at Object.getElementError (node_modules/@testing-library/dom/dist/config.js:37:19)
      at node_modules/@testing-library/dom/dist/query-helpers.js:76:38
      at node_modules/@testing-library/dom/dist/query-helpers.js:52:17
      at getByText (node_modules/@testing-library/dom/dist/query-helpers.js:95:19)
      at Object.<anonymous> (test/StudentMyTickets.test.tsx:25:19)

  ● Student My Tickets page › switches to Closed and renders CLOSED and RESOLVED cards with their detail links

    TestingLibraryElementError: Unable to find an element with the text: Resolved. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.

    Ignored nodes: comments, script, style
    <body>
      <div>
        <header
          class="app-header"
        >
          <a
            class="app-header__brand"
            href="/student/dashboard"
          >
            CodeClinic
          </a>
          <div
            class="app-header__actions"
          >
            <nav
              aria-label="Main navigation"
              class="app-header__nav"
            >
              <a
                href="/student/tickets/new"
              >
                Create Ticket
              </a>
              <a
                href="/student/tickets"
              >
                My Tickets
              </a>
              <a
                aria-label="Notifications"
                class="notification-bell"
                href="/notifications"
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                  />
                </svg>
                <span>
                  Notifications
                </span>
              </a>
              <a
                href="/student/account"
              >
                Account
              </a>
            </nav>
            <button
              class="app-header__logout"
              type="button"
            >
              Log out
            </button>
          </div>
        </header>
        <main
          class="dashboard-page student-dashboard my-tickets-page"
        >
          <h1>
            My Tickets
          </h1>
          <section
            aria-labelledby="my-tickets-heading"
            class="dashboard-panel my-tickets-panel"
          >
            <div
              class="my-tickets-heading-row"
            >
              <h2
                id="my-tickets-heading"
              >
                Your tickets
              </h2>
              <div
                aria-label="Ticket status view"
                class="my-tickets-toggle"
                role="group"
              >
                <button
                  aria-pressed="false"
                  type="button"
                >
                  Open
                </button>
                <button
                  aria-pressed="true"
                  type="button"
                >
                  Closed
                </button>
              </div>
            </div>
            <ul
              aria-label="closed tickets"
              class="student-active-ticket-list my-tickets-list"
            >
              <li>
                <a
                  class="student-active-ticket-card student-ticket-card--muted"
                  href="/student/tickets/closed-1"
                >
                  <span
                    class="student-active-ticket-title"
                  >
                    Title closed-1
                  </span>
                  <span
                    class="student-active-ticket-meta"
                  >
                    TypeScript
                     · 
                    Closed
                  </span>
                  <span
                    class="student-active-ticket-tags"
                  >
                    loops
                  </span>
                </a>
              </li>
              <li>
                <a
                  class="student-active-ticket-card student-ticket-card--muted"
                  href="/student/tickets/resolved-1"
                >
                  <span
                    class="student-active-ticket-title"
                  >
                    Title resolved-1
                  </span>
                  <span
                    class="student-active-ticket-meta"
                  >
                    TypeScript
                     · 
                    Resolved
                  </span>
                  <span
                    class="student-active-ticket-tags"
                  >
                    loops
                  </span>
                </a>
              </li>
            </ul>
          </section>
        </main>
      </div>
    </body>

      39 |     expect(await screen.findByRole('link', { name: /Title resolved-1/ })).toHaveAttribute('href', '/student/tickets/resolved-1');
      40 |     expect(screen.getAllByText('Closed').length).toBeGreaterThanOrEqual(1);
    > 41 |     expect(screen.getByText('Resolved')).toBeInTheDocument();
         |                   ^
      42 |   });
      43 |
      44 |   test('keeps existing cards after a failed next page and retries that page once', async () => {

      at Object.getElementError (node_modules/@testing-library/dom/dist/config.js:37:19)
      at node_modules/@testing-library/dom/dist/query-helpers.js:76:38
      at node_modules/@testing-library/dom/dist/query-helpers.js:52:17
      at getByText (node_modules/@testing-library/dom/dist/query-helpers.js:95:19)
      at Object.<anonymous> (test/StudentMyTickets.test.tsx:41:19)

  ● Student My Tickets page › keeps existing cards after a failed next page and retries that page once

    Unable to find role="link" and name `/Title first/`

    Ignored nodes: comments, script, style
    <body>
      <div>
        <header
          class="app-header"
        >
          <a
            class="app-header__brand"
            href="/student/dashboard"
          >
            CodeClinic
          </a>
          <div
            class="app-header__actions"
          >
            <nav
              aria-label="Main navigation"
              class="app-header__nav"
            >
              <a
                href="/student/tickets/new"
              >
                Create Ticket
              </a>
              <a
                href="/student/tickets"
              >
                My Tickets
              </a>
              <a
                aria-label="Notifications"
                class="notification-bell"
                href="/notifications"
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                  />
                </svg>
                <span>
                  Notifications
                </span>
              </a>
              <a
                href="/student/account"
              >
                Account
              </a>
            </nav>
            <button
              class="app-header__logout"
              type="button"
            >
              Log out
            </button>
          </div>
        </header>
        <main
          class="dashboard-page student-dashboard my-tickets-page"
        >
          <h1>
            My Tickets
          </h1>
          <section
            aria-labelledby="my-tickets-heading"
            class="dashboard-panel my-tickets-panel"
          >
            <div
              class="my-tickets-heading-row"
            >
              <h2
                id="my-tickets-heading"
              >
                Your tickets
              </h2>
              <div
                aria-label="Ticket status view"
                class="my-tickets-toggle"
                role="group"
              >
                <button
                  aria-pressed="true"
                  type="button"
                >
                  Open
                </button>
                <button
                  aria-pressed="false"
                  type="button"
                >
                  Closed
                </button>
              </div>
            </div>
            <div
              class="my-tickets-feedback"
              role="alert"
            >
              <p>
                We couldn’t load your tickets. Please try again.
              </p>
              <button
                type="button"
              >
                Retry
              </button>
            </div>
          </section>
        </main>
      </div>
    </body>

      49 |     global.fetch = fetchMock as typeof fetch;
      50 |     render(<MyTicketsPage onLogoutConfirmed={jest.fn()} />);
    > 51 |     await screen.findByRole('link', { name: /Title first/ });
         |                  ^
      52 |     fireEvent.click(await screen.findByRole('button', { name: /load more/i }));
      53 |     expect(await screen.findByRole('alert')).toBeInTheDocument();
      54 |     expect(screen.getByRole('link', { name: /Title first/ })).toBeInTheDocument();

      at waitForWrapper (node_modules/@testing-library/dom/dist/wait-for.js:163:27)
      at findByRole (node_modules/@testing-library/dom/dist/query-helpers.js:86:33)
      at Object.<anonymous> (test/StudentMyTickets.test.tsx:51:18)

  ● Student My Tickets page › does not issue duplicate requests when Load more is clicked while pending

    Unable to find role="link" and name `/Title first/`

    Ignored nodes: comments, script, style
    <body>
      <div>
        <header
          class="app-header"
        >
          <a
            class="app-header__brand"
            href="/student/dashboard"
          >
            CodeClinic
          </a>
          <div
            class="app-header__actions"
          >
            <nav
              aria-label="Main navigation"
              class="app-header__nav"
            >
              <a
                href="/student/tickets/new"
              >
                Create Ticket
              </a>
              <a
                href="/student/tickets"
              >
                My Tickets
              </a>
              <a
                aria-label="Notifications"
                class="notification-bell"
                href="/notifications"
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                  />
                </svg>
                <span>
                  Notifications
                </span>
              </a>
              <a
                href="/student/account"
              >
                Account
              </a>
            </nav>
            <button
              class="app-header__logout"
              type="button"
            >
              Log out
            </button>
          </div>
        </header>
        <main
          class="dashboard-page student-dashboard my-tickets-page"
        >
          <h1>
            My Tickets
          </h1>
          <section
            aria-labelledby="my-tickets-heading"
            class="dashboard-panel my-tickets-panel"
          >
            <div
              class="my-tickets-heading-row"
            >
              <h2
                id="my-tickets-heading"
              >
                Your tickets
              </h2>
              <div
                aria-label="Ticket status view"
                class="my-tickets-toggle"
                role="group"
              >
                <button
                  aria-pressed="true"
                  type="button"
                >
                  Open
                </button>
                <button
                  aria-pressed="false"
                  type="button"
                >
                  Closed
                </button>
              </div>
            </div>
            <p
              aria-live="polite"
              role="status"
            >
              Loading 
              open
               tickets…
            </p>
          </section>
        </main>
      </div>
    </body>

      65 |     global.fetch = fetchMock as typeof fetch;
      66 |     render(<MyTicketsPage onLogoutConfirmed={jest.fn()} />);
    > 67 |     await screen.findByRole('link', { name: /Title first/ });
         |                  ^
      68 |     const loadMore = await screen.findByRole('button', { name: /load more/i });
      69 |     fireEvent.click(loadMore);
      70 |     fireEvent.click(loadMore);

      at waitForWrapper (node_modules/@testing-library/dom/dist/wait-for.js:163:27)
      at findByRole (node_modules/@testing-library/dom/dist/query-helpers.js:86:33)
      at Object.<anonymous> (test/StudentMyTickets.test.tsx:67:18)

  ● Student My Tickets page › rejects malformed or wrong-view ticket responses and offers a working retry

    Unable to find role="alert"

    Ignored nodes: comments, script, style
    <body>
      <div>
        <header
          class="app-header"
        >
          <a
            class="app-header__brand"
            href="/student/dashboard"
          >
            CodeClinic
          </a>
          <div
            class="app-header__actions"
          >
            <nav
              aria-label="Main navigation"
              class="app-header__nav"
            >
              <a
                href="/student/tickets/new"
              >
                Create Ticket
              </a>
              <a
                href="/student/tickets"
              >
                My Tickets
              </a>
              <a
                aria-label="Notifications"
                class="notification-bell"
                href="/notifications"
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                  />
                </svg>
                <span>
                  Notifications
                </span>
              </a>
              <a
                href="/student/account"
              >
                Account
              </a>
            </nav>
            <button
              class="app-header__logout"
              type="button"
            >
              Log out
            </button>
          </div>
        </header>
        <main
          class="dashboard-page student-dashboard my-tickets-page"
        >
          <h1>
            My Tickets
          </h1>
          <section
            aria-labelledby="my-tickets-heading"
            class="dashboard-panel my-tickets-panel"
          >
            <div
              class="my-tickets-heading-row"
            >
              <h2
                id="my-tickets-heading"
              >
                Your tickets
              </h2>
              <div
                aria-label="Ticket status view"
                class="my-tickets-toggle"
                role="group"
              >
                <button
                  aria-pressed="true"
                  type="button"
                >
                  Open
                </button>
                <button
                  aria-pressed="false"
                  type="button"
                >
                  Closed
                </button>
              </div>
            </div>
            <ul
              aria-label="open tickets"
              class="student-active-ticket-list my-tickets-list"
            >
              <li>
                <a
                  class="student-active-ticket-card"
                  href="/student/tickets/safe-retry"
                >
                  <span
                    class="student-active-ticket-title"
                  >
                    Title safe-retry
                  </span>
                  <span
                    class="student-active-ticket-meta"
                  >
                    TypeScript
                     · 
                    Open
                  </span>
                  <span
                    class="student-active-ticket-tags"
                  >
                    loops
                  </span>
                </a>
              </li>
            </ul>
          </section>
        </main>
      </div>
    </body>

       99 |     expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load your tickets/i);
      100 |     fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    > 101 |     expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load your tickets/i);
          |                         ^
      102 |     fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      103 |     expect(await screen.findByRole('link', { name: /Title safe-retry/ })).toBeInTheDocument();
      104 |     expect(screen.queryByText('<script>')).not.toBeInTheDocument();

      at waitForWrapper (node_modules/@testing-library/dom/dist/wait-for.js:163:27)
      at findByRole (node_modules/@testing-library/dom/dist/query-helpers.js:86:33)
      at Object.<anonymous> (test/StudentMyTickets.test.tsx:101:25)

  ● Student My Tickets page › shows a distinct empty state and narrow layouts use a single flexible card column

    expect(element).toHaveTextContent()

    Expected element to have text content:
      /no open tickets yet/i
    Received:
      Loading open tickets…

      123 |     global.fetch = jest.fn().mockResolvedValue(response({ tickets: [] })) as typeof fetch;
      124 |     const { container } = render(<MyTicketsPage onLogoutConfirmed={jest.fn()} />);
    > 125 |     expect(await screen.findByRole('status')).toHaveTextContent(/no open tickets yet/i);
          |                                               ^
      126 |     expect(container.querySelector('.my-tickets-list')).toBeNull();
      127 |     const page = container.querySelector('.my-tickets-page');
      128 |     expect(page).toHaveClass('student-dashboard');

      at Object.<anonymous> (test/StudentMyTickets.test.tsx:125:47)

PASS test/StudentTicketCard.test.tsx

Test Suites: 1 failed, 4 passed, 5 total
Tests:       6 failed, 53 passed, 59 total
Snapshots:   0 total
Time:        23.379 s
Ran all test suites within paths "test/StudentMyTickets.test.tsx", "test/StudentTicketActivity.test.tsx", "test/StudentTicketCard.test.tsx", "test/student-my-tickets.contract.test.js", "test/student-ticket-activity.contract.test.js".

> codeclinic@0.1.0 test
> react-scripts test --roots test --testMatch "**/test/**/*.test.*" --watchAll=false --runInBand --runTestsByPath test/StudentMyTickets.test.tsx test/StudentTicketActivity.test.tsx test/StudentTicketCard.test.tsx test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js

(node:27956) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
FAIL test/StudentMyTickets.test.tsx (6.852 s)
  ● Console

    console.error
      An update to MyTicketsPage inside a test was not wrapped in act(...).
      
      When testing, code that causes React state updates should be wrapped into act(...):
      
      act(() => {
        /* fire events that update state */
      });
      /* assert on the output */
      
      This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

      71 |       setLoadState('loaded');
      72 |     } catch {
    > 73 |       if (generation.current === requestGeneration) setLoadState('error');
         |                                                     ^
      74 |     }
      75 |   }, []);
      76 |

      at node_modules/react-dom/cjs/react-dom-client.development.js:20466:19
      at runWithFiberInDEV (node_modules/react-dom/cjs/react-dom-client.development.js:1048:13)
      at warnIfUpdatesNotWrappedWithActDEV (node_modules/react-dom/cjs/react-dom-client.development.js:20465:9)
      at scheduleUpdateOnFiber (node_modules/react-dom/cjs/react-dom-client.development.js:17920:11)
      at dispatchSetStateInternal (node_modules/react-dom/cjs/react-dom-client.development.js:9556:13)
      at setLoadState (node_modules/react-dom/cjs/react-dom-client.development.js:9513:7)
      at src/tickets/MyTicketsPage.tsx:73:53

    console.error
      An update to NotificationBell inside a test was not wrapped in act(...).
      
      When testing, code that causes React state updates should be wrapped into act(...):
      
      act(() => {
        /* fire events that update state */
      });
      /* assert on the output */
      
      This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

      53 |       const body = await response.json() as { unreadCount?: unknown };
      54 |       if (typeof body.unreadCount !== 'number' || !Number.isFinite(body.unreadCount)) throw new Error('Unread count unavailable.');
    > 55 |       if (mounted.current) setCount(Math.min(99, Math.max(0, Math.floor(body.unreadCount))));
         |                            ^
      56 |     } catch { if (mounted.current) setCount(null); }
      57 |   }, []);
      58 |   useEffect(() => {

      at node_modules/react-dom/cjs/react-dom-client.development.js:20466:19
      at runWithFiberInDEV (node_modules/react-dom/cjs/react-dom-client.development.js:1048:13)
      at warnIfUpdatesNotWrappedWithActDEV (node_modules/react-dom/cjs/react-dom-client.development.js:20465:9)
      at scheduleUpdateOnFiber (node_modules/react-dom/cjs/react-dom-client.development.js:17920:11)
      at dispatchSetStateInternal (node_modules/react-dom/cjs/react-dom-client.development.js:9556:13)
      at setCount (node_modules/react-dom/cjs/react-dom-client.development.js:9513:7)
      at src/notifications/Notifications.tsx:55:28

  ● Student My Tickets page › shows a distinct empty state and narrow layouts use a single flexible card column

    expect(element).toHaveTextContent()

    Expected element to have text content:
      /no open tickets yet/i
    Received:
      Loading open tickets…

      139 |     global.fetch = respondToPage(() => response({ tickets: [] })) as typeof fetch;
      140 |     const { container } = render(<MyTicketsPage onLogoutConfirmed={jest.fn()} />);
    > 141 |     expect(await screen.findByRole('status')).toHaveTextContent(/no open tickets yet/i);
          |                                               ^
      142 |     expect(container.querySelector('.my-tickets-list')).toBeNull();
      143 |     const page = container.querySelector('.my-tickets-page');
      144 |     expect(page).toHaveClass('student-dashboard');

      at Object.<anonymous> (test/StudentMyTickets.test.tsx:141:47)

PASS test/student-ticket-activity.contract.test.js
PASS test/StudentTicketActivity.test.tsx
PASS test/student-my-tickets.contract.test.js
PASS test/StudentTicketCard.test.tsx

Test Suites: 1 failed, 4 passed, 5 total
Tests:       1 failed, 58 passed, 59 total
Snapshots:   0 total
Time:        22.456 s
Ran all test suites within paths "test/StudentMyTickets.test.tsx", "test/StudentTicketActivity.test.tsx", "test/StudentTicketCard.test.tsx", "test/student-my-tickets.contract.test.js", "test/student-ticket-activity.contract.test.js".

> codeclinic@0.1.0 test
> react-scripts test --roots test --testMatch "**/test/**/*.test.*" --watchAll=false --runInBand --runTestsByPath test/StudentMyTickets.test.tsx test/StudentTicketActivity.test.tsx test/StudentTicketCard.test.tsx test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js

(node:23872) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
PASS test/StudentMyTickets.test.tsx (6.953 s)
  ● Console

    console.error
      An update to MyTicketsPage inside a test was not wrapped in act(...).
      
      When testing, code that causes React state updates should be wrapped into act(...):
      
      act(() => {
        /* fire events that update state */
      });
      /* assert on the output */
      
      This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

      71 |       setLoadState('loaded');
      72 |     } catch {
    > 73 |       if (generation.current === requestGeneration) setLoadState('error');
         |                                                     ^
      74 |     }
      75 |   }, []);
      76 |

      at node_modules/react-dom/cjs/react-dom-client.development.js:20466:19
      at runWithFiberInDEV (node_modules/react-dom/cjs/react-dom-client.development.js:1048:13)
      at warnIfUpdatesNotWrappedWithActDEV (node_modules/react-dom/cjs/react-dom-client.development.js:20465:9)
      at scheduleUpdateOnFiber (node_modules/react-dom/cjs/react-dom-client.development.js:17920:11)
      at dispatchSetStateInternal (node_modules/react-dom/cjs/react-dom-client.development.js:9556:13)
      at setLoadState (node_modules/react-dom/cjs/react-dom-client.development.js:9513:7)
      at src/tickets/MyTicketsPage.tsx:73:53

    console.error
      An update to NotificationBell inside a test was not wrapped in act(...).
      
      When testing, code that causes React state updates should be wrapped into act(...):
      
      act(() => {
        /* fire events that update state */
      });
      /* assert on the output */
      
      This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

      53 |       const body = await response.json() as { unreadCount?: unknown };
      54 |       if (typeof body.unreadCount !== 'number' || !Number.isFinite(body.unreadCount)) throw new Error('Unread count unavailable.');
    > 55 |       if (mounted.current) setCount(Math.min(99, Math.max(0, Math.floor(body.unreadCount))));
         |                            ^
      56 |     } catch { if (mounted.current) setCount(null); }
      57 |   }, []);
      58 |   useEffect(() => {

      at node_modules/react-dom/cjs/react-dom-client.development.js:20466:19
      at runWithFiberInDEV (node_modules/react-dom/cjs/react-dom-client.development.js:1048:13)
      at warnIfUpdatesNotWrappedWithActDEV (node_modules/react-dom/cjs/react-dom-client.development.js:20465:9)
      at scheduleUpdateOnFiber (node_modules/react-dom/cjs/react-dom-client.development.js:17920:11)
      at dispatchSetStateInternal (node_modules/react-dom/cjs/react-dom-client.development.js:9556:13)
      at setCount (node_modules/react-dom/cjs/react-dom-client.development.js:9513:7)
      at src/notifications/Notifications.tsx:55:28

PASS test/StudentTicketActivity.test.tsx
PASS test/student-ticket-activity.contract.test.js
PASS test/student-my-tickets.contract.test.js
PASS test/StudentTicketCard.test.tsx

Test Suites: 5 passed, 5 total
Tests:       59 passed, 59 total
Snapshots:   0 total
Time:        22.823 s
Ran all test suites within paths "test/StudentMyTickets.test.tsx", "test/StudentTicketActivity.test.tsx", "test/StudentTicketCard.test.tsx", "test/student-my-tickets.contract.test.js", "test/student-ticket-activity.contract.test.js".

> codeclinic@0.1.0 test
> react-scripts test --roots test --testMatch "**/test/**/*.test.*" --watchAll=false --runInBand --runTestsByPath test/StudentMyTickets.test.tsx test/StudentTicketActivity.test.tsx test/StudentTicketCard.test.tsx test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js

(node:5040) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
PASS test/StudentTicketActivity.test.tsx (7.058 s)
PASS test/student-ticket-activity.contract.test.js
PASS test/StudentMyTickets.test.tsx
  ● Console

    console.error
      An update to MyTicketsPage inside a test was not wrapped in act(...).
      
      When testing, code that causes React state updates should be wrapped into act(...):
      
      act(() => {
        /* fire events that update state */
      });
      /* assert on the output */
      
      This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

      75 |       setLoadState('loaded');
      76 |     } catch {
    > 77 |       if (generation.current === requestGeneration) setLoadState('error');
         |                                                     ^
      78 |     } finally {
      79 |       if (initialPendingGeneration.current === requestGeneration) initialPendingGeneration.current = null;
      80 |     }

      at node_modules/react-dom/cjs/react-dom-client.development.js:20466:19
      at runWithFiberInDEV (node_modules/react-dom/cjs/react-dom-client.development.js:1048:13)
      at warnIfUpdatesNotWrappedWithActDEV (node_modules/react-dom/cjs/react-dom-client.development.js:20465:9)
      at scheduleUpdateOnFiber (node_modules/react-dom/cjs/react-dom-client.development.js:17920:11)
      at dispatchSetStateInternal (node_modules/react-dom/cjs/react-dom-client.development.js:9556:13)
      at setLoadState (node_modules/react-dom/cjs/react-dom-client.development.js:9513:7)
      at src/tickets/MyTicketsPage.tsx:77:53

    console.error
      An update to NotificationBell inside a test was not wrapped in act(...).
      
      When testing, code that causes React state updates should be wrapped into act(...):
      
      act(() => {
        /* fire events that update state */
      });
      /* assert on the output */
      
      This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

      53 |       const body = await response.json() as { unreadCount?: unknown };
      54 |       if (typeof body.unreadCount !== 'number' || !Number.isFinite(body.unreadCount)) throw new Error('Unread count unavailable.');
    > 55 |       if (mounted.current) setCount(Math.min(99, Math.max(0, Math.floor(body.unreadCount))));
         |                            ^
      56 |     } catch { if (mounted.current) setCount(null); }
      57 |   }, []);
      58 |   useEffect(() => {

      at node_modules/react-dom/cjs/react-dom-client.development.js:20466:19
      at runWithFiberInDEV (node_modules/react-dom/cjs/react-dom-client.development.js:1048:13)
      at warnIfUpdatesNotWrappedWithActDEV (node_modules/react-dom/cjs/react-dom-client.development.js:20465:9)
      at scheduleUpdateOnFiber (node_modules/react-dom/cjs/react-dom-client.development.js:17920:11)
      at dispatchSetStateInternal (node_modules/react-dom/cjs/react-dom-client.development.js:9556:13)
      at setCount (node_modules/react-dom/cjs/react-dom-client.development.js:9513:7)
      at src/notifications/Notifications.tsx:55:28

PASS test/student-my-tickets.contract.test.js
PASS test/StudentTicketCard.test.tsx

Test Suites: 5 passed, 5 total
Tests:       60 passed, 60 total
Snapshots:   0 total
Time:        17.66 s
Ran all test suites within paths "test/StudentMyTickets.test.tsx", "test/StudentTicketActivity.test.tsx", "test/StudentTicketCard.test.tsx", "test/student-my-tickets.contract.test.js", "test/student-ticket-activity.contract.test.js".

> codeclinic@0.1.0 build
> react-scripts build

(node:10428) [DEP0176] DeprecationWarning: fs.F_OK is deprecated, use fs.constants.F_OK instead
(Use `node --trace-deprecation ...` to show where the warning was created)
Creating an optimized production build...
Compiled successfully.

File sizes after gzip:

  88.85 kB (+21 B)  build\static\js\main.3f7f5e7b.js
  5.93 kB           build\static\css\main.de0232ec.css

The project was built assuming it is hosted at /.
You can control this with the homepage field in your package.json.

The build folder is ready to be deployed.
You may serve it with a static server:

  npm install -g serve
  serve -s build

Find out more about deployment here:

  https://cra.link/deployment


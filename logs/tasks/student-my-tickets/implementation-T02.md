Invocation: npm test -- --watchAll=false --runInBand --runTestsByPath test/StudentTicketCard.test.tsx test/AppHeader.test.tsx test/StudentTicketActivity.test.tsx test/StudentTickets.test.tsx
Working directory: src/codeclinic


> codeclinic@0.1.0 test
> react-scripts test --roots test --testMatch "**/test/**/*.test.*" --watchAll=false --runInBand --runTestsByPath test/StudentTicketCard.test.tsx test/AppHeader.test.tsx test/StudentTicketActivity.test.tsx test/StudentTickets.test.tsx

(node:32960) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
PASS test/StudentTickets.test.tsx (6.849 s)
  ● Console

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

    console.error
      An update to StudentDashboard inside a test was not wrapped in act(...).
      
      When testing, code that causes React state updates should be wrapped into act(...):
      
      act(() => {
        /* fire events that update state */
      });
      /* assert on the output */
      
      This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

      34 |         setTicketsState('ready');
      35 |       } catch {
    > 36 |         setTicketsState('error');
         |         ^
      37 |       } finally {
      38 |         activeTicketRequest.current = null;
      39 |       }

      at node_modules/react-dom/cjs/react-dom-client.development.js:20466:19
      at runWithFiberInDEV (node_modules/react-dom/cjs/react-dom-client.development.js:1048:13)
      at warnIfUpdatesNotWrappedWithActDEV (node_modules/react-dom/cjs/react-dom-client.development.js:20465:9)
      at scheduleUpdateOnFiber (node_modules/react-dom/cjs/react-dom-client.development.js:17920:11)
      at dispatchSetStateInternal (node_modules/react-dom/cjs/react-dom-client.development.js:9556:13)
      at setTicketsState (node_modules/react-dom/cjs/react-dom-client.development.js:9513:7)
      at src/StudentDashboard.tsx:36:9

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
PASS test/StudentTicketCard.test.tsx
PASS test/AppHeader.test.tsx

Test Suites: 4 passed, 4 total
Tests:       39 passed, 39 total
Snapshots:   0 total
Time:        14.779 s, estimated 15 s
Ran all test suites within paths "test/StudentTicketCard.test.tsx", "test/AppHeader.test.tsx", "test/StudentTicketActivity.test.tsx", "test/StudentTickets.test.tsx".

Exit code: 0


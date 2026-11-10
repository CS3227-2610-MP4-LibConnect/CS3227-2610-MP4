
> codeclinic@0.1.0 test
> react-scripts test --roots test --testMatch "**/test/**/*.test.*" --watchAll=false --runInBand --runTestsByPath test/student-ticket-activity.emulator.test.js

PASS test/student-ticket-activity.emulator.test.js (18.562 s)
  √ student ticket activity query, ownership, paging, writes, and close race work in Firestore emulator (15112 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        18.815 s
Ran all test suites within paths "test/student-ticket-activity.emulator.test.js".

> codeclinic@0.1.0 test
> react-scripts test --roots test --testMatch "**/test/**/*.test.*" --watchAll=false --runInBand

(node:21852) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
FAIL test/ta-tickets.indexes.test.js
  ● ta-ticket-queue Firestore indexes › file has only COLLECTION-scoped composite indexes on tickets and no overrides

    expect(received).toHaveLength(expected)

    Expected length: 4
    Received length: 6
    Received array:  [{"collectionGroup": "tickets", "fields": [{"fieldPath": "studentId", "order": "ASCENDING"}, {"fieldPath": "status", "order": "ASCENDING"}, {"fieldPath": "updatedAt", "order": "DESCENDING"}, {"fieldPath": "ticketId", "order": "ASCENDING"}], "queryScope": "COLLECTION"}, {"collectionGroup": "tickets", "fields": [{"fieldPath": "studentId", "order": "ASCENDING"}, {"fieldPath": "status", "order": "ASCENDING"}, {"fieldPath": "updatedAt", "order": "DESCENDING"}, {"fieldPath": "ticketId", "order": "ASCENDING"}, {"fieldPath": "status", "order": "ASCENDING"}, {"fieldPath": "createdAt", "order": "ASCENDING"}], "queryScope": "COLLECTION"}, {"collectionGroup": "replies", "fields": [{"fieldPath": "createdAt", "order": "ASCENDING"}, {"fieldPath": "replyId", "order": "ASCENDING"}], "queryScope": "COLLECTION"}, {"collectionGroup": "tickets", "fields": [{"fieldPath": "status", "order": "ASCENDING"}, {"fieldPath": "language", "order": "ASCENDING"}, {"fieldPath": "createdAt", "order": "ASCENDING"}], "queryScope": "COLLECTION"}, {"collectionGroup": "tickets", "fields": [{"fieldPath": "status", "order": "ASCENDING"}, {"arrayConfig": "CONTAINS", "fieldPath": "conceptTags"}, {"fieldPath": "createdAt", "order": "ASCENDING"}], "queryScope": "COLLECTION"}, {"collectionGroup": "tickets", "fields": [{"fieldPath": "status", "order": "ASCENDING"}, {"fieldPath": "language", "order": "ASCENDING"}, {"arrayConfig": "CONTAINS", "fieldPath": "conceptTags"}, {"fieldPath": "createdAt", "order": "ASCENDING"}], "queryScope": "COLLECTION"}]

      39 |   test('file has only COLLECTION-scoped composite indexes on tickets and no overrides', () => {
      40 |     expect(indexFile.fieldOverrides).toEqual([]);
    > 41 |     expect(indexFile.indexes).toHaveLength(4);
         |                               ^
      42 |     for (const index of indexFile.indexes) {
      43 |       expect(index.collectionGroup).toBe('tickets');
      44 |       expect(index.queryScope).toBe('COLLECTION');

      at Object.<anonymous> (test/ta-tickets.indexes.test.js:41:31)

  ● ta-ticket-queue Firestore indexes › status=undefined language=undefined concept=undefined has exactly one matching index

    expect(received).toHaveLength(expected)

    Expected length: 1
    Received length: 0
    Received array:  []

      56 |           expect(needed[needed.length - 1]).toEqual({ fieldPath: 'createdAt', order: 'ASCENDING' });
      57 |           const matches = indexFile.indexes.filter((i) => JSON.stringify(i.fields) === JSON.stringify(needed));
    > 58 |           expect(matches).toHaveLength(1);
         |                           ^
      59 |         });
      60 |       }
      61 |     }

      at Object.<anonymous> (test/ta-tickets.indexes.test.js:58:27)

  ● ta-ticket-queue Firestore indexes › status=ACTIVE language=undefined concept=undefined has exactly one matching index

    expect(received).toHaveLength(expected)

    Expected length: 1
    Received length: 0
    Received array:  []

      56 |           expect(needed[needed.length - 1]).toEqual({ fieldPath: 'createdAt', order: 'ASCENDING' });
      57 |           const matches = indexFile.indexes.filter((i) => JSON.stringify(i.fields) === JSON.stringify(needed));
    > 58 |           expect(matches).toHaveLength(1);
         |                           ^
      59 |         });
      60 |       }
      61 |     }

      at Object.<anonymous> (test/ta-tickets.indexes.test.js:58:27)

  ● ta-ticket-queue Firestore indexes › status=OPEN language=undefined concept=undefined has exactly one matching index

    expect(received).toHaveLength(expected)

    Expected length: 1
    Received length: 0
    Received array:  []

      56 |           expect(needed[needed.length - 1]).toEqual({ fieldPath: 'createdAt', order: 'ASCENDING' });
      57 |           const matches = indexFile.indexes.filter((i) => JSON.stringify(i.fields) === JSON.stringify(needed));
    > 58 |           expect(matches).toHaveLength(1);
         |                           ^
      59 |         });
      60 |       }
      61 |     }

      at Object.<anonymous> (test/ta-tickets.indexes.test.js:58:27)

  ● ta-ticket-queue Firestore indexes › status=CLAIMED language=undefined concept=undefined has exactly one matching index

    expect(received).toHaveLength(expected)

    Expected length: 1
    Received length: 0
    Received array:  []

      56 |           expect(needed[needed.length - 1]).toEqual({ fieldPath: 'createdAt', order: 'ASCENDING' });
      57 |           const matches = indexFile.indexes.filter((i) => JSON.stringify(i.fields) === JSON.stringify(needed));
    > 58 |           expect(matches).toHaveLength(1);
         |                           ^
      59 |         });
      60 |       }
      61 |     }

      at Object.<anonymous> (test/ta-tickets.indexes.test.js:58:27)

  ● ta-ticket-queue Firestore indexes › status=RESOLVED language=undefined concept=undefined has exactly one matching index

    expect(received).toHaveLength(expected)

    Expected length: 1
    Received length: 0
    Received array:  []

      56 |           expect(needed[needed.length - 1]).toEqual({ fieldPath: 'createdAt', order: 'ASCENDING' });
      57 |           const matches = indexFile.indexes.filter((i) => JSON.stringify(i.fields) === JSON.stringify(needed));
    > 58 |           expect(matches).toHaveLength(1);
         |                           ^
      59 |         });
      60 |       }
      61 |     }

      at Object.<anonymous> (test/ta-tickets.indexes.test.js:58:27)

  ● ta-ticket-queue Firestore indexes › every index is used by some query shape (no extra fields or indexes)

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 3

      Set {
    +   "[{\"fieldPath\":\"createdAt\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"replyId\",\"order\":\"ASCENDING\"}]",
        "[{\"fieldPath\":\"status\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"conceptTags\",\"arrayConfig\":\"CONTAINS\"},{\"fieldPath\":\"createdAt\",\"order\":\"ASCENDING\"}]",
    -   "[{\"fieldPath\":\"status\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"createdAt\",\"order\":\"ASCENDING\"}]",
        "[{\"fieldPath\":\"status\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"language\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"conceptTags\",\"arrayConfig\":\"CONTAINS\"},{\"fieldPath\":\"createdAt\",\"order\":\"ASCENDING\"}]",
        "[{\"fieldPath\":\"status\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"language\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"createdAt\",\"order\":\"ASCENDING\"}]",
    +   "[{\"fieldPath\":\"studentId\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"status\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"updatedAt\",\"order\":\"DESCENDING\"},{\"fieldPath\":\"ticketId\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"status\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"createdAt\",\"order\":\"ASCENDING\"}]",
    +   "[{\"fieldPath\":\"studentId\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"status\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"updatedAt\",\"order\":\"DESCENDING\"},{\"fieldPath\":\"ticketId\",\"order\":\"ASCENDING\"}]",
      }

      69 |       }
      70 |     }
    > 71 |     expect(new Set(indexFile.indexes.map((i) => JSON.stringify(i.fields)))).toEqual(used);
         |                                                                             ^
      72 |   });
      73 | });
      74 |

      at Object.<anonymous> (test/ta-tickets.indexes.test.js:71:77)

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

PASS test/StudentTickets.test.tsx (6.602 s)
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

PASS test/RegistrationPage.test.tsx
PASS test/student-tickets.api.test.js (5.667 s)
PASS test/login.session.test.js
PASS test/registration.api.test.js
PASS test/LoginPage.integration.test.tsx
PASS test/StudentTicketActivity.test.tsx
PASS test/student-ticket-activity.contract.test.js
PASS test/login.credentials.test.js
PASS test/LoginPage.test.tsx
PASS test/DashboardRoutes.integration.test.tsx
PASS test/AccountPages.test.tsx
PASS test/notifications.api.test.js
PASS test/server.test.js
PASS test/account-r7-server.test.js
PASS test/student-my-tickets.contract.test.js
PASS test/registration.endpoint.test.js
PASS test/account-server-wiring.test.js
PASS test/NotificationsRoute.test.tsx
PASS test/account-routes.test.js
PASS test/ai-usage-store.test.js
PASS test/Notifications.test.tsx
PASS test/student-tickets.storage.test.js
PASS test/account-store.test.js
PASS test/ai-config.test.js
PASS test/StudentTicketCard.test.tsx
PASS test/account-guards.test.js
PASS test/email.test.js
PASS test/ai-prompt.test.js
PASS test/ai-redact.test.js
PASS test/ai-parse.test.js
PASS test/AppHeader.test.tsx
PASS test/ai-transport.test.js
PASS test/ai-rate-limit.test.js
PASS test/ai-features.test.js
PASS test/ai-browser-boundary.test.js
PASS test/firestore-target.test.js
PASS test/RegistrationNavigation.test.tsx
PASS test/firestore-rate-counter.test.js
PASS test/bootstrap-coordinator.test.js
PASS test/ai-gateway.test.js
PASS test/ai-transport-hardening.test.js
PASS test/ta-tickets.api.test.js
PASS test/TATicketPage.test.tsx
PASS test/ta-ai-insights-route.api.test.js
PASS test/ta-ai-draft-route.api.test.js
PASS test/TATicketPage.ai.test.tsx
PASS test/TAQueuePage.test.tsx
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

PASS test/TAQueuePage.ai.test.tsx
PASS test/ta-ai-insights.test.js
PASS test/ta-ai-assist.review.test.js
PASS test/ta-ai-shared.test.js
PASS test/ta-ai-fix-note.test.js
PASS test/ta-tickets.transitions.test.js
PASS test/TAQueuePage.ai-coverage.review.test.tsx
  ● Console

    console.error
      Encountered two children with the same key, `t1`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.

      at node_modules/react-dom/cjs/react-dom-client.development.js:6967:23
      at runWithFiberInDEV (node_modules/react-dom/cjs/react-dom-client.development.js:1048:13)
      at warnOnInvalidKey (node_modules/react-dom/cjs/react-dom-client.development.js:6966:13)
      at reconcileChildrenArray (node_modules/react-dom/cjs/react-dom-client.development.js:7035:31)
      at reconcileChildFibersImpl (node_modules/react-dom/cjs/react-dom-client.development.js:7357:20)
      at node_modules/react-dom/cjs/react-dom-client.development.js:7456:33
      at reconcileChildren (node_modules/react-dom/cjs/react-dom-client.development.js:10096:13)
      at beginWork (node_modules/react-dom/cjs/react-dom-client.development.js:12468:13)
      at runWithFiberInDEV (node_modules/react-dom/cjs/react-dom-client.development.js:1048:13)
      at performUnitOfWork (node_modules/react-dom/cjs/react-dom-client.development.js:19176:22)
      at workLoopSync (node_modules/react-dom/cjs/react-dom-client.development.js:19004:41)
      at renderRootSync (node_modules/react-dom/cjs/react-dom-client.development.js:18985:11)
      at performWorkOnRoot (node_modules/react-dom/cjs/react-dom-client.development.js:18015:11)
      at performWorkOnRootViaSchedulerTask (node_modules/react-dom/cjs/react-dom-client.development.js:20665:7)
      at performWorkUntilDeadline (node_modules/scheduler/cjs/scheduler.development.js:45:48)
      at Timeout.task [as _onTimeout] (node_modules/jsdom/lib/jsdom/browser/Window.js:516:19)

PASS test/ta-ai-rounds.review.test.js
PASS test/TAQueuePage.ai-coverage.test.tsx
PASS test/ta-ai-messages.round1.test.js
PASS test/ta-ai-prompts.round1.test.js
PASS test/TAQueuePage.ai-empty.test.tsx
PASS test/ta-ai-prompts.round6.test.js
PASS test/ta-ai-prompts.round3.test.js
PASS test/ta-ai-prompts.round2.test.js
PASS test/ta-ticket-queue.review.test.tsx
PASS test/ta-ai-prompts.round5b.test.js
PASS test/ta-ai-prompts.round5.test.js
PASS test/ta-ai-prompts.round4.test.js
PASS test/ta-ai-insights.cache-prune.test.js
PASS test/ta-ai-prompts.round4b.test.js
PASS test/ta-tickets.review-fixes.test.js
PASS test/ta-ticket-queue.review.test.js
PASS test/ta-tickets.store.test.js
PASS test/notifications.notify.test.js
PASS test/firestore-store.test.js
PASS test/SharedTheme.test.tsx
PASS test/TAQueuePage.n1.test.tsx

Summary of all failing tests
FAIL test/ta-tickets.indexes.test.js
  ● ta-ticket-queue Firestore indexes › file has only COLLECTION-scoped composite indexes on tickets and no overrides

    expect(received).toHaveLength(expected)

    Expected length: 4
    Received length: 6
    Received array:  [{"collectionGroup": "tickets", "fields": [{"fieldPath": "studentId", "order": "ASCENDING"}, {"fieldPath": "status", "order": "ASCENDING"}, {"fieldPath": "updatedAt", "order": "DESCENDING"}, {"fieldPath": "ticketId", "order": "ASCENDING"}], "queryScope": "COLLECTION"}, {"collectionGroup": "tickets", "fields": [{"fieldPath": "studentId", "order": "ASCENDING"}, {"fieldPath": "status", "order": "ASCENDING"}, {"fieldPath": "updatedAt", "order": "DESCENDING"}, {"fieldPath": "ticketId", "order": "ASCENDING"}, {"fieldPath": "status", "order": "ASCENDING"}, {"fieldPath": "createdAt", "order": "ASCENDING"}], "queryScope": "COLLECTION"}, {"collectionGroup": "replies", "fields": [{"fieldPath": "createdAt", "order": "ASCENDING"}, {"fieldPath": "replyId", "order": "ASCENDING"}], "queryScope": "COLLECTION"}, {"collectionGroup": "tickets", "fields": [{"fieldPath": "status", "order": "ASCENDING"}, {"fieldPath": "language", "order": "ASCENDING"}, {"fieldPath": "createdAt", "order": "ASCENDING"}], "queryScope": "COLLECTION"}, {"collectionGroup": "tickets", "fields": [{"fieldPath": "status", "order": "ASCENDING"}, {"arrayConfig": "CONTAINS", "fieldPath": "conceptTags"}, {"fieldPath": "createdAt", "order": "ASCENDING"}], "queryScope": "COLLECTION"}, {"collectionGroup": "tickets", "fields": [{"fieldPath": "status", "order": "ASCENDING"}, {"fieldPath": "language", "order": "ASCENDING"}, {"arrayConfig": "CONTAINS", "fieldPath": "conceptTags"}, {"fieldPath": "createdAt", "order": "ASCENDING"}], "queryScope": "COLLECTION"}]

      39 |   test('file has only COLLECTION-scoped composite indexes on tickets and no overrides', () => {
      40 |     expect(indexFile.fieldOverrides).toEqual([]);
    > 41 |     expect(indexFile.indexes).toHaveLength(4);
         |                               ^
      42 |     for (const index of indexFile.indexes) {
      43 |       expect(index.collectionGroup).toBe('tickets');
      44 |       expect(index.queryScope).toBe('COLLECTION');

      at Object.<anonymous> (test/ta-tickets.indexes.test.js:41:31)

  ● ta-ticket-queue Firestore indexes › status=undefined language=undefined concept=undefined has exactly one matching index

    expect(received).toHaveLength(expected)

    Expected length: 1
    Received length: 0
    Received array:  []

      56 |           expect(needed[needed.length - 1]).toEqual({ fieldPath: 'createdAt', order: 'ASCENDING' });
      57 |           const matches = indexFile.indexes.filter((i) => JSON.stringify(i.fields) === JSON.stringify(needed));
    > 58 |           expect(matches).toHaveLength(1);
         |                           ^
      59 |         });
      60 |       }
      61 |     }

      at Object.<anonymous> (test/ta-tickets.indexes.test.js:58:27)

  ● ta-ticket-queue Firestore indexes › status=ACTIVE language=undefined concept=undefined has exactly one matching index

    expect(received).toHaveLength(expected)

    Expected length: 1
    Received length: 0
    Received array:  []

      56 |           expect(needed[needed.length - 1]).toEqual({ fieldPath: 'createdAt', order: 'ASCENDING' });
      57 |           const matches = indexFile.indexes.filter((i) => JSON.stringify(i.fields) === JSON.stringify(needed));
    > 58 |           expect(matches).toHaveLength(1);
         |                           ^
      59 |         });
      60 |       }
      61 |     }

      at Object.<anonymous> (test/ta-tickets.indexes.test.js:58:27)

  ● ta-ticket-queue Firestore indexes › status=OPEN language=undefined concept=undefined has exactly one matching index

    expect(received).toHaveLength(expected)

    Expected length: 1
    Received length: 0
    Received array:  []

      56 |           expect(needed[needed.length - 1]).toEqual({ fieldPath: 'createdAt', order: 'ASCENDING' });
      57 |           const matches = indexFile.indexes.filter((i) => JSON.stringify(i.fields) === JSON.stringify(needed));
    > 58 |           expect(matches).toHaveLength(1);
         |                           ^
      59 |         });
      60 |       }
      61 |     }

      at Object.<anonymous> (test/ta-tickets.indexes.test.js:58:27)

  ● ta-ticket-queue Firestore indexes › status=CLAIMED language=undefined concept=undefined has exactly one matching index

    expect(received).toHaveLength(expected)

    Expected length: 1
    Received length: 0
    Received array:  []

      56 |           expect(needed[needed.length - 1]).toEqual({ fieldPath: 'createdAt', order: 'ASCENDING' });
      57 |           const matches = indexFile.indexes.filter((i) => JSON.stringify(i.fields) === JSON.stringify(needed));
    > 58 |           expect(matches).toHaveLength(1);
         |                           ^
      59 |         });
      60 |       }
      61 |     }

      at Object.<anonymous> (test/ta-tickets.indexes.test.js:58:27)

  ● ta-ticket-queue Firestore indexes › status=RESOLVED language=undefined concept=undefined has exactly one matching index

    expect(received).toHaveLength(expected)

    Expected length: 1
    Received length: 0
    Received array:  []

      56 |           expect(needed[needed.length - 1]).toEqual({ fieldPath: 'createdAt', order: 'ASCENDING' });
      57 |           const matches = indexFile.indexes.filter((i) => JSON.stringify(i.fields) === JSON.stringify(needed));
    > 58 |           expect(matches).toHaveLength(1);
         |                           ^
      59 |         });
      60 |       }
      61 |     }

      at Object.<anonymous> (test/ta-tickets.indexes.test.js:58:27)

  ● ta-ticket-queue Firestore indexes › every index is used by some query shape (no extra fields or indexes)

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 3

      Set {
    +   "[{\"fieldPath\":\"createdAt\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"replyId\",\"order\":\"ASCENDING\"}]",
        "[{\"fieldPath\":\"status\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"conceptTags\",\"arrayConfig\":\"CONTAINS\"},{\"fieldPath\":\"createdAt\",\"order\":\"ASCENDING\"}]",
    -   "[{\"fieldPath\":\"status\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"createdAt\",\"order\":\"ASCENDING\"}]",
        "[{\"fieldPath\":\"status\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"language\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"conceptTags\",\"arrayConfig\":\"CONTAINS\"},{\"fieldPath\":\"createdAt\",\"order\":\"ASCENDING\"}]",
        "[{\"fieldPath\":\"status\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"language\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"createdAt\",\"order\":\"ASCENDING\"}]",
    +   "[{\"fieldPath\":\"studentId\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"status\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"updatedAt\",\"order\":\"DESCENDING\"},{\"fieldPath\":\"ticketId\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"status\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"createdAt\",\"order\":\"ASCENDING\"}]",
    +   "[{\"fieldPath\":\"studentId\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"status\",\"order\":\"ASCENDING\"},{\"fieldPath\":\"updatedAt\",\"order\":\"DESCENDING\"},{\"fieldPath\":\"ticketId\",\"order\":\"ASCENDING\"}]",
      }

      69 |       }
      70 |     }
    > 71 |     expect(new Set(indexFile.indexes.map((i) => JSON.stringify(i.fields)))).toEqual(used);
         |                                                                             ^
      72 |   });
      73 | });
      74 |

      at Object.<anonymous> (test/ta-tickets.indexes.test.js:71:77)


Test Suites: 1 failed, 6 skipped, 77 passed, 78 of 84 total
Tests:       7 failed, 10 skipped, 1440 passed, 1457 total
Snapshots:   0 total
Time:        134.95 s
Ran all test suites.

> codeclinic@0.1.0 build
> react-scripts build

(node:24252) [DEP0176] DeprecationWarning: fs.F_OK is deprecated, use fs.constants.F_OK instead
(Use `node --trace-deprecation ...` to show where the warning was created)
Creating an optimized production build...
Compiled successfully.

File sizes after gzip:

  88.81 kB (+897 B)  build\static\js\main.1644e2fd.js
  5.93 kB (+197 B)   build\static\css\main.de0232ec.css

The project was built assuming it is hosted at /.
You can control this with the homepage field in your package.json.

The build folder is ready to be deployed.
You may serve it with a static server:

  npm install -g serve
  serve -s build

Find out more about deployment here:

  https://cra.link/deployment


> codeclinic@0.1.0 test
> react-scripts test --roots test --testMatch "**/test/**/*.test.*" --watchAll=false --runInBand --runTestsByPath test/StudentMyTickets.test.tsx test/StudentTicketActivity.test.tsx test/StudentTicketCard.test.tsx test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js test/student-ticket-activity.emulator.test.js

PASS test/student-ticket-activity.emulator.test.js (11.351 s)
(node:20440) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
PASS test/StudentTicketActivity.test.tsx
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

PASS test/student-ticket-activity.contract.test.js
PASS test/student-my-tickets.contract.test.js
PASS test/StudentTicketCard.test.tsx

Test Suites: 6 passed, 6 total
Tests:       60 passed, 60 total
Snapshots:   0 total
Time:        24.809 s, estimated 31 s
Ran all test suites within paths "test/StudentMyTickets.test.tsx", "test/StudentTicketActivity.test.tsx", "test/StudentTicketCard.test.tsx", "test/student-my-tickets.contract.test.js", "test/student-ticket-activity.contract.test.js", "test/student-ticket-activity.emulator.test.js".

> codeclinic@0.1.0 test
> react-scripts test --roots test --testMatch "**/test/**/*.test.*" --watchAll=false --runInBand --runTestsByPath test/StudentMyTickets.test.tsx test/StudentTicketActivity.test.tsx test/StudentTicketCard.test.tsx test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js

(node:36044) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
PASS test/StudentTicketActivity.test.tsx (7.173 s)
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

      72 |       setLoadState('loaded');
      73 |     } catch {
    > 74 |       if (generation.current === requestGeneration) setLoadState('error');
         |                                                     ^
      75 |     }
      76 |   }, []);
      77 |

      at node_modules/react-dom/cjs/react-dom-client.development.js:20466:19
      at runWithFiberInDEV (node_modules/react-dom/cjs/react-dom-client.development.js:1048:13)
      at warnIfUpdatesNotWrappedWithActDEV (node_modules/react-dom/cjs/react-dom-client.development.js:20465:9)
      at scheduleUpdateOnFiber (node_modules/react-dom/cjs/react-dom-client.development.js:17920:11)
      at dispatchSetStateInternal (node_modules/react-dom/cjs/react-dom-client.development.js:9556:13)
      at setLoadState (node_modules/react-dom/cjs/react-dom-client.development.js:9513:7)
      at src/tickets/MyTicketsPage.tsx:74:53

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
Tests:       59 passed, 59 total
Snapshots:   0 total
Time:        18.308 s
Ran all test suites within paths "test/StudentMyTickets.test.tsx", "test/StudentTicketActivity.test.tsx", "test/StudentTicketCard.test.tsx", "test/student-my-tickets.contract.test.js", "test/student-ticket-activity.contract.test.js".

> codeclinic@0.1.0 build
> react-scripts build

(node:35584) [DEP0176] DeprecationWarning: fs.F_OK is deprecated, use fs.constants.F_OK instead
(Use `node --trace-deprecation ...` to show where the warning was created)
Creating an optimized production build...
Compiled successfully.

File sizes after gzip:

  88.83 kB (+17 B)  build\static\js\main.c97d87c8.js
  5.93 kB           build\static\css\main.de0232ec.css

The project was built assuming it is hosted at /.
You can control this with the homepage field in your package.json.

The build folder is ready to be deployed.
You may serve it with a static server:

  npm install -g serve
  serve -s build

Find out more about deployment here:

  https://cra.link/deployment


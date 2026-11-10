const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const { createFirestoreTicketStore } = require(process.cwd() + '/server/tickets/store');

(async () => {
  const app = initializeApp({ projectId: 'demo-codeclinic-t04' }, 't04-synthetic-c1');
  const db = getFirestore(app);
  const beforeTickets = await db.collection('tickets').get();
  const beforeNotifications = await db.collection('notifications').get();
  const store = createFirestoreTicketStore(db);
  const ticketId = await store.create('synthetic-student-t04', {
    title: 'Synthetic C1 verification', language: 'Other', conceptTags: ['arrays'],
    files: [], repoUrl: null, repoFilePaths: [], errorOutput: null,
    expectedBehaviour: 'Synthetic expected result', actualBehaviour: 'Synthetic actual result',
    attempted: 'Synthetic attempt',
  });
  const ticketRef = db.collection('tickets').doc(ticketId);
  const snapshot = await ticketRef.get();
  const ticket = snapshot.data();
  const expectedKeys = ['ticketId','studentId','title','language','conceptTags','files','repoUrl','repoFilePaths','errorOutput','expectedBehaviour','actualBehaviour','attempted','status','claimedByTaId','fixNote','createdAt','updatedAt','resolvedAt'].sort();
  const actualKeys = Object.keys(ticket || {}).sort();
  const exactKeys = JSON.stringify(actualKeys) === JSON.stringify(expectedKeys);
  const values = ticket && ticket.ticketId === ticketId && ticket.studentId === 'synthetic-student-t04' && ticket.status === 'OPEN' && ticket.claimedByTaId === null && ticket.fixNote === null && ticket.resolvedAt === null && ticket.repoUrl === null && ticket.repoFilePaths.length === 0 && ticket.files.length === 0 && ticket.errorOutput === null && ticket.conceptTags.length === 1 && ticket.conceptTags[0] === 'arrays';
  const timestamps = ticket && ticket.createdAt instanceof Timestamp && ticket.updatedAt instanceof Timestamp;
  const afterTickets = await db.collection('tickets').get();
  const afterNotifications = await db.collection('notifications').get();
  const createdOne = afterTickets.size === beforeTickets.size + 1;
  const noNotification = afterNotifications.size === beforeNotifications.size;
  await ticketRef.delete();
  await deleteApp(app);
  if (!exactKeys || !values || !timestamps || !createdOne || !noNotification) {
    throw new Error(JSON.stringify({ exactKeys, values, timestamps, createdOne, noNotification }));
  }
  process.stdout.write(JSON.stringify({ result: 'PASS', exactC1Keys: true, openOwnedTicket: true, timestamps: true, nullAndEmptyInitialValues: true, oneTicketWrite: true, notificationCountUnchanged: true, syntheticRecordDeleted: true }) + '\n');
})().catch((error) => { process.stderr.write(`${error.name}: ${error.message}\n`); process.exitCode = 1; });





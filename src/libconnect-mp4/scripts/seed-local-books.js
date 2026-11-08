'use strict';

const { resolveFirestoreTarget, connectFirestoreTarget } = require('../server/firestore-target');

const TITLES = [
  ['The Lantern Archive', 'Mira Chen', 2017, 'North Quay Press', 'Fiction', 'A curator follows clues hidden in a collection of old letters.'],
  ['Across the River', 'Daniel Hart', 2019, 'Willow House', 'Adventure', 'Two friends map a route through unfamiliar country.'],
  ['A Map of Small Things', 'Priya Rao', 2021, 'Harbour Books', 'Fiction', 'A collection of stories about everyday discoveries.'],
  ['The Quiet Observatory', 'Elena Park', 2015, 'Meridian Press', 'Science', 'An introduction to observing the night sky.'],
  ['Gardens After Rain', 'Jonah Lim', 2020, 'Willow House', 'Nature', 'A practical guide to caring for a small garden.'],
  ['The Clockmaker’s Notebook', 'Amara Idris', 2018, 'North Quay Press', 'Mystery', 'A notebook reveals the history of a missing clock.'],
  ['Paper Bridges', 'Noah Tan', 2022, 'Harbour Books', 'Fiction', 'A family reconnects through letters sent across generations.'],
  ['The City of Kites', 'Sofia Malik', 2016, 'Meridian Press', 'Adventure', 'A young maker prepares for an annual kite festival.'],
  ['Learning the Tides', 'Isabel Wong', 2023, 'Willow House', 'Science', 'A clear guide to coasts, currents, and tides.'],
  ['Beneath the Canopy', 'Leo Martin', 2024, 'North Quay Press', 'Nature', 'A field journal from a journey through tropical forests.'],
  ['The Glass Harbour', 'Nadia Yusuf', 2014, 'Harbour Books', 'Fiction', 'A coastal town prepares for a changing season.'],
  ['Patterns in the Sky', 'Owen Lee', 2020, 'Meridian Press', 'Science', 'An illustrated introduction to clouds and weather.'],
  ['The Last Postcard', 'Hana Rahman', 2018, 'North Quay Press', 'Mystery', 'A postcard sends two siblings on a search for its sender.'],
  ['Paths Through the Park', 'Evan Koh', 2021, 'Willow House', 'Nature', 'A guide to the plants and wildlife in city parks.'],
  ['The Blue Workshop', 'Aisha Bello', 2019, 'Harbour Books', 'Fiction', 'An apprentice discovers a new craft in an old workshop.'],
  ['A History of Bridges', 'Theo Grant', 2016, 'Meridian Press', 'History', 'Stories behind bridges that connected communities.'],
  ['The Orchard Gate', 'Mei Tan', 2022, 'North Quay Press', 'Fiction', 'A family restores a neglected orchard together.'],
  ['Notes from the Coast', 'Ravi Menon', 2017, 'Willow House', 'Nature', 'Observations from a year spent beside the sea.'],
  ['The Small Museum', 'Clara Evans', 2023, 'Harbour Books', 'Mystery', 'A volunteer uncovers the story behind an unlabelled exhibit.'],
  ['Making Space for Art', 'Iris Chen', 2015, 'Meridian Press', 'Art', 'Creative projects for shared neighbourhood spaces.'],
  ['Beyond the Footpath', 'Adam Noor', 2024, 'North Quay Press', 'Adventure', 'A walking group follows an unexpected trail.'],
  ['The Rain Collector', 'Leah Morris', 2020, 'Willow House', 'Science', 'Simple experiments explain the water cycle.'],
  ['Letters to Tomorrow', 'Zara Patel', 2021, 'Harbour Books', 'Fiction', 'A box of letters connects friends across time.'],
  ['The Mountain Index', 'Ben Chua', 2018, 'Meridian Press', 'Adventure', 'An old index points a researcher toward a hidden route.'],
  ['The Colour of Morning', 'Nina Solis', 2022, 'North Quay Press', 'Art', 'A painter learns to notice familiar places anew.'],
  ['The Compass Room', 'Farah Ali', 2016, 'Harbour Books', 'Mystery', 'A curious room contains clues to a forgotten journey.'],
  ['Seeds and Seasons', 'Oliver Ng', 2023, 'Willow House', 'Nature', 'A beginner guide to growing plants through the year.'],
  ['The Railway Journal', 'Maya Das', 2019, 'Meridian Press', 'History', 'A journal traces the people who built a railway.'],
  ['Windows on the World', 'Samuel Reed', 2017, 'North Quay Press', 'Fiction', 'Neighbours share stories from their apartment windows.'],
  ['The Open Atlas', 'Lina Park', 2024, 'Harbour Books', 'Geography', 'Maps and short essays about places near and far.'],
];

const EXTRA_TOPICS = [
  ['Rainforests', 'Nature'], ['Libraries', 'History'], ['Rivers', 'Geography'],
  ['Architecture', 'Art'], ['Music', 'Art'], ['Gardens', 'Nature'],
  ['Space', 'Science'], ['Oceans', 'Science'], ['Cities', 'Geography'],
  ['Ancient History', 'History'], ['Wildlife', 'Nature'], ['Weather', 'Science'],
  ['Maps', 'Geography'], ['Painting', 'Art'], ['Food', 'Culture'],
];
const EXTRA_FORMATS = ['A Guide to', 'Stories of', 'Exploring', 'Understanding', 'Sketches of', 'Journeys Through'];

function isbnFor(index) {
  const firstTwelve = `978000000${String(index + 1).padStart(3, '0')}`;
  const sum = Array.from(firstTwelve, Number).reduce((total, digit, position) =>
    total + digit * (position % 2 === 0 ? 1 : 3), 0);
  return `${firstTwelve}${(10 - sum % 10) % 10}`;
}

function seedDocuments() {
  // Keep the original 30 ISBNs and book data stable when extending the fixture.
  const generated = EXTRA_FORMATS.flatMap((format, formatIndex) => EXTRA_TOPICS.map(([topic, category], topicIndex) => {
    const index = formatIndex * EXTRA_TOPICS.length + topicIndex;
    return [
      `${format} ${topic}`, `Sample Author ${index + 31}`, 2000 + index % 25,
      ['North Quay Press', 'Willow House', 'Harbour Books', 'Meridian Press'][index % 4],
      category, `A synthetic collection about ${topic.toLowerCase()} for local catalog testing.`,
    ];
  }));
  const books = [...TITLES, ...generated].map(([title, author, publicationYear, publisher, category, synopsis], index) => ({
    isbn: isbnFor(index), title, author, publicationYear, publisher, category, synopsis,
  }));
  const copies = books.flatMap(({ isbn }, index) => [1, 2, 3].map((number) => {
    const copyId = `${isbn}-${String(number).padStart(2, '0')}`;
    return { copyId, isbn, shelfLocation: `A${index + 1}-${number}`, status: 'AVAILABLE' };
  }));
  return { books, copies };
}

async function seedLocalBooks(db) {
  const { books, copies } = seedDocuments();
  const entries = [
    ...books.map((book) => ({ ref: db.collection('books').doc(book.isbn), value: book, kind: 'book' })),
    ...copies.map((copy) => ({ ref: db.collection('bookCopies').doc(copy.copyId), value: copy, kind: 'copy' })),
  ];
  const snapshots = await db.getAll(...entries.map(({ ref }) => ref));
  if (snapshots.length !== entries.length) throw new Error('Local seed preflight returned an incomplete result.');
  const missing = entries.filter((_, index) => !snapshots[index].exists);
  if (missing.length > 0) {
    const batch = db.batch();
    for (const { ref, value } of missing) batch.create(ref, value);
    await batch.commit();
  }
  return {
    bookCount: books.length, copyCount: copies.length,
    booksCreated: missing.filter(({ kind }) => kind === 'book').length,
    copiesCreated: missing.filter(({ kind }) => kind === 'copy').length,
  };
}

async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || (args.length === 1 && args[0] !== '--dry-run')) {
    throw new Error('Usage: node scripts/seed-local-books.js [--dry-run]');
  }
  const { books, copies } = seedDocuments();
  if (args[0] === '--dry-run') {
    console.log(`Seed target: ${books.length} books and ${copies.length} copies in the local emulator; new copies start AVAILABLE and existing IDs are preserved.`);
    return;
  }
  const target = resolveFirestoreTarget({
    LIBCONNECT_FIRESTORE_MODE: 'local-emulator',
    LIBCONNECT_FIRESTORE_PROJECT_ID: 'libconnect-mp4',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  });
  const db = await connectFirestoreTarget(target);
  try {
    const result = await seedLocalBooks(db);
    console.log(`Seeded ${result.bookCount} books and ${result.copyCount} copies in the local emulator; created ${result.booksCreated} books and ${result.copiesCreated} copies, preserving existing IDs.`);
  } finally {
    await db.terminate();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Local seed failed: ${error.code === 6 || error.code === 'already-exists'
      ? 'A target document appeared during seeding; no documents were changed.'
      : error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { isbnFor, seedDocuments, seedLocalBooks, main };

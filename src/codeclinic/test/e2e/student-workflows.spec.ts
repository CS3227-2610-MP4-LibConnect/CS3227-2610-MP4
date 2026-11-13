import { randomBytes } from 'node:crypto';
import { expect, test, type Browser, type Page } from '@playwright/test';

type Student = { name: string; email: string; password: string };
type Ticket = { title: string; expected: string; actual: string; attempted: string; reply: string };

test.beforeAll(({}, testInfo) => {
  const env = process.env;
  const baseURL = testInfo.project.use.baseURL;
  const localURL = baseURL ? new URL(baseURL) : null;
  if (env.CODECLINIC_FIRESTORE_MODE !== 'local-emulator' ||
      env.CODECLINIC_FIRESTORE_PROJECT_ID !== 'demo-codeclinic' ||
      env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' ||
      (env.GOOGLE_CLOUD_PROJECT && env.GOOGLE_CLOUD_PROJECT !== 'demo-codeclinic') ||
      !localURL || localURL.protocol !== 'http:' || localURL.hostname !== '127.0.0.1') {
    throw new Error('Student E2E tests require the local CodeClinic app and demo-codeclinic Firestore emulator.');
  }
});

function uniqueSuffix(): string {
  return randomBytes(10).toString('hex');
}

function newStudent(): Student {
  const suffix = uniqueSuffix();
  return {
    name: `E2E Student ${suffix}`,
    email: `e2e-student-${suffix}@example.test`,
    password: randomBytes(32).toString('base64url'),
  };
}

function newTicket(): Ticket {
  const suffix = uniqueSuffix();
  return {
    title: `E2E ticket ${suffix}`,
    expected: `Expected result ${suffix}`,
    actual: `Actual result ${suffix}`,
    attempted: `Attempted fix ${suffix}`,
    reply: `Student follow-up ${suffix}`,
  };
}

async function registerAndSignIn(page: Page, student: Student): Promise<void> {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible();
  await page.getByRole('radio', { name: 'Student' }).check();
  await page.getByRole('textbox', { name: 'Name' }).fill(student.name);
  await page.getByRole('textbox', { name: 'Email address' }).fill(student.email);
  await page.getByLabel('Password', { exact: true }).fill(student.password);
  await page.getByLabel('Confirm password').fill(student.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('status')).toContainText('Student registration complete.');

  await page.getByRole('link', { name: 'Go to login now' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByRole('radio', { name: 'Student' }).check();
  await page.getByRole('textbox', { name: 'Email address' }).fill(student.email);
  await page.getByLabel('Password', { exact: true }).fill(student.password);
  await page.getByRole('button', { name: /Sign in/ }).click();
  await expect(page.getByRole('heading', { name: 'Student Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'My Tickets' })).toBeVisible();
}

async function createTicket(page: Page, ticket: Ticket): Promise<void> {
  await page.getByRole('link', { name: 'Create Ticket' }).first().click();
  await expect(page.getByRole('heading', { name: 'Create Ticket' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Title' }).fill(ticket.title);
  await page.getByRole('combobox', { name: 'Language' }).selectOption('Python');
  await page.getByRole('textbox', { name: 'Expected behaviour' }).fill(ticket.expected);
  await page.getByRole('textbox', { name: 'Actual behaviour' }).fill(ticket.actual);
  await page.getByRole('textbox', { name: 'Attempted' }).fill(ticket.attempted);
  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ticket created successfully.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Student Dashboard' })).toBeVisible();
}

async function openTicketFromMyTickets(page: Page, title: string): Promise<string> {
  await page.getByRole('link', { name: 'My Tickets' }).click();
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const openList = page.getByRole('list', { name: 'open tickets' });
  const ticketLink = openList.getByRole('link', { name: new RegExp(title) });
  await expect(ticketLink).toBeVisible();
  await ticketLink.click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  const path = new URL(page.url()).pathname;
  expect(path).toMatch(/^\/student\/tickets\/[^/]+$/);
  return path;
}

async function postReply(page: Page, reply: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Reply' }).fill(reply);
  await page.getByRole('button', { name: 'Send reply' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: reply })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Reply sent.' })).toBeVisible();
}

test('Student can register, create and close a ticket, then sign out', async ({ page }) => {
  const student = newStudent();
  const ticket = newTicket();
  await registerAndSignIn(page, student);
  await createTicket(page, ticket);
  const detailPath = await openTicketFromMyTickets(page, ticket.title);
  await expect(page.getByRole('region', { name: 'Ticket description' })).toContainText(ticket.expected);
  await expect(page.getByRole('region', { name: 'Ticket description' })).toContainText(ticket.actual);
  await postReply(page, ticket.reply);

  await page.getByRole('button', { name: 'Close Ticket' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ticket closed without a resolution.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ticket closed' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Add a reply' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: ticket.title })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: ticket.reply })).toBeVisible();

  await page.getByRole('link', { name: 'My Tickets' }).click();
  await page.getByRole('button', { name: 'Closed', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Closed', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('list', { name: 'closed tickets' }).getByRole('link', { name: new RegExp(ticket.title) })).toBeVisible();
  await page.goto(detailPath);
  await expect(page.getByRole('heading', { name: ticket.title })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Add a reply' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.goto(detailPath);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByRole('heading', { name: ticket.title })).toHaveCount(0);
});

test('another Student cannot list or directly open the owner’s ticket', async ({ browser, page }, testInfo) => {
  const owner = newStudent();
  const other = newStudent();
  const ticket = newTicket();
  await registerAndSignIn(page, owner);
  await createTicket(page, ticket);
  const detailPath = await openTicketFromMyTickets(page, ticket.title);
  await postReply(page, ticket.reply);

  const baseURL = testInfo.project.use.baseURL;
  if (!baseURL) throw new Error('The local Playwright baseURL is required.');
  const otherContext = await browser.newContext({ baseURL });
  try {
    const otherPage = await otherContext.newPage();
    await registerAndSignIn(otherPage, other);
    await otherPage.getByRole('link', { name: 'My Tickets' }).click();
    await expect(otherPage.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
    await expect(otherPage.getByRole('status').filter({ hasText: 'No open tickets yet.' })).toBeVisible();
    await expect(otherPage.getByText(ticket.title)).toHaveCount(0);

    await otherPage.goto(detailPath);
    await expect(otherPage.getByRole('alert').filter({ hasText: 'We couldn’t load this ticket.' })).toBeVisible();
    await expect(otherPage.getByText(ticket.title)).toHaveCount(0);
    await expect(otherPage.getByText(ticket.expected)).toHaveCount(0);
    await expect(otherPage.getByText(ticket.actual)).toHaveCount(0);
    await expect(otherPage.getByText(ticket.attempted)).toHaveCount(0);
    await expect(otherPage.getByText(ticket.reply)).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { name: ticket.title })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Ticket description' })).toContainText(ticket.expected);
    await expect(page.getByRole('region', { name: 'Ticket description' })).toContainText(ticket.actual);
    await expect(page.getByRole('region', { name: 'Ticket description' })).toContainText(ticket.attempted);
    await expect(page.getByRole('listitem').filter({ hasText: ticket.reply })).toBeVisible();
  } finally {
    await otherContext.close();
  }
});

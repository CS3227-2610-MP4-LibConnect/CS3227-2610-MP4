import React from 'react';
import { render, screen } from '@testing-library/react';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { MemberDashboard } from '../src/MemberDashboard';
import { LibrarianDashboard } from '../src/LibrarianDashboard';

const sourcePath = (name: string) => resolve(__dirname, '../src', name);
const readSource = (name: string) => readFileSync(sourcePath(name), 'utf8');
const readOptionalSource = (name: string) => existsSync(sourcePath(name)) ? readSource(name) : '';

describe('shared dashboard theme', () => {
  test('both role views retain semantic headings, main content, and the shared logout control', () => {
    const onLogoutConfirmed = jest.fn();

    const { rerender } = render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /member dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeVisible();

    rerender(<LibrarianDashboard onLogoutConfirmed={onLogoutConfirmed} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /librarian dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeVisible();
  });

  test('the application entry imports the common theme once and login and dashboards consume its tokens', () => {
    const entry = readSource('index.tsx');
    const loginStyles = readSource('LoginPage.css');
    const theme = readSource('theme.css');
    const dashboardPageStyles = readOptionalSource('DashboardViews.css');
    const dashboardStyles = `${theme}\n${dashboardPageStyles}`;
    const memberMarkup = readSource('MemberDashboard.tsx');
    const librarianMarkup = readSource('LibrarianDashboard.tsx');
    const dashboardMarkup = `${memberMarkup}\n${librarianMarkup}`;

    expect(entry.match(/['"]\.\/theme\.css['"]/g)).toHaveLength(1);

    const declaredTokens = [...theme.matchAll(/--([\w-]+)\s*:/g)].map((match) => `--${match[1]}`);
    expect(declaredTokens.length).toBeGreaterThan(0);
    expect(declaredTokens.some((token) => loginStyles.includes(`var(${token}`))).toBe(true);
    expect(loginStyles).toMatch(/var\(--lc-space-/);

    const dashboardClasses = [...dashboardMarkup.matchAll(/className=["']([^"']+)["']/g)]
      .flatMap((match) => match[1].split(/\s+/));
    expect(dashboardClasses.length).toBeGreaterThan(0);
    expect(declaredTokens.some((token) => dashboardStyles.includes(`var(${token}`))).toBe(true);
    expect(dashboardStyles).toMatch(/var\(--lc-space-/);
    expect(dashboardClasses.some((className) => dashboardStyles.includes(`.${className}`))).toBe(true);
    expect(theme).toMatch(/\.login-card\s*,\s*\.dashboard-panel/);
    expect(dashboardMarkup).toMatch(/className="dashboard-panel"/);
  });

  test('the route guard imports each role view from its dedicated shared-style module', () => {
    const routeGuard = readSource('DashboardRouteGuard.tsx');
    const appEntry = readSource('index.tsx');
    const memberMarkup = readSource('MemberDashboard.tsx');
    const librarianMarkup = readSource('LibrarianDashboard.tsx');

    expect(routeGuard).toMatch(/from ['"]\.\/MemberDashboard['"]/);
    expect(routeGuard).toMatch(/from ['"]\.\/LibrarianDashboard['"]/);
    for (const moduleSource of [memberMarkup, librarianMarkup]) {
      expect(moduleSource).toMatch(/from ['"]\.\/DashboardLogout['"]/);
    }
    expect(`${memberMarkup}\n${librarianMarkup}\n${routeGuard}\n${appEntry}`)
      .toMatch(/['"]\.\/DashboardViews\.css['"]/);
  });

  test('shared styles provide keyboard focus and adapt dashboard layout at 320 CSS pixels', () => {
    const theme = readSource('theme.css');
    const dashboardStyles = readOptionalSource('DashboardViews.css');

    expect(theme).toMatch(/\.dashboard-page\s*\+\s*button:focus-visible/);
    expect(dashboardStyles).toMatch(/@media\s*\(max-width:\s*360px\)/);
    expect(dashboardStyles).toMatch(/overflow-wrap:\s*anywhere/);
  });
});

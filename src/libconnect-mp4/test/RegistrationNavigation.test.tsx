import React from 'react';
import { act, render, screen } from '@testing-library/react';
import LoginPage from '../src/LoginPage';
import RegistrationPage from '../src/RegistrationPage';

test('Register is a keyboard-accessible link to the registration path', () => {
  render(<LoginPage />);
  const registerLink = screen.getByRole('link', { name: 'Register' });
  expect(registerLink).toHaveAttribute('href', '/register');
  registerLink.focus();
  expect(registerLink).toHaveFocus();
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
});

test('registration page has an accessible route back to login', () => {
  render(<RegistrationPage />);
  expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
  const loginLink = screen.getByRole('link', { name: 'Back to login' });
  expect(loginLink).toHaveAttribute('href', '/');
  loginLink.focus();
  expect(loginLink).toHaveFocus();
});

test('direct navigation to /register selects the registration page at the React root', async () => {
  window.history.replaceState({}, '', '/register');
  const rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
  try {
    await act(async () => { require('../src/index'); });
    expect(await screen.findByRole('heading', { name: 'Register' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', '/');
  } finally {
    window.history.replaceState({}, '', '/');
    rootElement.remove();
  }
});

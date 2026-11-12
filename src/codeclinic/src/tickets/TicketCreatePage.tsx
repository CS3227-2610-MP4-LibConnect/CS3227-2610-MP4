import React, { FormEvent, useRef, useState } from 'react';
import './TicketCreatePage.css';
import StudentHelpChat from './StudentHelpChat';

type TicketFile = { filename: string; content: string; size: number };
type Errors = Record<string, string>;
const languages = ['Python', 'Java', 'JavaScript', 'TypeScript', 'C', 'C++', 'Other'];
const characterLength = (value: string) => Array.from(value).length;
const hasControlCharacters = (value: string) => Array.from(value).some((character) => {
  const code = character.charCodeAt(0);
  return code < 32 || code === 127;
});

function moveTo(path: string, state: Record<string, unknown> = {}) {
  window.history.pushState(state, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function TicketCreatePage() {
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('');
  const [expectedBehaviour, setExpectedBehaviour] = useState('');
  const [actualBehaviour, setActualBehaviour] = useState('');
  const [attempted, setAttempted] = useState('');
  const [errorOutput, setErrorOutput] = useState('');
  const [tags, setTags] = useState('');
  const [files, setFiles] = useState<TicketFile[]>([]);
  const [readingFiles, setReadingFiles] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoPaths, setRepoPaths] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const errorOutputRef = useRef<HTMLTextAreaElement>(null);
  const languageRef = useRef<HTMLSelectElement>(null);
  const expectedRef = useRef<HTMLTextAreaElement>(null);
  const actualRef = useRef<HTMLTextAreaElement>(null);
  const attemptedRef = useRef<HTMLTextAreaElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLInputElement>(null);
  const codePickerRef = useRef<HTMLInputElement>(null);
  const readingFilesRef = useRef(false);

  const validate = () => {
    const next: Errors = {};
    const required: [string, string][] = [
      ['title', title], ['expectedBehaviour', expectedBehaviour],
      ['actualBehaviour', actualBehaviour], ['attempted', attempted],
    ];
    for (const [key, value] of required) if (!value.trim()) next[key] = 'Enter a value for this field.';
    if (title.trim() && characterLength(title.trim()) > 255) next.title = 'Use no more than 255 characters.';
    for (const [key, value] of required.slice(1)) if (characterLength(value.trim()) > 5000) next[key] = 'Use no more than 5,000 characters.';
    if (characterLength(errorOutput.trim()) > 5000) next.errorOutput = 'Use no more than 5,000 characters.';
    if (!language) next.language = 'Select a language.';
    if (language && !languages.includes(language)) next.language = 'Select a language from the list.';
    const normalizedTags = tags.trim() ? tags.split(',').map((tag) => tag.trim().toLowerCase()) : [];
    if (normalizedTags.length > 5 || normalizedTags.some((tag) => !tag || characterLength(tag) > 30) || new Set(normalizedTags).size !== normalizedTags.length) {
      next.conceptTags = 'Use up to five unique tags, each 1–30 characters.';
    }
    if (files.length && repoUrl.trim()) next.source = 'Choose files or a repository reference, not both.';
    if (files.length > 3) next.source = 'Attach up to three files.';
    for (const file of files) {
      if (!file.filename.trim() || characterLength(file.filename) > 120 || /[\\/]/.test(file.filename) || hasControlCharacters(file.filename) || ['.', '..'].includes(file.filename.trim())) next.source = 'Each filename must be a basename of at most 120 characters.';
      if (new Blob([file.content]).size > 24576) next.source = 'Each file must be at most 24 KiB.';
    }
    if (repoUrl.trim()) {
      try {
        const parsed = new URL(repoUrl.trim());
        const paths = repoPaths.split('\n').filter((item) => item.trim().length > 0);
        const authority = /^https:\/\/([^/]+)/i.exec(repoUrl.trim());
        const segments = parsed.pathname.split('/').filter(Boolean);
        if (characterLength(repoUrl.trim()) > 255 || hasControlCharacters(repoUrl) || parsed.protocol !== 'https:' || parsed.hostname !== 'github.com' || parsed.username || parsed.password || !authority || authority[1].includes('@') || repoUrl.includes('?') || repoUrl.includes('#') || parsed.search || parsed.hash || segments.length !== 2 || segments.some((part) => part === '.' || part === '..') ||
          paths.length < 1 || paths.length > 10 || paths.reduce((sum, item) => sum + characterLength(item), 0) > 5000 ||
          paths.some((item) => item.startsWith('/') || item.startsWith('\\') || /^[A-Za-z]:/.test(item) || hasControlCharacters(item) || item.split(/[\\/]/).some((part) => part === '.' || part === '..'))) {
          next.source = 'Enter a public GitHub URL and 1–10 safe relative file paths.';
        }
      } catch { next.source = 'Enter a valid public GitHub URL and relevant file paths.'; }
    } else if (repoPaths.trim()) next.source = 'Add a GitHub repository URL for these paths.';
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first === 'title') titleRef.current?.focus();
    else if (first === 'language') languageRef.current?.focus();
    else if (first === 'expectedBehaviour') expectedRef.current?.focus();
    else if (first === 'actualBehaviour') actualRef.current?.focus();
    else if (first === 'attempted') attemptedRef.current?.focus();
    else if (first === 'conceptTags') tagsRef.current?.focus();
    else if (first === 'errorOutput') errorOutputRef.current?.focus();
    else if (first === 'source') (files.length ? codePickerRef.current : sourceRef.current)?.focus();
    return { next, normalizedTags };
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || readingFilesRef.current) return;
    setMessage('');
    const { next, normalizedTags } = validate();
    if (Object.keys(next).length) return;
    setPending(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(), language, expectedBehaviour: expectedBehaviour.trim(),
        actualBehaviour: actualBehaviour.trim(), attempted: attempted.trim(),
        conceptTags: normalizedTags,
      };
      if (errorOutput.trim()) payload.errorOutput = errorOutput.trim();
      if (files.length) payload.files = files.map((file) => ({ filename: file.filename, content: file.content }));
      if (repoUrl.trim()) {
        payload.repoUrl = repoUrl.trim();
        payload.repoFilePaths = repoPaths.split('\n').filter((item) => item.trim().length > 0);
      }
      const serializedBody = JSON.stringify(payload);
      if (new Blob([serializedBody]).size > 128 * 1024) {
        setMessage('Your ticket details are too large to submit. Remove some optional content and try again.');
        return;
      }
      const csrfResponse = await fetch('/api/auth/csrf', { method: 'GET', credentials: 'same-origin' });
      if (csrfResponse.status !== 200) throw new Error('csrf');
      const csrfBody: unknown = await csrfResponse.json();
      const csrfToken = (csrfBody as { csrfToken?: unknown } | null)?.csrfToken;
      if (typeof csrfToken !== 'string' || !csrfToken) throw new Error('csrf');
      const response = await fetch('/api/tickets', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: serializedBody,
      });
      if (response.status !== 201) throw new Error('request');
      const body: unknown = await response.json();
      const ticketId = (body as { ticketId?: unknown } | null)?.ticketId;
      if (typeof ticketId !== 'string' || !ticketId) throw new Error('response');
      moveTo('/student/dashboard', { ticketCreated: true });
    } catch {
      setMessage('We couldn’t create your ticket. Your entries are saved here; check your connection and try again.');
    } finally { setPending(false); }
  };

  const fieldError = (name: string) => errors[name] ? <p className="ticket-field-error" id={`ticket-${name}-error`} role="alert">{errors[name]}</p> : null;
  const buildHelpRequest = (question: string, history: { role: 'STUDENT' | 'BOT'; text: string }[]) => ({
    question,
    ...(history.length ? { history } : {}),
    draft: {
      title, language, expectedBehaviour, actualBehaviour, attempted, errorOutput,
      conceptTags: tags,
      files: files.map((file) => ({ filename: file.filename, content: file.content })),
      repoUrl,
      repoFilePaths: repoPaths,
    },
  });
  return <main className="ticket-create-page">
    <section className="ticket-create-card" aria-labelledby="ticket-create-title">
      <a className="ticket-back-link" href="/student/dashboard">Back to dashboard</a>
      <h1 id="ticket-create-title">Create Ticket</h1>
      <p>Share what you’re working on so we can help.</p>
      {message && <p className="ticket-form-message" role="alert">{message}</p>}
      <form onSubmit={submit} noValidate>
        <label htmlFor="ticket-title">Title</label>
        <input ref={titleRef} id="ticket-title" value={title} maxLength={510} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'ticket-title-error' : undefined} onChange={(e) => setTitle(e.target.value)} />{fieldError('title')}
        <label htmlFor="ticket-language">Language</label>
        <select ref={languageRef} id="ticket-language" value={language} aria-invalid={Boolean(errors.language)} aria-describedby={errors.language ? 'ticket-language-error' : undefined} onChange={(e) => setLanguage(e.target.value)}>
          <option value="" disabled>Select a language</option>{languages.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <small className="ticket-help">If you choose Other, name the language in your title or another ticket detail.</small>{fieldError('language')}
        <label htmlFor="ticket-expected">Expected behaviour</label>
        <textarea ref={expectedRef} id="ticket-expected" value={expectedBehaviour} maxLength={10000} aria-invalid={Boolean(errors.expectedBehaviour)} aria-describedby={errors.expectedBehaviour ? 'ticket-expectedBehaviour-error' : undefined} onChange={(e) => setExpectedBehaviour(e.target.value)} />{fieldError('expectedBehaviour')}
        <label htmlFor="ticket-actual">Actual behaviour</label>
        <textarea ref={actualRef} id="ticket-actual" value={actualBehaviour} maxLength={10000} aria-invalid={Boolean(errors.actualBehaviour)} aria-describedby={errors.actualBehaviour ? 'ticket-actualBehaviour-error' : undefined} onChange={(e) => setActualBehaviour(e.target.value)} />{fieldError('actualBehaviour')}
        <label htmlFor="ticket-attempted">Attempted</label>
        <textarea ref={attemptedRef} id="ticket-attempted" value={attempted} maxLength={10000} aria-invalid={Boolean(errors.attempted)} aria-describedby={errors.attempted ? 'ticket-attempted-error' : undefined} onChange={(e) => setAttempted(e.target.value)} />{fieldError('attempted')}
        <label htmlFor="ticket-error-output">Error output <span>(optional)</span></label>
        <textarea ref={errorOutputRef} id="ticket-error-output" value={errorOutput} maxLength={10000} aria-invalid={Boolean(errors.errorOutput)} aria-describedby={errors.errorOutput ? 'ticket-errorOutput-error' : undefined} onChange={(e) => setErrorOutput(e.target.value)} />{fieldError('errorOutput')}
        <label htmlFor="ticket-tags">Concept tags <span>(optional, comma separated)</span></label>
        <input ref={tagsRef} id="ticket-tags" value={tags} aria-invalid={Boolean(errors.conceptTags)} aria-describedby={errors.conceptTags ? 'ticket-conceptTags-error' : undefined} onChange={(e) => setTags(e.target.value)} />{fieldError('conceptTags')}
        <fieldset className="ticket-source" aria-describedby={errors.source ? 'ticket-source-error' : undefined}>
          <legend>Source context <span>(optional, choose one method)</span></legend>
          {files.map((file, index) => <div className="ticket-file" key={`${file.filename}-${index}`}>
            <span>{file.filename} <small>{file.size} bytes</small></span>
            <button type="button" className="ticket-secondary-button" aria-label={`Remove ${file.filename}`} onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>Remove</button>
          </div>)}
          <label htmlFor="ticket-code-files">Code files <span>(UTF-8 text, up to 3 files, 24 KiB each)</span></label>
          <input ref={codePickerRef} id="ticket-code-files" type="file" accept="text/*,.txt,.py,.java,.js,.jsx,.ts,.tsx,.c,.h,.cpp,.hpp,.cs,.go,.rs,.rb,.php,.html,.css,.json,.xml,.md,.sql" multiple aria-invalid={Boolean(errors.source)} aria-describedby={errors.source ? 'ticket-source-error' : undefined} disabled={readingFiles} onChange={async (event) => {
            if (readingFilesRef.current) return;
            const picker = event.currentTarget;
            const selected = Array.from(picker.files ?? []);
            picker.value = '';
            if (!selected.length) return;
            const validBasename = (name: string) => name.trim().length > 0 && characterLength(name) <= 120 && name !== '.' && name !== '..' && !/[\\/]/.test(name) && !hasControlCharacters(name);
            const problem = selected.length + files.length > 3
              ? 'Attach up to three files.'
              : selected.some((file) => !validBasename(file.name))
                ? 'Each filename must be a valid basename of at most 120 characters.'
                : selected.some((file) => file.size > 24576)
                  ? 'Each file must be at most 24 KiB.'
                  : '';
            if (problem) { setErrors((current) => ({ ...current, source: problem })); return; }
            setErrors((current) => ({ ...current, source: '' }));
            readingFilesRef.current = true;
            setReadingFiles(true);
            try {
              const results = await Promise.all(selected.map((file) => new Promise<TicketFile | null>((resolve) => {
                const reader = new FileReader();
                reader.onerror = () => resolve(null);
                reader.onload = () => {
                  try {
                    if (!(reader.result instanceof ArrayBuffer)) { resolve(null); return; }
                    const bytes = new Uint8Array(reader.result);
                    const encoded = Array.from(bytes, (byte) => `%${byte.toString(16).padStart(2, '0')}`).join('');
                    const content = decodeURIComponent(encoded);
                    resolve({ filename: file.name, content, size: file.size });
                  } catch { resolve(null); }
                };
                reader.readAsArrayBuffer(file);
              })));
              if (results.some((file) => file === null)) throw new Error('read');
              const accepted = results as TicketFile[];
              setFiles((current) => [...current, ...accepted]);
            } catch {
              setErrors((current) => ({ ...current, source: 'Files must be readable UTF-8 text. No files from this selection were added.' }));
            } finally {
              readingFilesRef.current = false;
              setReadingFiles(false);
            }
          }} />
          {readingFiles && <p role="status" aria-live="polite">Reading selected files…</p>}
          <label htmlFor="ticket-repo-url">Public GitHub URL</label><input ref={sourceRef} id="ticket-repo-url" type="url" maxLength={510} value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
          <label htmlFor="ticket-repo-paths">Relevant file paths <span>(one per line)</span></label><textarea id="ticket-repo-paths" value={repoPaths} onChange={(e) => setRepoPaths(e.target.value)} />
          {errors.source && <p className="ticket-field-error" id="ticket-source-error" role="alert">{errors.source}</p>}
        </fieldset>
        <button className="submit-button ticket-submit" type="submit" disabled={pending || readingFiles}>{pending ? 'Submitting…' : 'Submit Ticket'}</button>
        {pending && <p role="status" aria-live="polite">Submitting your ticket…</p>}
      </form>
    </section>
    <StudentHelpChat endpoint="/api/tickets/help-chat" introduction="What help do you need?" buildRequestBody={buildHelpRequest} canSend={() => !readingFilesRef.current} />
  </main>;
}

'use client';

import { FormEvent, useState } from 'react';

type Status = 'idle' | 'sending' | 'ok' | 'error' | 'limited';

/** Secondary footer suggestion box — must not compete with the green CTA. */
/** Round 13: the form's words in English for /en (Hebrew is today's text). */
const FB = {
  he: { thanks: 'תודה, ההצעה נרשמה', title: 'מה חסר לכם במערכת?', idea: 'רעיון, שיפור, או משהו שחסר בדוח', mail: 'מייל לחזרה (אופציונלי)', sending: 'שולח…', send: 'שלח הצעה', fail: 'לא הצלחנו לשלוח. בדקו את הטקסט ונסו שוב.', many: 'נשלחו יותר מדי הצעות. נסו שוב מאוחר יותר.' },
  en: { thanks: 'Thank you, your suggestion was received', title: 'What is missing for you?', idea: 'An idea, an improvement, or something missing from the report', mail: 'Email for a reply (optional)', sending: 'Sending…', send: 'Send suggestion', fail: 'We could not send it. Check the text and try again.', many: 'Too many suggestions were sent. Try again later.' },
} as const;

export function FooterFeedback({ lang = 'he' }: { lang?: string } = {}) {
  const T = lang === 'he' ? FB.he : FB.en;
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending' || status === 'ok') return;

    const trimmed = message.trim();
    if (trimmed.length < 5 || trimmed.length > 1000) {
      setStatus('error');
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          email: email.trim() || undefined,
        }),
      });
      if (res.status === 429) {
        setStatus('limited');
        return;
      }
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const data: { ok?: boolean } = await res.json().catch(() => ({}));
      if (data.ok === true) {
        setStatus('ok');
        setMessage('');
        setEmail('');
        return;
      }
      setStatus('error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'ok') {
    return (
      <p className="foot-feedback-thanks" role="status">
        {T.thanks}
      </p>
    );
  }

  return (
    <form
      className="foot-feedback border border-slate-700/50 bg-transparent"
      onSubmit={onSubmit}
      noValidate
    >
      <label className="foot-feedback-title" htmlFor="foot-feedback-message">
        {T.title}
      </label>
      <textarea
        id="foot-feedback-message"
        name="message"
        rows={3}
        maxLength={1000}
        required
        minLength={5}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          if (status === 'error' || status === 'limited') setStatus('idle');
        }}
        placeholder={T.idea}
        disabled={status === 'sending'}
      />
      <input
        id="foot-feedback-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={T.mail}
        disabled={status === 'sending'}
      />
      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? T.sending : T.send}
      </button>
      {status === 'error' ? (
        <p className="foot-feedback-err" role="alert">
          {T.fail}
        </p>
      ) : null}
      {status === 'limited' ? (
        <p className="foot-feedback-err" role="alert">
          {T.many}
        </p>
      ) : null}
    </form>
  );
}

'use client';

import { FormEvent, useState } from 'react';

type Status = 'idle' | 'sending' | 'ok' | 'error' | 'limited';

/** Secondary footer suggestion box — must not compete with the green CTA. */
export function FooterFeedback() {
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
        תודה, ההצעה נרשמה
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
        מה חסר לכם במערכת?
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
        placeholder="רעיון, שיפור, או משהו שחסר בדוח"
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
        placeholder="מייל לחזרה (אופציונלי)"
        disabled={status === 'sending'}
      />
      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'שולח…' : 'שלח הצעה'}
      </button>
      {status === 'error' ? (
        <p className="foot-feedback-err" role="alert">
          לא הצלחנו לשלוח. בדקו את הטקסט ונסו שוב.
        </p>
      ) : null}
      {status === 'limited' ? (
        <p className="foot-feedback-err" role="alert">
          נשלחו יותר מדי הצעות. נסו שוב מאוחר יותר.
        </p>
      ) : null}
    </form>
  );
}

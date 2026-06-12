'use client';

interface QualityGaugeProps {
  score: number;
  grade: string;
  locale?: 'he' | 'en';
  className?: string;
}

export function QualityGauge({
  score,
  grade,
  locale = 'he',
  className,
}: QualityGaugeProps) {
  const isHe = locale === 'he';
  const clamped = Math.max(0, Math.min(100, score));
  const angle = (clamped / 100) * 180;

  const arcPath = (start: number, end: number, r: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = 100 + r * Math.cos(toRad(180 - start));
    const y1 = 100 - r * Math.sin(toRad(180 - start));
    const x2 = 100 + r * Math.cos(toRad(180 - end));
    const y2 = 100 - r * Math.sin(toRad(180 - end));
    const large = end - start > 90 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <div className={`rr-quality-gauge ${className ?? ''}`}>
      <svg viewBox="0 0 200 120" className="rr-quality-gauge__svg" role="img">
        <title>
          {isHe ? `ציון איכות ${score} — דרגה ${grade}` : `Quality score ${score} — grade ${grade}`}
        </title>
        <path
          d={arcPath(0, 180, 78)}
          fill="none"
          stroke="rgba(0,194,184,0.15)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={arcPath(0, angle, 78)}
          fill="none"
          stroke="url(#rrGaugeGrad)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="rrGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#163530" />
            <stop offset="50%" stopColor="#00C2B8" />
            <stop offset="100%" stopColor="#9EEEE6" />
          </linearGradient>
        </defs>
        <text x="100" y="88" textAnchor="middle" className="rr-quality-gauge__score">
          {Math.round(clamped)}
        </text>
        <text x="100" y="108" textAnchor="middle" className="rr-quality-gauge__grade">
          {grade}
        </text>
      </svg>
      <p className="rr-quality-gauge__caption">
        {isHe
          ? 'ציון איכות הנתונים והתחזית — משפיע על פרמיית הסיכון'
          : 'Data & forecast quality score — informs risk premium'}
      </p>
    </div>
  );
}

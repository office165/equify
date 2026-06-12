import React from 'react';
import { Text, type Styles } from '@react-pdf/renderer';

export function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(' ')}…`;
}

export function PdfBoldNumbers({
  text,
  style,
}: {
  text: string;
  style: Styles[string] | Styles[string][];
}) {
  const parts = text.split(/(\d+[\d,.]*%?)/g);
  return (
    <Text style={style}>
      {parts.map((part, index) =>
        /^\d/.test(part) ? (
          <Text key={`${part}-${index}`} style={{ fontWeight: 700 }}>
            {part}
          </Text>
        ) : (
          <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
        ),
      )}
    </Text>
  );
}

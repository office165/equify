export interface LegalSection {
  heading: string;
  /** Paragraphs under this heading */
  paragraphs: string[];
  /** Optional bullet list */
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
}

export interface UseCaseQuote {
  quote: string;
  name: string;
  title: string;
  stats?: string[];
}

export interface UseCaseFeature {
  h3Line1: string;
  h3Line2: string;
  intro: string;
  bullets: string[];
  kicker: string;
  ctaLink?: { label: string; href: string };
}

export interface UseCaseData {
  slug: string;
  meta: {
    title: string;
    description: string;
  };
  hero: {
    h1Line1: string;
    h1Line2: string;
    bodyLines: string[];
    primaryCta: string;
    secondaryCta: string;
  };
  problem: {
    headline: string;
    paragraphs: string[];
    painTiles: string[];
  };
  socialProof: {
    quotes: UseCaseQuote[];
  };
  solution: {
    headline: string;
    deckSentence: string;
    features: UseCaseFeature[];
  };
  integrations: {
    headline: string;
    body: string;
  };
  closingCta: {
    headline: string;
    bodyLines: string[];
    primaryCta: string;
    secondaryCta: string;
    endorsement?: { quote: string; attribution: string };
  };
}

// Corporate-fraud cases exposed by short sellers and investigative reporters.
// Text is written from Market Scan's checked pages (mscan exposes). Each case links one source only:
// the investigator's own report. When that report is no longer available, `source` is omitted.

export type CaseSource = { label: string; url: string };

export type FraudCase = {
  slug: string;
  date: string; // ISO date of the report
  company: string;
  ticker?: string;
  investigator: string;
  status: string;
  title: string;
  points: [string, string, string];
  body: string[];
  source?: CaseSource;
};

export const cases: FraudCase[] = [
  {
    slug: "abivax-scorpion-capital",
    date: "2026-11-20",
    company: "Abivax",
    ticker: "ABVX",
    investigator: "Scorpion Capital",
    status: "Company denies",
    title: "A short seller paid for its own lab tests on Abivax's colitis pill",
    points: [
      "Scorpion Capital says obefazimod absorbs UVA light at 8.4 times the ICH photosafety threshold.",
      "Its lab work found cell toxicity at 0.38 µM, against Abivax's claim of no toxicity below 60 µM.",
      "The ADRs fell 12.4% in a day. Abivax calls the report inaccurate and keeps its FDA timeline.",
    ],
    body: [
      "Abivax is a French biotech company with one big bet: obefazimod, an oral pill for moderate to severe ulcerative colitis. The drug is in Phase 3, the last stage of trials before a company asks regulators for approval. For a company like this, the share price is mostly a forecast of one future FDA decision.",
      "On November 20, 2026, Scorpion Capital published a report on Abivax and disclosed a short position. A short seller makes money when the shares fall, so the report is both research and a trade. Scorpion called it an 11-month investigation, its longest to date.",
      "The unusual part is how the evidence was made. Most short reports are built from filings, court records and interviews. Scorpion commissioned its own laboratory studies, including fluorescence absorption and LC-MS/MS assays, and released four scientific abstracts. In effect, it ran a small piece of the safety testing itself and published the results against the company.",
      "The report makes three claims. First, that obefazimod absorbs UVA light at 8.4 times the ICH photosafety screening threshold and may be a photocarcinogen, which matters because skin cancers appeared in the Phase 3 trials. Second, that the drug is toxic to cells at far lower doses than Abivax says: in Scorpion's tests a 0.38 µM concentration already produced a 10% cytotoxicity signal, while Abivax describes the drug as non-toxic below 60 µM. Scorpion calls that threshold inflated 154-fold. Third, that former employees raised concerns about how adverse events were reported.",
      "The market answered the same day. Abivax American depositary receipts fell 12.4% on November 20, and the shares dropped more than 9% in wider trading.",
      "That evening Abivax called the report factually inaccurate and misleading. The company said it stood behind its Phase 3 ABTECT trials and still expected to file its new drug application with the FDA by the end of the year.",
      "So the dispute now has a clear referee. If the application goes in and the safety data holds up, the report becomes an expensive lab bill. If regulators start asking about light sensitivity or adverse events, a short seller will have done part of their work in advance.",
    ],
    source: {
      label: "Scorpion Capital report on Abivax (PDF)",
      url: "https://scorpionreports.s3.us-east-2.amazonaws.com/ABVX.pdf",
    },
  },
];

export function findCase(slug: string): FraudCase | undefined {
  return cases.find((item) => item.slug === slug);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

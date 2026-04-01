type QuoteResponseDraftInput = {
  fullName: string;
  serviceType: string;
  projectType: string | null;
  location: string | null;
  estimatedBudgetRange: string | null;
  preferredStartDate: Date | null;
  siteVisitRequired: boolean;
  referenceCode: string;
  projectDescription: string;
};

export type QuoteResponseDraft = {
  subject: string;
  greeting: string;
  contextLines: string[];
  closing: string;
};

export function buildQuoteResponseDraft(input: QuoteResponseDraftInput): QuoteResponseDraft {
  const preferredStart =
    input.preferredStartDate
      ? new Date(input.preferredStartDate).toLocaleDateString()
      : 'Flexible timeline';

  const contextLines = [
    `Reference: ${input.referenceCode}`,
    `Service requested: ${input.serviceType}`,
    `Project type: ${input.projectType || 'Not specified'}`,
    `Project location: ${input.location || 'Not specified'}`,
    `Budget range: ${input.estimatedBudgetRange || 'Not specified'}`,
    `Preferred start: ${preferredStart}`,
    `Site visit required: ${input.siteVisitRequired ? 'Yes' : 'No'}`,
    `Scope summary: ${input.projectDescription.slice(0, 180)}${input.projectDescription.length > 180 ? '...' : ''}`,
  ];

  return {
    subject: `Quote response | ${input.referenceCode} | Elchanan Construction`,
    greeting: `Hi ${input.fullName},`,
    contextLines,
    closing:
      'Our estimator has reviewed your request and will follow up with scope confirmation, timeline options, and the next steps for final pricing.',
  };
}

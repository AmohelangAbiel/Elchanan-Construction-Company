export type FAQItem = {
  question: string;
  answer: string;
};

export const faqs: FAQItem[] = [
  {
    question: 'How quickly can I get a quote-',
    answer: 'We typically respond to quote requests within 24 business hours after reviewing the project details and schedule.',
  },
  {
    question: 'What areas do you serve-',
    answer: 'Our primary service area is Rustenburg and the North West province. We also support neighboring regions for larger project work.',
  },
  {
    question: 'Can you handle both full builds and renovations-',
    answer: 'Yes. We manage full residential and commercial construction as well as renovation, roofing, plastering, painting and hardscape work.',
  },
  {
    question: 'Who oversees project quality-',
    answer: 'Each project is overseen by a dedicated supervisor who coordinates trades, inspections and finish quality through every stage.',
  },
  {
    question: 'How do you estimate project prices-',
    answer: 'We provide transparent estimate ranges based on the brief, then refine the quote after an on-site inspection and materials review.',
  },
  {
    question: 'Do you help with planning and permits-',
    answer: 'Yes. We support technical planning, permit preparation and professional documentation for compliant builds.',
  },
];

export type PricingTier = {
  title: string;
  range: string;
  description: string;
  items: string[];
};

export const pricingTiers: PricingTier[] = [
  {
    title: 'Essential Consultation',
    range: 'R5,000 - R12,000',
    description: 'Initial project review, site inspection, and realistic scope definition.',
    items: ['Site assessment', 'Concept planning', 'Preliminary quote'],
  },
  {
    title: 'Renovation Starter',
    range: 'From R35,000',
    description: 'Guided renovation packages for kitchens, bathrooms, and living spaces.',
    items: ['Design and material guidance', 'Construction management', 'Finish delivery'],
  },
  {
    title: 'Residential Build',
    range: 'From R180,000',
    description: 'Complete residential builds, turnkey solutions, and project supervision.',
    items: ['Full build planning', 'Structural construction', 'Interior finishing'],
  },
];

export type Solution = {
  title: string;
  highlight: string;
  features: string[];
  cta: string;
};

export const solutions: Solution[] = [
  {
    title: 'Essential Build Package',
    highlight: 'Ideal for new homes and small residential projects.',
    features: ['Full project planning', 'Quality structural work', 'Transparent materials sourcing'],
    cta: 'Request estimate',
  },
  {
    title: 'Residential Renovation Suite',
    highlight: 'Complete renovation support from concept to handover.',
    features: ['Interior remodelling', 'Roof and ceiling refresh', 'Paint and finishing'],
    cta: 'Discuss your project',
  },
  {
    title: 'Infrastructure & Civil Support',
    highlight: 'Trusted contractor support for paving, retaining and site infrastructure work.',
    features: ['Paving and hardscape', 'Site drainage planning', 'Quality compliance support'],
    cta: 'Get a quote',
  },
];

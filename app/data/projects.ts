export type Project = {
  title: string;
  category: string;
  description: string;
  image: string;
};

export const projects: Project[] = [
  {
    title: 'Rustenburg Family Residence',
    category: 'New Build',
    description: 'A modern family home with clean lines, premium materials and efficient project delivery.',
    image: '/project-1.svg',
  },
  {
    title: 'Urban Renovation',
    category: 'Renovation',
    description: 'Interior and exterior upgrades for a contemporary residential property in the North West.',
    image: '/project-2.svg',
  },
  {
    title: 'Commercial Fitout',
    category: 'Commercial',
    description: 'Functional finishing and reliable installation for a customer-facing retail environment.',
    image: '/project-3.svg',
  },
  {
    title: 'Precise Brick & Paving',
    category: 'Hardscape',
    description: 'A structural paving and brickwork project with carefully engineered surfaces and drainage.',
    image: '/project-4.svg',
  },
];

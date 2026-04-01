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
    image: '/images/construction/residential-completed-home.jpg',
  },
  {
    title: 'Urban Renovation',
    category: 'Renovation',
    description: 'Interior and exterior upgrades for a contemporary residential property in the North West.',
    image: '/images/construction/renovation-kitchen.jpg',
  },
  {
    title: 'Commercial Fitout',
    category: 'Commercial',
    description: 'Functional finishing and reliable installation for a customer-facing retail environment.',
    image: '/images/construction/commercial-interior.jpg',
  },
  {
    title: 'Precise Brick & Paving',
    category: 'Hardscape',
    description: 'A structural paving and brickwork project with carefully engineered surfaces and drainage.',
    image: '/images/construction/brickwork-site.jpg',
  },
];

export type Service = {
  title: string;
  summary: string;
  details: string[];
  icon: string;
};

export const services: Service[] = [
  {
    title: 'Residential Construction',
    summary: 'From foundations to finishes, home builds designed for durability and modern living.',
    details: ['New home construction', 'Project planning and permits', 'Quality structural work'],
    icon: 'RS',
  },
  {
    title: 'Renovations and Upgrades',
    summary: 'Refresh existing spaces with high-impact renovations that improve value and lifestyle.',
    details: ['Kitchen and bathroom remodels', 'Home extensions', 'Interior and exterior upgrades'],
    icon: 'RN',
  },
  {
    title: 'Roofing and Ceilings',
    summary: 'Trusted roof systems, leak repair, and premium ceiling installations for long-term performance.',
    details: ['Roof replacement', 'Leak repair', 'Ceiling finishes and insulation'],
    icon: 'RF',
  },
  {
    title: 'Paving and Brickwork',
    summary: 'Durable paving solutions and precision brickwork for driveways, patios, and walls.',
    details: ['Driveways and walkways', 'Boundary walls', 'Retaining walls and hardscapes'],
    icon: 'PB',
  },
  {
    title: 'Plastering and Painting',
    summary: 'Flawless finishes that create polished interiors and strong exterior protection.',
    details: ['Gypsum and cement plaster', 'Texture finishes', 'Interior and exterior painting'],
    icon: 'PP',
  },
  {
    title: 'Home Improvements',
    summary: 'Holistic home improvement packages for modern comfort, efficiency, and design.',
    details: ['Open-plan upgrades', 'Custom built-ins', 'Lighting and feature walls'],
    icon: 'HI',
  },
];

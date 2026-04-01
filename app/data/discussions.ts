export type DiscussionThread = {
  id: string;
  title: string;
  meta: string;
  comments: number;
  lastUpdated: string;
};

export const discussions: DiscussionThread[] = [
  {
    id: 'planning-tips',
    title: 'Smart budget planning for home renovations',
    meta: 'Advice on staging phased upgrades while keeping quality high.',
    comments: 12,
    lastUpdated: '2 days ago',
  },
  {
    id: 'roofing-solutions',
    title: 'Choosing the right roof system for our climate',
    meta: 'How to balance durability, cost and energy efficiency in Rustenburg.',
    comments: 8,
    lastUpdated: '5 days ago',
  },
  {
    id: 'material-selection',
    title: 'Best exterior finishes for long-term value',
    meta: 'Comparing plaster, paint and masonry for a premium look.',
    comments: 4,
    lastUpdated: '1 week ago',
  },
];

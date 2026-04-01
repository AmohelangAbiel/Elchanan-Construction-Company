export type Testimonial = {
  name: string;
  role: string;
  quote: string;
  rating: number;
};

export const testimonials: Testimonial[] = [
  {
    name: 'Nokuthula M.',
    role: 'Homeowner, Rustenburg',
    quote: 'Elchanan delivered our kitchen renovation on time and with a premium finish. The team kept communication clear from inspection to handover.',
    rating: 5,
  },
  {
    name: 'Sipho K.',
    role: 'Property Developer',
    quote: 'Their site planning and attention to construction detail helped us complete a multi-unit residential upgrade with confidence.',
    rating: 5,
  },
  {
    name: 'Leila S.',
    role: 'Business Owner',
    quote: 'Professional, reliable and responsive. We trust them for both commercial fitouts and hardscape work.',
    rating: 5,
  },
];

export type SiteVisual = {
  src: string;
  alt: string;
};

const PLACEHOLDER_VISUALS = new Set([
  '/project-1.svg',
  '/project-2.svg',
  '/project-3.svg',
  '/project-4.svg',
]);

export const brandVisualPalette = {
  primary: '#098EC7',
  secondary: '#3DBBED',
  graphite: '#666666',
  steel: '#97989A',
  midnight: '#04101C',
  cloud: '#F3F6F8',
};

export const sectionVisuals = {
  hero: {
    src: '/images/construction/hero-concrete-site.jpg',
    alt: 'Workers pouring concrete and preparing structural formwork on an active construction site.',
  },
  services: {
    src: '/images/construction/site-scaffold-team.jpg',
    alt: 'Construction team working on scaffolding against a modern building facade.',
  },
  projects: {
    src: '/images/construction/crane-commercial-site.jpg',
    alt: 'Commercial construction site with tower cranes and structural work in progress.',
  },
  about: {
    src: '/images/construction/blueprint-plans.jpg',
    alt: 'Architectural plans, scale ruler, and pen arranged on a planning desk.',
  },
  testimonials: {
    src: '/images/construction/residential-completed-home.jpg',
    alt: 'Completed residential home exterior with a clean driveway and finished landscaping.',
  },
  contact: {
    src: '/images/construction/excavator-civil-work.jpg',
    alt: 'Excavator performing trenching work on a civil construction site.',
  },
  reviews: {
    src: '/images/construction/site-scaffold-team.jpg',
    alt: 'Construction team delivering facade work from scaffolding.',
  },
  forum: {
    src: '/images/construction/blueprint-plans.jpg',
    alt: 'Construction planning sheet and drawing tools ready for project discussion.',
  },
  cta: {
    src: '/images/construction/roofing-team.jpg',
    alt: 'Roofing team coordinating work on a pitched roof.',
  },
  fallback: {
    src: '/images/construction/fallback-construction.jpg',
    alt: 'Construction worker standing within a reinforced concrete slab layout.',
  },
} satisfies Record<string, SiteVisual>;

export const serviceVisuals: Record<string, SiteVisual> = {
  'residential-construction': {
    src: '/images/construction/residential-build-shell.jpg',
    alt: 'Residential building shell under construction with scaffolding and facade work underway.',
  },
  'renovations-upgrades': {
    src: '/images/construction/renovation-kitchen.jpg',
    alt: 'Completed kitchen renovation with premium cabinetry, lighting, and timber floors.',
  },
  'paving-brickwork': {
    src: '/images/construction/brickwork-site.jpg',
    alt: 'Brickwork and masonry materials arranged on a live construction site.',
  },
};

const defaultServiceVisual = sectionVisuals.services;

const projectVisuals: Record<string, {
  cover: SiteVisual;
  gallery: SiteVisual[];
  before?: SiteVisual;
  after?: SiteVisual;
}> = {
  'rustenburg-family-residence': {
    cover: {
      src: '/images/construction/residential-completed-home.jpg',
      alt: 'Completed family residence with finished exterior, front porch, and driveway.',
    },
    gallery: [
      {
        src: '/images/construction/residential-completed-home.jpg',
        alt: 'Completed residential home exterior photographed from the front approach.',
      },
      {
        src: '/images/construction/residential-build-shell.jpg',
        alt: 'Residential structure mid-build with scaffolding around the exterior shell.',
      },
      {
        src: '/images/construction/roofing-team.jpg',
        alt: 'Roofing crew working on a pitched residential roof during installation.',
      },
    ],
    before: {
      src: '/images/construction/residential-build-shell.jpg',
      alt: 'Residential build shell before exterior completion and finishing.',
    },
    after: {
      src: '/images/construction/residential-completed-home.jpg',
      alt: 'Finished family residence after final handover and completion.',
    },
  },
  'urban-renovation': {
    cover: {
      src: '/images/construction/renovation-kitchen.jpg',
      alt: 'Renovated interior kitchen with bright finishes and improved layout.',
    },
    gallery: [
      {
        src: '/images/construction/renovation-kitchen.jpg',
        alt: 'Renovated kitchen with modern cabinets, island, and wood flooring.',
      },
      {
        src: '/images/construction/blueprint-plans.jpg',
        alt: 'Design planning documents used ahead of a renovation build.',
      },
      {
        src: '/images/construction/brickwork-site.jpg',
        alt: 'Construction materials and masonry detail supporting a renovation scope.',
      },
    ],
    before: {
      src: '/images/construction/blueprint-plans.jpg',
      alt: 'Planning stage for a renovation before finishes were installed.',
    },
    after: {
      src: '/images/construction/renovation-kitchen.jpg',
      alt: 'Completed renovation with premium interior finishes and brighter space planning.',
    },
  },
  'commercial-fitout': {
    cover: {
      src: '/images/construction/commercial-interior.jpg',
      alt: 'Modern commercial interior with glass partitions and finished office spaces.',
    },
    gallery: [
      {
        src: '/images/construction/commercial-interior.jpg',
        alt: 'Completed commercial interior fitout with modern furniture and glazed partitions.',
      },
      {
        src: '/images/construction/crane-commercial-site.jpg',
        alt: 'Commercial construction site using tower cranes during delivery.',
      },
      {
        src: '/images/construction/site-scaffold-team.jpg',
        alt: 'Facade and access works underway on a multi-storey commercial building.',
      },
    ],
    before: {
      src: '/images/construction/site-scaffold-team.jpg',
      alt: 'Commercial site works before interior fitout completion.',
    },
    after: {
      src: '/images/construction/commercial-interior.jpg',
      alt: 'Completed fitout interior after handover and furnishing.',
    },
  },
};

function isPlaceholderVisual(src?: string | null) {
  return Boolean(src && PLACEHOLDER_VISUALS.has(src));
}

export function sanitizeVisualSrc(src?: string | null) {
  if (!src) return null;
  if (isPlaceholderVisual(src)) return null;
  return src;
}

export function resolveImageSrc(src: string | null | undefined, fallback: SiteVisual) {
  return sanitizeVisualSrc(src) || fallback.src;
}

function inferServiceVisualFromTitle(title?: string | null) {
  const normalizedTitle = title?.toLowerCase() || '';
  if (normalizedTitle.includes('renovat')) return serviceVisuals['renovations-upgrades'];
  if (normalizedTitle.includes('brick') || normalizedTitle.includes('paving')) return serviceVisuals['paving-brickwork'];
  return serviceVisuals['residential-construction'] || defaultServiceVisual;
}

export function resolveServiceImage(input: {
  slug?: string | null;
  title?: string | null;
  image?: string | null;
}) {
  const fallback = (input.slug && serviceVisuals[input.slug]) || inferServiceVisualFromTitle(input.title);
  return {
    src: resolveImageSrc(input.image, fallback),
    alt: fallback.alt,
  };
}

function inferProjectVisualFromCategory(category?: string | null) {
  const normalizedCategory = category?.toLowerCase() || '';
  if (normalizedCategory.includes('renovat')) return projectVisuals['urban-renovation'];
  if (normalizedCategory.includes('commercial')) return projectVisuals['commercial-fitout'];
  return projectVisuals['rustenburg-family-residence'];
}

export function resolveProjectImageSet(input: {
  slug?: string | null;
  title?: string | null;
  category?: string | null;
  image?: string | null;
  galleryImages?: string[] | null;
  beforeImage?: string | null;
  afterImage?: string | null;
}) {
  const fallback = (input.slug && projectVisuals[input.slug]) || inferProjectVisualFromCategory(input.category);

  const galleryImages = (input.galleryImages || [])
    .map((image) => sanitizeVisualSrc(image))
    .filter((image): image is string => Boolean(image));

  const resolvedGallery = galleryImages.length
    ? galleryImages.map((image, index) => ({
        src: image,
        alt: `${input.title || 'Project visual'} image ${index + 1}`,
      }))
    : fallback.gallery;

  return {
    cover: {
      src: resolveImageSrc(input.image, fallback.cover),
      alt: fallback.cover.alt,
    },
    gallery: resolvedGallery,
    before: input.beforeImage || fallback.before?.src
      ? {
          src: sanitizeVisualSrc(input.beforeImage) || fallback.before?.src || fallback.cover.src,
          alt: fallback.before?.alt || `Before view for ${input.title || 'project'}`,
        }
      : null,
    after: input.afterImage || fallback.after?.src
      ? {
          src: sanitizeVisualSrc(input.afterImage) || fallback.after?.src || fallback.cover.src,
          alt: fallback.after?.alt || `After view for ${input.title || 'project'}`,
        }
      : null,
  };
}

export function resolveReviewImage(context?: string | null) {
  const normalizedContext = context?.toLowerCase() || '';
  if (normalizedContext.includes('renovat')) {
    return {
      src: '/images/construction/renovation-kitchen.jpg',
      alt: 'Finished renovation interior for a residential project.',
    };
  }
  if (normalizedContext.includes('commercial')) {
    return {
      src: '/images/construction/commercial-interior.jpg',
      alt: 'Completed commercial interior fitout with glazed partitions.',
    };
  }
  if (normalizedContext.includes('paving') || normalizedContext.includes('brick')) {
    return {
      src: '/images/construction/brickwork-site.jpg',
      alt: 'Brick and hardscape materials prepared on a job site.',
    };
  }
  return sectionVisuals.testimonials;
}

export function resolveForumImage(meta?: string | null) {
  const normalizedMeta = meta?.toLowerCase() || '';
  if (normalizedMeta.includes('materials') || normalizedMeta.includes('finish')) {
    return {
      src: '/images/construction/brickwork-site.jpg',
      alt: 'Construction materials and masonry details for building discussions.',
    };
  }
  if (normalizedMeta.includes('commercial')) {
    return {
      src: '/images/construction/commercial-interior.jpg',
      alt: 'Commercial interior space for project planning and fitout discussion.',
    };
  }
  return sectionVisuals.forum;
}

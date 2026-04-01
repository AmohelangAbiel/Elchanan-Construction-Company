const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@elchananconstruction.co.za';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe_Elchanan_Admin_2026!';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Elchanan Admin';
const PORTAL_EMAIL = process.env.SEED_PORTAL_EMAIL || 'client@elchananconstruction.co.za';
const PORTAL_PASSWORD = process.env.SEED_PORTAL_PASSWORD || 'ChangeMe_Elchanan_Client_2026!';
const PORTAL_NAME = process.env.SEED_PORTAL_NAME || 'Portal Client';

const STAFF_USERS = [
  {
    email: 'sales@elchananconstruction.co.za',
    name: 'Sales Coordinator',
    role: 'SALES',
  },
  {
    email: 'content@elchananconstruction.co.za',
    name: 'Content Manager',
    role: 'CONTENT_MANAGER',
  },
  {
    email: 'moderator@elchananconstruction.co.za',
    name: 'Community Moderator',
    role: 'MODERATOR',
  },
];

const serviceData = [
  {
    title: 'Residential Construction',
    slug: 'residential-construction',
    summary: 'Complete home builds designed for structural strength and modern living comfort.',
    details: ['New home construction', 'Project planning and permits', 'Quality structural work'],
    description:
      'Full residential construction packages that include design coordination, trade management, and handover support for local homeowners.',
    image: '/project-1.svg',
    seoTitle: 'Residential Construction in Rustenburg',
    seoDescription: 'Premium residential building services in Rustenburg with transparent project planning.',
    sortOrder: 1,
    published: true,
  },
  {
    title: 'Renovations and Upgrades',
    slug: 'renovations-upgrades',
    summary: 'High-impact renovation delivery for kitchens, bathrooms, and full living space upgrades.',
    details: ['Kitchen and bathroom remodels', 'Home extensions', 'Interior and exterior upgrades'],
    description:
      'Modern renovation services for kitchens, bathrooms, living spaces, and exteriors, with a focus on quality finishes and cost control.',
    image: '/project-2.svg',
    seoTitle: 'Home Renovation Services in North West',
    seoDescription: 'Professional renovation and home upgrade support from scope planning to final finish.',
    sortOrder: 2,
    published: true,
  },
  {
    title: 'Paving and Brickwork',
    slug: 'paving-brickwork',
    summary: 'Durable hardscape execution for driveways, walkways, boundary walls, and retaining structures.',
    details: ['Driveways and walkways', 'Boundary walls', 'Retaining walls and hardscapes'],
    description:
      'Trusted paving and masonry projects built for long-term performance, attractive finishes, and practical drainage.',
    image: '/project-4.svg',
    seoTitle: 'Paving and Brickwork Contractors Rustenburg',
    seoDescription: 'Precision paving, masonry, and boundary wall construction for homes and commercial sites.',
    sortOrder: 3,
    published: true,
  },
];

const projectData = [
  {
    title: 'Rustenburg Family Residence',
    slug: 'rustenburg-family-residence',
    category: 'New Build',
    summary: 'A modern family home delivered with planned sequencing and premium finishes.',
    description:
      'A full-scope residential construction project including foundation work, superstructure, roofing, and interior completion.',
    image: '/project-1.svg',
    galleryImages: ['/project-1.svg', '/project-2.svg', '/project-4.svg'],
    beforeImage: '/project-4.svg',
    afterImage: '/project-1.svg',
    beforeAfterCaption: 'Structural start phase compared with completed exterior delivery.',
    scopeNotes:
      'Included structural shell, roofing, plastering, paint finish, and driveway hardscape package.',
    location: 'Rustenburg, North West',
    seoTitle: 'Rustenburg Family Residence Project',
    seoDescription: 'Case study of a premium residential build completed by Elchanan Construction Company.',
    status: 'PUBLISHED',
    published: true,
    sortOrder: 1,
  },
  {
    title: 'Urban Renovation',
    slug: 'urban-renovation',
    category: 'Renovation',
    summary: 'Interior and exterior upgrades for an aging residence requiring modern finishes.',
    description:
      'Comprehensive renovation scope covering kitchen upgrades, bathroom restoration, plastering, painting, and external improvements.',
    image: '/project-2.svg',
    galleryImages: ['/project-2.svg', '/project-3.svg'],
    beforeImage: '/project-3.svg',
    afterImage: '/project-2.svg',
    beforeAfterCaption: 'Living area and exterior façade upgrades after renovation sequencing.',
    scopeNotes:
      'Renovation scope covered kitchen rebuild, bathroom upgrades, paint works, and ceiling correction.',
    location: 'Rustenburg, North West',
    seoTitle: 'Urban Home Renovation Project',
    seoDescription: 'A full renovation delivery with strong timeline discipline and quality control.',
    status: 'PUBLISHED',
    published: true,
    sortOrder: 2,
  },
  {
    title: 'Commercial Fitout',
    slug: 'commercial-fitout',
    category: 'Commercial Fitout',
    summary: 'Customer-facing fitout delivered for a functional and durable business environment.',
    description:
      'Commercial finishing and installation package with practical sequencing, quality materials, and reliable handover timelines.',
    image: '/project-3.svg',
    galleryImages: ['/project-3.svg', '/project-1.svg'],
    scopeNotes:
      'Included partitioning, flooring finish, customer circulation planning, and final handover snag list clearance.',
    location: 'Rustenburg CBD',
    seoTitle: 'Commercial Fitout Construction Project',
    seoDescription: 'Construction and fitout case study for a local retail and customer service site.',
    status: 'PUBLISHED',
    published: true,
    sortOrder: 3,
  },
];

const pricingPlanData = [
  {
    title: 'Essential Consultation',
    slug: 'essential-consultation',
    range: 'R5,000 - R12,000',
    summary: 'Initial site review and project scoping package for confident decision-making.',
    description:
      'Includes an on-site assessment, scope alignment, and a preliminary estimate framework for project planning.',
    items: ['Site assessment', 'Concept planning', 'Preliminary quote guidance'],
    seoTitle: 'Construction Consultation Pricing',
    seoDescription: 'Entry-level consultation package for scope definition and budget preparation.',
    sortOrder: 1,
    published: true,
  },
  {
    title: 'Renovation Starter',
    slug: 'renovation-starter',
    range: 'From R35,000',
    summary: 'Structured renovation support for kitchens, bathrooms, and targeted home upgrades.',
    description:
      'Guided renovation package covering material direction, build coordination, and quality finish execution.',
    items: ['Design and material guidance', 'Construction management', 'Finish delivery'],
    seoTitle: 'Renovation Starter Package',
    seoDescription: 'Transparent starter package for homeowners planning medium-scale renovations.',
    sortOrder: 2,
    published: true,
  },
  {
    title: 'Residential Build',
    slug: 'residential-build',
    range: 'From R180,000',
    summary: 'End-to-end residential build support for new home development and major extensions.',
    description:
      'Complete planning, structural execution, and interior completion workflow for full residential construction delivery.',
    items: ['Full build planning', 'Structural construction', 'Interior finishing'],
    seoTitle: 'Residential Build Package',
    seoDescription: 'Turnkey construction package for new residential build projects.',
    sortOrder: 3,
    published: true,
  },
];

const reviewData = [
  {
    name: 'Lebogang M.',
    email: 'lebogang.m@example.com',
    rating: 5,
    projectContext: 'Rustenburg home renovation',
    title: 'Excellent communication and delivery',
    message: 'The team kept me informed, stayed on schedule, and gave our home a quality finish on time.',
    consentGiven: true,
    status: 'APPROVED',
    featured: true,
  },
  {
    name: 'Thabo K.',
    email: 'thabo.k@example.com',
    rating: 5,
    projectContext: 'Commercial fitout',
    title: 'Professional service from start to finish',
    message:
      'A responsive contractor that delivered a strong finish for our retail space and helped us manage the budget effectively.',
    consentGiven: true,
    status: 'APPROVED',
    featured: true,
  },
  {
    name: 'Naledi P.',
    email: 'naledi.p@example.com',
    rating: 4,
    projectContext: 'Boundary wall and paving',
    title: 'Solid workmanship',
    message: 'Good site coordination and clear feedback on material options throughout the job.',
    consentGiven: true,
    status: 'PENDING',
    featured: false,
  },
];

async function upsertReferenceData() {
  for (const service of serviceData) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: service,
    });
  }

  for (const project of projectData) {
    await prisma.project.upsert({
      where: { slug: project.slug },
      update: project,
      create: project,
    });
  }

  for (const plan of pricingPlanData) {
    await prisma.pricingPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }
}

async function seedReviews() {
  for (const review of reviewData) {
    const existing = await prisma.review.findFirst({
      where: {
        name: review.name,
        title: review.title,
        message: review.message,
      },
    });

    if (!existing) {
      await prisma.review.create({ data: review });
    }
  }
}

async function seedForum() {
  const categories = [
    {
      name: 'General Advice',
      slug: 'general-advice',
      description: 'Planning, budgeting, and project coordination discussions.',
      sortOrder: 1,
      published: true,
    },
    {
      name: 'Materials and Finishes',
      slug: 'materials-and-finishes',
      description: 'Discussion on durable materials, finishes, and cost-performance tradeoffs.',
      sortOrder: 2,
      published: true,
    },
    {
      name: 'Commercial Projects',
      slug: 'commercial-projects',
      description: 'Fitout, scheduling, and delivery topics for business environments.',
      sortOrder: 3,
      published: true,
    },
  ];

  for (const category of categories) {
    await prisma.forumCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  const generalCategory = await prisma.forumCategory.findUnique({ where: { slug: 'general-advice' } });
  const materialsCategory = await prisma.forumCategory.findUnique({ where: { slug: 'materials-and-finishes' } });

  const threads = [
    {
      title: 'Planning budget tips for phased home renovations',
      slug: 'planning-budget-tips',
      content:
        'What is the best way to phase a renovation so we keep living in the house while still controlling cost and build quality?',
      excerpt: 'How to stage renovation phases while managing cost, quality, and timeline risk.',
      authorName: 'Sophie van der Merwe',
      authorEmail: 'sophie@example.com',
      status: 'OPEN',
      categoryId: generalCategory ? generalCategory.id : null,
      publishedAt: new Date(),
    },
    {
      title: 'Best exterior paint systems for North West weather',
      slug: 'exterior-paint-north-west',
      content:
        'Looking for exterior paint recommendations that handle heat, storms, and long sun exposure without constant repainting.',
      excerpt: 'Durable exterior paint recommendations for local climate conditions.',
      authorName: 'Karabo M.',
      authorEmail: 'karabo@example.com',
      status: 'OPEN',
      categoryId: materialsCategory ? materialsCategory.id : null,
      publishedAt: new Date(),
    },
    {
      title: 'How to prepare before requesting a commercial fitout quote',
      slug: 'commercial-fitout-quote-prep',
      content:
        'What information should we prepare before requesting quotes for a retail fitout to avoid scope creep later?',
      excerpt: 'Required information for faster and more accurate commercial quote responses.',
      authorName: 'Andre J.',
      authorEmail: 'andre@example.com',
      status: 'PENDING',
      categoryId: generalCategory ? generalCategory.id : null,
      publishedAt: null,
    },
  ];

  for (const thread of threads) {
    await prisma.forumThread.upsert({
      where: { slug: thread.slug },
      update: thread,
      create: thread,
    });
  }

  const thread = await prisma.forumThread.findUnique({ where: { slug: 'planning-budget-tips' } });

  if (thread) {
    const replies = [
      {
        threadId: thread.id,
        authorName: 'Local contractor',
        authorEmail: 'advisor@example.com',
        content:
          'Start with structural and moisture issues first, then move to high-traffic areas and finish with decorative upgrades.',
        status: 'APPROVED',
      },
      {
        threadId: thread.id,
        authorName: 'Project coordinator',
        authorEmail: 'coordination@example.com',
        content:
          'Keep a 10-15% contingency and lock material specs early to avoid delays from supplier changes.',
        status: 'APPROVED',
      },
    ];

    for (const reply of replies) {
      const exists = await prisma.forumReply.findFirst({
        where: {
          threadId: reply.threadId,
          authorName: reply.authorName,
          content: reply.content,
        },
      });

      if (!exists) {
        await prisma.forumReply.create({ data: reply });
      }
    }
  }
}

async function seedLeads() {
  const now = Date.now();
  const enquirySamples = [
    {
      fullName: 'Nokuthula P.',
      email: 'nokuthula@example.com',
      phone: '082 555 1234',
      subject: 'Site inspection for a home extension',
      serviceInterest: 'Renovations and Upgrades',
      preferredContactMethod: 'Phone',
      location: 'Rustenburg, North West',
      message: 'I need a quote for a kitchen and living room extension with improved insulation.',
      consentGiven: true,
      status: 'NEW',
      sourceType: 'CONTACT_PAGE',
      sourcePath: '/contact',
      sourcePage: '/contact',
      sourceReferrer: 'https://www.google.com',
      utmSource: 'google',
      utmMedium: 'organic',
      utmCampaign: 'home-renovation-discovery',
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    },
    {
      fullName: 'Mpho D.',
      email: 'mpho.d@example.com',
      phone: '083 202 1104',
      subject: 'Boundary wall and paving quote',
      serviceInterest: 'Paving and Brickwork',
      preferredContactMethod: 'WhatsApp',
      location: 'Mogwase',
      message: 'Need driveway paving and a boundary wall for a corner stand.',
      consentGiven: true,
      status: 'IN_PROGRESS',
      sourceType: 'SERVICE_PAGE',
      sourcePath: '/services/paving-brickwork',
      sourcePage: '/services/paving-brickwork',
      sourceReferrer: 'https://elchananconstruction.co.za/services',
      utmSource: 'facebook',
      utmMedium: 'paid-social',
      utmCampaign: 'hardscape-leads',
      createdAt: new Date(now - 9 * 24 * 60 * 60 * 1000),
    },
    {
      fullName: 'Johan V.',
      email: 'johan.v@example.com',
      phone: '072 449 8123',
      subject: 'Commercial painting and plastering support',
      serviceInterest: 'Plastering and Painting',
      preferredContactMethod: 'Email',
      location: 'Rustenburg CBD',
      message: 'We need plaster repair and repainting before opening date.',
      consentGiven: true,
      status: 'RESOLVED',
      sourceType: 'DIRECT',
      sourcePath: '/contact',
      sourcePage: '/contact',
      sourceReferrer: '',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
      createdAt: new Date(now - 21 * 24 * 60 * 60 * 1000),
    },
    {
      fullName: 'Lerato N.',
      email: 'lerato.n@example.com',
      phone: '079 654 2201',
      subject: 'Roofing replacement planning',
      serviceInterest: 'Roofing and Ceilings',
      preferredContactMethod: 'Phone',
      location: 'Phokeng',
      message: 'Looking for a full roof replacement before heavy rain season.',
      consentGiven: true,
      status: 'NEW',
      sourceType: 'QUOTE_PAGE',
      sourcePath: '/quote',
      sourcePage: '/quote',
      sourceReferrer: 'https://elchananconstruction.co.za/pricing',
      utmSource: 'instagram',
      utmMedium: 'social',
      utmCampaign: 'roofing-awareness',
      createdAt: new Date(now - 32 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const sample of enquirySamples) {
    const exists = await prisma.contactEnquiry.findFirst({
      where: {
        email: sample.email,
        subject: sample.subject,
      },
      select: { id: true },
    });

    if (!exists) {
      await prisma.contactEnquiry.create({ data: sample });
    }
  }

  const quoteSamples = [
    {
      fullName: 'Jaco S.',
      email: 'jaco@example.com',
      phone: '083 444 5678',
      serviceType: 'Roofing and Ceilings',
      projectType: 'Maintenance',
      location: 'Rustenburg',
      estimatedBudgetRange: 'R100,000 - R250,000',
      preferredStartDate: new Date(),
      siteVisitRequired: true,
      projectDescription: 'Roof leak repairs and a complete roof replacement with new insulation.',
      consentGiven: true,
      status: 'REVIEWING',
      sourceType: 'QUOTE_PAGE',
      sourcePath: '/quote',
      sourcePage: '/quote',
      sourceReferrer: 'https://elchananconstruction.co.za/services/renovations-upgrades',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'quote-request-roofing',
      quoteSummary:
        'Roof replacement and ceiling insulation package prepared after initial inspection findings.',
      scopeNotes:
        'Includes old roof removal, waterproofing membrane installation, and new insulation layer.',
      lineItems: [
        { label: 'Roof sheet replacement', amount: 'R78,000' },
        { label: 'Waterproofing and sealing', amount: 'R14,500' },
        { label: 'Ceiling insulation', amount: 'R22,000' },
      ],
      estimateSubtotal: '114500',
      estimateTax: '17175',
      estimateTotal: '131675',
      validityDays: 14,
      exclusions:
        'Electrical rewiring and structural timber replacement not included unless defects are identified.',
      assumptions:
        'Quotation assumes clear roof access and no hidden structural defects during strip-down.',
      termsDisclaimer:
        'Final contract value is confirmed after site verification and client approval of final scope.',
      createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
    },
    {
      fullName: 'Palesa M.',
      email: 'palesa.m@example.com',
      phone: '084 110 0043',
      serviceType: 'Residential Construction',
      projectType: 'New Build',
      location: 'Rustenburg North',
      estimatedBudgetRange: 'R500,000+',
      preferredStartDate: new Date(now + 30 * 24 * 60 * 60 * 1000),
      siteVisitRequired: true,
      projectDescription: 'Two-bedroom new build with open-plan kitchen and covered patio.',
      consentGiven: true,
      status: 'RESPONDED',
      sourceType: 'PROJECT_PAGE',
      sourcePath: '/projects/rustenburg-family-residence',
      sourcePage: '/projects/rustenburg-family-residence',
      sourceReferrer: 'https://elchananconstruction.co.za/projects',
      utmSource: 'facebook',
      utmMedium: 'paid-social',
      utmCampaign: 'new-build-leads',
      createdAt: new Date(now - 14 * 24 * 60 * 60 * 1000),
    },
    {
      fullName: 'Sipho K.',
      email: 'sipho.k@example.com',
      phone: '081 400 2219',
      serviceType: 'Commercial Fitout',
      projectType: 'Commercial Fitout',
      location: 'Rustenburg CBD',
      estimatedBudgetRange: 'R250,000 - R500,000',
      preferredStartDate: new Date(now + 15 * 24 * 60 * 60 * 1000),
      siteVisitRequired: true,
      projectDescription: 'Restaurant interior fitout including partitions and flooring.',
      consentGiven: true,
      status: 'WON',
      sourceType: 'WHATSAPP',
      sourcePath: '/contact',
      sourcePage: '/contact',
      sourceReferrer: 'https://wa.me/27747512226',
      utmSource: 'whatsapp',
      utmMedium: 'chat',
      utmCampaign: 'quick-contact',
      quoteSentAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now - 18 * 24 * 60 * 60 * 1000),
    },
    {
      fullName: 'Tshepo R.',
      email: 'tshepo.r@example.com',
      phone: '073 904 1182',
      serviceType: 'Paving and Brickwork',
      projectType: 'Extension',
      location: 'Tlhabane',
      estimatedBudgetRange: 'R50,000 - R100,000',
      preferredStartDate: new Date(now + 12 * 24 * 60 * 60 * 1000),
      siteVisitRequired: false,
      projectDescription: 'Front yard paving replacement and walkway brickwork.',
      consentGiven: true,
      status: 'LOST',
      sourceType: 'SERVICE_PAGE',
      sourcePath: '/services/paving-brickwork',
      sourcePage: '/services/paving-brickwork',
      sourceReferrer: 'https://www.google.com',
      utmSource: 'google',
      utmMedium: 'organic',
      utmCampaign: 'paving-service',
      createdAt: new Date(now - 35 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const sample of quoteSamples) {
    const exists = await prisma.quoteRequest.findFirst({
      where: {
        email: sample.email,
        serviceType: sample.serviceType,
        projectDescription: sample.projectDescription,
      },
      select: { id: true },
    });

    if (!exists) {
      await prisma.quoteRequest.create({ data: sample });
    }
  }
}

async function seedStaffUsers(password) {
  const seeded = {};

  for (const user of STAFF_USERS) {
    const staff = await prisma.adminUser.upsert({
      where: { email: user.email },
      update: {
        password,
        name: user.name,
        role: user.role,
        isActive: true,
      },
      create: {
        email: user.email,
        password,
        name: user.name,
        role: user.role,
        isActive: true,
      },
    });

    seeded[user.role] = staff.id;
  }

  return seeded;
}

async function seedMediaAssets(adminUserId) {
  const assets = [
    {
      name: 'Project Cover 1',
      url: '/project-1.svg',
      type: 'project',
      mimeType: 'image/svg+xml',
      altText: 'Residential project exterior render',
      storagePath: 'uploads/project/project-1.svg',
      bytes: 12000,
      uploadedByAdminId: adminUserId,
    },
    {
      name: 'Service Visual 1',
      url: '/project-2.svg',
      type: 'service',
      mimeType: 'image/svg+xml',
      altText: 'Renovation service visual',
      storagePath: 'uploads/service/project-2.svg',
      bytes: 12000,
      uploadedByAdminId: adminUserId,
    },
    {
      name: 'Quote Attachment Sample',
      url: '/project-3.svg',
      type: 'quote',
      mimeType: 'image/svg+xml',
      altText: 'Sample quote attachment visual',
      storagePath: 'uploads/quote/project-3.svg',
      bytes: 12000,
      uploadedByAdminId: adminUserId,
    },
  ];

  for (const asset of assets) {
    const exists = await prisma.mediaAsset.findFirst({
      where: { url: asset.url, type: asset.type },
      select: { id: true },
    });

    if (!exists) {
      await prisma.mediaAsset.create({
        data: asset,
      });
    }
  }
}

async function seedCommunicationLogs() {
  const enquiry = await prisma.contactEnquiry.findFirst({
    where: { email: 'nokuthula@example.com' },
    select: { id: true },
  });

  const quote = await prisma.quoteRequest.findFirst({
    where: { email: 'jaco@example.com' },
    select: { id: true },
  });

  if (enquiry) {
    const exists = await prisma.communicationLog.findFirst({
      where: {
        enquiryId: enquiry.id,
        subject: 'Initial outbound acknowledgement',
      },
      select: { id: true },
    });

    if (!exists) {
      await prisma.communicationLog.create({
        data: {
          enquiryId: enquiry.id,
          channel: 'EMAIL',
          direction: 'OUTBOUND',
          subject: 'Initial outbound acknowledgement',
          message: 'Client received acknowledgement with reference code and follow-up expectations.',
          actorName: 'System',
          actorEmail: 'hello@elchananconstruction.co.za',
        },
      });
    }
  }

  if (quote) {
    const exists = await prisma.communicationLog.findFirst({
      where: {
        quoteRequestId: quote.id,
        subject: 'Estimator review started',
      },
      select: { id: true },
    });

    if (!exists) {
      await prisma.communicationLog.create({
        data: {
          quoteRequestId: quote.id,
          channel: 'NOTE',
          direction: 'INTERNAL',
          subject: 'Estimator review started',
          message: 'Scope reviewed and preliminary line-item breakdown drafted for client-ready quotation output.',
          actorName: 'Estimator Team',
          actorEmail: 'hello@elchananconstruction.co.za',
        },
      });
    }
  }
}

function mergeLeadStatus(current, incoming) {
  const rank = {
    NEW: 1,
    CONTACTED: 2,
    QUALIFIED: 3,
    QUOTED: 4,
    WON: 5,
    LOST: 0,
    INACTIVE: -1,
  };

  if (!current) return incoming;
  if (current === 'WON') return current;
  if (incoming === 'WON') return 'WON';
  if (current === 'LOST' && incoming !== 'WON') return current;
  if (incoming === 'LOST' && current !== 'WON') return 'LOST';
  return rank[incoming] > rank[current] ? incoming : current;
}

function mapEnquiryToLeadStatus(status) {
  if (status === 'NEW') return 'NEW';
  if (status === 'IN_PROGRESS') return 'CONTACTED';
  if (status === 'RESOLVED') return 'QUALIFIED';
  return 'INACTIVE';
}

function mapQuoteToLeadStatus(status) {
  if (status === 'WON') return 'WON';
  if (status === 'LOST') return 'LOST';
  if (status === 'NEW' || status === 'REVIEWING' || status === 'RESPONDED') return 'QUOTED';
  return 'INACTIVE';
}

async function seedCrmWorkflow(defaultAssigneeId, staffUsers) {
  const salesAssigneeId = staffUsers.SALES || defaultAssigneeId;
  const moderatorAssigneeId = staffUsers.MODERATOR || defaultAssigneeId;
  const contentAssigneeId = staffUsers.CONTENT_MANAGER || defaultAssigneeId;

  const enquiries = await prisma.contactEnquiry.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  for (const enquiry of enquiries) {
    const incomingStatus = mapEnquiryToLeadStatus(enquiry.status);
    const existingLead = await prisma.lead.findUnique({
      where: {
        email_phone: {
          email: enquiry.email,
          phone: enquiry.phone,
        },
      },
      select: {
        id: true,
        status: true,
        assignedToAdminId: true,
      },
    });

    const nextStatus = mergeLeadStatus(existingLead?.status, incomingStatus);
    const assignedToAdminId = existingLead?.assignedToAdminId || enquiry.assignedToAdminId || salesAssigneeId;

    const lead = await prisma.lead.upsert({
      where: {
        email_phone: {
          email: enquiry.email,
          phone: enquiry.phone,
        },
      },
      update: {
        fullName: enquiry.fullName,
        location: enquiry.location || null,
        notes: enquiry.message || null,
        status: nextStatus,
        sourceType: enquiry.sourceType,
        sourcePath: enquiry.sourcePath || null,
        sourcePage: enquiry.sourcePage || null,
        sourceReferrer: enquiry.sourceReferrer || null,
        utmSource: enquiry.utmSource || null,
        utmMedium: enquiry.utmMedium || null,
        utmCampaign: enquiry.utmCampaign || null,
        assignedToAdminId,
      },
      create: {
        fullName: enquiry.fullName,
        email: enquiry.email,
        phone: enquiry.phone,
        location: enquiry.location || null,
        notes: enquiry.message || null,
        status: nextStatus,
        sourceType: enquiry.sourceType,
        sourcePath: enquiry.sourcePath || null,
        sourcePage: enquiry.sourcePage || null,
        sourceReferrer: enquiry.sourceReferrer || null,
        utmSource: enquiry.utmSource || null,
        utmMedium: enquiry.utmMedium || null,
        utmCampaign: enquiry.utmCampaign || null,
        assignedToAdminId,
      },
      select: {
        id: true,
      },
    });

    await prisma.contactEnquiry.update({
      where: { id: enquiry.id },
      data: {
        leadId: lead.id,
        assignedToAdminId: enquiry.assignedToAdminId || salesAssigneeId,
      },
    });

    const hasActivity = await prisma.activityLog.findFirst({
      where: {
        type: 'ENQUIRY_SUBMITTED',
        enquiryId: enquiry.id,
      },
      select: { id: true },
    });

    if (!hasActivity) {
      await prisma.activityLog.create({
        data: {
          type: 'ENQUIRY_SUBMITTED',
          title: 'Enquiry submitted',
          description: `Seeded enquiry ${enquiry.referenceCode} imported into CRM timeline.`,
          leadId: lead.id,
          enquiryId: enquiry.id,
          actorAdminId: defaultAssigneeId,
        },
      });
    }
  }

  const quotes = await prisma.quoteRequest.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  for (const quote of quotes) {
    const incomingStatus = mapQuoteToLeadStatus(quote.status);
    const existingLead = await prisma.lead.findUnique({
      where: {
        email_phone: {
          email: quote.email,
          phone: quote.phone,
        },
      },
      select: {
        id: true,
        status: true,
        assignedToAdminId: true,
      },
    });

    const nextStatus = mergeLeadStatus(existingLead?.status, incomingStatus);
    const assignedToAdminId = existingLead?.assignedToAdminId || quote.assignedToAdminId || salesAssigneeId;

    const lead = await prisma.lead.upsert({
      where: {
        email_phone: {
          email: quote.email,
          phone: quote.phone,
        },
      },
      update: {
        fullName: quote.fullName,
        location: quote.location || null,
        notes: quote.projectDescription || null,
        status: nextStatus,
        sourceType: quote.sourceType,
        sourcePath: quote.sourcePath || null,
        sourcePage: quote.sourcePage || null,
        sourceReferrer: quote.sourceReferrer || null,
        utmSource: quote.utmSource || null,
        utmMedium: quote.utmMedium || null,
        utmCampaign: quote.utmCampaign || null,
        assignedToAdminId,
      },
      create: {
        fullName: quote.fullName,
        email: quote.email,
        phone: quote.phone,
        location: quote.location || null,
        notes: quote.projectDescription || null,
        status: nextStatus,
        sourceType: quote.sourceType,
        sourcePath: quote.sourcePath || null,
        sourcePage: quote.sourcePage || null,
        sourceReferrer: quote.sourceReferrer || null,
        utmSource: quote.utmSource || null,
        utmMedium: quote.utmMedium || null,
        utmCampaign: quote.utmCampaign || null,
        assignedToAdminId,
      },
      select: {
        id: true,
      },
    });

    const quoteAssignee = quote.assignedToAdminId || salesAssigneeId;
    await prisma.quoteRequest.update({
      where: { id: quote.id },
      data: {
        leadId: lead.id,
        assignedToAdminId: quoteAssignee,
      },
    });

    const hasActivity = await prisma.activityLog.findFirst({
      where: {
        type: 'QUOTE_REQUESTED',
        quoteRequestId: quote.id,
      },
      select: { id: true },
    });

    if (!hasActivity) {
      await prisma.activityLog.create({
        data: {
          type: 'QUOTE_REQUESTED',
          title: 'Quote request submitted',
          description: `Seeded quote ${quote.referenceCode} imported into CRM timeline.`,
          leadId: lead.id,
          quoteRequestId: quote.id,
          actorAdminId: defaultAssigneeId,
        },
      });
    }

    if (quote.status === 'WON') {
      await prisma.deliveryProject.upsert({
        where: { quoteRequestId: quote.id },
        update: {
          title: `${quote.serviceType} - ${quote.fullName}`,
          status: 'PLANNED',
          leadId: lead.id,
          createdByAdminId: quoteAssignee,
          notes: 'Seeded delivery project from won quote.',
        },
        create: {
          quoteRequestId: quote.id,
          title: `${quote.serviceType} - ${quote.fullName}`,
          status: 'PLANNED',
          leadId: lead.id,
          createdByAdminId: quoteAssignee,
          notes: 'Seeded delivery project from won quote.',
        },
      });
    }
  }

  const leadForTask = await prisma.lead.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  const enquiryForTask = await prisma.contactEnquiry.findFirst({
    where: { deletedAt: null, status: { in: ['NEW', 'IN_PROGRESS'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, leadId: true },
  });

  const quoteForTask = await prisma.quoteRequest.findFirst({
    where: { deletedAt: null, status: { in: ['NEW', 'REVIEWING', 'RESPONDED'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, leadId: true },
  });

  const taskSamples = [
    {
      title: 'Call new lead within 24 hours',
      description: 'Initial qualification call for newly captured lead.',
      status: 'OPEN',
      priority: 'HIGH',
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      assignedToAdminId: salesAssigneeId,
      leadId: leadForTask?.id || enquiryForTask?.leadId || quoteForTask?.leadId || null,
      enquiryId: enquiryForTask?.id || null,
      quoteRequestId: null,
      deliveryProjectId: null,
      createdByAdminId: defaultAssigneeId,
    },
    {
      title: 'Prepare estimate follow-up response',
      description: 'Review latest quote details and schedule a follow-up response.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      assignedToAdminId: salesAssigneeId,
      leadId: quoteForTask?.leadId || null,
      enquiryId: null,
      quoteRequestId: quoteForTask?.id || null,
      deliveryProjectId: null,
      createdByAdminId: defaultAssigneeId,
      startedAt: new Date(),
    },
    {
      title: 'Moderation queue sweep',
      description: 'Review pending testimonials and forum submissions.',
      status: 'OPEN',
      priority: 'LOW',
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      assignedToAdminId: moderatorAssigneeId,
      leadId: null,
      enquiryId: null,
      quoteRequestId: null,
      deliveryProjectId: null,
      createdByAdminId: contentAssigneeId,
    },
  ];

  for (const task of taskSamples) {
    const exists = await prisma.followUpTask.findFirst({
      where: {
        title: task.title,
        leadId: task.leadId,
        enquiryId: task.enquiryId,
        quoteRequestId: task.quoteRequestId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!exists) {
      const createdTask = await prisma.followUpTask.create({
        data: task,
        select: {
          id: true,
          title: true,
          leadId: true,
          enquiryId: true,
          quoteRequestId: true,
          deliveryProjectId: true,
        },
      });

      await prisma.activityLog.create({
        data: {
          type: 'TASK_CREATED',
          title: 'Follow-up task created',
          description: createdTask.title,
          actorAdminId: defaultAssigneeId,
          taskId: createdTask.id,
          leadId: createdTask.leadId,
          enquiryId: createdTask.enquiryId,
          quoteRequestId: createdTask.quoteRequestId,
          deliveryProjectId: createdTask.deliveryProjectId,
        },
      });
    }
  }
}

async function seedClientPortal(defaultAdminId) {
  const leadWithClientHistory = await prisma.lead.findFirst({
    where: {
      deletedAt: null,
      OR: [
        {
          quotes: {
            some: {
              deletedAt: null,
            },
          },
        },
        {
          deliveryProjects: {
            some: {
              deletedAt: null,
            },
          },
        },
      ],
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      companyName: true,
      location: true,
    },
  });

  const lead = leadWithClientHistory || await prisma.lead.findFirst({
    where: { deletedAt: null },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      companyName: true,
      location: true,
    },
  });

  if (!lead) {
    return;
  }

  const clientPasswordHash = bcrypt.hashSync(PORTAL_PASSWORD, 10);

  await prisma.clientUser.upsert({
    where: { email: PORTAL_EMAIL },
    update: {
      password: clientPasswordHash,
      fullName: lead.fullName || PORTAL_NAME,
      displayName: lead.fullName || PORTAL_NAME,
      phone: lead.phone || null,
      companyName: lead.companyName || null,
      location: lead.location || null,
      contactPreference: 'Email',
      leadId: lead.id,
      isActive: true,
    },
    create: {
      email: PORTAL_EMAIL,
      password: clientPasswordHash,
      fullName: lead.fullName || PORTAL_NAME,
      displayName: lead.fullName || PORTAL_NAME,
      phone: lead.phone || null,
      companyName: lead.companyName || null,
      location: lead.location || null,
      contactPreference: 'Email',
      leadId: lead.id,
      isActive: true,
    },
  });

  const quoteForPortal = await prisma.quoteRequest.findFirst({
    where: {
      deletedAt: null,
      leadId: lead.id,
    },
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      referenceCode: true,
      serviceType: true,
      status: true,
      quoteSummary: true,
      quoteSentAt: true,
      projectDescription: true,
    },
  });

  const wonQuote = await prisma.quoteRequest.findFirst({
    where: {
      deletedAt: null,
      leadId: lead.id,
      status: 'WON',
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      referenceCode: true,
      serviceType: true,
      projectDescription: true,
    },
  });

  let deliveryProject = await prisma.deliveryProject.findFirst({
    where: {
      deletedAt: null,
      leadId: lead.id,
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      title: true,
      quoteRequestId: true,
      startTarget: true,
      portalVisible: true,
      projectCode: true,
      estimatedCompletion: true,
      notes: true,
      clientSummary: true,
    },
  });

  if (!deliveryProject && (wonQuote || quoteForPortal)) {
    const sourceQuote = wonQuote || quoteForPortal;
    const quoteAlreadyLinked = sourceQuote
      ? await prisma.deliveryProject.findFirst({
        where: {
          quoteRequestId: sourceQuote.id,
        },
        select: {
          id: true,
        },
      })
      : null;

    const created = await prisma.deliveryProject.create({
      data: {
        title: `${sourceQuote.serviceType} - ${lead.fullName}`,
        status: wonQuote ? 'ACTIVE' : 'PLANNED',
        leadId: lead.id,
        quoteRequestId: quoteAlreadyLinked ? undefined : sourceQuote.id,
        startTarget: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        estimatedCompletion: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        notes: 'Portal-seeded delivery project foundation from won quote workflow.',
        clientSummary:
          'Project is underway with staged progress updates and milestone tracking available in the portal.',
        portalVisible: true,
        createdByAdminId: defaultAdminId,
      },
      select: {
        id: true,
        title: true,
        quoteRequestId: true,
        startTarget: true,
        portalVisible: true,
        projectCode: true,
        estimatedCompletion: true,
        notes: true,
        clientSummary: true,
      },
    });

    deliveryProject = created;
  }

  if (deliveryProject) {
    const generatedProjectCode = deliveryProject.projectCode || `PRJ-${deliveryProject.id.slice(-8).toUpperCase()}`;
    const startBase = deliveryProject.startTarget || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const estimatedCompletion =
      deliveryProject.estimatedCompletion || new Date(startBase.getTime() + 75 * 24 * 60 * 60 * 1000);

    await prisma.deliveryProject.update({
      where: { id: deliveryProject.id },
      data: {
        portalVisible: true,
        projectCode: generatedProjectCode,
        clientSummary:
          deliveryProject.clientSummary ||
          'Construction delivery is progressing with clear milestone tracking and regular client-facing updates.',
        estimatedCompletion,
      },
    });

    const milestoneSamples = [
      {
        title: 'Site mobilization and kickoff',
        description: 'Site preparation, safety controls, and kickoff review completed.',
        status: 'COMPLETED',
        targetDate: new Date(startBase.getTime() - 1 * 24 * 60 * 60 * 1000),
        completedDate: new Date(startBase.getTime() - 1 * 24 * 60 * 60 * 1000),
        sortOrder: 1,
        clientVisible: true,
      },
      {
        title: 'Core structural works',
        description: 'Main structural package in progress with weekly quality inspections.',
        status: 'IN_PROGRESS',
        targetDate: new Date(startBase.getTime() + 21 * 24 * 60 * 60 * 1000),
        completedDate: null,
        sortOrder: 2,
        clientVisible: true,
      },
      {
        title: 'Finishes and snagging',
        description: 'Final finishes, quality checks, and handover readiness review.',
        status: 'PENDING',
        targetDate: new Date(startBase.getTime() + 55 * 24 * 60 * 60 * 1000),
        completedDate: null,
        sortOrder: 3,
        clientVisible: true,
      },
    ];

    for (const milestone of milestoneSamples) {
      const exists = await prisma.projectMilestone.findFirst({
        where: {
          deliveryProjectId: deliveryProject.id,
          title: milestone.title,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!exists) {
        await prisma.projectMilestone.create({
          data: {
            deliveryProjectId: deliveryProject.id,
            ...milestone,
          },
        });
      }
    }

    const updateSamples = [
      {
        title: 'Kickoff completed',
        summary: 'Site team mobilized and baseline schedule confirmed.',
        body: 'Kickoff meeting completed with site access confirmed, materials sequencing validated, and baseline timeline shared with the client.',
        postedByLabel: 'Project Coordinator',
        clientVisible: true,
        publishedAt: new Date(startBase.getTime()),
      },
      {
        title: 'Structural package progressing',
        summary: 'Core structural works are currently on track.',
        body: 'Primary structural works are progressing in line with the agreed sequence. Quality checks completed for this cycle with no major blockers raised.',
        postedByLabel: 'Site Supervisor',
        clientVisible: true,
        imageUrl: '/project-1.svg',
        publishedAt: new Date(startBase.getTime() + 10 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Upcoming phase planning',
        summary: 'Preparation for finishes phase has started.',
        body: 'Material selections and finishing phase planning are underway to keep the project aligned with the estimated completion timeline.',
        postedByLabel: 'Project Coordinator',
        clientVisible: true,
        publishedAt: new Date(startBase.getTime() + 20 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const update of updateSamples) {
      const exists = await prisma.projectUpdate.findFirst({
        where: {
          deliveryProjectId: deliveryProject.id,
          title: update.title,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!exists) {
        await prisma.projectUpdate.create({
          data: {
            deliveryProjectId: deliveryProject.id,
            postedByAdminId: defaultAdminId,
            ...update,
          },
        });
      }
    }

    const latestClientUpdate = await prisma.projectUpdate.findFirst({
      where: {
        deliveryProjectId: deliveryProject.id,
        clientVisible: true,
        deletedAt: null,
      },
      orderBy: { publishedAt: 'desc' },
      select: { publishedAt: true },
    });

    if (latestClientUpdate) {
      await prisma.deliveryProject.update({
        where: { id: deliveryProject.id },
        data: {
          lastClientUpdateAt: latestClientUpdate.publishedAt,
        },
      });
    }
  }

  if (quoteForPortal) {
    await prisma.portalDocument.upsert({
      where: {
        id: `quote-doc-${quoteForPortal.id}`,
      },
      update: {
        title: `Quotation ${quoteForPortal.referenceCode}`,
        description: 'Client-ready quotation document.',
        type: 'QUOTE',
        url: `/portal/quotes/${quoteForPortal.id}/document?print=1`,
        fileName: `${quoteForPortal.referenceCode}.pdf`,
        clientVisible: true,
        leadId: lead.id,
        quoteRequestId: quoteForPortal.id,
        deliveryProjectId: deliveryProject ? deliveryProject.id : null,
        uploadedByAdminId: defaultAdminId,
      },
      create: {
        id: `quote-doc-${quoteForPortal.id}`,
        title: `Quotation ${quoteForPortal.referenceCode}`,
        description: 'Client-ready quotation document.',
        type: 'QUOTE',
        url: `/portal/quotes/${quoteForPortal.id}/document?print=1`,
        fileName: `${quoteForPortal.referenceCode}.pdf`,
        clientVisible: true,
        leadId: lead.id,
        quoteRequestId: quoteForPortal.id,
        deliveryProjectId: deliveryProject ? deliveryProject.id : null,
        uploadedByAdminId: defaultAdminId,
      },
    });

    if (!quoteForPortal.quoteSummary) {
      await prisma.quoteRequest.update({
        where: { id: quoteForPortal.id },
        data: {
          quoteSummary:
            quoteForPortal.projectDescription ||
            'Quotation prepared based on current scope details and staged delivery planning.',
          quoteSentAt: quoteForPortal.quoteSentAt || new Date(),
        },
      });
    }
  }

  if (deliveryProject) {
    const projectDocSamples = [
      {
        id: `project-update-image-${deliveryProject.id}`,
        title: 'Progress site image',
        description: 'Latest approved site progress image for client reference.',
        type: 'IMAGE',
        url: '/project-2.svg',
        fileName: 'progress-site-image.svg',
      },
      {
        id: `project-scope-note-${deliveryProject.id}`,
        title: 'Project scope summary',
        description: 'Current scope summary for client communication.',
        type: 'PROJECT',
        url: '/project-3.svg',
        fileName: 'project-scope-summary.svg',
      },
    ];

    for (const doc of projectDocSamples) {
      await prisma.portalDocument.upsert({
        where: { id: doc.id },
        update: {
          title: doc.title,
          description: doc.description,
          type: doc.type,
          url: doc.url,
          fileName: doc.fileName,
          clientVisible: true,
          leadId: lead.id,
          deliveryProjectId: deliveryProject.id,
          uploadedByAdminId: defaultAdminId,
        },
        create: {
          id: doc.id,
          title: doc.title,
          description: doc.description,
          type: doc.type,
          url: doc.url,
          fileName: doc.fileName,
          clientVisible: true,
          leadId: lead.id,
          deliveryProjectId: deliveryProject.id,
          uploadedByAdminId: defaultAdminId,
        },
      });
    }
  }
}

async function seedCompanyProfile() {
  await prisma.companyProfile.upsert({
    where: { email: 'hello@elchananconstruction.co.za' },
    update: {
      displayName: 'Elchanan Construction',
      tagline: 'Rustenburg modern construction partner for residential, renovation, and infrastructure projects.',
      serviceAreas: ['Rustenburg', 'North West Province', 'Nearby regional developments'],
      serviceAreaText:
        'Serving Rustenburg and surrounding service areas with dependable residential, renovation, and commercial project execution.',
      socialLinks: {
        website: 'https://elchananconstruction.co.za',
        facebook: '',
        instagram: '',
        linkedin: '',
      },
      quotationFooter:
        'Any services not listed in this quotation are excluded and will be priced separately if requested.',
      quotationDisclaimer:
        'All quoted rates remain subject to final site verification, material confirmation, and signed agreement.',
      emailSignature: 'Regards,\nElchanan Construction Company Team',
      emailFooter: 'Professional construction and renovation delivery in Rustenburg and surrounding areas.',
    },
    create: {
      companyName: 'Elchanan Construction Company',
      displayName: 'Elchanan Construction',
      tagline: 'Rustenburg modern construction partner for residential, renovation, and infrastructure projects.',
      description:
        'Elchanan Construction delivers premium build, renovation, and infrastructure services across Rustenburg and the North West province with trusted project planning and transparent quoting.',
      phone: '074 751 2226',
      email: 'hello@elchananconstruction.co.za',
      whatsapp: '+27747512226',
      address: 'Rustenburg, North West Province, South Africa',
      serviceAreas: ['Rustenburg', 'North West Province', 'Nearby regional developments'],
      serviceAreaText:
        'Serving Rustenburg and surrounding service areas with dependable residential, renovation, and commercial project execution.',
      socialLinks: {
        website: 'https://elchananconstruction.co.za',
        facebook: '',
        instagram: '',
        linkedin: '',
      },
      quotationFooter:
        'Any services not listed in this quotation are excluded and will be priced separately if requested.',
      quotationDisclaimer:
        'All quoted rates remain subject to final site verification, material confirmation, and signed agreement.',
      emailSignature: 'Regards,\nElchanan Construction Company Team',
      emailFooter: 'Professional construction and renovation delivery in Rustenburg and surrounding areas.',
      heroHeadline: 'Build with confidence and timeline certainty.',
      seoTitle: 'Elchanan Construction Company | Rustenburg Construction Experts',
      seoDescription:
        'Premium construction, renovation, and infrastructure delivery for residential and commercial clients in Rustenburg.',
      hours: [
        { day: 'Mon', hours: '09:00 - 17:00' },
        { day: 'Tue', hours: '09:00 - 17:00' },
        { day: 'Wed', hours: '09:00 - 17:00' },
        { day: 'Thu', hours: '09:00 - 17:00' },
        { day: 'Fri', hours: '09:00 - 17:00' },
        { day: 'Sat', hours: '09:00 - 13:00' },
        { day: 'Sun', hours: 'Closed' },
      ],
    },
  });
}

async function seedNewsletterAndAudit(adminUserId) {
  await prisma.newsletterSubscriber.upsert({
    where: { email: 'updates@example.com' },
    update: { subscribed: true },
    create: {
      email: 'updates@example.com',
      source: 'Homepage CTA',
      subscribed: true,
    },
  });

  const existing = await prisma.auditLog.findFirst({
    where: {
      action: 'SEED_BOOTSTRAP',
      entity: 'SYSTEM',
      entityId: 'INITIAL_SETUP',
    },
  });

  if (!existing) {
    await prisma.auditLog.create({
      data: {
        actor: ADMIN_EMAIL,
        action: 'SEED_BOOTSTRAP',
        entity: 'SYSTEM',
        entityId: 'INITIAL_SETUP',
        actorAdminId: adminUserId,
        details: {
          note: 'Initial seed baseline completed for full-stack construction platform.',
        },
      },
    });
  }
}

async function main() {
  const password = bcrypt.hashSync(ADMIN_PASSWORD, 10);

  const admin = await prisma.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      password,
      name: ADMIN_NAME,
      isActive: true,
    },
    create: {
      email: ADMIN_EMAIL,
      password,
      name: ADMIN_NAME,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  const staffUsers = await seedStaffUsers(password);

  await seedCompanyProfile();
  await upsertReferenceData();
  await seedReviews();
  await seedForum();
  await seedLeads();
  await seedCrmWorkflow(admin.id, staffUsers);
  await seedClientPortal(admin.id);
  await seedMediaAssets(admin.id);
  await seedCommunicationLogs();
  await seedNewsletterAndAudit(admin.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

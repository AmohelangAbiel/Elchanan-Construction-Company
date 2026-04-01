import { expect, test, type APIRequestContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const adminEmail =
  process.env.E2E_ADMIN_EMAIL ||
  'e2e-admin@elchananconstruction.co.za';
const adminPassword =
  process.env.E2E_ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  'ChangeMe_Elchanan_Admin_2026!';
const portalPrimaryEmail =
  process.env.E2E_PORTAL_EMAIL ||
  'e2e-client@elchananconstruction.co.za';
const portalPrimaryPassword =
  process.env.E2E_PORTAL_PASSWORD ||
  'ChangeMe_Elchanan_Client_2026!';
const portalSecondaryEmail =
  process.env.E2E_PORTAL_SECONDARY_EMAIL ||
  'e2e-client-2@elchananconstruction.co.za';
const portalSecondaryPassword =
  process.env.E2E_PORTAL_SECONDARY_PASSWORD ||
  'ChangeMe_Elchanan_Client_Secondary_2026!';

const forumCategorySlug = 'e2e-security';
const forumThreadSlug = 'e2e-safe-redirect-thread';
let moderationReplyFixture: { id: string; threadId: string } | null = null;
let portalFixture:
  | {
      ownQuoteId: string;
      foreignQuoteId: string;
      ownDocumentId: string;
      foreignDocumentId: string;
      insecureDocumentId: string;
    }
  | null = null;

function getOrigin() {
  const configuredBaseUrl = test.info().project.use.baseURL;
  if (typeof configuredBaseUrl !== 'string') {
    throw new Error('Playwright baseURL must be configured.');
  }

  return new URL(configuredBaseUrl).origin;
}

async function loginAsAdmin(
  requestContext: APIRequestContext,
  origin: string,
  password: string,
) {
  return requestContext.post('/api/admin/login', {
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    data: {
      email: adminEmail,
      password,
    },
  });
}

async function loginAsPortal(
  requestContext: APIRequestContext,
  origin: string,
  email: string,
  password: string,
) {
  return requestContext.post('/api/portal/login', {
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    data: {
      email,
      password,
    },
  });
}

function extractCookieValue(response: Awaited<ReturnType<APIRequestContext['post']>>, cookieName: string) {
  const setCookieHeader = response
    .headersArray()
    .find((header) => header.name.toLowerCase() === 'set-cookie' && header.value.startsWith(`${cookieName}=`))
    ?.value;

  if (!setCookieHeader) return undefined;

  const cookieChunk = setCookieHeader.split(';')[0] || '';
  const [, value] = cookieChunk.split('=');
  return value;
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.beforeAll(async () => {
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      password: bcrypt.hashSync(adminPassword, 10),
      name: 'E2E Admin',
      isActive: true,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: adminEmail,
      password: bcrypt.hashSync(adminPassword, 10),
      name: 'E2E Admin',
      isActive: true,
      role: 'SUPER_ADMIN',
    },
  });

  const category = await prisma.forumCategory.upsert({
    where: { slug: forumCategorySlug },
    update: {
      name: 'E2E Security',
      description: 'E2E security moderation fixtures',
      sortOrder: 999,
      published: true,
      deletedAt: null,
    },
    create: {
      name: 'E2E Security',
      slug: forumCategorySlug,
      description: 'E2E security moderation fixtures',
      sortOrder: 999,
      published: true,
    },
    select: { id: true },
  });

  const thread = await prisma.forumThread.upsert({
    where: { slug: forumThreadSlug },
    update: {
      title: 'E2E Safe Redirect Fixture',
      content: 'Fixture thread for safe redirect security regression coverage.',
      excerpt: 'Fixture thread for security regression tests.',
      authorName: 'E2E Fixture',
      status: 'OPEN',
      publishedAt: new Date(),
      deletedAt: null,
      categoryId: category.id,
    },
    create: {
      title: 'E2E Safe Redirect Fixture',
      slug: forumThreadSlug,
      content: 'Fixture thread for safe redirect security regression coverage.',
      excerpt: 'Fixture thread for security regression tests.',
      authorName: 'E2E Fixture',
      authorEmail: 'fixture@example.com',
      status: 'OPEN',
      publishedAt: new Date(),
      categoryId: category.id,
    },
    select: { id: true },
  });

  const existingReply = await prisma.forumReply.findFirst({
    where: {
      threadId: thread.id,
      authorName: 'E2E Fixture Reply',
      deletedAt: null,
    },
    select: { id: true, threadId: true },
  });

  if (existingReply) {
    moderationReplyFixture = existingReply;
  } else {
    const reply = await prisma.forumReply.create({
      data: {
        threadId: thread.id,
        authorName: 'E2E Fixture Reply',
        authorEmail: 'fixture-reply@example.com',
        content: 'Fixture reply for moderator update endpoint authorization tests.',
        status: 'PENDING',
      },
      select: { id: true, threadId: true },
    });

    moderationReplyFixture = reply;
  }

  async function ensureLead(input: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
  }) {
    const existing = await prisma.lead.findFirst({
      where: {
        email: input.email,
        phone: input.phone,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      return prisma.lead.update({
        where: { id: existing.id },
        data: {
          fullName: input.fullName,
          location: input.location,
          status: 'QUALIFIED',
          sourceType: 'DIRECT',
        },
        select: { id: true, fullName: true, email: true, phone: true },
      });
    }

    return prisma.lead.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        location: input.location,
        status: 'QUALIFIED',
        sourceType: 'DIRECT',
      },
      select: { id: true, fullName: true, email: true, phone: true },
    });
  }

  const [primaryLead, secondaryLead] = await Promise.all([
    ensureLead({
      fullName: 'E2E Portal Primary Client',
      email: 'e2e-portal-primary@example.com',
      phone: '+27110000001',
      location: 'Rustenburg',
    }),
    ensureLead({
      fullName: 'E2E Portal Secondary Client',
      email: 'e2e-portal-secondary@example.com',
      phone: '+27110000002',
      location: 'Mogwase',
    }),
  ]);

  await Promise.all([
    prisma.clientUser.upsert({
      where: { email: portalPrimaryEmail },
      update: {
        password: bcrypt.hashSync(portalPrimaryPassword, 10),
        fullName: primaryLead.fullName,
        displayName: 'Primary Portal Client',
        phone: primaryLead.phone,
        companyName: 'Primary Client Co',
        location: 'Rustenburg',
        contactPreference: 'Email',
        leadId: primaryLead.id,
        isActive: true,
      },
      create: {
        email: portalPrimaryEmail,
        password: bcrypt.hashSync(portalPrimaryPassword, 10),
        fullName: primaryLead.fullName,
        displayName: 'Primary Portal Client',
        phone: primaryLead.phone,
        companyName: 'Primary Client Co',
        location: 'Rustenburg',
        contactPreference: 'Email',
        leadId: primaryLead.id,
        isActive: true,
      },
      select: { id: true },
    }),
    prisma.clientUser.upsert({
      where: { email: portalSecondaryEmail },
      update: {
        password: bcrypt.hashSync(portalSecondaryPassword, 10),
        fullName: secondaryLead.fullName,
        displayName: 'Secondary Portal Client',
        phone: secondaryLead.phone,
        companyName: 'Secondary Client Co',
        location: 'Mogwase',
        contactPreference: 'Phone',
        leadId: secondaryLead.id,
        isActive: true,
      },
      create: {
        email: portalSecondaryEmail,
        password: bcrypt.hashSync(portalSecondaryPassword, 10),
        fullName: secondaryLead.fullName,
        displayName: 'Secondary Portal Client',
        phone: secondaryLead.phone,
        companyName: 'Secondary Client Co',
        location: 'Mogwase',
        contactPreference: 'Phone',
        leadId: secondaryLead.id,
        isActive: true,
      },
      select: { id: true },
    }),
  ]);

  async function ensureQuote(input: {
    referenceCode: string;
    leadId: string;
    fullName: string;
    email: string;
    phone: string;
    serviceType: string;
    location: string;
    status: 'RESPONDED' | 'NEW';
  }) {
    const existing = await prisma.quoteRequest.findFirst({
      where: {
        referenceCode: input.referenceCode,
        deletedAt: null,
      },
      select: { id: true },
    });

    const baseData = {
      leadId: input.leadId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      serviceType: input.serviceType,
      projectType: 'Renovation',
      location: input.location,
      estimatedBudgetRange: 'R100,000 - R250,000',
      siteVisitRequired: true,
      projectDescription: 'E2E portal authorization fixture project scope.',
      consentGiven: true,
      status: input.status,
      quoteSentAt: new Date(),
      quoteSummary: 'Fixture quotation summary for portal access control validation.',
      scopeNotes: 'Fixture scope notes.',
      lineItems: [
        { label: 'Labor package', amount: 'R80,000' },
        { label: 'Materials package', amount: 'R45,000' },
      ],
      estimateSubtotal: '125000',
      estimateTax: '18750',
      estimateTotal: '143750',
      validityDays: 21,
      termsDisclaimer: 'Fixture disclaimer.',
    } as const;

    if (existing) {
      return prisma.quoteRequest.update({
        where: { id: existing.id },
        data: baseData,
        select: { id: true, referenceCode: true, leadId: true },
      });
    }

    return prisma.quoteRequest.create({
      data: {
        ...baseData,
        referenceCode: input.referenceCode,
      },
      select: { id: true, referenceCode: true, leadId: true },
    });
  }

  const [primaryQuote, secondaryQuote] = await Promise.all([
    ensureQuote({
      referenceCode: 'E2E-PORTAL-QUOTE-PRIMARY',
      leadId: primaryLead.id,
      fullName: primaryLead.fullName,
      email: primaryLead.email,
      phone: primaryLead.phone,
      serviceType: 'Residential Construction',
      location: 'Rustenburg',
      status: 'RESPONDED',
    }),
    ensureQuote({
      referenceCode: 'E2E-PORTAL-QUOTE-SECONDARY',
      leadId: secondaryLead.id,
      fullName: secondaryLead.fullName,
      email: secondaryLead.email,
      phone: secondaryLead.phone,
      serviceType: 'Renovations and Upgrades',
      location: 'Mogwase',
      status: 'RESPONDED',
    }),
  ]);

  async function ensureDeliveryProject(input: {
    leadId: string;
    quoteRequestId: string;
    title: string;
    projectCode: string;
  }) {
    const existing = await prisma.deliveryProject.findFirst({
      where: {
        quoteRequestId: input.quoteRequestId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const baseData = {
      leadId: input.leadId,
      title: input.title,
      status: 'ACTIVE' as const,
      portalVisible: true,
      projectCode: input.projectCode,
      clientSummary: 'Fixture project summary for portal milestone and update visibility.',
      startTarget: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      estimatedCompletion: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      notes: 'Fixture project note.',
    };

    if (existing) {
      return prisma.deliveryProject.update({
        where: { id: existing.id },
        data: baseData,
        select: { id: true, leadId: true, quoteRequestId: true },
      });
    }

    return prisma.deliveryProject.create({
      data: {
        ...baseData,
        quoteRequestId: input.quoteRequestId,
      },
      select: { id: true, leadId: true, quoteRequestId: true },
    });
  }

  const [primaryProject, secondaryProject] = await Promise.all([
    ensureDeliveryProject({
      leadId: primaryLead.id,
      quoteRequestId: primaryQuote.id,
      title: 'E2E Portal Primary Project',
      projectCode: 'E2E-PRJ-PRIMARY',
    }),
    ensureDeliveryProject({
      leadId: secondaryLead.id,
      quoteRequestId: secondaryQuote.id,
      title: 'E2E Portal Secondary Project',
      projectCode: 'E2E-PRJ-SECONDARY',
    }),
  ]);

  await prisma.projectMilestone.upsert({
    where: { id: 'e2e-portal-milestone-primary' },
    update: {
      deliveryProjectId: primaryProject.id,
      title: 'E2E primary milestone',
      description: 'Fixture milestone for portal visibility.',
      status: 'IN_PROGRESS',
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sortOrder: 1,
      clientVisible: true,
      deletedAt: null,
    },
    create: {
      id: 'e2e-portal-milestone-primary',
      deliveryProjectId: primaryProject.id,
      title: 'E2E primary milestone',
      description: 'Fixture milestone for portal visibility.',
      status: 'IN_PROGRESS',
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sortOrder: 1,
      clientVisible: true,
    },
  });

  await prisma.projectUpdate.upsert({
    where: { id: 'e2e-portal-update-primary' },
    update: {
      deliveryProjectId: primaryProject.id,
      title: 'E2E primary update',
      summary: 'Fixture update summary',
      body: 'Fixture update body for portal detail rendering and ownership checks.',
      postedByLabel: 'E2E Coordinator',
      clientVisible: true,
      publishedAt: new Date(),
      deletedAt: null,
    },
    create: {
      id: 'e2e-portal-update-primary',
      deliveryProjectId: primaryProject.id,
      title: 'E2E primary update',
      summary: 'Fixture update summary',
      body: 'Fixture update body for portal detail rendering and ownership checks.',
      postedByLabel: 'E2E Coordinator',
      clientVisible: true,
      publishedAt: new Date(),
    },
  });

  const ownDocumentId = 'e2e-portal-doc-primary';
  const foreignDocumentId = 'e2e-portal-doc-secondary';
  const insecureDocumentId = 'e2e-portal-doc-insecure-http';

  await prisma.portalDocument.upsert({
    where: { id: ownDocumentId },
    update: {
      title: 'E2E Primary Document',
      description: 'Primary client document fixture.',
      type: 'PROJECT',
      url: '/project-1.svg',
      fileName: 'e2e-primary.svg',
      clientVisible: true,
      leadId: primaryLead.id,
      quoteRequestId: primaryQuote.id,
      deliveryProjectId: primaryProject.id,
      deletedAt: null,
    },
    create: {
      id: ownDocumentId,
      title: 'E2E Primary Document',
      description: 'Primary client document fixture.',
      type: 'PROJECT',
      url: '/project-1.svg',
      fileName: 'e2e-primary.svg',
      clientVisible: true,
      leadId: primaryLead.id,
      quoteRequestId: primaryQuote.id,
      deliveryProjectId: primaryProject.id,
    },
  });

  await prisma.portalDocument.upsert({
    where: { id: foreignDocumentId },
    update: {
      title: 'E2E Secondary Document',
      description: 'Secondary client document fixture.',
      type: 'PROJECT',
      url: '/project-2.svg',
      fileName: 'e2e-secondary.svg',
      clientVisible: true,
      leadId: secondaryLead.id,
      quoteRequestId: secondaryQuote.id,
      deliveryProjectId: secondaryProject.id,
      deletedAt: null,
    },
    create: {
      id: foreignDocumentId,
      title: 'E2E Secondary Document',
      description: 'Secondary client document fixture.',
      type: 'PROJECT',
      url: '/project-2.svg',
      fileName: 'e2e-secondary.svg',
      clientVisible: true,
      leadId: secondaryLead.id,
      quoteRequestId: secondaryQuote.id,
      deliveryProjectId: secondaryProject.id,
    },
  });

  await prisma.portalDocument.upsert({
    where: { id: insecureDocumentId },
    update: {
      title: 'E2E Insecure URL Document',
      description: 'Fixture document with insecure URL for security validation.',
      type: 'GENERAL',
      url: 'http://example.com/e2e-insecure.pdf',
      fileName: 'e2e-insecure.pdf',
      clientVisible: true,
      leadId: primaryLead.id,
      quoteRequestId: null,
      deliveryProjectId: null,
      deletedAt: null,
    },
    create: {
      id: insecureDocumentId,
      title: 'E2E Insecure URL Document',
      description: 'Fixture document with insecure URL for security validation.',
      type: 'GENERAL',
      url: 'http://example.com/e2e-insecure.pdf',
      fileName: 'e2e-insecure.pdf',
      clientVisible: true,
      leadId: primaryLead.id,
    },
  });

  portalFixture = {
    ownQuoteId: primaryQuote.id,
    foreignQuoteId: secondaryQuote.id,
    ownDocumentId,
    foreignDocumentId,
    insecureDocumentId,
  };
});

test('admin login succeeds with valid credentials', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill(adminPassword);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/admin$/);
});

test('admin login fails with invalid credentials', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill('Incorrect_password_123!');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('protected admin page redirects unauthenticated users', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('admin mutation API returns 401 when unauthenticated', async ({ request }) => {
  const origin = getOrigin();

  const response = await request.post('/api/admin/services', {
    headers: { Origin: origin },
    multipart: {
      title: 'Unauthorized test service',
      summary: 'summary for unauthorized test service',
      description: 'description for unauthorized test service',
      sortOrder: '0',
    },
  });

  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body).toMatchObject({
    success: false,
    error: 'Unauthorized',
  });
});

test('portal login succeeds with valid credentials', async ({ page }) => {
  await page.goto('/portal/login');
  await page.getByLabel('Email').fill(portalPrimaryEmail);
  await page.getByLabel('Password').fill(portalPrimaryPassword);
  await page.getByRole('button', { name: /sign in to portal/i }).click();

  await expect(page).toHaveURL(/\/portal$/);
});

test('protected portal page redirects unauthenticated users', async ({ page }) => {
  await page.goto('/portal/projects');
  await expect(page).toHaveURL(/\/portal\/login/);
});

test('portal mutation API returns 401 when unauthenticated', async ({ request }) => {
  const origin = getOrigin();

  const response = await request.post('/api/portal/profile', {
    headers: { Origin: origin },
    multipart: {
      fullName: 'Unauthenticated Portal Client',
      displayName: 'Unauthenticated',
      returnTo: '/portal/profile',
    },
  });

  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body).toMatchObject({
    success: false,
    error: 'Unauthorized',
  });
});

test('portal session cookie cannot access admin mutation API', async ({ request }) => {
  const origin = getOrigin();
  const loginResponse = await loginAsPortal(request, origin, portalPrimaryEmail, portalPrimaryPassword);
  expect(loginResponse.status()).toBe(200);

  const portalToken = extractCookieValue(loginResponse, 'elchanan_portal_token');
  test.skip(!portalToken, 'Unable to extract portal auth cookie from login response.');

  const response = await request.post('/api/admin/services', {
    headers: {
      Origin: origin,
      Cookie: `elchanan_portal_token=${portalToken}`,
    },
    multipart: {
      title: 'Portal-auth admin access test',
      summary: 'summary',
      description: 'description',
      sortOrder: '0',
    },
  });

  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body).toMatchObject({
    success: false,
    error: 'Unauthorized',
  });
});

test('invalid JSON payload is rejected with 400', async ({ request }) => {
  const origin = getOrigin();

  const response = await request.fetch('/api/enquiries', {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    data: '{"brokenJson"',
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body).toMatchObject({
    success: false,
    error: 'Invalid request payload.',
  });
});

test('oversized JSON payload is rejected with 413', async ({ request }) => {
  const origin = getOrigin();

  const response = await request.post('/api/enquiries', {
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    data: {
      fullName: 'Payload Test',
      email: 'payload-test@example.com',
      phone: '+27747512226',
      subject: 'Oversized payload test',
      serviceInterest: 'Residential Construction',
      preferredContactMethod: 'Email',
      location: 'Rustenburg',
      message: 'A'.repeat(70_000),
      consentGiven: true,
      honeypot: '',
    },
  });

  expect(response.status()).toBe(413);
  const body = await response.json();
  expect(body).toMatchObject({
    success: false,
    error: 'Payload too large.',
  });
});

test('safe redirect enforcement blocks external returnTo', async ({ request }) => {
  const origin = getOrigin();
  const loginResponse = await loginAsAdmin(request, origin, adminPassword);
  expect(loginResponse.status()).toBe(200);

  expect(moderationReplyFixture).toBeTruthy();
  const reply = moderationReplyFixture!;

  const response = await request.post(`/api/admin/forum/replies/${reply.id}`, {
    headers: { Origin: origin },
    multipart: {
      status: 'PENDING',
      returnTo: 'https://evil.com/phishing',
    },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(307);
  const location = response.headers().location || '';
  expect(location).not.toContain('evil.com');

  const redirectUrl = new URL(location, origin);
  expect(redirectUrl.pathname).toBe(`/admin/forum/${reply.threadId}`);
});

test('session revocation invalidates previously issued admin token', async ({ request }) => {
  const origin = getOrigin();
  const loginResponse = await loginAsAdmin(request, origin, adminPassword);
  expect(loginResponse.status()).toBe(200);

  const previousToken = extractCookieValue(loginResponse, 'elchanan_admin_token');
  test.skip(!previousToken, 'Unable to extract admin auth cookie from login response.');

  const revokeResponse = await request.post('/api/admin/session/revoke', {
    headers: { Origin: origin },
    maxRedirects: 0,
  });
  expect(revokeResponse.status()).toBe(307);

  const response = await request.post('/api/admin/services', {
    headers: {
      Origin: origin,
      Cookie: `elchanan_admin_token=${previousToken}`,
    },
    multipart: {
      title: 'Post-revoke authorization test',
      summary: 'summary',
      description: 'description',
      sortOrder: '0',
    },
  });

  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body).toMatchObject({
    success: false,
    error: 'Unauthorized',
  });
});

test('portal user cannot access another client quote route', async ({ page }) => {
  test.skip(!portalFixture, 'Portal fixture records were not created.');

  await page.goto('/portal/login');
  await page.getByLabel('Email').fill(portalPrimaryEmail);
  await page.getByLabel('Password').fill(portalPrimaryPassword);
  await page.getByRole('button', { name: /sign in to portal/i }).click();
  await expect(page).toHaveURL(/\/portal$/);

  await page.goto(`/portal/quotes/${portalFixture!.foreignQuoteId}`);
  await expect(page.getByRole('heading', { name: /we could not find that portal item/i })).toBeVisible();
});

test('portal user cannot access another client document endpoint', async ({ request }) => {
  test.skip(!portalFixture, 'Portal fixture records were not created.');

  const origin = getOrigin();
  const loginResponse = await loginAsPortal(request, origin, portalPrimaryEmail, portalPrimaryPassword);
  expect(loginResponse.status()).toBe(200);

  const portalToken = extractCookieValue(loginResponse, 'elchanan_portal_token');
  test.skip(!portalToken, 'Unable to extract portal auth cookie from login response.');

  const response = await request.get(`/api/portal/documents/${portalFixture!.foreignDocumentId}`, {
    headers: {
      Cookie: `elchanan_portal_token=${portalToken}`,
    },
  });

  expect(response.status()).toBe(404);
  const body = await response.json();
  expect(body).toMatchObject({
    success: false,
    error: 'Document not found.',
  });
});

test('portal document endpoint blocks insecure external HTTP URLs', async ({ request }) => {
  test.skip(!portalFixture, 'Portal fixture records were not created.');

  const origin = getOrigin();
  const loginResponse = await loginAsPortal(request, origin, portalPrimaryEmail, portalPrimaryPassword);
  expect(loginResponse.status()).toBe(200);

  const portalToken = extractCookieValue(loginResponse, 'elchanan_portal_token');
  test.skip(!portalToken, 'Unable to extract portal auth cookie from login response.');

  const response = await request.get(`/api/portal/documents/${portalFixture!.insecureDocumentId}`, {
    headers: {
      Cookie: `elchanan_portal_token=${portalToken}`,
    },
  });

  expect(response.status()).toBe(422);
  const body = await response.json();
  expect(body).toMatchObject({
    success: false,
    error: 'Document URL is not valid.',
  });
});

test('health and readiness endpoints return structured statuses', async ({ request }) => {
  const healthResponse = await request.get('/api/health');
  expect(healthResponse.status()).toBe(200);
  const healthBody = await healthResponse.json();
  expect(healthBody).toMatchObject({
    success: true,
    status: 'ok',
  });

  const readinessResponse = await request.get('/api/health/ready');
  expect([200, 401, 503]).toContain(readinessResponse.status());

  if (readinessResponse.status() !== 401) {
    const readinessBody = await readinessResponse.json();
    expect(readinessBody).toMatchObject({
      success: true,
    });
    expect(['ready', 'degraded']).toContain(readinessBody.status);
    expect(readinessBody.checks).toBeTruthy();
  }
});

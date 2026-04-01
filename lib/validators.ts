import { z } from 'zod';
import {
  BILLING_TYPES,
  BUDGET_RANGES,
  DOCUMENT_APPROVAL_STATUSES,
  CONTACT_METHODS,
  DELIVERY_PROJECT_STATUSES,
  INVOICE_STATUSES,
  LEAD_STATUSES,
  LEAD_SOURCE_TYPES,
  MATERIAL_ITEM_STATUSES,
  PAYMENT_METHODS,
  PROCUREMENT_STATUSES,
  PROJECT_TYPES,
  PROJECT_ASSIGNMENT_ROLES,
  PORTAL_DOCUMENT_TYPES,
  PURCHASE_REQUEST_STATUSES,
  QUOTE_APPROVAL_STATUSES,
  SITE_TASK_STATUSES,
  SERVICE_TYPES,
  SUPPLIER_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from './constants';
import { normalizePhone, sanitizeOptionalText, sanitizeText, slugify } from './sanitize';

const booleanish = z.union([z.boolean(), z.literal('true'), z.literal('false'), z.literal('on'), z.literal('1')]);

const optionalText = (max = 255) =>
  z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, max));

const requiredText = (label: string, min: number, max = 255) =>
  z
    .string({ required_error: `${label} is required` })
    .transform((value) => sanitizeText(value, max))
    .refine((value) => value.length >= min, `${label} is required`);

const phoneText = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .transform((value) => normalizePhone(value))
    .refine((value) => value.replace(/\D/g, '').length >= 7, `${label} is invalid`);

const optionalPhoneText = (label: string) =>
  z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 50))
    .transform((value) => (value ? normalizePhone(value) : undefined))
    .refine((value) => !value || value.replace(/\D/g, '').length >= 7, `${label} is invalid`);

const optionalEmailField = () =>
  z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 320)?.toLowerCase())
    .refine((value) => !value || z.string().email().safeParse(value).success, 'Valid email is required');

const isSafeHttpOrRelativeUrl = (value: string) =>
  /^https?:\/\/[^\s]+$/i.test(value) || /^\/[^\s]*$/.test(value);

const dateString = z
  .string()
  .optional()
  .transform((value) => sanitizeOptionalText(value, 32))
  .refine((value) => {
    if (!value) return true;
    return !Number.isNaN(Date.parse(value));
  }, 'Invalid date provided');

const optionalCurrencyNumber = z
  .union([z.number(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string' && !value.trim()) return undefined;
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) return undefined;
    return parsed;
  })
  .refine((value) => value === undefined || (value >= 0 && value <= 999999999), 'Invalid currency value');

const optionalDecimalNumber = z
  .union([z.number(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string' && !value.trim()) return undefined;
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) return undefined;
    return parsed;
  })
  .refine((value) => value === undefined || (value >= 0 && value <= 999999999), 'Invalid numeric value');

const requiredDecimalNumber = (label: string, min = 0) =>
  z
    .union([z.number(), z.string()], { required_error: `${label} is required` })
    .transform((value) => {
      const parsed = typeof value === 'number' ? value : Number(sanitizeText(value, 60));
      return Number.isFinite(parsed) ? parsed : NaN;
    })
    .refine((value) => Number.isFinite(value) && value >= min && value <= 999999999, `${label} is invalid`);

const relationIdField = z
  .string()
  .optional()
  .transform((value) => sanitizeOptionalText(value, 120));

const adminIdField = relationIdField;

const requiredIdField = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .transform((value) => sanitizeText(value, 120))
    .refine((value) => value.length >= 1, `${label} is required`);

const requiredDateString = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .transform((value) => sanitizeText(value, 40))
    .refine((value) => !Number.isNaN(Date.parse(value)), `${label} is required`);

const returnToField = optionalText(2048);

function strictObject<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).strict();
}

function strictObjectWithReturnTo<T extends z.ZodRawShape>(shape: T) {
  return z.object({ ...shape, returnTo: returnToField }).strict();
}

export const enquirySchema = strictObject({
  fullName: requiredText('Full name', 2, 120),
  email: z
    .string()
    .transform((value) => sanitizeText(value, 320).toLowerCase())
    .pipe(z.string().email('Valid email is required')),
  phone: phoneText('Phone'),
  subject: requiredText('Subject', 3, 180),
  serviceInterest: optionalText(120),
  preferredContactMethod: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 30))
    .refine((value) => !value || CONTACT_METHODS.includes(value as (typeof CONTACT_METHODS)[number]), 'Invalid contact method'),
  location: optionalText(140),
  message: requiredText('Message', 10, 4000),
  consentGiven: booleanish,
  leadSourceType: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 40))
    .refine(
      (value) => !value || LEAD_SOURCE_TYPES.includes(value as (typeof LEAD_SOURCE_TYPES)[number]),
      'Invalid lead source type',
    ),
  sourcePath: optionalText(2048),
  sourcePage: optionalText(2048),
  sourceReferrer: optionalText(2048),
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(160),
  honeypot: z.string().optional(),
});

export const quoteSchema = strictObject({
  fullName: requiredText('Full name', 2, 120),
  email: z
    .string()
    .transform((value) => sanitizeText(value, 320).toLowerCase())
    .pipe(z.string().email('Valid email is required')),
  phone: phoneText('Phone'),
  serviceType: requiredText('Service type', 2, 120).refine(
    (value) => SERVICE_TYPES.includes(value as (typeof SERVICE_TYPES)[number]),
    'Invalid service type',
  ),
  projectType: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 80))
    .refine((value) => !value || PROJECT_TYPES.includes(value as (typeof PROJECT_TYPES)[number]), 'Invalid project type'),
  location: optionalText(140),
  estimatedBudgetRange: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 80))
    .refine((value) => !value || BUDGET_RANGES.includes(value as (typeof BUDGET_RANGES)[number]), 'Invalid budget range'),
  preferredStartDate: dateString,
  siteVisitRequired: z.union([z.literal('yes'), z.literal('no'), z.boolean()]).optional(),
  projectDescription: requiredText('Project description', 10, 5000),
  attachmentUrl: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 2048))
    .refine((value) => !value || isSafeHttpOrRelativeUrl(value), 'Attachment URL must be a valid URL'),
  consentGiven: booleanish,
  leadSourceType: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 40))
    .refine(
      (value) => !value || LEAD_SOURCE_TYPES.includes(value as (typeof LEAD_SOURCE_TYPES)[number]),
      'Invalid lead source type',
    ),
  sourcePath: optionalText(2048),
  sourcePage: optionalText(2048),
  sourceReferrer: optionalText(2048),
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(160),
  honeypot: z.string().optional(),
});

export const reviewSchema = strictObject({
  name: requiredText('Name', 2, 120),
  email: optionalEmailField(),
  rating: z.coerce.number().int().min(1).max(5),
  projectContext: optionalText(140),
  title: optionalText(160),
  message: requiredText('Review message', 10, 3000),
  consentGiven: booleanish,
  honeypot: z.string().optional(),
});

export const forumThreadSchema = strictObject({
  categorySlug: optionalText(100),
  title: requiredText('Topic title', 5, 160),
  content: requiredText('Topic description', 10, 5000),
  authorName: requiredText('Name', 2, 120),
  authorEmail: optionalEmailField(),
  consentGiven: booleanish,
  honeypot: z.string().optional(),
});

export const forumReplySchema = strictObject({
  authorName: requiredText('Name', 2, 120),
  authorEmail: optionalEmailField(),
  content: requiredText('Reply', 10, 3000),
  honeypot: z.string().optional(),
});

export const adminLoginSchema = strictObject({
  email: z
    .string()
    .transform((value) => sanitizeText(value, 320).toLowerCase())
    .pipe(z.string().email('Valid email is required')),
  password: z.string().min(8, 'Password is required').max(200, 'Password is too long'),
});

export const portalLoginSchema = strictObject({
  email: z
    .string()
    .transform((value) => sanitizeText(value, 320).toLowerCase())
    .pipe(z.string().email('Valid email is required')),
  password: z.string().min(8, 'Password is required').max(200, 'Password is too long'),
});

export const portalProfileUpdateSchema = strictObjectWithReturnTo({
  fullName: requiredText('Full name', 2, 160),
  displayName: optionalText(120),
  phone: optionalPhoneText('Phone'),
  companyName: optionalText(160),
  location: optionalText(180),
  contactPreference: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 30))
    .refine((value) => !value || CONTACT_METHODS.includes(value as (typeof CONTACT_METHODS)[number]), 'Invalid contact preference'),
});

export const enquiryUpdateSchema = strictObjectWithReturnTo({
  status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED']),
  assignedToAdminId: adminIdField,
  notes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  followUpNotes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  lastContactedAt: dateString,
  communicationChannel: z.enum(['NOTE', 'EMAIL', 'PHONE', 'WHATSAPP', 'SYSTEM', 'CALL', 'MEETING', 'GENERAL']).optional(),
  communicationDirection: z.enum(['INBOUND', 'OUTBOUND', 'INTERNAL']).optional(),
  communicationSubject: z.string().optional().transform((value) => sanitizeOptionalText(value, 220)),
  communicationMessage: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
});

export const quoteUpdateSchema = strictObjectWithReturnTo({
  status: z.enum(['NEW', 'REVIEWING', 'RESPONDED', 'WON', 'LOST', 'ARCHIVED']),
  assignedToAdminId: adminIdField,
  leadStatus: z.enum(LEAD_STATUSES).optional(),
  internalNotes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  followUpNotes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  lastContactedAt: dateString,
  quoteSentAt: dateString,
  quoteSentNow: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
  convertToProject: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
  deliveryProjectTitle: z.string().optional().transform((value) => sanitizeOptionalText(value, 180)),
  deliveryProjectStartTarget: dateString,
  deliveryProjectNotes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  quoteSummary: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  scopeNotes: z.string().optional().transform((value) => sanitizeOptionalText(value, 6000)),
  attachmentUrl: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 2048))
    .refine((value) => !value || isSafeHttpOrRelativeUrl(value), 'Attachment URL must be a valid path or URL'),
  lineItemsText: z.string().optional().transform((value) => sanitizeOptionalText(value, 8000)),
  estimateSubtotal: optionalCurrencyNumber,
  estimateTax: optionalCurrencyNumber,
  estimateTotal: optionalCurrencyNumber,
  validityDays: z.coerce.number().int().min(1).max(365).optional(),
  exclusions: z.string().optional().transform((value) => sanitizeOptionalText(value, 6000)),
  assumptions: z.string().optional().transform((value) => sanitizeOptionalText(value, 6000)),
  termsDisclaimer: z.string().optional().transform((value) => sanitizeOptionalText(value, 6000)),
  communicationChannel: z.enum(['NOTE', 'EMAIL', 'PHONE', 'WHATSAPP', 'SYSTEM', 'CALL', 'MEETING', 'GENERAL']).optional(),
  communicationDirection: z.enum(['INBOUND', 'OUTBOUND', 'INTERNAL']).optional(),
  communicationSubject: z.string().optional().transform((value) => sanitizeOptionalText(value, 220)),
  communicationMessage: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
});

export const reviewUpdateSchema = strictObject({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  featured: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
});

export const forumThreadUpdateSchema = strictObject({
  status: z.enum(['PENDING', 'OPEN', 'LOCKED', 'HIDDEN']),
});

export const forumReplyUpdateSchema = strictObjectWithReturnTo({
  status: z.enum(['PENDING', 'APPROVED', 'HIDDEN']),
});

export const serviceInputSchema = strictObjectWithReturnTo({
  title: requiredText('Title', 2, 140),
  slug: z
    .string()
    .optional()
    .transform((value) => {
      const normalized = sanitizeOptionalText(value, 180);
      return normalized ? slugify(normalized) : undefined;
    }),
  summary: requiredText('Summary', 10, 220),
  description: requiredText('Description', 20, 5000),
  detailsText: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  image: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 2048))
    .refine((value) => !value || isSafeHttpOrRelativeUrl(value), 'Image URL must be a valid path or URL'),
  seoTitle: optionalText(160),
  seoDescription: optionalText(300),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  published: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
});

export const projectInputSchema = strictObjectWithReturnTo({
  title: requiredText('Title', 2, 140),
  slug: z
    .string()
    .optional()
    .transform((value) => {
      const normalized = sanitizeOptionalText(value, 180);
      return normalized ? slugify(normalized) : undefined;
    }),
  category: requiredText('Category', 2, 80),
  summary: requiredText('Summary', 10, 220),
  description: requiredText('Description', 20, 5000),
  image: requiredText('Image URL', 2, 2048).refine(
    (value) => isSafeHttpOrRelativeUrl(value),
    'Image URL must be a valid path or URL',
  ),
  galleryImagesText: z.string().optional().transform((value) => sanitizeOptionalText(value, 8000)),
  beforeImage: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 2048))
    .refine((value) => !value || isSafeHttpOrRelativeUrl(value), 'Before image URL must be a valid path or URL'),
  afterImage: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 2048))
    .refine((value) => !value || isSafeHttpOrRelativeUrl(value), 'After image URL must be a valid path or URL'),
  beforeAfterCaption: optionalText(260),
  scopeNotes: z.string().optional().transform((value) => sanitizeOptionalText(value, 5000)),
  location: optionalText(120),
  seoTitle: optionalText(160),
  seoDescription: optionalText(300),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  published: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
});

export const pricingInputSchema = strictObjectWithReturnTo({
  title: requiredText('Title', 2, 140),
  slug: z
    .string()
    .optional()
    .transform((value) => {
      const normalized = sanitizeOptionalText(value, 180);
      return normalized ? slugify(normalized) : undefined;
    }),
  range: requiredText('Range', 2, 120),
  summary: requiredText('Summary', 10, 220),
  description: requiredText('Description', 20, 5000),
  itemsText: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  seoTitle: optionalText(160),
  seoDescription: optionalText(300),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  published: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
});

export const settingsInputSchema = strictObject({
  companyName: requiredText('Company name', 2, 160),
  displayName: optionalText(160),
  tagline: requiredText('Tagline', 2, 220),
  description: requiredText('Description', 20, 5000),
  phone: phoneText('Phone'),
  email: z
    .string()
    .transform((value) => sanitizeText(value, 320).toLowerCase())
    .pipe(z.string().email('Valid email is required')),
  whatsapp: optionalText(50),
  address: requiredText('Address', 5, 220),
  serviceAreasText: z.string().optional().transform((value) => sanitizeOptionalText(value, 2000)),
  serviceAreaText: z.string().optional().transform((value) => sanitizeOptionalText(value, 2000)),
  websiteUrl: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 2048))
    .refine((value) => !value || isSafeHttpOrRelativeUrl(value), 'Website URL must be a valid path or URL'),
  facebookUrl: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 2048))
    .refine((value) => !value || isSafeHttpOrRelativeUrl(value), 'Facebook URL must be a valid path or URL'),
  instagramUrl: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 2048))
    .refine((value) => !value || isSafeHttpOrRelativeUrl(value), 'Instagram URL must be a valid path or URL'),
  linkedinUrl: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 2048))
    .refine((value) => !value || isSafeHttpOrRelativeUrl(value), 'LinkedIn URL must be a valid path or URL'),
  quotationFooter: z.string().optional().transform((value) => sanitizeOptionalText(value, 6000)),
  quotationDisclaimer: z.string().optional().transform((value) => sanitizeOptionalText(value, 6000)),
  emailSignature: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  emailFooter: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  heroHeadline: optionalText(200),
  seoTitle: optionalText(160),
  seoDescription: optionalText(300),
  hoursJson: z.string().optional().transform((value) => sanitizeOptionalText(value, 6000)),
});

export const leadCreateSchema = strictObjectWithReturnTo({
  fullName: requiredText('Full name', 2, 160),
  email: z
    .string()
    .transform((value) => sanitizeText(value, 320).toLowerCase())
    .pipe(z.string().email('Valid email is required')),
  phone: phoneText('Phone'),
  companyName: optionalText(160),
  location: optionalText(180),
  status: z.enum(LEAD_STATUSES).default('NEW'),
  assignedToAdminId: adminIdField,
  notes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  tagsText: z.string().optional().transform((value) => sanitizeOptionalText(value, 1000)),
});

export const leadUpdateSchema = strictObjectWithReturnTo({
  status: z.enum(LEAD_STATUSES),
  assignedToAdminId: adminIdField,
  companyName: optionalText(160),
  location: optionalText(180),
  notes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  tagsText: z.string().optional().transform((value) => sanitizeOptionalText(value, 1000)),
  lastContactedAt: dateString,
  communicationChannel: z.enum(['NOTE', 'EMAIL', 'PHONE', 'WHATSAPP', 'SYSTEM', 'CALL', 'MEETING', 'GENERAL']).optional(),
  communicationDirection: z.enum(['INBOUND', 'OUTBOUND', 'INTERNAL']).optional(),
  communicationSubject: z.string().optional().transform((value) => sanitizeOptionalText(value, 220)),
  communicationMessage: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
});

export const taskCreateSchema = strictObjectWithReturnTo({
  title: requiredText('Title', 3, 180),
  description: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  status: z.enum(TASK_STATUSES).default('OPEN'),
  priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
  dueAt: z
    .string()
    .transform((value) => sanitizeText(value, 40))
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Due date is required'),
  assignedToAdminId: adminIdField,
  leadId: adminIdField,
  enquiryId: adminIdField,
  quoteRequestId: adminIdField,
  deliveryProjectId: adminIdField,
});

export const taskUpdateSchema = strictObjectWithReturnTo({
  title: requiredText('Title', 3, 180),
  description: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueAt: z
    .string()
    .transform((value) => sanitizeText(value, 40))
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Due date is required'),
  assignedToAdminId: adminIdField,
});

export const deliveryProjectUpdateSchema = strictObject({
  title: requiredText('Title', 3, 180),
  status: z.enum(DELIVERY_PROJECT_STATUSES),
  startTarget: dateString,
  notes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
});

export const quoteApprovalSubmissionSchema = strictObjectWithReturnTo({
  approvalStatus: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 30))
    .refine(
      (value) => !value || QUOTE_APPROVAL_STATUSES.includes(value as (typeof QUOTE_APPROVAL_STATUSES)[number]),
      'Invalid quote approval status',
    ),
  clientResponseNote: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
});

export const documentApprovalSubmissionSchema = strictObjectWithReturnTo({
  approvalStatus: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 30))
    .refine(
      (value) => !value || DOCUMENT_APPROVAL_STATUSES.includes(value as (typeof DOCUMENT_APPROVAL_STATUSES)[number]),
      'Invalid document approval status',
    ),
  clientResponseNote: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
});

export const invoiceFormSchema = strictObjectWithReturnTo({
  title: requiredText('Title', 3, 180),
  description: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  billingType: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 20))
    .refine((value) => !value || BILLING_TYPES.includes(value as (typeof BILLING_TYPES)[number]), 'Invalid billing type'),
  status: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 30))
    .refine((value) => !value || INVOICE_STATUSES.includes(value as (typeof INVOICE_STATUSES)[number]), 'Invalid invoice status'),
  leadId: adminIdField,
  quoteRequestId: adminIdField,
  deliveryProjectId: adminIdField,
  projectMilestoneId: adminIdField,
  issuedAt: dateString,
  dueDate: dateString,
  subtotal: optionalCurrencyNumber,
  tax: optionalCurrencyNumber,
  total: optionalCurrencyNumber,
  notes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  paymentInstructions: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  footerNote: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  lineItemsText: z.string().optional().transform((value) => sanitizeOptionalText(value, 8000)),
  clientVisible: booleanish.optional(),
});

export const paymentFormSchema = strictObjectWithReturnTo({
  invoiceId: adminIdField,
  amount: z.coerce.number().positive().max(999999999),
  paymentDate: dateString,
  paymentReference: z.string().optional().transform((value) => sanitizeOptionalText(value, 160)),
  notes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  method: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 30))
    .refine((value) => !value || PAYMENT_METHODS.includes(value as (typeof PAYMENT_METHODS)[number]), 'Invalid payment method'),
});

export const portalDocumentFormSchema = strictObjectWithReturnTo({
  title: requiredText('Title', 3, 180),
  description: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  type: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 40))
    .refine(
      (value) => !value || PORTAL_DOCUMENT_TYPES.includes(value as (typeof PORTAL_DOCUMENT_TYPES)[number]),
      'Invalid document type',
    ),
  url: z
    .string()
    .transform((value) => sanitizeText(value, 2048))
    .refine((value) => /^https?:\/\/[^\s]+$/i.test(value) || /^\/[^\s]*$/.test(value), 'Document URL must be a valid path or URL'),
  fileName: z.string().optional().transform((value) => sanitizeOptionalText(value, 255)),
  mimeType: z.string().optional().transform((value) => sanitizeOptionalText(value, 120)),
  bytes: z.coerce.number().int().min(0).max(20_000_000).optional(),
  leadId: adminIdField,
  quoteRequestId: adminIdField,
  deliveryProjectId: adminIdField,
  approvalStatus: z
    .string()
    .optional()
    .transform((value) => sanitizeOptionalText(value, 30))
    .refine(
      (value) => !value || DOCUMENT_APPROVAL_STATUSES.includes(value as (typeof DOCUMENT_APPROVAL_STATUSES)[number]),
      'Invalid document approval status',
    ),
  clientVisible: booleanish.optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  clientResponseNote: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
});

export const supplierFormSchema = strictObject({
  name: requiredText('Supplier name', 2, 180),
  contactPerson: optionalText(120),
  email: optionalEmailField(),
  phone: optionalPhoneText('Phone'),
  alternatePhone: optionalPhoneText('Alternate phone'),
  address: optionalText(220),
  cityArea: optionalText(140),
  notes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  supplyCategoriesText: z.string().optional().transform((value) => sanitizeOptionalText(value, 1200)),
  status: z.enum(SUPPLIER_STATUSES).default('ACTIVE'),
});

export const materialItemFormSchema = strictObject({
  name: requiredText('Material name', 2, 180),
  code: optionalText(80),
  category: optionalText(80),
  description: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  unit: requiredText('Unit', 1, 40),
  estimatedUnitCost: optionalCurrencyNumber,
  notes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  status: z.enum(MATERIAL_ITEM_STATUSES).default('ACTIVE'),
  defaultSupplierId: relationIdField,
});

export const projectProcurementItemFormSchema = strictObjectWithReturnTo({
  deliveryProjectId: requiredIdField('Project'),
  materialItemId: relationIdField,
  preferredSupplierId: relationIdField,
  name: requiredText('Item name', 2, 180),
  category: optionalText(80),
  description: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  unit: requiredText('Unit', 1, 40),
  estimatedQuantity: requiredDecimalNumber('Estimated quantity', 0.01),
  estimatedUnitCost: optionalCurrencyNumber,
  requiredBy: dateString,
  status: z.enum(PROCUREMENT_STATUSES).default('PLANNED'),
  notes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
});

export const purchaseRequestFormSchema = strictObjectWithReturnTo({
  deliveryProjectId: requiredIdField('Project'),
  supplierId: relationIdField,
  status: z.enum(PURCHASE_REQUEST_STATUSES).default('DRAFT'),
  requestDate: dateString,
  issueDate: dateString,
  expectedDeliveryDate: dateString,
  notes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  internalNotes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
});

export const projectAssignmentFormSchema = z
  .object({
    deliveryProjectId: requiredIdField('Project'),
    adminUserId: relationIdField,
    role: z.enum(PROJECT_ASSIGNMENT_ROLES),
    externalName: optionalText(160),
    externalCompany: optionalText(160),
    startDate: dateString,
    endDate: dateString,
    notes: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
    returnTo: returnToField,
  })
  .strict()
  .refine((value) => Boolean(value.adminUserId || value.externalName), {
    message: 'Provide an internal assignee or an external contact.',
    path: ['adminUserId'],
  });

export const siteTaskFormSchema = strictObjectWithReturnTo({
  deliveryProjectId: requiredIdField('Project'),
  projectMilestoneId: relationIdField,
  title: requiredText('Task title', 3, 180),
  description: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  status: z.enum(SITE_TASK_STATUSES).default('TODO'),
  priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
  dueDate: dateString,
  assignedToAdminId: relationIdField,
});

export const siteLogFormSchema = strictObjectWithReturnTo({
  deliveryProjectId: requiredIdField('Project'),
  logDate: requiredDateString('Log date'),
  summary: requiredText('Summary', 5, 4000),
  workCompleted: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  issuesRisks: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  nextSteps: z.string().optional().transform((value) => sanitizeOptionalText(value, 4000)),
  weatherConditions: optionalText(220),
  attachmentUrlsText: z.string().optional().transform((value) => sanitizeOptionalText(value, 8000)),
  clientVisible: booleanish.optional(),
});

export function splitLines(input?: string) {
  if (!input) return [];

  return input
    .split(/\r?\n/)
    .map((line) => sanitizeText(line, 240))
    .filter(Boolean);
}

export function splitMediaLines(input?: string) {
  if (!input) return [];

  return input
    .split(/\r?\n|,/)
    .map((line) => sanitizeText(line, 2048))
    .filter(Boolean);
}

export function splitTextList(input?: string, maxLength = 80, limit = 24) {
  if (!input) return [];

  return input
    .split(/\r?\n|,/)
    .map((line) => sanitizeText(line, maxLength))
    .filter(Boolean)
    .slice(0, limit);
}

export function splitTags(input?: string) {
  if (!input) return [];

  const tags = input
    .split(/\r?\n|,/)
    .map((tag) => sanitizeText(tag, 40).toLowerCase())
    .filter(Boolean);

  return [...new Set(tags)].slice(0, 20);
}

export function parseLineItems(input?: string) {
  if (!input) return [];

  return input
    .split(/\r?\n/)
    .map((raw) => sanitizeText(raw, 260))
    .filter(Boolean)
    .map((line) => {
      const [labelPart, amountPart] = line.split('|');
      const label = sanitizeText(labelPart, 180);
      const amount = sanitizeText(amountPart, 60);
      return { label, amount: amount || '' };
    })
    .filter((item) => Boolean(item.label));
}

export function normalizeSlugOrFallback(slug: string | undefined, title: string) {
  return slug || slugify(title);
}

export function parseBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (['false', '0', 'no', 'off'].includes(value.toLowerCase())) {
      return false;
    }
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
  return fallback;
}

export const allowedServiceTypes = [...SERVICE_TYPES];
export const allowedProjectTypes = [...PROJECT_TYPES];
export const allowedBudgetRanges = [...BUDGET_RANGES];

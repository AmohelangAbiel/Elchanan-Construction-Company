export const SERVICE_TYPES = [
  'Residential Construction',
  'Renovations and Upgrades',
  'Roofing and Ceilings',
  'Paving and Brickwork',
  'Plastering and Painting',
  'Home Improvements',
  'Commercial Fitout',
] as const;

export const PROJECT_TYPES = [
  'New Build',
  'Renovation',
  'Extension',
  'Commercial Fitout',
  'Infrastructure',
  'Maintenance',
] as const;

export const CONTACT_METHODS = ['Phone', 'Email', 'WhatsApp'] as const;

export const LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'QUOTED',
  'WON',
  'LOST',
  'INACTIVE',
] as const;

export const TASK_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const DELIVERY_PROJECT_STATUSES = ['PLANNED', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] as const;
export const SUPPLIER_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
export const MATERIAL_ITEM_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
export const PROCUREMENT_STATUSES = ['PLANNED', 'REQUESTED', 'ORDERED', 'RECEIVED', 'CANCELLED'] as const;
export const PURCHASE_REQUEST_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'] as const;
export const PROJECT_ASSIGNMENT_ROLES = ['PROJECT_MANAGER', 'SITE_SUPERVISOR', 'SALES_SUPPORT', 'GENERAL_STAFF', 'CONTRACTOR', 'OTHER'] as const;
export const PROJECT_MILESTONE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'] as const;
export const PORTAL_DOCUMENT_TYPES = ['QUOTE', 'PROJECT', 'GENERAL', 'IMAGE', 'CONTRACT', 'AGREEMENT', 'SCOPE_DOCUMENT', 'TERMS_ATTACHMENT', 'OTHER', 'INVOICE'] as const;
export const QUOTE_APPROVAL_STATUSES = ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'ARCHIVED'] as const;
export const DOCUMENT_APPROVAL_STATUSES = ['DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'REJECTED', 'ARCHIVED'] as const;
export const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID', 'CANCELLED'] as const;
export const BILLING_TYPES = ['DEPOSIT', 'MILESTONE', 'FINAL', 'OTHER'] as const;
export const PAYMENT_METHODS = ['BANK_TRANSFER', 'CASH', 'CARD', 'OTHER'] as const;
export const SITE_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'] as const;

export const LEAD_SOURCE_TYPES = [
  'DIRECT',
  'CONTACT_PAGE',
  'QUOTE_PAGE',
  'SERVICE_PAGE',
  'PROJECT_PAGE',
  'WHATSAPP',
  'FORUM_PAGE',
  'OTHER',
] as const;

export const BUDGET_RANGES = [
  'Under R25,000',
  'R25,000 - R50,000',
  'R50,000 - R100,000',
  'R100,000 - R250,000',
  'R250,000 - R500,000',
  'R500,000+',
  'Not sure yet',
] as const;

export const FORUM_DEFAULT_CATEGORY_SLUG = 'general-advice';

export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://elchananconstruction.co.za';

export const ADMIN_COOKIE_NAME = 'elchanan_admin_token';
export const PORTAL_COOKIE_NAME = 'elchanan_portal_token';

export const RATE_LIMIT_WINDOWS = {
  formSubmit: { max: 10, windowMs: 10 * 60 * 1000 },
  forumSubmit: { max: 8, windowMs: 10 * 60 * 1000 },
  adminLoginIp: { max: 10, windowMs: 15 * 60 * 1000 },
  adminLoginEmail: { max: 6, windowMs: 15 * 60 * 1000 },
  adminLoginPair: { max: 5, windowMs: 15 * 60 * 1000 },
  portalLoginIp: { max: 10, windowMs: 15 * 60 * 1000 },
  portalLoginEmail: { max: 6, windowMs: 15 * 60 * 1000 },
  portalLoginPair: { max: 5, windowMs: 15 * 60 * 1000 },
} as const;

export const BODY_SIZE_LIMITS = {
  jsonForm: 64 * 1024,
  forumReply: 32 * 1024,
  adminLogin: 8 * 1024,
  adminForm: 128 * 1024,
  mediaUpload: 12 * 1024 * 1024,
} as const;

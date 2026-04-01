import type {
  ContactEnquiry,
  EnquiryStatus,
  LeadSourceType,
  Prisma,
  QuoteRequest,
  QuoteStatus,
} from '@prisma/client';
import { prisma } from './prisma';
import { BUDGET_RANGES, SERVICE_TYPES } from './constants';
import { sanitizeOptionalText } from './sanitize';

export type SearchParamValue = string | string[] | undefined;
export type SearchParamsInput = Record<string, SearchParamValue>;

export const ENQUIRY_STATUSES: EnquiryStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'];
export const QUOTE_STATUSES: QuoteStatus[] = ['NEW', 'REVIEWING', 'RESPONDED', 'WON', 'LOST', 'ARCHIVED'];
export const LEAD_SOURCE_TYPES: LeadSourceType[] = [
  'DIRECT',
  'CONTACT_PAGE',
  'QUOTE_PAGE',
  'SERVICE_PAGE',
  'PROJECT_PAGE',
  'WHATSAPP',
  'FORUM_PAGE',
  'OTHER',
];

export type DateRange = {
  from?: Date;
  to?: Date;
  fromRaw?: string;
  toRaw?: string;
};

export type EnquiryReportFilters = DateRange & {
  status?: EnquiryStatus;
  serviceInterest?: string;
  location?: string;
  sourceType?: LeadSourceType;
};

export type QuoteReportFilters = DateRange & {
  status?: QuoteStatus;
  serviceType?: string;
  budgetRange?: string;
  location?: string;
  sourceType?: LeadSourceType;
};

export type ModerationReportFilters = DateRange & {
  reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  threadStatus?: 'PENDING' | 'OPEN' | 'LOCKED' | 'HIDDEN';
  replyStatus?: 'PENDING' | 'APPROVED' | 'HIDDEN';
};

export type TrendPoint = {
  key: string;
  label: string;
  value: number;
};

export type NamedValue = {
  label: string;
  value: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_REPORT_RANGE_DAYS = 180;

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function optionalParam(value: SearchParamValue, max = 160) {
  return sanitizeOptionalText(firstParam(value), max);
}

function isDateInput(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function parseDateInput(value?: string, isEndOfDay = false) {
  if (!isDateInput(value)) return undefined;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;

  if (isEndOfDay) {
    parsed.setUTCHours(23, 59, 59, 999);
  } else {
    parsed.setUTCHours(0, 0, 0, 0);
  }

  return parsed;
}

function toStartOfDay(value: Date) {
  const normalized = new Date(value);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

function toEndOfDay(value: Date) {
  const normalized = new Date(value);
  normalized.setUTCHours(23, 59, 59, 999);
  return normalized;
}

function shiftDays(value: Date, days: number) {
  return new Date(value.getTime() + days * DAY_MS);
}

function normalizeDateRange(fromRaw?: string, toRaw?: string, fallbackDays = 30): DateRange {
  const parsedFrom = parseDateInput(fromRaw, false);
  const parsedTo = parseDateInput(toRaw, true);

  const safeFallbackDays = Math.min(Math.max(1, fallbackDays), MAX_REPORT_RANGE_DAYS);
  let to = parsedTo || toEndOfDay(new Date());
  let from = parsedFrom || toStartOfDay(shiftDays(to, -(safeFallbackDays - 1)));

  if (from.getTime() > to.getTime()) {
    const swappedFrom = toStartOfDay(to);
    const swappedTo = toEndOfDay(from);
    from = swappedFrom;
    to = swappedTo;
  }

  const spanDays = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;
  if (spanDays > MAX_REPORT_RANGE_DAYS) {
    from = toStartOfDay(shiftDays(to, -(MAX_REPORT_RANGE_DAYS - 1)));
  }

  return {
    from,
    to,
    fromRaw: from.toISOString().slice(0, 10),
    toRaw: to.toISOString().slice(0, 10),
  };
}

export function parseEnquiryReportFilters(searchParams?: SearchParamsInput): EnquiryReportFilters {
  const statusCandidate = optionalParam(searchParams?.status, 30);
  const sourceCandidate = optionalParam(searchParams?.sourceType, 30);
  const dateRange = normalizeDateRange(optionalParam(searchParams?.from, 20), optionalParam(searchParams?.to, 20));

  return {
    ...dateRange,
    status: ENQUIRY_STATUSES.includes(statusCandidate as EnquiryStatus)
      ? (statusCandidate as EnquiryStatus)
      : undefined,
    sourceType: LEAD_SOURCE_TYPES.includes(sourceCandidate as LeadSourceType)
      ? (sourceCandidate as LeadSourceType)
      : undefined,
    serviceInterest: optionalParam(searchParams?.serviceInterest, 120),
    location: optionalParam(searchParams?.location, 140),
  };
}

export function parseQuoteReportFilters(searchParams?: SearchParamsInput): QuoteReportFilters {
  const statusCandidate = optionalParam(searchParams?.status, 30);
  const sourceCandidate = optionalParam(searchParams?.sourceType, 30);
  const serviceCandidate = optionalParam(searchParams?.serviceType, 120);
  const budgetCandidate = optionalParam(searchParams?.budgetRange, 120);
  const dateRange = normalizeDateRange(optionalParam(searchParams?.from, 20), optionalParam(searchParams?.to, 20));

  return {
    ...dateRange,
    status: QUOTE_STATUSES.includes(statusCandidate as QuoteStatus)
      ? (statusCandidate as QuoteStatus)
      : undefined,
    sourceType: LEAD_SOURCE_TYPES.includes(sourceCandidate as LeadSourceType)
      ? (sourceCandidate as LeadSourceType)
      : undefined,
    serviceType: SERVICE_TYPES.includes(serviceCandidate as (typeof SERVICE_TYPES)[number])
      ? serviceCandidate
      : undefined,
    budgetRange: BUDGET_RANGES.includes(budgetCandidate as (typeof BUDGET_RANGES)[number])
      ? budgetCandidate
      : undefined,
    location: optionalParam(searchParams?.location, 140),
  };
}

export function parseModerationReportFilters(searchParams?: SearchParamsInput): ModerationReportFilters {
  const reviewStatus = optionalParam(searchParams?.reviewStatus, 20);
  const threadStatus = optionalParam(searchParams?.threadStatus, 20);
  const replyStatus = optionalParam(searchParams?.replyStatus, 20);
  const dateRange = normalizeDateRange(optionalParam(searchParams?.from, 20), optionalParam(searchParams?.to, 20));

  return {
    ...dateRange,
    reviewStatus: ['PENDING', 'APPROVED', 'REJECTED'].includes(reviewStatus || '')
      ? (reviewStatus as ModerationReportFilters['reviewStatus'])
      : undefined,
    threadStatus: ['PENDING', 'OPEN', 'LOCKED', 'HIDDEN'].includes(threadStatus || '')
      ? (threadStatus as ModerationReportFilters['threadStatus'])
      : undefined,
    replyStatus: ['PENDING', 'APPROVED', 'HIDDEN'].includes(replyStatus || '')
      ? (replyStatus as ModerationReportFilters['replyStatus'])
      : undefined,
  };
}

function withDateRangeFilter<T extends Prisma.ContactEnquiryWhereInput | Prisma.QuoteRequestWhereInput>(
  where: T,
  from?: Date,
  to?: Date,
) {
  if (!from && !to) return where;

  return {
    ...where,
    createdAt: {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    },
  };
}

export function buildEnquiryWhere(filters: EnquiryReportFilters): Prisma.ContactEnquiryWhereInput {
  const where: Prisma.ContactEnquiryWhereInput = {
    deletedAt: null,
  };

  if (filters.status) where.status = filters.status;
  if (filters.serviceInterest) where.serviceInterest = filters.serviceInterest;
  if (filters.sourceType) where.sourceType = filters.sourceType;
  if (filters.location) {
    where.location = { contains: filters.location, mode: 'insensitive' };
  }

  return withDateRangeFilter(where, filters.from, filters.to);
}

export function buildQuoteWhere(filters: QuoteReportFilters): Prisma.QuoteRequestWhereInput {
  const where: Prisma.QuoteRequestWhereInput = {
    deletedAt: null,
  };

  if (filters.status) where.status = filters.status;
  if (filters.serviceType) where.serviceType = filters.serviceType;
  if (filters.budgetRange) where.estimatedBudgetRange = filters.budgetRange;
  if (filters.sourceType) where.sourceType = filters.sourceType;
  if (filters.location) {
    where.location = { contains: filters.location, mode: 'insensitive' };
  }

  return withDateRangeFilter(where, filters.from, filters.to);
}

export function buildDateSeries(days: number, to = new Date()) {
  const safeDays = Math.min(Math.max(1, days), 180);
  const normalizedEnd = toEndOfDay(to);
  const start = toStartOfDay(shiftDays(normalizedEnd, -(safeDays - 1)));

  const series: TrendPoint[] = [];
  for (let index = 0; index < safeDays; index += 1) {
    const current = shiftDays(start, index);
    const key = current.toISOString().slice(0, 10);
    const label = current.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
    series.push({ key, label, value: 0 });
  }

  return {
    start,
    end: normalizedEnd,
    series,
  };
}

function applyDateCounts(series: TrendPoint[], records: Array<{ createdAt: Date }>) {
  const byKey = new Map(series.map((point) => [point.key, point]));
  records.forEach((record) => {
    const key = record.createdAt.toISOString().slice(0, 10);
    const target = byKey.get(key);
    if (target) {
      target.value += 1;
    }
  });
}

function toNamedValues(
  rows: Array<{ label: string | null; count: number }>,
  fallbackLabel: string,
  limit = 8,
) {
  return rows
    .map((row) => ({
      label: row.label && row.label.trim() ? row.label : fallbackLabel,
      value: row.count,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function safeRate(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function formatDateCell(date: Date | null | undefined) {
  if (!date) return '';
  return date.toISOString();
}

export function buildCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  function escapeCell(cell: string | number | boolean | null | undefined) {
    const value = cell === null || cell === undefined ? '' : String(cell);
    if (!/[",\n]/.test(value)) return value;
    return `"${value.replace(/"/g, '""')}"`;
  }

  const lines = [headers.map(escapeCell).join(',')];
  rows.forEach((row) => {
    lines.push(row.map(escapeCell).join(','));
  });
  return lines.join('\n');
}

export type DashboardAnalytics = {
  totals: {
    totalEnquiries: number;
    newEnquiries: number;
    inProgressEnquiries: number;
    resolvedEnquiries: number;
    totalQuotes: number;
    wonQuotes: number;
    lostQuotes: number;
    pendingReviews: number;
    pendingForumItems: number;
    servicesPublished: number;
    servicesDraft: number;
    projectsPublished: number;
    projectsDraft: number;
  };
  kpis: {
    enquiryToQuoteRate: number;
    quoteWinRate: number;
    unresolvedLeadBacklog: number;
    averageLeadsPerWeek: number;
    averageLeadsPerMonth: number;
  };
  trends: {
    enquiries: TrendPoint[];
    quotes: TrendPoint[];
    reviews: TrendPoint[];
    forumActivity: TrendPoint[];
  };
  distributions: {
    quoteStatuses: NamedValue[];
    serviceDemand: NamedValue[];
    budgetDemand: NamedValue[];
    leadSources: NamedValue[];
  };
  activity: Array<{
    id: string;
    type: 'enquiry' | 'quote' | 'review' | 'thread' | 'reply';
    title: string;
    detail: string;
    at: Date;
    href: string;
  }>;
};

type EnquiryRow = Pick<
  ContactEnquiry,
  | 'id'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'subject'
  | 'serviceInterest'
  | 'location'
  | 'preferredContactMethod'
  | 'status'
  | 'referenceCode'
  | 'sourceType'
  | 'sourcePage'
  | 'utmSource'
  | 'utmMedium'
  | 'utmCampaign'
  | 'createdAt'
  | 'lastContactedAt'
>;

type QuoteRow = Pick<
  QuoteRequest,
  | 'id'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'serviceType'
  | 'projectType'
  | 'location'
  | 'estimatedBudgetRange'
  | 'status'
  | 'referenceCode'
  | 'sourceType'
  | 'sourcePage'
  | 'utmSource'
  | 'utmMedium'
  | 'utmCampaign'
  | 'createdAt'
  | 'quoteSentAt'
>;

export type EnquiryReportData = {
  filters: EnquiryReportFilters;
  summary: {
    total: number;
    unresolved: number;
    statusBreakdown: NamedValue[];
    serviceDemand: NamedValue[];
    locationDemand: NamedValue[];
    leadSources: NamedValue[];
  };
  trends: TrendPoint[];
  options: {
    serviceInterests: string[];
  };
  rows: EnquiryRow[];
};

export type QuoteReportData = {
  filters: QuoteReportFilters;
  summary: {
    total: number;
    responded: number;
    won: number;
    lost: number;
    winRate: number;
    statusBreakdown: NamedValue[];
    serviceDemand: NamedValue[];
    budgetDemand: NamedValue[];
    leadSources: NamedValue[];
  };
  trends: TrendPoint[];
  rows: QuoteRow[];
};

export type ContentReportData = {
  services: { published: number; draft: number; archived: number };
  projects: { published: number; draft: number; archived: number };
  pricing: { published: number; draft: number; archived: number };
  recentActivity: Array<{ type: string; title: string; status: string; updatedAt: Date; href: string }>;
};

export type ModerationReportData = {
  filters: ModerationReportFilters;
  summary: {
    pendingReviews: number;
    approvedReviews: number;
    rejectedReviews: number;
    pendingThreads: number;
    openThreads: number;
    pendingReplies: number;
    approvedReplies: number;
    hiddenReplies: number;
  };
  trends: {
    reviews: TrendPoint[];
    forumThreads: TrendPoint[];
    forumReplies: TrendPoint[];
  };
  recentQueue: Array<{ id: string; type: 'review' | 'thread' | 'reply'; title: string; status: string; href: string; createdAt: Date }>;
};

function statusCountsToNamedValues(
  statuses: string[],
  rows: Array<{ status: string; _count: { _all: number } }>,
) {
  const lookup = new Map(rows.map((row) => [row.status, row._count._all]));
  return statuses.map((status) => ({
    label: status.replace('_', ' '),
    value: lookup.get(status) || 0,
  }));
}

function statusRowsToMap(rows: Array<{ status: string; _count: { _all: number } }>) {
  return new Map(rows.map((row) => [row.status, row._count._all]));
}

function sumStatusCounts(rows: Array<{ _count: { _all: number } }>) {
  return rows.reduce((sum, row) => sum + row._count._all, 0);
}

function trendFromRecords(records: Array<{ createdAt: Date }>, from?: Date, to?: Date, fallbackDays = 30) {
  if (from && to) {
    const days = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;
    const series = buildDateSeries(days, to).series;
    applyDateCounts(series, records);
    return series;
  }

  const series = buildDateSeries(fallbackDays).series;
  applyDateCounts(series, records);
  return series;
}

export async function getDashboardAnalytics(windowDays = 30): Promise<DashboardAnalytics> {
  const { start, end, series } = buildDateSeries(windowDays);
  const cutoff = toStartOfDay(shiftDays(new Date(), -7));

  const [
    enquiryStatusRows,
    quoteStatusRows,
    pendingReviews,
    pendingThreads,
    pendingReplies,
    servicePublishRows,
    projectStatusRows,
    enquiryTrendRecords,
    quoteTrendRecords,
    reviewTrendRecords,
    forumThreadTrendRecords,
    forumReplyTrendRecords,
    enquiryServiceRows,
    quoteServiceRows,
    quoteBudgetRows,
    enquiryLeadSourceRows,
    quoteLeadSourceRows,
    unresolvedEnquiryBacklog,
    unresolvedQuoteBacklog,
    recentEnquiries,
    recentQuotes,
    recentReviews,
    recentThreads,
    recentReplies,
  ] = await Promise.all([
    prisma.contactEnquiry.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.quoteRequest.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.review.count({ where: { deletedAt: null, status: 'PENDING' } }),
    prisma.forumThread.count({ where: { deletedAt: null, status: 'PENDING' } }),
    prisma.forumReply.count({ where: { deletedAt: null, status: 'PENDING' } }),
    prisma.service.groupBy({
      by: ['published'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.project.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.contactEnquiry.findMany({
      where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    }),
    prisma.quoteRequest.findMany({
      where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    }),
    prisma.review.findMany({
      where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    }),
    prisma.forumThread.findMany({
      where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    }),
    prisma.forumReply.findMany({
      where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    }),
    prisma.contactEnquiry.groupBy({
      by: ['serviceInterest'],
      where: { deletedAt: null, serviceInterest: { not: null } },
      _count: { _all: true },
    }),
    prisma.quoteRequest.groupBy({
      by: ['serviceType'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.quoteRequest.groupBy({
      by: ['estimatedBudgetRange'],
      where: { deletedAt: null, estimatedBudgetRange: { not: null } },
      _count: { _all: true },
    }),
    prisma.contactEnquiry.groupBy({
      by: ['sourceType'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.quoteRequest.groupBy({
      by: ['sourceType'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.contactEnquiry.count({
      where: {
        deletedAt: null,
        status: { in: ['NEW', 'IN_PROGRESS'] },
        createdAt: { lte: cutoff },
      },
    }),
    prisma.quoteRequest.count({
      where: {
        deletedAt: null,
        status: { in: ['NEW', 'REVIEWING', 'RESPONDED'] },
        createdAt: { lte: cutoff },
      },
    }),
    prisma.contactEnquiry.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        subject: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.quoteRequest.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        serviceType: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.review.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: {
        id: true,
        name: true,
        rating: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.forumThread.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.forumReply.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 4,
      include: {
        thread: {
          select: { id: true, title: true },
        },
      },
    }),
  ]);

  const enquiryStatusMap = statusRowsToMap(
    enquiryStatusRows.map((row) => ({ status: row.status, _count: row._count })),
  );
  const quoteStatusMap = statusRowsToMap(
    quoteStatusRows.map((row) => ({ status: row.status, _count: row._count })),
  );
  const projectStatusMap = statusRowsToMap(
    projectStatusRows.map((row) => ({ status: row.status, _count: row._count })),
  );
  const servicePublishMap = new Map(
    servicePublishRows.map((row) => [row.published, row._count._all]),
  );

  const totalEnquiries = sumStatusCounts(enquiryStatusRows.map((row) => ({ _count: row._count })));
  const newEnquiries = enquiryStatusMap.get('NEW') || 0;
  const inProgressEnquiries = enquiryStatusMap.get('IN_PROGRESS') || 0;
  const resolvedEnquiries = enquiryStatusMap.get('RESOLVED') || 0;

  const totalQuotes = sumStatusCounts(quoteStatusRows.map((row) => ({ _count: row._count })));
  const wonQuotes = quoteStatusMap.get('WON') || 0;
  const lostQuotes = quoteStatusMap.get('LOST') || 0;

  const servicesPublished = servicePublishMap.get(true) || 0;
  const servicesDraft = servicePublishMap.get(false) || 0;
  const projectsPublished = projectStatusMap.get('PUBLISHED') || 0;
  const projectsDraft = projectStatusMap.get('DRAFT') || 0;

  const enquirySeries = series.map((point) => ({ ...point }));
  const quoteSeries = series.map((point) => ({ ...point }));
  const reviewSeries = series.map((point) => ({ ...point }));
  const forumSeries = series.map((point) => ({ ...point }));

  applyDateCounts(enquirySeries, enquiryTrendRecords);
  applyDateCounts(quoteSeries, quoteTrendRecords);
  applyDateCounts(reviewSeries, reviewTrendRecords);
  applyDateCounts(forumSeries, [...forumThreadTrendRecords, ...forumReplyTrendRecords]);

  const serviceDemandMap = new Map<string, number>();
  enquiryServiceRows.forEach((row) => {
    const key = row.serviceInterest || 'General enquiries';
    serviceDemandMap.set(key, (serviceDemandMap.get(key) || 0) + row._count._all);
  });
  quoteServiceRows.forEach((row) => {
    const key = row.serviceType || 'Unspecified';
    serviceDemandMap.set(key, (serviceDemandMap.get(key) || 0) + row._count._all);
  });

  const leadSourceMap = new Map<string, number>();
  enquiryLeadSourceRows.forEach((row) => {
    leadSourceMap.set(row.sourceType, (leadSourceMap.get(row.sourceType) || 0) + row._count._all);
  });
  quoteLeadSourceRows.forEach((row) => {
    leadSourceMap.set(row.sourceType, (leadSourceMap.get(row.sourceType) || 0) + row._count._all);
  });

  const quoteStatusBreakdown = statusCountsToNamedValues(
    QUOTE_STATUSES as string[],
    quoteStatusRows.map((row) => ({ status: row.status, _count: row._count })),
  );

  const budgetDemand = toNamedValues(
    quoteBudgetRows.map((row) => ({
      label: row.estimatedBudgetRange,
      count: row._count._all,
    })),
    'Not specified',
  );

  const serviceDemand = [...serviceDemandMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const leadSources = [...leadSourceMap.entries()]
    .map(([label, value]) => ({ label: label.replace('_', ' '), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const pendingForumItems = pendingThreads + pendingReplies;
  const unresolvedLeadBacklog = unresolvedEnquiryBacklog + unresolvedQuoteBacklog;

  const leadsInWindow = enquiryTrendRecords.length + quoteTrendRecords.length;
  const averageLeadsPerWeek = Math.round((leadsInWindow / Math.max(windowDays / 7, 1)) * 10) / 10;
  const averageLeadsPerMonth = Math.round((leadsInWindow / Math.max(windowDays / 30, 1)) * 10) / 10;

  const activity = [
    ...recentEnquiries.map((item) => ({
      id: item.id,
      type: 'enquiry' as const,
      title: item.fullName,
      detail: `${item.subject} (${item.status})`,
      at: item.createdAt,
      href: `/admin/enquiries/${item.id}`,
    })),
    ...recentQuotes.map((item) => ({
      id: item.id,
      type: 'quote' as const,
      title: item.fullName,
      detail: `${item.serviceType} (${item.status})`,
      at: item.createdAt,
      href: `/admin/quotes/${item.id}`,
    })),
    ...recentReviews.map((item) => ({
      id: item.id,
      type: 'review' as const,
      title: item.name,
      detail: `Rating ${item.rating}/5 (${item.status})`,
      at: item.createdAt,
      href: `/admin/reviews/${item.id}`,
    })),
    ...recentThreads.map((item) => ({
      id: item.id,
      type: 'thread' as const,
      title: item.title,
      detail: `Forum thread (${item.status})`,
      at: item.createdAt,
      href: `/admin/forum/${item.id}`,
    })),
    ...recentReplies.map((item) => ({
      id: item.id,
      type: 'reply' as const,
      title: item.thread?.title || 'Forum reply',
      detail: `Reply by ${item.authorName} (${item.status})`,
      at: item.createdAt,
      href: `/admin/forum/${item.threadId}`,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 12);

  return {
    totals: {
      totalEnquiries,
      newEnquiries,
      inProgressEnquiries,
      resolvedEnquiries,
      totalQuotes,
      wonQuotes,
      lostQuotes,
      pendingReviews,
      pendingForumItems,
      servicesPublished,
      servicesDraft,
      projectsPublished,
      projectsDraft,
    },
    kpis: {
      enquiryToQuoteRate: safeRate(totalQuotes, totalEnquiries),
      quoteWinRate: safeRate(wonQuotes, totalQuotes),
      unresolvedLeadBacklog,
      averageLeadsPerWeek,
      averageLeadsPerMonth,
    },
    trends: {
      enquiries: enquirySeries,
      quotes: quoteSeries,
      reviews: reviewSeries,
      forumActivity: forumSeries,
    },
    distributions: {
      quoteStatuses: quoteStatusBreakdown,
      serviceDemand,
      budgetDemand,
      leadSources,
    },
    activity,
  };
}

export async function getEnquiryReportData(
  filters: EnquiryReportFilters,
  options?: { limit?: number },
): Promise<EnquiryReportData> {
  const where = buildEnquiryWhere(filters);
  const limit = Math.min(Math.max(options?.limit || 100, 1), 5000);

  const [rows, total, statusRows, serviceRows, locationRows, leadSourceRows, trendRecords, serviceOptions] = await Promise.all([
    prisma.contactEnquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        subject: true,
        serviceInterest: true,
        location: true,
        preferredContactMethod: true,
        status: true,
        referenceCode: true,
        sourceType: true,
        sourcePage: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        createdAt: true,
        lastContactedAt: true,
      },
    }),
    prisma.contactEnquiry.count({ where }),
    prisma.contactEnquiry.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
    prisma.contactEnquiry.groupBy({
      by: ['serviceInterest'],
      where: {
        ...where,
        serviceInterest: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.contactEnquiry.groupBy({
      by: ['location'],
      where: {
        ...where,
        location: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.contactEnquiry.groupBy({
      by: ['sourceType'],
      where,
      _count: { _all: true },
    }),
    prisma.contactEnquiry.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.contactEnquiry.findMany({
      where: {
        deletedAt: null,
        serviceInterest: { not: null },
      },
      select: { serviceInterest: true },
      distinct: ['serviceInterest'],
      orderBy: { serviceInterest: 'asc' },
    }),
  ]);

  const unresolved = (statusRows.find((row) => row.status === 'NEW')?._count._all || 0)
    + (statusRows.find((row) => row.status === 'IN_PROGRESS')?._count._all || 0);
  const statusBreakdown = statusCountsToNamedValues(
    ENQUIRY_STATUSES as string[],
    statusRows.map((row) => ({ status: row.status, _count: row._count })),
  );

  return {
    filters,
    summary: {
      total,
      unresolved,
      statusBreakdown,
      serviceDemand: toNamedValues(
        serviceRows.map((row) => ({ label: row.serviceInterest, count: row._count._all })),
        'General enquiries',
      ),
      locationDemand: toNamedValues(
        locationRows.map((row) => ({ label: row.location, count: row._count._all })),
        'Unspecified',
      ),
      leadSources: toNamedValues(
        leadSourceRows.map((row) => ({ label: row.sourceType, count: row._count._all })),
        'DIRECT',
      ).map((row) => ({ ...row, label: row.label.replace('_', ' ') })),
    },
    trends: trendFromRecords(trendRecords, filters.from, filters.to),
    options: {
      serviceInterests: serviceOptions
        .map((item) => item.serviceInterest)
        .filter((item): item is string => Boolean(item)),
    },
    rows,
  };
}

export async function getQuoteReportData(
  filters: QuoteReportFilters,
  options?: { limit?: number },
): Promise<QuoteReportData> {
  const where = buildQuoteWhere(filters);
  const limit = Math.min(Math.max(options?.limit || 100, 1), 5000);

  const [rows, total, statusRows, serviceRows, budgetRows, sourceRows, trendRecords] = await Promise.all([
    prisma.quoteRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        serviceType: true,
        projectType: true,
        location: true,
        estimatedBudgetRange: true,
        status: true,
        referenceCode: true,
        sourceType: true,
        sourcePage: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        createdAt: true,
        quoteSentAt: true,
      },
    }),
    prisma.quoteRequest.count({ where }),
    prisma.quoteRequest.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
    prisma.quoteRequest.groupBy({
      by: ['serviceType'],
      where,
      _count: { _all: true },
    }),
    prisma.quoteRequest.groupBy({
      by: ['estimatedBudgetRange'],
      where: { ...where, estimatedBudgetRange: { not: null } },
      _count: { _all: true },
    }),
    prisma.quoteRequest.groupBy({
      by: ['sourceType'],
      where,
      _count: { _all: true },
    }),
    prisma.quoteRequest.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const won = statusRows.find((row) => row.status === 'WON')?._count._all || 0;
  const lost = statusRows.find((row) => row.status === 'LOST')?._count._all || 0;
  const responded = statusRows.find((row) => row.status === 'RESPONDED')?._count._all || 0;

  return {
    filters,
    summary: {
      total,
      responded,
      won,
      lost,
      winRate: safeRate(won, total),
      statusBreakdown: statusCountsToNamedValues(
        QUOTE_STATUSES as string[],
        statusRows.map((row) => ({ status: row.status, _count: row._count })),
      ),
      serviceDemand: toNamedValues(
        serviceRows.map((row) => ({ label: row.serviceType, count: row._count._all })),
        'Unspecified',
      ),
      budgetDemand: toNamedValues(
        budgetRows.map((row) => ({ label: row.estimatedBudgetRange, count: row._count._all })),
        'Not specified',
      ),
      leadSources: toNamedValues(
        sourceRows.map((row) => ({ label: row.sourceType, count: row._count._all })),
        'DIRECT',
      ).map((row) => ({ ...row, label: row.label.replace('_', ' ') })),
    },
    trends: trendFromRecords(trendRecords, filters.from, filters.to),
    rows,
  };
}

export async function getContentReportData(): Promise<ContentReportData> {
  const [
    servicesPublished,
    servicesDraft,
    projectsPublished,
    projectsDraft,
    projectsArchived,
    pricingPublished,
    pricingDraft,
    recentServices,
    recentProjects,
    recentPricing,
  ] = await Promise.all([
    prisma.service.count({ where: { deletedAt: null, published: true } }),
    prisma.service.count({ where: { deletedAt: null, published: false } }),
    prisma.project.count({ where: { deletedAt: null, status: 'PUBLISHED' } }),
    prisma.project.count({ where: { deletedAt: null, status: 'DRAFT' } }),
    prisma.project.count({ where: { deletedAt: null, status: 'ARCHIVED' } }),
    prisma.pricingPlan.count({ where: { deletedAt: null, published: true } }),
    prisma.pricingPlan.count({ where: { deletedAt: null, published: false } }),
    prisma.service.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: { id: true, title: true, published: true, updatedAt: true },
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: { id: true, title: true, status: true, updatedAt: true },
    }),
    prisma.pricingPlan.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: { id: true, title: true, published: true, updatedAt: true },
    }),
  ]);

  const recentActivity = [
    ...recentServices.map((item) => ({
      type: 'Service',
      title: item.title,
      status: item.published ? 'PUBLISHED' : 'DRAFT',
      updatedAt: item.updatedAt,
      href: `/admin/services?highlight=${item.id}`,
    })),
    ...recentProjects.map((item) => ({
      type: 'Project',
      title: item.title,
      status: item.status,
      updatedAt: item.updatedAt,
      href: `/admin/projects?highlight=${item.id}`,
    })),
    ...recentPricing.map((item) => ({
      type: 'Pricing',
      title: item.title,
      status: item.published ? 'PUBLISHED' : 'DRAFT',
      updatedAt: item.updatedAt,
      href: `/admin/pricing?highlight=${item.id}`,
    })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 12);

  return {
    services: {
      published: servicesPublished,
      draft: servicesDraft,
      archived: 0,
    },
    projects: {
      published: projectsPublished,
      draft: projectsDraft,
      archived: projectsArchived,
    },
    pricing: {
      published: pricingPublished,
      draft: pricingDraft,
      archived: 0,
    },
    recentActivity,
  };
}

export async function getModerationReportData(filters: ModerationReportFilters): Promise<ModerationReportData> {
  const reviewWhere: Prisma.ReviewWhereInput = {
    deletedAt: null,
    ...(filters.reviewStatus ? { status: filters.reviewStatus } : {}),
    ...((filters.from || filters.to)
      ? {
        createdAt: {
          ...(filters.from ? { gte: filters.from } : {}),
          ...(filters.to ? { lte: filters.to } : {}),
        },
      }
      : {}),
  };

  const threadWhere: Prisma.ForumThreadWhereInput = {
    deletedAt: null,
    ...(filters.threadStatus ? { status: filters.threadStatus } : {}),
    ...((filters.from || filters.to)
      ? {
        createdAt: {
          ...(filters.from ? { gte: filters.from } : {}),
          ...(filters.to ? { lte: filters.to } : {}),
        },
      }
      : {}),
  };

  const replyWhere: Prisma.ForumReplyWhereInput = {
    deletedAt: null,
    ...(filters.replyStatus ? { status: filters.replyStatus } : {}),
    ...((filters.from || filters.to)
      ? {
        createdAt: {
          ...(filters.from ? { gte: filters.from } : {}),
          ...(filters.to ? { lte: filters.to } : {}),
        },
      }
      : {}),
  };

  const [
    reviewStatusRows,
    threadStatusRows,
    replyStatusRows,
    reviewTrendRecords,
    threadTrendRecords,
    replyTrendRecords,
    recentReviews,
    recentThreads,
    recentReplies,
  ] = await Promise.all([
    prisma.review.groupBy({
      by: ['status'],
      where: reviewWhere,
      _count: { _all: true },
    }),
    prisma.forumThread.groupBy({
      by: ['status'],
      where: threadWhere,
      _count: { _all: true },
    }),
    prisma.forumReply.groupBy({
      by: ['status'],
      where: replyWhere,
      _count: { _all: true },
    }),
    prisma.review.findMany({
      where: reviewWhere,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.forumThread.findMany({
      where: threadWhere,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.forumReply.findMany({
      where: replyWhere,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.review.findMany({
      where: reviewWhere,
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, name: true, status: true, createdAt: true },
    }),
    prisma.forumThread.findMany({
      where: threadWhere,
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
    prisma.forumReply.findMany({
      where: replyWhere,
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        thread: {
          select: { id: true, title: true },
        },
      },
    }),
  ]);

  const reviewMap = new Map(reviewStatusRows.map((row) => [row.status, row._count._all]));
  const threadMap = new Map(threadStatusRows.map((row) => [row.status, row._count._all]));
  const replyMap = new Map(replyStatusRows.map((row) => [row.status, row._count._all]));

  const queue = [
    ...recentReviews.map((item) => ({
      id: item.id,
      type: 'review' as const,
      title: item.name,
      status: item.status,
      href: `/admin/reviews/${item.id}`,
      createdAt: item.createdAt,
    })),
    ...recentThreads.map((item) => ({
      id: item.id,
      type: 'thread' as const,
      title: item.title,
      status: item.status,
      href: `/admin/forum/${item.id}`,
      createdAt: item.createdAt,
    })),
    ...recentReplies.map((item) => ({
      id: item.id,
      type: 'reply' as const,
      title: item.thread?.title || 'Forum reply',
      status: item.status,
      href: `/admin/forum/${item.threadId}`,
      createdAt: item.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 15);

  return {
    filters,
    summary: {
      pendingReviews: reviewMap.get('PENDING') || 0,
      approvedReviews: reviewMap.get('APPROVED') || 0,
      rejectedReviews: reviewMap.get('REJECTED') || 0,
      pendingThreads: threadMap.get('PENDING') || 0,
      openThreads: threadMap.get('OPEN') || 0,
      pendingReplies: replyMap.get('PENDING') || 0,
      approvedReplies: replyMap.get('APPROVED') || 0,
      hiddenReplies: replyMap.get('HIDDEN') || 0,
    },
    trends: {
      reviews: trendFromRecords(reviewTrendRecords, filters.from, filters.to),
      forumThreads: trendFromRecords(threadTrendRecords, filters.from, filters.to),
      forumReplies: trendFromRecords(replyTrendRecords, filters.from, filters.to),
    },
    recentQueue: queue,
  };
}

export function buildEnquiriesCsv(rows: EnquiryRow[]) {
  return buildCsv(
    [
      'Submitted At',
      'Reference',
      'Full Name',
      'Email',
      'Phone',
      'Status',
      'Subject',
      'Service Interest',
      'Preferred Contact',
      'Location',
      'Source Type',
      'Source Page',
      'UTM Source',
      'UTM Medium',
      'UTM Campaign',
      'Last Contacted At',
    ],
    rows.map((row) => [
      formatDateCell(row.createdAt),
      row.referenceCode,
      row.fullName,
      row.email,
      row.phone,
      row.status,
      row.subject,
      row.serviceInterest || '',
      row.preferredContactMethod || '',
      row.location || '',
      row.sourceType,
      row.sourcePage || '',
      row.utmSource || '',
      row.utmMedium || '',
      row.utmCampaign || '',
      formatDateCell(row.lastContactedAt),
    ]),
  );
}

export function buildQuotesCsv(rows: QuoteRow[]) {
  return buildCsv(
    [
      'Submitted At',
      'Reference',
      'Full Name',
      'Email',
      'Phone',
      'Status',
      'Service Type',
      'Project Type',
      'Budget Range',
      'Location',
      'Source Type',
      'Source Page',
      'UTM Source',
      'UTM Medium',
      'UTM Campaign',
      'Quote Sent At',
    ],
    rows.map((row) => [
      formatDateCell(row.createdAt),
      row.referenceCode,
      row.fullName,
      row.email,
      row.phone,
      row.status,
      row.serviceType,
      row.projectType || '',
      row.estimatedBudgetRange || '',
      row.location || '',
      row.sourceType,
      row.sourcePage || '',
      row.utmSource || '',
      row.utmMedium || '',
      row.utmCampaign || '',
      formatDateCell(row.quoteSentAt),
    ]),
  );
}

import Link from 'next/link';
import { Prisma } from '@prisma/client';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  ClipboardCheck,
  FolderKanban,
  MessageSquareMore,
  NotebookPen,
  PackageSearch,
  Quote,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import { requireAdminSession } from '../../lib/auth';
import { getDashboardAnalytics } from '../../lib/analytics';
import { canAccessCrm, canAccessOperations } from '../../lib/permissions';
import { prisma } from '../../lib/prisma';
import { AdminTopNav } from './components/AdminTopNav';
import { DistributionBars, MiniTrendChart } from './reports/components/Charts';

export const dynamic = 'force-dynamic';

const metricCards = [
  { label: 'Total enquiries', key: 'totalEnquiries', href: '/admin/enquiries', icon: Users },
  { label: 'New enquiries', key: 'newEnquiries', href: '/admin/enquiries?status=NEW', icon: MessageSquareMore },
  { label: 'In-progress enquiries', key: 'inProgressEnquiries', href: '/admin/enquiries?status=IN_PROGRESS', icon: TrendingUp },
  { label: 'Resolved enquiries', key: 'resolvedEnquiries', href: '/admin/enquiries?status=RESOLVED', icon: ClipboardCheck },
  { label: 'Total quotes', key: 'totalQuotes', href: '/admin/quotes', icon: Quote },
  { label: 'Won quotes', key: 'wonQuotes', href: '/admin/quotes?status=WON', icon: BarChart3 },
  { label: 'Pending reviews', key: 'pendingReviews', href: '/admin/reviews', icon: ShieldCheck },
  { label: 'Pending forum items', key: 'pendingForumItems', href: '/admin/forum', icon: FolderKanban },
] as const;

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const analytics = await getDashboardAnalytics(30);
  const hasCrmAccess = canAccessCrm(session.role);
  const hasOperationsAccess = canAccessOperations(session.role);

  let leadStatusRows: Array<{ status: string; _count: { _all: number } }> = [];
  let overdueTasks = 0;
  let myOpenTasks: Awaited<ReturnType<typeof prisma.followUpTask.findMany>> = [];
  let myAssignedLeads = 0;
  let myAssignedQuotes = 0;
  let activeDeliveryProjects = 0;
  let pendingQuotesCount = 0;
  let recentEnquiries: Array<{
    id: string;
    fullName: string;
    subject: string;
    status: string;
    createdAt: Date;
  }> = [];
  let featuredPendingQuote:
    | {
        id: string;
        referenceCode: string;
        fullName: string;
        serviceType: string;
        status: string;
      }
    | null = null;
  let featuredActiveProject:
    | {
        id: string;
        title: string;
        projectCode: string | null;
        lead: { fullName: string } | null;
        quoteRequest: { referenceCode: string } | null;
      }
    | null = null;
  let featuredCompletedProject:
    | {
        id: string;
        title: string;
        projectCode: string | null;
        lead: { fullName: string } | null;
        quoteRequest: { referenceCode: string } | null;
      }
    | null = null;
  let activeProjectsNeedingProcurement = 0;
  let overdueSiteTasks = 0;
  let blockedSiteTasks = 0;
  let pendingPurchaseRequests = 0;
  let upcomingRequiredBy: Array<{
    id: string;
    name: string;
    requiredBy: Date | null;
    deliveryProject: { id: string; title: string; projectCode: string | null };
  }> = [];
  let recentSiteLogs: Array<{
    id: string;
    summary: string;
    logDate: Date;
    deliveryProject: { id: string; title: string; projectCode: string | null };
  }> = [];

  if (hasCrmAccess) {
    try {
      [
        leadStatusRows,
        overdueTasks,
        myOpenTasks,
        myAssignedLeads,
        myAssignedQuotes,
        pendingQuotesCount,
        recentEnquiries,
        featuredPendingQuote,
      ] = await Promise.all([
        prisma.lead.groupBy({
          by: ['status'],
          where: { deletedAt: null },
          _count: { _all: true },
        }),
        prisma.followUpTask.count({
          where: {
            deletedAt: null,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
            dueAt: { lt: new Date() },
          },
        }),
        prisma.followUpTask.findMany({
          where: {
            deletedAt: null,
            assignedToAdminId: session.userId,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
          orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
          take: 5,
        }),
        prisma.lead.count({
          where: {
            deletedAt: null,
            assignedToAdminId: session.userId,
          },
        }),
        prisma.quoteRequest.count({
          where: {
            deletedAt: null,
            assignedToAdminId: session.userId,
            status: { in: ['NEW', 'REVIEWING', 'RESPONDED'] },
          },
        }),
        prisma.quoteRequest.count({
          where: {
            deletedAt: null,
            status: { in: ['NEW', 'REVIEWING', 'RESPONDED'] },
          },
        }),
        prisma.contactEnquiry.findMany({
          where: { deletedAt: null },
          orderBy: [{ createdAt: 'desc' }],
          take: 5,
          select: {
            id: true,
            fullName: true,
            subject: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.quoteRequest.findFirst({
          where: {
            deletedAt: null,
            status: { in: ['NEW', 'REVIEWING', 'RESPONDED'] },
          },
          orderBy: [{ createdAt: 'desc' }],
          select: {
            id: true,
            referenceCode: true,
            fullName: true,
            serviceType: true,
            status: true,
          },
        }),
      ]);
    } catch (error) {
      const isTableMissing =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2021', 'P2022'].includes(error.code);

      if (!isTableMissing) {
        throw error;
      }
    }
  }

  if (hasOperationsAccess) {
    try {
      [
        activeDeliveryProjects,
        featuredActiveProject,
        featuredCompletedProject,
        activeProjectsNeedingProcurement,
        overdueSiteTasks,
        blockedSiteTasks,
        pendingPurchaseRequests,
        upcomingRequiredBy,
        recentSiteLogs,
      ] = await Promise.all([
        prisma.deliveryProject.count({
          where: {
            deletedAt: null,
            status: 'ACTIVE',
          },
        }),
        prisma.deliveryProject.findFirst({
          where: {
            deletedAt: null,
            status: 'ACTIVE',
          },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            title: true,
            projectCode: true,
            lead: {
              select: { fullName: true },
            },
            quoteRequest: {
              select: { referenceCode: true },
            },
          },
        }),
        prisma.deliveryProject.findFirst({
          where: {
            deletedAt: null,
            status: 'COMPLETED',
          },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            title: true,
            projectCode: true,
            lead: {
              select: { fullName: true },
            },
            quoteRequest: {
              select: { referenceCode: true },
            },
          },
        }),
        prisma.deliveryProject.count({
          where: {
            deletedAt: null,
            status: { in: ['ACTIVE', 'PLANNED', 'ON_HOLD'] },
            procurementItems: {
              some: {
                status: { in: ['PLANNED', 'REQUESTED'] },
              },
            },
          },
        }),
        prisma.siteTask.count({
          where: {
            status: { in: ['TODO', 'IN_PROGRESS', 'BLOCKED'] },
            dueDate: { lt: new Date() },
            deliveryProject: { deletedAt: null },
          },
        }),
        prisma.siteTask.count({
          where: {
            status: 'BLOCKED',
            deliveryProject: { deletedAt: null },
          },
        }),
        prisma.purchaseRequest.count({
          where: {
            status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] },
            deliveryProject: { deletedAt: null },
          },
        }),
        prisma.projectProcurementItem.findMany({
          where: {
            status: { in: ['PLANNED', 'REQUESTED', 'ORDERED'] },
            requiredBy: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            deliveryProject: { deletedAt: null },
          },
          orderBy: [{ requiredBy: 'asc' }],
          take: 5,
          select: {
            id: true,
            name: true,
            requiredBy: true,
            deliveryProject: {
              select: { id: true, title: true, projectCode: true },
            },
          },
        }),
        prisma.siteLog.findMany({
          orderBy: [{ logDate: 'desc' }, { createdAt: 'desc' }],
          take: 5,
          select: {
            id: true,
            summary: true,
            logDate: true,
            deliveryProject: {
              select: { id: true, title: true, projectCode: true },
            },
          },
        }),
      ]);
    } catch (error) {
      const isTableMissing =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2021', 'P2022'].includes(error.code);

      if (!isTableMissing) {
        throw error;
      }
    }
  }

  const leadMap = new Map(leadStatusRows.map((row) => [row.status, row._count._all]));
  const totalLeads = leadStatusRows.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-cyan">Admin analytics</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Business intelligence overview</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Monitor lead flow, quote pipeline performance, moderation workload, and content readiness from one analytics surface.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/admin/reports" className="btn-primary px-5 py-2.5 text-xs uppercase tracking-[0.18em]">
              Open Reports
            </Link>
            <Link href="/admin/my-work" className="btn-ghost px-5 py-2.5 text-xs uppercase tracking-[0.18em]">
              My Work
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((item) => {
            const Icon = item.icon;
            const value = analytics.totals[item.key];
            return (
              <Link key={item.label} href={item.href} className="interactive-card rounded-2xl p-5">
                <span className="icon-pill mb-3">
                  <Icon size={16} />
                </span>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-cyan">{item.label}</p>
                <p className="mt-3 text-4xl font-semibold text-white">{value}</p>
              </Link>
            );
          })}
        </section>

        {hasCrmAccess ? (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Link href="/admin/leads" className="interactive-card rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Total leads</p>
              <p className="mt-3 text-3xl font-semibold text-white">{totalLeads}</p>
            </Link>
            <Link href="/admin/leads?status=QUALIFIED" className="interactive-card rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Qualified leads</p>
              <p className="mt-3 text-3xl font-semibold text-white">{leadMap.get('QUALIFIED') || 0}</p>
            </Link>
            <Link href="/admin/tasks" className="interactive-card rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Overdue tasks</p>
              <p className="mt-3 text-3xl font-semibold text-white">{overdueTasks}</p>
            </Link>
            <Link href="/admin/my-work" className="interactive-card rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">My assigned leads</p>
              <p className="mt-3 text-3xl font-semibold text-white">{myAssignedLeads}</p>
            </Link>
          </section>
        ) : null}

        {hasCrmAccess ? (
          <section className="mt-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Demo flow spotlight</h2>
                <p className="mt-2 text-sm text-slate-400">
                  The seeded workspace now tells a clean three-stage story from pending quote to active delivery and completed handover.
                </p>
              </div>
              <Link href="/admin/quotes" className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">
                Open quote board
              </Link>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-4 sm:grid-cols-2">
                <Link href={featuredActiveProject ? `/admin/projects/${featuredActiveProject.id}/operations` : '/admin/procurement'} className="interactive-card rounded-2xl p-5">
                  <span className="icon-pill mb-3">
                    <Wrench size={16} />
                  </span>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Active projects</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{activeDeliveryProjects}</p>
                  <p className="mt-2 text-sm text-slate-400">Delivery projects currently in execution.</p>
                </Link>
                <Link href="/admin/quotes?status=RESPONDED" className="interactive-card rounded-2xl p-5">
                  <span className="icon-pill mb-3">
                    <Quote size={16} />
                  </span>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pending quotes</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{pendingQuotesCount}</p>
                  <p className="mt-2 text-sm text-slate-400">Quotes still waiting on final client approval.</p>
                </Link>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">Recent enquiries</p>
                    <Link href="/admin/enquiries" className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">
                      View all
                    </Link>
                  </div>
                  <div className="mt-4 space-y-3">
                    {recentEnquiries.length ? recentEnquiries.map((enquiry) => (
                      <Link key={enquiry.id} href={`/admin/enquiries/${enquiry.id}`} className="block rounded-xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-brand-cyan/45">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-white">{enquiry.fullName}</p>
                          <span className="text-xs uppercase tracking-[0.16em] text-slate-500">{enquiry.status.replace('_', ' ')}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-300">{enquiry.subject}</p>
                        <p className="mt-2 text-xs text-slate-500">{new Date(enquiry.createdAt).toLocaleString('en-ZA')}</p>
                      </Link>
                    )) : (
                      <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-400">
                        Fresh enquiries will appear here as soon as they are captured.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5">
                  <p className="text-sm font-semibold text-white">Demo journey shortcuts</p>
                  <div className="mt-4 space-y-3">
                    {featuredPendingQuote ? (
                      <Link href={`/admin/quotes/${featuredPendingQuote.id}`} className="block rounded-xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-brand-cyan/45">
                        <p className="text-xs uppercase tracking-[0.16em] text-brand-cyan">1. Pending quote</p>
                        <p className="mt-2 font-semibold text-white">{featuredPendingQuote.referenceCode}</p>
                        <p className="mt-1 text-sm text-slate-300">{featuredPendingQuote.fullName} · {featuredPendingQuote.serviceType}</p>
                      </Link>
                    ) : null}
                    {featuredActiveProject ? (
                      <Link href={`/admin/projects/${featuredActiveProject.id}/operations`} className="block rounded-xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-brand-cyan/45">
                        <p className="text-xs uppercase tracking-[0.16em] text-brand-cyan">2. Active delivery</p>
                        <p className="mt-2 font-semibold text-white">{featuredActiveProject.projectCode || featuredActiveProject.title}</p>
                        <p className="mt-1 text-sm text-slate-300">
                          {featuredActiveProject.lead?.fullName || 'Client not linked'}
                          {featuredActiveProject.quoteRequest ? ` · ${featuredActiveProject.quoteRequest.referenceCode}` : ''}
                        </p>
                      </Link>
                    ) : null}
                    {featuredCompletedProject ? (
                      <Link href={`/admin/projects/${featuredCompletedProject.id}/operations`} className="block rounded-xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-brand-cyan/45">
                        <p className="text-xs uppercase tracking-[0.16em] text-brand-cyan">3. Completed handover</p>
                        <p className="mt-2 font-semibold text-white">{featuredCompletedProject.projectCode || featuredCompletedProject.title}</p>
                        <p className="mt-1 text-sm text-slate-300">
                          {featuredCompletedProject.lead?.fullName || 'Client not linked'}
                          {featuredCompletedProject.quoteRequest ? ` · ${featuredCompletedProject.quoteRequest.referenceCode}` : ''}
                        </p>
                      </Link>
                    ) : null}
                    {!featuredPendingQuote && !featuredActiveProject && !featuredCompletedProject ? (
                      <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-400">
                        Seed the demo dataset to unlock guided stage shortcuts here.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-6 grid gap-4 lg:grid-cols-4">
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Enquiry to quote rate</p>
            <p className="mt-3 text-3xl font-semibold text-white">{analytics.kpis.enquiryToQuoteRate}%</p>
            <p className="mt-2 text-sm text-slate-400">Share of enquiries that progress to formal quote requests.</p>
          </div>
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Quote win rate</p>
            <p className="mt-3 text-3xl font-semibold text-white">{analytics.kpis.quoteWinRate}%</p>
            <p className="mt-2 text-sm text-slate-400">Won opportunities across total quote requests.</p>
          </div>
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Average leads / week</p>
            <p className="mt-3 text-3xl font-semibold text-white">{analytics.kpis.averageLeadsPerWeek}</p>
            <p className="mt-2 text-sm text-slate-400">Based on combined enquiries and quotes in the last 30 days.</p>
          </div>
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Unresolved backlog</p>
            <p className="mt-3 text-3xl font-semibold text-white">{analytics.kpis.unresolvedLeadBacklog}</p>
            <p className="mt-2 text-sm text-slate-400">Open leads older than 7 days requiring follow-up.</p>
          </div>
        </section>

        {analytics.kpis.unresolvedLeadBacklog > 0 ? (
          <section className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4">
            <div className="flex items-start gap-3">
              <span className="icon-pill mt-0.5 border-amber-300/50 bg-amber-400/15 text-amber-200">
                <AlertTriangle size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-amber-100">Backlog attention needed</p>
                <p className="mt-1 text-sm text-amber-100/80">
                  There are {analytics.kpis.unresolvedLeadBacklog} unresolved leads older than 7 days. Prioritize status updates and follow-up outreach.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {hasCrmAccess ? (
          <section className="mt-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">My immediate workload</h2>
              <Link href="/admin/my-work" className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">
                Open my work
              </Link>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-300">My open tasks</p>
                {myOpenTasks.length ? myOpenTasks.map((task) => (
                  <Link key={task.id} href={`/admin/tasks/${task.id}?returnTo=/admin`} className="block rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition hover:border-brand-cyan/45">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">{task.title}</p>
                      <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{task.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Due {new Date(task.dueAt).toLocaleString()} · {task.priority}</p>
                  </Link>
                )) : (
                  <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-400">No open tasks assigned to you.</p>
                )}
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-300">My active quote ownership</p>
                <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">Assigned active quotes: <span className="font-semibold text-white">{myAssignedQuotes}</span></p>
                <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">Assigned leads: <span className="font-semibold text-white">{myAssignedLeads}</span></p>
                <Link href="/admin/quotes?mine=1" className="btn-ghost inline-flex px-4 py-2 text-xs uppercase tracking-[0.16em]">Open my quotes</Link>
              </div>
            </div>
          </section>
        ) : null}

        {hasOperationsAccess ? (
          <section className="mt-8 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Operations delivery board</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Internal procurement, execution, and field-reporting indicators for active projects.
                </p>
              </div>
              <Link href="/admin/procurement" className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">
                Open procurement
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Link href="/admin/procurement" className="interactive-card rounded-2xl p-5">
                <span className="icon-pill mb-3"><PackageSearch size={16} /></span>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Projects needing procurement</p>
                <p className="mt-2 text-3xl font-semibold text-white">{activeProjectsNeedingProcurement}</p>
              </Link>
              <Link href="/admin/site-tasks" className="interactive-card rounded-2xl p-5">
                <span className="icon-pill mb-3"><Wrench size={16} /></span>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Overdue site tasks</p>
                <p className="mt-2 text-3xl font-semibold text-white">{overdueSiteTasks}</p>
              </Link>
              <Link href="/admin/site-tasks?status=BLOCKED" className="interactive-card rounded-2xl p-5">
                <span className="icon-pill mb-3"><AlertTriangle size={16} /></span>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Blocked site tasks</p>
                <p className="mt-2 text-3xl font-semibold text-white">{blockedSiteTasks}</p>
              </Link>
              <Link href="/admin/procurement?status=SUBMITTED" className="interactive-card rounded-2xl p-5">
                <span className="icon-pill mb-3"><ShoppingCart size={16} /></span>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pending purchase records</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pendingPurchaseRequests}</p>
              </Link>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5">
                <div className="flex items-center gap-2">
                  <span className="icon-pill"><CalendarClock size={16} /></span>
                  <p className="text-sm font-semibold text-white">Upcoming required-by dates</p>
                </div>
                <div className="mt-4 space-y-3">
                  {upcomingRequiredBy.length ? upcomingRequiredBy.map((item) => (
                    <Link key={item.id} href={`/admin/projects/${item.deliveryProject.id}/operations`} className="block rounded-xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-brand-cyan/45">
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.deliveryProject.title} · Due {item.requiredBy ? new Date(item.requiredBy).toLocaleDateString() : 'Date not set'}
                      </p>
                    </Link>
                  )) : (
                    <p className="text-sm text-slate-400">No requirement deadlines are approaching in the next 7 days.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5">
                <div className="flex items-center gap-2">
                  <span className="icon-pill"><NotebookPen size={16} /></span>
                  <p className="text-sm font-semibold text-white">Recent site logs</p>
                </div>
                <div className="mt-4 space-y-3">
                  {recentSiteLogs.length ? recentSiteLogs.map((item) => (
                    <Link key={item.id} href={`/admin/projects/${item.deliveryProject.id}/operations`} className="block rounded-xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-brand-cyan/45">
                      <p className="font-semibold text-white">{item.deliveryProject.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{item.summary}</p>
                      <p className="mt-2 text-xs text-slate-500">{new Date(item.logDate).toLocaleDateString()}</p>
                    </Link>
                  )) : (
                    <p className="text-sm text-slate-400">No site log entries have been captured yet.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <MiniTrendChart title="Enquiries over time" subtitle="Last 30 days" data={analytics.trends.enquiries} accent="cyan" />
          <MiniTrendChart title="Quotes over time" subtitle="Last 30 days" data={analytics.trends.quotes} accent="sky" />
          <MiniTrendChart title="Review submissions" subtitle="Last 30 days" data={analytics.trends.reviews} accent="blue" />
          <MiniTrendChart title="Forum activity" subtitle="Threads + replies" data={analytics.trends.forumActivity} accent="cyan" />
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <DistributionBars title="Quote status mix" items={analytics.distributions.quoteStatuses} emptyMessage="No quote status data yet." />
          <DistributionBars title="Service demand" items={analytics.distributions.serviceDemand} emptyMessage="No service demand data captured yet." />
          <DistributionBars title="Lead source mix" items={analytics.distributions.leadSources} emptyMessage="No lead source data captured yet." />
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="interactive-card rounded-2xl p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">Recent activity</h2>
              <Link href="/admin/reports/moderation" className="text-sm text-brand-cyan hover:text-white">
                View moderation report
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {analytics.activity.length ? (
                analytics.activity.map((item) => (
                  <Link key={`${item.type}-${item.id}`} href={item.href} className="block rounded-xl border border-slate-800 bg-slate-900/80 p-3 transition hover:border-brand-cyan/45">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.type}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                    <p className="mt-2 text-xs text-slate-500">{item.at.toLocaleString('en-ZA')}</p>
                  </Link>
                ))
              ) : (
                <p className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
                  No recent activity has been recorded yet.
                </p>
              )}
            </div>
          </div>

          <div className="interactive-card rounded-2xl p-5">
            <h2 className="text-xl font-semibold text-white">Content readiness</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>Services: {analytics.totals.servicesPublished} published / {analytics.totals.servicesDraft} draft</p>
              <p>Projects: {analytics.totals.projectsPublished} published / {analytics.totals.projectsDraft} draft</p>
              <p>Pending moderation: {analytics.totals.pendingReviews + analytics.totals.pendingForumItems}</p>
            </div>
            <div className="mt-5 space-y-2">
              <Link href="/admin/reports/content" className="btn-ghost w-full py-2 text-xs uppercase tracking-[0.16em]">
                Content report
              </Link>
              <Link href="/admin/reports/enquiries" className="btn-primary w-full py-2 text-xs uppercase tracking-[0.16em]">
                Enquiry report
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}


import type { UserRole } from '@prisma/client';

export const ALL_ADMIN_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'SALES',
  'CONTENT_MANAGER',
  'MODERATOR',
];

export const OPERATIONS_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'SALES'];
export const CONTENT_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER'];
export const MODERATION_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'];
export const REPORTING_ROLES: UserRole[] = ALL_ADMIN_ROLES;
export const MEDIA_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'SALES'];

export const CRM_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'SALES'];
export const PROCUREMENT_ROLES: UserRole[] = OPERATIONS_ROLES;
export const SITE_OPERATIONS_ROLES: UserRole[] = OPERATIONS_ROLES;

export function hasRoleAccess(role: UserRole, allowedRoles: UserRole[]) {
  if (!allowedRoles.length) return true;
  if (role === 'SUPER_ADMIN') return true;
  return allowedRoles.includes(role);
}

export function canAccessOperations(role: UserRole) {
  return hasRoleAccess(role, OPERATIONS_ROLES);
}

export function canAccessContent(role: UserRole) {
  return hasRoleAccess(role, CONTENT_ROLES);
}

export function canAccessModeration(role: UserRole) {
  return hasRoleAccess(role, MODERATION_ROLES);
}

export function canAccessReporting(role: UserRole) {
  return hasRoleAccess(role, REPORTING_ROLES);
}

export function canAccessCrm(role: UserRole) {
  return hasRoleAccess(role, CRM_ROLES);
}

export function canAccessProcurement(role: UserRole) {
  return hasRoleAccess(role, PROCUREMENT_ROLES);
}

export function canAccessSiteOperations(role: UserRole) {
  return hasRoleAccess(role, SITE_OPERATIONS_ROLES);
}

export type AdminNavItem = {
  href: string;
  label: string;
  allowedRoles: UserRole[];
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin', label: 'Overview', allowedRoles: ALL_ADMIN_ROLES },
  { href: '/admin/my-work', label: 'My Work', allowedRoles: ALL_ADMIN_ROLES },
  { href: '/admin/leads', label: 'Leads', allowedRoles: CRM_ROLES },
  { href: '/admin/tasks', label: 'Tasks', allowedRoles: CRM_ROLES },
  { href: '/admin/enquiries', label: 'Enquiries', allowedRoles: OPERATIONS_ROLES },
  { href: '/admin/quotes', label: 'Quotes', allowedRoles: OPERATIONS_ROLES },
  { href: '/admin/procurement', label: 'Procurement', allowedRoles: PROCUREMENT_ROLES },
  { href: '/admin/suppliers', label: 'Suppliers', allowedRoles: PROCUREMENT_ROLES },
  { href: '/admin/materials', label: 'Materials', allowedRoles: PROCUREMENT_ROLES },
  { href: '/admin/site-tasks', label: 'Site Tasks', allowedRoles: SITE_OPERATIONS_ROLES },
  { href: '/admin/site-logs', label: 'Site Logs', allowedRoles: SITE_OPERATIONS_ROLES },
  { href: '/admin/invoices', label: 'Invoices', allowedRoles: OPERATIONS_ROLES },
  { href: '/admin/contracts', label: 'Contracts', allowedRoles: OPERATIONS_ROLES },
  { href: '/admin/reviews', label: 'Reviews', allowedRoles: MODERATION_ROLES },
  { href: '/admin/forum', label: 'Forum', allowedRoles: MODERATION_ROLES },
  { href: '/admin/reports', label: 'Reports', allowedRoles: REPORTING_ROLES },
  { href: '/admin/services', label: 'Services', allowedRoles: CONTENT_ROLES },
  { href: '/admin/projects', label: 'Projects', allowedRoles: CONTENT_ROLES },
  { href: '/admin/pricing', label: 'Pricing', allowedRoles: CONTENT_ROLES },
  { href: '/admin/media', label: 'Media', allowedRoles: MEDIA_ROLES },
  { href: '/admin/settings', label: 'Settings', allowedRoles: CONTENT_ROLES },
];

export function getAdminNavItemsForRole(role: UserRole) {
  return ADMIN_NAV_ITEMS.filter((item) => hasRoleAccess(role, item.allowedRoles));
}

export function isSessionAllowed(session: { role: UserRole } | null, allowedRoles: UserRole[]) {
  if (!session) return false;
  return hasRoleAccess(session.role, allowedRoles);
}

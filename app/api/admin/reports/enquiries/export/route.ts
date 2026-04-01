import {
  buildEnquiriesCsv,
  getEnquiryReportData,
  parseEnquiryReportFilters,
  type SearchParamsInput,
} from '../../../../../../lib/analytics';
import { requireAdminAuth } from '../../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../../lib/admin-access';
import { getRequestId, jsonError } from '../../../../../../lib/api';
import { getExportRowLimit } from '../../../../../../lib/env';
import { buildRequestLogMeta, logInfo, logWarn } from '../../../../../../lib/logger';
import { REPORTING_ROLES } from '../../../../../../lib/permissions';

function searchParamsToRecord(searchParams: URLSearchParams): SearchParamsInput {
  const output: SearchParamsInput = {};
  searchParams.forEach((value, key) => {
    if (!(key in output)) {
      output[key] = value;
    } else {
      const current = output[key];
      if (Array.isArray(current)) {
        current.push(value);
      } else if (typeof current === 'string') {
        output[key] = [current, value];
      }
    }
  });
  return output;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.reports.enquiries.export', requestId);

  const session = await requireAdminAuth();
  const roleError = enforceAdminApiRole({
    session,
    allowedRoles: REPORTING_ROLES,
    requestId,
    requestMeta,
    unauthorizedEvent: 'report_export.enquiries_unauthorized',
    forbiddenEvent: 'report_export.enquiries_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const url = new URL(request.url);
  const filters = parseEnquiryReportFilters(searchParamsToRecord(url.searchParams));
  const report = await getEnquiryReportData(filters, { limit: getExportRowLimit() });
  const csv = buildEnquiriesCsv(report.rows);

  logInfo('report_export.enquiries_success', {
    ...requestMeta,
    userId: adminSession.userId,
    rows: report.rows.length,
  });

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="enquiries-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'x-request-id': requestId,
    },
  });
}

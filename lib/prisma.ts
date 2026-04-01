import { PrismaClient } from '@prisma/client';
import { getEnvValidationReport } from './env';
import { logInfo, logWarn } from './logger';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  __elchananEnvReportLogged?: boolean;
};

if (!globalForPrisma.__elchananEnvReportLogged) {
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  const envReport = getEnvValidationReport();

  if (!isBuildPhase && envReport.errors.length) {
    logWarn('env.validation_errors', {
      errors: envReport.errors,
    });
  }

  if (!isBuildPhase && envReport.warnings.length && process.env.NODE_ENV !== 'test') {
    logInfo('env.validation_warnings', {
      warnings: envReport.warnings,
    });
  }

  globalForPrisma.__elchananEnvReportLogged = true;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

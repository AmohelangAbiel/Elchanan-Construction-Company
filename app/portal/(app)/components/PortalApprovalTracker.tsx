'use client';

import { useEffect } from 'react';

type PortalApprovalTrackerProps = {
  endpoint: string;
  returnTo: string;
};

export function PortalApprovalTracker({ endpoint, returnTo }: PortalApprovalTrackerProps) {
  useEffect(() => {
    const body = new URLSearchParams({
      approvalStatus: 'VIEWED',
      returnTo,
    });

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }, [endpoint, returnTo]);

  return null;
}

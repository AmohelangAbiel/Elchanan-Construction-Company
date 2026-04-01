type ApiErrorShape = {
  message?: string;
  code?: string;
};

export type ApiResponseEnvelope<T extends Record<string, unknown> = Record<string, unknown>> = {
  success?: boolean;
  data?: T;
  error?: ApiErrorShape | string;
  message?: string;
  code?: string;
} & Partial<T>;

export async function readApiResponse<T extends Record<string, unknown> = Record<string, unknown>>(
  response: Response,
): Promise<ApiResponseEnvelope<T>> {
  const text = await response.text().catch(() => '');

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as ApiResponseEnvelope<T>;
  } catch {
    return {
      success: false,
      error: {
        message: 'Unexpected server response. Please try again.',
        code: 'NON_JSON_RESPONSE',
      },
      message: 'Unexpected server response. Please try again.',
      code: 'NON_JSON_RESPONSE',
    } as ApiResponseEnvelope<T>;
  }
}

export function getApiErrorMessage(
  response: ApiResponseEnvelope | undefined,
  fallback: string,
) {
  if (typeof response?.error === 'string' && response.error.trim()) {
    return response.error;
  }

  if (response?.error && typeof response.error === 'object' && typeof response.error.message === 'string' && response.error.message.trim()) {
    return response.error.message;
  }

  if (typeof response?.message === 'string' && response.message.trim()) {
    return response.message;
  }

  return fallback;
}

export function getApiData<T extends Record<string, unknown> = Record<string, unknown>>(
  response: ApiResponseEnvelope<T>,
) {
  return (response.data || response) as T;
}

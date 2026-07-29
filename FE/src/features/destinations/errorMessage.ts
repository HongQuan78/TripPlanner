import { ApiError } from '@/shared/api/apiError';

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status !== 503 && error.status !== 0) {
    return error.message;
  }
  return 'Service unavailable — please try again.';
}

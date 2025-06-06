// Common API response interface
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Error response for consistent error handling
export interface ErrorResponse {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// Status enum for blogs and projects
export type Status = 'draft' | 'published';

// Query parameters for filtering
export interface StatusQueryParams {
  status?: Status;
}

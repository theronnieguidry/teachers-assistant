/**
 * Async utilities for timeout handling and error management
 */

/**
 * Error thrown when an async operation times out
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public operationName: string,
    public timeoutMs: number
  ) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the timeout, it rejects with a TimeoutError.
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name of the operation (for error messages)
 * @returns The resolved value if completed before timeout
 * @throws TimeoutError if timeout is exceeded
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new TimeoutError(
          `Operation "${operationName}" timed out after ${timeoutMs}ms`,
          operationName,
          timeoutMs
        )
      );
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Creates an AbortController with automatic timeout.
 * Useful for fetch requests that need timeout handling.
 *
 * @param timeoutMs - Timeout in milliseconds
 * @returns Object with signal and clear function
 */
export function createAbortableTimeout(timeoutMs: number): {
  signal: AbortSignal;
  clear: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

/**
 * Default timeout values for various operations
 */
export const TIMEOUTS = {
  /** Default timeout for Supabase queries (15 seconds) */
  SUPABASE_QUERY: 15000,

  /** Default timeout for Supabase inserts (10 seconds) */
  SUPABASE_INSERT: 10000,

  /** Idle timeout for streaming - time without receiving data (30 seconds) */
  STREAMING_IDLE: 30000,

  /** Total timeout for streaming operations (5 minutes) */
  STREAMING_TOTAL: 300000,

  /** Timeout per inspiration item during persistence (5 seconds) */
  INSPIRATION_PERSIST: 5000,

  /** Default fetch timeout for non-streaming requests (30 seconds) */
  FETCH_DEFAULT: 30000,
};

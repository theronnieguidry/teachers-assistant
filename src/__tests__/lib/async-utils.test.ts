import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  withTimeout,
  createAbortableTimeout,
  TimeoutError,
  TIMEOUTS,
} from "@/lib/async-utils";

describe("async-utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("TimeoutError", () => {
    it("should create error with correct properties", () => {
      const error = new TimeoutError("Test timeout", "testOp", 5000);

      expect(error.name).toBe("TimeoutError");
      expect(error.message).toBe("Test timeout");
      expect(error.operationName).toBe("testOp");
      expect(error.timeoutMs).toBe(5000);
    });

    it("should be instanceof Error", () => {
      const error = new TimeoutError("Test", "op", 1000);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TimeoutError);
    });
  });

  describe("withTimeout", () => {
    it("should resolve when promise completes before timeout", async () => {
      const promise = Promise.resolve("success");
      const result = await withTimeout(promise, 1000, "testOp");
      expect(result).toBe("success");
    });

    it("should resolve with async value before timeout", async () => {
      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve("delayed success"), 100);
      });

      const resultPromise = withTimeout(promise, 1000, "testOp");
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result).toBe("delayed success");
    });

    it("should reject with TimeoutError when timeout exceeded", async () => {
      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve("too late"), 2000);
      });

      const resultPromise = withTimeout(promise, 500, "slowOp");

      // Advance time and immediately catch the rejection to avoid unhandled rejection
      vi.advanceTimersByTime(500);

      try {
        await resultPromise;
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as TimeoutError).operationName).toBe("slowOp");
        expect((error as TimeoutError).timeoutMs).toBe(500);
      }
    });

    it("should include operation name in error message", async () => {
      const promise = new Promise<string>(() => {}); // Never resolves

      const resultPromise = withTimeout(promise, 100, "myOperation");

      // Advance time and immediately catch the rejection
      vi.advanceTimersByTime(100);

      try {
        await resultPromise;
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as TimeoutError).message).toBe(
          'Operation "myOperation" timed out after 100ms'
        );
      }
    });

    it("should propagate original error if promise rejects before timeout", async () => {
      const originalError = new Error("Original error");
      const promise = Promise.reject(originalError);

      await expect(withTimeout(promise, 1000, "testOp")).rejects.toThrow(
        "Original error"
      );
    });

    it("should clear timeout when promise resolves", async () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

      const promise = Promise.resolve("fast");
      await withTimeout(promise, 1000, "testOp");

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it("should clear timeout when promise rejects", async () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

      const promise = Promise.reject(new Error("fail"));

      try {
        await withTimeout(promise, 1000, "testOp");
      } catch {
        // Expected
      }

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe("createAbortableTimeout", () => {
    it("should return signal and clear function", () => {
      const { signal, clear } = createAbortableTimeout(1000);

      expect(signal).toBeInstanceOf(AbortSignal);
      expect(typeof clear).toBe("function");
      expect(signal.aborted).toBe(false);
    });

    it("should abort signal after timeout", async () => {
      const { signal } = createAbortableTimeout(500);

      expect(signal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(500);
      expect(signal.aborted).toBe(true);
    });

    it("should not abort if clear is called before timeout", async () => {
      const { signal, clear } = createAbortableTimeout(500);

      expect(signal.aborted).toBe(false);
      clear();
      await vi.advanceTimersByTimeAsync(500);
      expect(signal.aborted).toBe(false);
    });

    it("should be usable with fetch", () => {
      const { signal, clear } = createAbortableTimeout(1000);

      // Verify the signal can be used in fetch options
      const fetchOptions: RequestInit = { signal };
      expect(fetchOptions.signal).toBe(signal);

      clear();
    });
  });

  describe("TIMEOUTS constants", () => {
    it("should have expected timeout values", () => {
      expect(TIMEOUTS.SUPABASE_QUERY).toBe(15000);
      expect(TIMEOUTS.SUPABASE_INSERT).toBe(10000);
      expect(TIMEOUTS.STREAMING_IDLE).toBe(30000);
      expect(TIMEOUTS.STREAMING_TOTAL).toBe(300000);
      expect(TIMEOUTS.INSPIRATION_PERSIST).toBe(5000);
      expect(TIMEOUTS.FETCH_DEFAULT).toBe(30000);
    });

    it("should have all values as positive numbers", () => {
      Object.values(TIMEOUTS).forEach((value) => {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThan(0);
      });
    });
  });
});

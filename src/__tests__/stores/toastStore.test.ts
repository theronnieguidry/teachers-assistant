import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useToastStore, toast } from "@/stores/toastStore";

describe("toastStore", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("addToast", () => {
    it("should add a toast to the store", () => {
      const id = useToastStore.getState().addToast({
        type: "success",
        title: "Test Toast",
      });

      expect(id).toMatch(/^toast-\d+$/);
      expect(useToastStore.getState().toasts).toHaveLength(1);
      expect(useToastStore.getState().toasts[0]).toMatchObject({
        type: "success",
        title: "Test Toast",
      });
    });

    it("should include message if provided", () => {
      useToastStore.getState().addToast({
        type: "info",
        title: "Title",
        message: "Description message",
      });

      expect(useToastStore.getState().toasts[0].message).toBe("Description message");
    });

    it("should auto-remove toast after duration", () => {
      useToastStore.getState().addToast({
        type: "success",
        title: "Test",
        duration: 3000,
      });

      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(3000);

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it("should use default duration of 5000ms", () => {
      useToastStore.getState().addToast({
        type: "success",
        title: "Test",
      });

      vi.advanceTimersByTime(4999);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it("should not auto-remove when duration is 0", () => {
      useToastStore.getState().addToast({
        type: "success",
        title: "Persistent",
        duration: 0,
      });

      vi.advanceTimersByTime(100000);
      expect(useToastStore.getState().toasts).toHaveLength(1);
    });
  });

  describe("removeToast", () => {
    it("should remove a specific toast", () => {
      const id1 = useToastStore.getState().addToast({
        type: "success",
        title: "Toast 1",
        duration: 0,
      });
      useToastStore.getState().addToast({
        type: "success",
        title: "Toast 2",
        duration: 0,
      });

      expect(useToastStore.getState().toasts).toHaveLength(2);

      useToastStore.getState().removeToast(id1);

      expect(useToastStore.getState().toasts).toHaveLength(1);
      expect(useToastStore.getState().toasts[0].title).toBe("Toast 2");
    });
  });

  describe("clearToasts", () => {
    it("should remove all toasts", () => {
      useToastStore.getState().addToast({ type: "success", title: "1", duration: 0 });
      useToastStore.getState().addToast({ type: "success", title: "2", duration: 0 });
      useToastStore.getState().addToast({ type: "success", title: "3", duration: 0 });

      expect(useToastStore.getState().toasts).toHaveLength(3);

      useToastStore.getState().clearToasts();

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });

  describe("toast helper functions", () => {
    it("toast.success should add success toast", () => {
      toast.success("Success!", "It worked");

      const t = useToastStore.getState().toasts[0];
      expect(t.type).toBe("success");
      expect(t.title).toBe("Success!");
      expect(t.message).toBe("It worked");
    });

    it("toast.error should add error toast with longer duration", () => {
      toast.error("Error!", "Something failed");

      const t = useToastStore.getState().toasts[0];
      expect(t.type).toBe("error");

      // Error toasts have 8000ms duration
      vi.advanceTimersByTime(7999);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it("toast.info should add info toast", () => {
      toast.info("Info");

      expect(useToastStore.getState().toasts[0].type).toBe("info");
    });

    it("toast.warning should add warning toast", () => {
      toast.warning("Warning!", "Be careful");

      const t = useToastStore.getState().toasts[0];
      expect(t.type).toBe("warning");

      // Warning toasts have 6000ms duration
      vi.advanceTimersByTime(5999);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });

  describe("multiple toasts", () => {
    it("should maintain order of toasts", () => {
      toast.success("First");
      toast.info("Second");
      toast.error("Third");

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].title).toBe("First");
      expect(toasts[1].title).toBe("Second");
      expect(toasts[2].title).toBe("Third");
    });

    it("should generate unique IDs", () => {
      const id1 = toast.success("1");
      const id2 = toast.success("2");
      const id3 = toast.success("3");

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
    });
  });
});

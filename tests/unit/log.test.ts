import { describe, expect, it, vi, afterEach } from "vitest";
import { logError } from "@/lib/log";

describe("logError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a structured JSON payload with context and message for an Error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("finalizeMatch", new Error("Neon connection failed"), { roomCode: "ABC123" });

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.context).toBe("finalizeMatch");
    expect(payload.message).toBe("Neon connection failed");
    expect(payload.meta).toEqual({ roomCode: "ABC123" });
    expect(typeof payload.timestamp).toBe("string");
    expect(typeof payload.stack).toBe("string");
  });

  it("stringifies a non-Error thrown value instead of crashing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("api/identity:GET", "a plain string rejection");

    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.message).toBe("a plain string rejection");
    expect(payload.stack).toBeUndefined();
  });

  it("omits the meta key entirely when no meta is given", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("api/public-rooms:GET", new Error("boom"));

    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect("meta" in payload).toBe(false);
  });
});

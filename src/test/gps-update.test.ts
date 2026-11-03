import { describe, expect, it } from "vitest";
import { shouldIgnoreOlderGpsTime } from "@/lib/gps-update";

describe("GPS clock restart handling", () => {
  it("ignores an older simulator time while the stored position is fresh", () => {
    const now = Date.parse("2026-11-03T07:00:30Z");
    expect(shouldIgnoreOlderGpsTime("2026-11-03T07:00:10Z", "2026-11-03T07:00:00Z", new Date("2026-11-03T06:00:00Z"), now)).toBe(true);
  });

  it("accepts an older simulator time after the stored position is 60 seconds old", () => {
    const now = Date.parse("2026-11-03T07:01:01Z");
    expect(shouldIgnoreOlderGpsTime("2026-11-03T07:00:10Z", "2026-11-03T07:00:00Z", new Date("2026-11-03T06:00:00Z"), now)).toBe(false);
  });
});

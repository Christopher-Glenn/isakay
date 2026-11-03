import { describe, expect, it } from "vitest";
import { getStatus } from "@/lib/ebus";

const NOW = new Date("2026-11-03T07:00:00Z").getTime();
const at = (secondsAgo: number) => new Date(NOW - secondsAgo * 1000).toISOString();

describe("E-Bus tracking status", () => {
  it("marks updates within 30 seconds as live", () => {
    expect(getStatus(at(30), NOW, 30, 120)).toBe("live");
  });

  it("marks updates after 30 through 120 seconds as delayed", () => {
    expect(getStatus(at(31), NOW, 30, 120)).toBe("delayed");
    expect(getStatus(at(120), NOW, 30, 120)).toBe("delayed");
  });

  it("marks updates older than 120 seconds as offline", () => {
    expect(getStatus(at(121), NOW, 30, 120)).toBe("offline");
  });
});

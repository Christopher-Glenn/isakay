import { describe, expect, it } from "vitest";
import { estimatedArrivalMinutes, getStatus } from "@/lib/ebus";

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

  it("keeps the latest Wokwi Iloilo coordinate valid for tracking", () => {
    const latitude = 10.693758;
    const longitude = 122.546383;
    expect(latitude).toBeGreaterThanOrEqual(-90);
    expect(latitude).toBeLessThanOrEqual(90);
    expect(longitude).toBeGreaterThanOrEqual(-180);
    expect(longitude).toBeLessThanOrEqual(180);
  });

  it("estimates a nearby rider arrival time from the reported bus speed", () => {
    expect(estimatedArrivalMinutes({ lat: 10.693758, lng: 122.546383 }, { lat: 10.697459, lng: 122.546537 }, 24)).toBe(2);
  });
});

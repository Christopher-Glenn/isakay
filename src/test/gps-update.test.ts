import { describe, expect, it } from "vitest";
import { validateGpsUpdate } from "@/lib/gps-update";

describe("GPS update validation", () => {
  it("accepts a valid update even when its device clock is older", () => {
    const update = validateGpsUpdate({
      bus_code: "BUS-01",
      lat: 10.761919,
      lng: 122.577802,
      gps_time: "2025-01-01T00:00:00Z",
    });
    expect(update.busCode).toBe("BUS-01");
    expect(update.validCoordinates).toBe(true);
    expect(update.gpsTime?.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });
});

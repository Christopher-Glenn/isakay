import { describe, expect, it } from "vitest";
import { parseGpxRoute, parseRouteCoordinates } from "@/lib/route-path";

describe("route coordinate import", () => {
  it("parses Route 10 coordinates written as lat,lng", () => {
    expect(parseRouteCoordinates("10.761919,122.577802\n10.724772,122.557754")).toEqual([[10.761919, 122.577802], [10.724772, 122.557754]]);
  });

  it("parses a GPX path", () => {
    expect(parseGpxRoute('<gpx><trkpt lat="10.761919" lon="122.577802"/><trkpt lat="10.724772" lon="122.557754"/></gpx>')).toEqual([[10.761919, 122.577802], [10.724772, 122.557754]]);
  });
});
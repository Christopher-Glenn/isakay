export type DestinationPlace = { name: string; lat: number; lng: number };

export const route10Name = "Route 10 Buntatala / Tagbak Terminal to City Proper Loop";

export const route10Destinations: DestinationPlace[] = [
  { name: "Tagbak Terminal", lat: 10.76218, lng: 122.57775 },
  { name: "Ceres Northbound Terminal", lat: 10.75428, lng: 122.57218 },
  { name: "Jaro Plaza", lat: 10.72437, lng: 122.55733 },
  { name: "West Visayas State University", lat: 10.7132, lng: 122.5621 },
  { name: "Iloilo Provincial Capitol", lat: 10.70258, lng: 122.56905 },
  { name: "University of San Agustin", lat: 10.6994, lng: 122.56313 },
  { name: "University of Iloilo", lat: 10.6916, lng: 122.56982 },
  { name: "The Atrium", lat: 10.70104, lng: 122.56821 },
  { name: "Iloilo City Hall", lat: 10.6918, lng: 122.5672 },
  { name: "Plaza Libertad", lat: 10.6904, lng: 122.5691 },
];

export const route10Path: Array<[number, number]> = route10Destinations.map(({ lat, lng }) => [lat, lng]);
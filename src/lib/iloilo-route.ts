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

export const route10Path: Array<[number, number]> = [
  [10.76218, 122.57775], // Tagbak Terminal roundabout
  [10.7588, 122.5754],
  [10.75428, 122.57218], // Ceres Northbound Terminal
  [10.7469, 122.5664],
  [10.7386, 122.5614],
  [10.72437, 122.55733], // Jaro Plaza
  [10.7201, 122.5592], // Commission Civil / Del Carmen
  [10.7132, 122.5621], // West Visayas State University
  [10.7094, 122.5647], // Iloilo National High School / La Paz
  [10.7053, 122.5677], // Hall of Justice / Museo Iloilo
  [10.70258, 122.56905], // Iloilo Provincial Capitol
  [10.70104, 122.56821], // The Atrium
  [10.7005, 122.5657], // Saint Paul's / Iloilo Central Elementary
  [10.6994, 122.56313], // University of San Agustin
  [10.6968, 122.5637], // Ledesma / EastWest / Robinsons Mabini
  [10.6946, 122.5668], // Iloilo Terminal Market / De Leon
  [10.6916, 122.56982], // University of Iloilo
  [10.6929, 122.5702], // Gaisano Guanco / Mapa
  [10.6904, 122.5691], // Plaza Libertad
  [10.6918, 122.5672], // Iloilo City Hall
  [10.6954, 122.5655], // Quezon / Valeria / Marymart / SM Delgado
  [10.70104, 122.56821], // The Atrium return
  [10.70258, 122.56905], // Provincial Capitol return
  [10.7053, 122.5677],
  [10.7102, 122.5639], // Gaisano Capital La Paz / La Paz Market
  [10.7132, 122.5621],
  [10.7201, 122.5592],
  [10.72437, 122.55733], // Jaro Plaza return
  [10.7386, 122.5614],
  [10.75428, 122.57218],
  [10.76218, 122.57775], // Tagbak Terminal loop complete
];
export interface CatalogClub {
  id: string;
  name: string;
  crestUrl: string;
  platform: "common-gen5";
  skillRating?: number;
  record?: string;
  source: "overview" | "match-history";
}

export const catalogClubs: CatalogClub[] = [
  {
    id: "171630",
    name: "Villathinaikos",
    crestUrl: "https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l1318.png",
    platform: "common-gen5",
    skillRating: 2403,
    record: "624-121-445",
    source: "overview",
  },
  { id: "255239", name: "Tropa", crestUrl: "https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l99160428.png", platform: "common-gen5", source: "match-history" },
  { id: "70399", name: "São PauIo FC", crestUrl: "https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l598.png", platform: "common-gen5", source: "match-history" },
  { id: "2150620", name: "TROPA ARTISTA", crestUrl: "https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l1318.png", platform: "common-gen5", source: "match-history" },
  { id: "4982923", name: "TRIVELAS FC", crestUrl: "https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l99161120.png", platform: "common-gen5", source: "match-history" },
  { id: "2600404", name: "Xibiu Team", crestUrl: "https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l1043.png", platform: "common-gen5", source: "match-history" },
];

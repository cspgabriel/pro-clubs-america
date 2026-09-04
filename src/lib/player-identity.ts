export const playerDevices = [
  { id: "ps5", label: "PS5", generation: "current", catalog: "common-gen5" },
  { id: "xbox-series", label: "Xbox Series X|S", generation: "current", catalog: "common-gen5" },
  { id: "pc", label: "PC", generation: "current", catalog: "common-gen5" },
  { id: "ps4", label: "PS4", generation: "previous", catalog: "common-gen4" },
  { id: "xbox-one", label: "Xbox One", generation: "previous", catalog: "common-gen4" },
  { id: "switch-2", label: "Switch 2", generation: "switch2", catalog: null },
  { id: "switch", label: "Switch", generation: "switch", catalog: "nx" },
] as const;
export const positionGroups = [
  { id: "goal", positions: ["GOL"] },
  { id: "defense", positions: ["ZAG", "LE", "LD"] },
  { id: "midfield", positions: ["VOL", "MC", "MEI", "ME", "MD"] },
  { id: "attack", positions: ["PE", "PD", "ATA"] },
] as const;
export const playerPositions: readonly string[] = positionGroups.flatMap((group) => [...group.positions]);
export const nicknamePattern = /^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$/;
export const normalizeNickname = (value: string) => value.trim().toLowerCase();
export const normalizePhone = (value: string) => value.trim().replace(/[\s().-]/g, "");
export const validPhone = (value: string) => !value || /^\+[1-9][0-9]{7,14}$/.test(value);
export const deviceLabel = (id?: string | null) => playerDevices.find((device) => device.id === id)?.label || "";
export const communityProfileUrl = (profile: { id: string; nickname?: string | null }) => `/perfil?id=${encodeURIComponent(profile.nickname || profile.id)}`;

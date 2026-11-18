// Updates applied once to live project data (see src/lib/updates.ts).
// Add a JSON file here and list it below; never edit or reuse an id that already ran.
import type { ProjectUpdate } from "@/lib/updates";
import u20261118lc11 from "./2026-11-18-lc11-labour-bell.json";
import u20261118lc11b from "./2026-11-18-lc11-labour-bell-2.json";
import dDaily20261117b3 from "./daily-2026-11-17-b3.json";
import dDaily30d20261118b3 from "./daily-30d-2026-11-18-b3.json";
import dDaily30d20261118b4 from "./daily-30d-2026-11-18-b4.json";
import dDaily30d20261118est from "./daily-30d-2026-11-18-est.json";

export const UPDATES: ProjectUpdate[] = [
  u20261118lc11 as ProjectUpdate,
  u20261118lc11b as ProjectUpdate,
  dDaily20261117b3 as ProjectUpdate,
  dDaily30d20261118b3 as ProjectUpdate,
  dDaily30d20261118b4 as ProjectUpdate,
  dDaily30d20261118est as ProjectUpdate,
];

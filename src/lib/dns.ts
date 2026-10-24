import { setDefaultResultOrder, setServers } from "node:dns";

/** Router DNS on Windows often refuses Node SRV lookups (`mongodb+srv`). */
export function patchDnsForAtlas() {
  setDefaultResultOrder("ipv4first");
  if (process.platform === "win32") {
    setServers(["8.8.8.8", "1.1.1.1"]);
  }
}

import { VaultShell } from "../../../components/vault/VaultShell";
import { SystemMapClient } from "./SystemMapClient";

export const metadata = { title: "Tree Intelligence OS — System Map | ZZC Vault" };

export default function SystemMapPage() {
  return (
    <VaultShell>
      <SystemMapClient />
    </VaultShell>
  );
}

import { notFound } from "next/navigation";

import { MathQuestScreen } from "@/components/MathQuestApp";
import { ENABLED_REALMS, type RealmId } from "@/lib/config";

export const instant = false;

export default async function BattlePage({ params }: PageProps<"/battle/[id]/[stage]">) {
  const { id, stage } = await params;
  const stageIndex = Number(stage);
  if (!ENABLED_REALMS.includes(id as RealmId) || !/^\d+$/.test(stage) || stageIndex < 0 || stageIndex > 4) notFound();
  return <MathQuestScreen screen="battle" realmId={id} stageIndex={stageIndex} />;
}

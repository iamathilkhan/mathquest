import { notFound } from "next/navigation";

import { MathQuestScreen } from "@/components/MathQuestApp";
import { ENABLED_REALMS, type RealmId } from "@/lib/config";

export const instant = false;

export default async function RealmPage({ params }: PageProps<"/realm/[id]">) {
  const { id } = await params;
  if (!ENABLED_REALMS.includes(id as RealmId)) notFound();
  return <MathQuestScreen screen="realm" realmId={id} />;
}

import { notFound } from "next/navigation";

import { LearnView } from "@/components/lesson/LearnView";
import { ENABLED_REALMS, type RealmId } from "@/lib/config";
import { getRealm } from "@/data/curriculum";

export const instant = false;

export default async function LessonPage({ params }: PageProps<"/realm/[id]/learn/[subSkillId]">) {
  const { id, subSkillId } = await params;
  if (!ENABLED_REALMS.includes(id as RealmId)) notFound();
  const realm = getRealm(id as RealmId);
  if (!realm.subSkills.some((skill) => skill.id === subSkillId)) notFound();
  return <LearnView realmId={id} subSkillId={subSkillId} />;
}

import type { User } from "../../types/domain";
import { PageHeading } from "../ui/PageHeading";
import { PvModuleTabs } from "./PvModuleTabs";

export function PvModuleHeader({
  currentUser,
  title,
  description
}: {
  currentUser: User;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-5">
      <PageHeading eyebrow="Suivi PV" title={title} description={description} />
      <PvModuleTabs currentUser={currentUser} />
    </div>
  );
}

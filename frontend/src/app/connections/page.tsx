"use client";

import { AuthenticatedLayout } from "@/components/common/AuthenticatedLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConnectionList } from "@/components/social/ConnectionList";

export default function ConnectionsPage() {
  return (
    <AuthenticatedLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <PageHeader
          eyebrow="Social"
          title="Connections"
          description="Your mutual matches. Message or plan a date with anyone here."
        />
        <ConnectionList showActions />
      </div>
    </AuthenticatedLayout>
  );
}

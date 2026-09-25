"use client";

import { useAdminData } from "@/lib/adminStore";
import { useAdminT } from "@/lib/adminI18n";
import { PageHeader } from "@/components/admin/ui";
import { FleetTimeline } from "@/components/admin/FleetTimeline";

export default function CalendarPage() {
  const { data } = useAdminData();
  const { t } = useAdminT();

  return (
    <>
      <PageHeader title={t.calendar.title} sub={t.calendar.sub} />
      <FleetTimeline vehicles={data.vehicles} bookings={data.bookings} />
    </>
  );
}

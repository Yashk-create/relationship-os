"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function getGlobalTimeline() {
  const user = await requireUser();

  return await db.interaction.findMany({
    where: { userId: user.id },
    include: {
      contact: true,
      opportunity: true,
    },
    orderBy: { occurredAt: "desc" },
    take: 50, // Limit to recent 50 interactions
  });
}

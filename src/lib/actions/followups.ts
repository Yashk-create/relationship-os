"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertOwned, NotFoundError } from "@/lib/ownership";
import { followUpInput, idSchema, parse } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function getFollowUps() {
  const user = await requireUser();

  return await db.followUp.findMany({
    where: { userId: user.id },
    include: {
      contact: true,
      opportunity: true,
    },
    orderBy: { dueDate: "asc" },
  });
}

export async function createFollowUp(data: {
  title: string;
  dueDate: Date;
  contactId?: string;
  opportunityId?: string;
}) {
  const user = await requireUser();
  const input = parse(followUpInput, data);

  const followUp = await db.$transaction(async (tx) => {
    await assertOwned(tx, user.id, {
      contactIds: [input.contactId],
      opportunityIds: [input.opportunityId],
    });
    const created = await tx.followUp.create({
      data: { userId: user.id, ...input },
      include: { contact: true, opportunity: true },
    });
    await tx.interaction.create({
      data: {
        userId: user.id,
        contactId: input.contactId,
        opportunityId: input.opportunityId,
        type: "FOLLOW_UP",
        description: `Added follow-up task: "${created.title}" (Due: ${input.dueDate.toLocaleDateString("en-IN")})`,
      },
    });
    return created;
  });

  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
  return followUp;
}

export async function toggleFollowUp(id: string, completed: boolean) {
  const user = await requireUser();
  const followUpId = parse(idSchema, id);
  const done = parse(z.boolean(), completed);

  const followUp = await db.$transaction(async (tx) => {
    const existing = await tx.followUp.findFirst({ where: { id: followUpId, userId: user.id } });
    if (!existing) throw new NotFoundError("Follow-up not found");

    const updated = await tx.followUp.update({
      where: { id: followUpId },
      data: { completed: done },
      include: { contact: true, opportunity: true },
    });
    // Log only the transition to done, not repeated "done" clicks.
    if (done && !existing.completed) {
      await tx.interaction.create({
        data: {
          userId: user.id,
          contactId: updated.contactId,
          opportunityId: updated.opportunityId,
          type: "FOLLOW_UP",
          description: `Completed follow-up task: "${updated.title}"`,
        },
      });
    }
    return updated;
  });

  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
  return followUp;
}

export async function deleteFollowUp(id: string) {
  const user = await requireUser();
  const followUpId = parse(idSchema, id);

  const { count } = await db.followUp.deleteMany({ where: { id: followUpId, userId: user.id } });
  if (count === 0) throw new NotFoundError("Follow-up not found");

  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
  return { success: true };
}

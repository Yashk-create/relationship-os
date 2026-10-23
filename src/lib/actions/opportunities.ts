"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertOwned, NotFoundError } from "@/lib/ownership";
import { idSchema, opportunityInput, parse, statusInput } from "@/lib/validation";
import { Priority } from "@prisma/client";
import { revalidatePath } from "next/cache";

type OpportunityData = {
  title: string;
  value?: number;
  status: string;
  priority?: Priority;
  contactId?: string;
  notes?: string;
  nextActionDate?: Date;
};

export async function getOpportunities() {
  const user = await requireUser();

  return await db.opportunity.findMany({
    where: { userId: user.id },
    include: {
      contact: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createOpportunity(data: OpportunityData) {
  const user = await requireUser();
  const input = parse(opportunityInput, data);

  const opportunity = await db.$transaction(async (tx) => {
    // Without this check, linking another user's contact id here and reading
    // it back via `include: { contact: true }` leaked that contact's details.
    await assertOwned(tx, user.id, { contactIds: [input.contactId] });
    const created = await tx.opportunity.create({
      data: { userId: user.id, ...input },
      include: { contact: true },
    });
    await tx.interaction.create({
      data: {
        userId: user.id,
        opportunityId: created.id,
        contactId: input.contactId,
        type: "STATUS_CHANGE",
        description: `Created opportunity "${created.title}" with status "${created.status}"`,
      },
    });
    return created;
  });

  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
  return opportunity;
}

export async function updateOpportunityStatus(id: string, newStatus: string) {
  const user = await requireUser();
  const oppId = parse(idSchema, id);
  const status = parse(statusInput, newStatus);

  const opportunity = await db.$transaction(async (tx) => {
    const old = await tx.opportunity.findFirst({ where: { id: oppId, userId: user.id } });
    if (!old) throw new NotFoundError("Opportunity not found");

    const updated = await tx.opportunity.update({
      where: { id: oppId },
      data: { status },
      include: { contact: true },
    });
    await tx.interaction.create({
      data: {
        userId: user.id,
        opportunityId: updated.id,
        contactId: updated.contactId,
        type: "STATUS_CHANGE",
        description: `Changed status of "${updated.title}" from "${old.status}" to "${status}"`,
      },
    });
    return updated;
  });

  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
  return opportunity;
}

export async function updateOpportunity(id: string, data: OpportunityData) {
  const user = await requireUser();
  const oppId = parse(idSchema, id);
  const input = parse(opportunityInput, data);

  const opportunity = await db.$transaction(async (tx) => {
    const old = await tx.opportunity.findFirst({ where: { id: oppId, userId: user.id } });
    if (!old) throw new NotFoundError("Opportunity not found");
    await assertOwned(tx, user.id, { contactIds: [input.contactId] });

    const updated = await tx.opportunity.update({
      where: { id: oppId },
      data: input,
      include: { contact: true },
    });
    if (old.status !== input.status) {
      await tx.interaction.create({
        data: {
          userId: user.id,
          opportunityId: updated.id,
          contactId: input.contactId,
          type: "STATUS_CHANGE",
          description: `Changed status of "${updated.title}" from "${old.status}" to "${input.status}"`,
        },
      });
    }
    return updated;
  });

  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
  return opportunity;
}

export async function deleteOpportunity(id: string) {
  const user = await requireUser();
  const oppId = parse(idSchema, id);

  const { count } = await db.opportunity.deleteMany({ where: { id: oppId, userId: user.id } });
  if (count === 0) throw new NotFoundError("Opportunity not found");

  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getOpportunityTimeline(opportunityId: string) {
  const user = await requireUser();
  const id = parse(idSchema, opportunityId);

  return await db.interaction.findMany({
    where: { opportunityId: id, userId: user.id },
    orderBy: { occurredAt: "desc" },
  });
}

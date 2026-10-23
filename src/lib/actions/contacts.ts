"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertOwned, NotFoundError } from "@/lib/ownership";
import { contactInput, idSchema, interactionInput, parse } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export async function getContacts() {
  const user = await requireUser();

  return await db.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
}

export async function createContact(data: {
  name: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
  tags?: string[];
  notes?: string;
}) {
  const user = await requireUser();
  const input = parse(contactInput, data);

  // The contact and its timeline entry are saved together or not at all.
  const contact = await db.$transaction(async (tx) => {
    const created = await tx.contact.create({ data: { userId: user.id, ...input } });
    await tx.interaction.create({
      data: {
        userId: user.id,
        contactId: created.id,
        type: "NOTE",
        description: `Added contact details for ${created.name}`,
      },
    });
    return created;
  });

  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  return contact;
}

export async function updateContact(
  id: string,
  data: {
    name: string;
    company?: string;
    role?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    website?: string;
    tags?: string[];
    notes?: string;
  }
) {
  const user = await requireUser();
  const contactId = parse(idSchema, id);
  const input = parse(contactInput, data);

  await assertOwned(db, user.id, { contactIds: [contactId] });
  const contact = await db.contact.update({ where: { id: contactId }, data: input });

  revalidatePath("/contacts");
  return contact;
}

export async function deleteContact(id: string) {
  const user = await requireUser();
  const contactId = parse(idSchema, id);

  const { count } = await db.contact.deleteMany({ where: { id: contactId, userId: user.id } });
  if (count === 0) throw new NotFoundError("Contact not found");

  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function logCustomInteraction(
  contactId: string,
  type: "CALL" | "EMAIL" | "LINKEDIN_MESSAGE" | "NOTE",
  description: string
) {
  const user = await requireUser();
  const input = parse(interactionInput, { contactId, type, description });

  // Previously any contact id was accepted, including another user's.
  await assertOwned(db, user.id, { contactIds: [input.contactId] });
  const interaction = await db.interaction.create({
    data: { userId: user.id, ...input },
  });

  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  return interaction;
}

export async function getContactTimeline(contactId: string) {
  const user = await requireUser();
  const id = parse(idSchema, contactId);

  return await db.interaction.findMany({
    where: { contactId: id, userId: user.id },
    orderBy: { occurredAt: "desc" },
  });
}

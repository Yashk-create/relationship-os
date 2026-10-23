"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { noteInput, parse } from "@/lib/validation";
import { revalidatePath } from "next/cache";

// Bug fixed: these used the Clerk id as GlobalNote.userId, but that column
// references UserProfile.id, so every save failed with a foreign-key error
// and the notes drawer could never persist anything.

export async function getGlobalNote() {
  const user = await requireUser();

  return await db.globalNote.findUnique({
    where: { userId: user.id },
  });
}

export async function saveGlobalNote(content: string) {
  const user = await requireUser();
  const text = parse(noteInput, content);

  const note = await db.globalNote.upsert({
    where: { userId: user.id },
    update: { content: text },
    create: { userId: user.id, content: text },
  });

  revalidatePath("/");
  return note;
}

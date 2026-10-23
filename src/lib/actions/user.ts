"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parse, roleInput } from "@/lib/validation";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function onboardUser(role: UserRole) {
  const user = await requireUser();
  const validRole = parse(roleInput, role);

  await db.userProfile.update({
    where: { id: user.id },
    data: { role: validRole },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true };
}

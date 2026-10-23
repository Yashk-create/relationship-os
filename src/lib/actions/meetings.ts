"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertOwned, NotFoundError } from "@/lib/ownership";
import { idSchema, meetingInput, parse } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export async function getMeetings() {
  const user = await requireUser();

  return await db.meeting.findMany({
    where: { userId: user.id },
    include: {
      participants: true,
    },
    orderBy: { meetingDate: "desc" },
  });
}

export async function createMeeting(data: {
  title: string;
  meetingDate: Date;
  notes?: string;
  actionItems?: string[];
  participantIds?: string[];
}) {
  const user = await requireUser();
  const { participantIds, ...input } = parse(meetingInput, data);
  const participants = [...new Set(participantIds)];

  const meeting = await db.$transaction(async (tx) => {
    // Previously any contact ids were connected, including other users' contacts,
    // which then appeared (with their details) in this user's meeting list.
    await assertOwned(tx, user.id, { contactIds: participants });
    const created = await tx.meeting.create({
      data: {
        userId: user.id,
        ...input,
        participants: { connect: participants.map((id) => ({ id })) },
      },
      include: { participants: true },
    });

    const when = input.meetingDate.toLocaleDateString("en-IN");
    if (participants.length > 0) {
      await tx.interaction.createMany({
        data: participants.map((contactId) => ({
          userId: user.id,
          contactId,
          type: "MEETING" as const,
          description: `Attended meeting: "${created.title}" on ${when}`,
        })),
      });
    } else {
      await tx.interaction.create({
        data: {
          userId: user.id,
          type: "MEETING",
          description: `Logged meeting: "${created.title}" on ${when}`,
        },
      });
    }
    return created;
  });

  revalidatePath("/meetings");
  revalidatePath("/dashboard");
  return meeting;
}

export async function deleteMeeting(id: string) {
  const user = await requireUser();
  const meetingId = parse(idSchema, id);

  const { count } = await db.meeting.deleteMany({ where: { id: meetingId, userId: user.id } });
  if (count === 0) throw new NotFoundError("Meeting not found");

  revalidatePath("/meetings");
  revalidatePath("/dashboard");
  return { success: true };
}

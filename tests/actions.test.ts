// Behaviour of the Server Actions for a single user: the notes bug, timeline
// logging, transactions and input validation.
import type { UserProfile } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as contacts from "@/lib/actions/contacts";
import * as followups from "@/lib/actions/followups";
import * as meetings from "@/lib/actions/meetings";
import * as notes from "@/lib/actions/notes";
import * as opportunities from "@/lib/actions/opportunities";
import { onboardUser } from "@/lib/actions/user";
import { cleanupUsers, createTestUser } from "./helpers";

let user: UserProfile;

beforeEach(async () => {
  user = await createTestUser("JOB_SEEKER");
  vi.mocked(requireUser).mockResolvedValue(user);
});

afterAll(cleanupUsers);

const timeline = () => db.interaction.findMany({ where: { userId: user.id }, orderBy: { occurredAt: "asc" } });

describe("notes drawer (regression: every save used to fail)", () => {
  it("saves, reads back and overwrites the note", async () => {
    expect(await notes.getGlobalNote()).toBeNull();
    await notes.saveGlobalNote("first draft");
    await notes.saveGlobalNote("second draft");
    const note = await notes.getGlobalNote();
    expect(note?.content).toBe("second draft");
    expect(note?.userId).toBe(user.id);
    expect(await db.globalNote.count({ where: { userId: user.id } })).toBe(1);
  });
});

describe("contacts", () => {
  it("creates a contact with a timeline entry and normalises empty fields", async () => {
    const c = await contacts.createContact({
      name: "  Priya Sharma  ", company: "", email: "priya@example.com", tags: ["recruiter"],
    });
    expect(c.name).toBe("Priya Sharma");
    expect(c.company).toBeNull();
    expect((await timeline()).map((i) => i.description)).toEqual(["Added contact details for Priya Sharma"]);
  });

  it.each([
    [{ name: "" }, /name: is required/],
    [{ name: "x", email: "not-an-email" }, /email/],
    [{ name: "x", linkedin: "javascript:alert(1)" }, /linkedin/],
    [{ name: "x".repeat(201) }, /name/],
  ])("rejects invalid input %#", async (data, message) => {
    await expect(contacts.createContact(data as { name: string })).rejects.toThrow(message);
    expect(await db.contact.count({ where: { userId: user.id } })).toBe(0);
  });

  it("rejects a malformed id instead of querying with it", async () => {
    await expect(contacts.deleteContact("1 OR 1=1")).rejects.toThrow(/Invalid input/);
  });
});

describe("opportunities", () => {
  it("logs creation and each real status change, but not edits that keep the status", async () => {
    const contact = await contacts.createContact({ name: "Recruiter" });
    const opp = await opportunities.createOpportunity({
      title: "Backend role", status: "Applied", contactId: contact.id,
    });
    await opportunities.updateOpportunityStatus(opp.id, "Interview Scheduled");
    await opportunities.updateOpportunity(opp.id, { title: "Backend role (Pune)", status: "Interview Scheduled" });

    const log = (await timeline()).filter((i) => i.opportunityId === opp.id).map((i) => i.description);
    expect(log).toEqual([
      'Created opportunity "Backend role" with status "Applied"',
      'Changed status of "Backend role" from "Applied" to "Interview Scheduled"',
    ]);
  });

  it.each([
    [{ title: "x", status: "Lead", value: Number.NaN }],
    [{ title: "x", status: "Lead", value: -5 }],
    [{ title: "x", status: "" }],
    [{ title: "x", status: "Lead", nextActionDate: new Date("not a date") }],
    [{ title: "x", status: "Lead", priority: "URGENT" }],
  ])("rejects invalid input %#", async (data) => {
    await expect(opportunities.createOpportunity(data as never)).rejects.toThrow(/Invalid input/);
    expect(await db.opportunity.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("follow-ups", () => {
  it("logs completion once, not on every toggle", async () => {
    const f = await followups.createFollowUp({ title: "Send portfolio", dueDate: new Date() });
    await followups.toggleFollowUp(f.id, true);
    await followups.toggleFollowUp(f.id, true);
    await followups.toggleFollowUp(f.id, false);
    const completions = (await timeline()).filter((i) => i.description.startsWith("Completed"));
    expect(completions).toHaveLength(1);
  });
});

describe("meetings", () => {
  it("logs one timeline entry per distinct participant", async () => {
    const a = await contacts.createContact({ name: "A" });
    const b = await contacts.createContact({ name: "B" });
    const m = await meetings.createMeeting({
      title: "Sync", meetingDate: new Date("2026-11-01T10:00:00Z"),
      participantIds: [a.id, b.id, a.id], actionItems: ["Share deck"],
    });
    expect(m.participants.map((p) => p.name).sort()).toEqual(["A", "B"]);
    const entries = (await timeline()).filter((i) => i.type === "MEETING");
    expect(entries.map((i) => i.contactId).sort()).toEqual([a.id, b.id].sort());
  });
});

describe("onboarding", () => {
  it("accepts a valid role and rejects anything else", async () => {
    await onboardUser("FOUNDER");
    expect((await db.userProfile.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("FOUNDER");
    await expect(onboardUser("ADMIN" as never)).rejects.toThrow(/Invalid input/);
  });
});

// Cross-user isolation: user B must never read, change or link user A's data,
// even when B calls the Server Actions directly with A's record ids.
import type { UserProfile } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as contacts from "@/lib/actions/contacts";
import * as followups from "@/lib/actions/followups";
import * as meetings from "@/lib/actions/meetings";
import * as notes from "@/lib/actions/notes";
import * as opportunities from "@/lib/actions/opportunities";
import { getGlobalTimeline } from "@/lib/actions/timeline";
import { cleanupUsers, createTestUser } from "./helpers";

const actAs = (user: UserProfile) => vi.mocked(requireUser).mockResolvedValue(user);

let alice: UserProfile;
let bob: UserProfile;
let aliceContact: { id: string };
let aliceOpp: { id: string };
let aliceFollowUp: { id: string };
let aliceMeeting: { id: string };

beforeAll(async () => {
  alice = await createTestUser("FREELANCER");
  bob = await createTestUser("FREELANCER");

  actAs(alice);
  aliceContact = await contacts.createContact({ name: "Alice's client", email: "client@example.com" });
  aliceOpp = await opportunities.createOpportunity({
    title: "Alice's deal", status: "Proposal Sent", value: 50000, contactId: aliceContact.id,
  });
  aliceFollowUp = await followups.createFollowUp({
    title: "Call client", dueDate: new Date(), contactId: aliceContact.id,
  });
  aliceMeeting = await meetings.createMeeting({
    title: "Kickoff", meetingDate: new Date(), participantIds: [aliceContact.id],
  });
  await notes.saveGlobalNote("Alice's private note");
});

afterAll(cleanupUsers);

beforeEach(() => actAs(bob));

describe("reading", () => {
  it("lists only the caller's own records", async () => {
    expect(await contacts.getContacts()).toEqual([]);
    expect(await opportunities.getOpportunities()).toEqual([]);
    expect(await followups.getFollowUps()).toEqual([]);
    expect(await meetings.getMeetings()).toEqual([]);
    expect(await getGlobalTimeline()).toEqual([]);
    expect(await notes.getGlobalNote()).toBeNull();
  });

  it("returns nothing for another user's timelines", async () => {
    expect(await contacts.getContactTimeline(aliceContact.id)).toEqual([]);
    expect(await opportunities.getOpportunityTimeline(aliceOpp.id)).toEqual([]);
  });
});

describe("changing another user's records", () => {
  it("cannot update or delete them, and they stay unchanged", async () => {
    await expect(contacts.updateContact(aliceContact.id, { name: "Hijacked" })).rejects.toThrow(/not found/i);
    await expect(contacts.deleteContact(aliceContact.id)).rejects.toThrow(/not found/i);
    await expect(opportunities.updateOpportunityStatus(aliceOpp.id, "Lost")).rejects.toThrow(/not found/i);
    await expect(
      opportunities.updateOpportunity(aliceOpp.id, { title: "Hijacked", status: "Lost" })
    ).rejects.toThrow(/not found/i);
    await expect(opportunities.deleteOpportunity(aliceOpp.id)).rejects.toThrow(/not found/i);
    await expect(followups.toggleFollowUp(aliceFollowUp.id, true)).rejects.toThrow(/not found/i);
    await expect(followups.deleteFollowUp(aliceFollowUp.id)).rejects.toThrow(/not found/i);
    await expect(meetings.deleteMeeting(aliceMeeting.id)).rejects.toThrow(/not found/i);

    const contact = await db.contact.findUniqueOrThrow({ where: { id: aliceContact.id } });
    const opp = await db.opportunity.findUniqueOrThrow({ where: { id: aliceOpp.id } });
    const followUp = await db.followUp.findUniqueOrThrow({ where: { id: aliceFollowUp.id } });
    expect(contact.name).toBe("Alice's client");
    expect(opp.status).toBe("Proposal Sent");
    expect(followUp.completed).toBe(false);
    expect(await db.meeting.count({ where: { id: aliceMeeting.id } })).toBe(1);
  });
});

describe("linking another user's records (the original IDOR bug)", () => {
  it("cannot attach another user's contact to an opportunity", async () => {
    await expect(
      opportunities.createOpportunity({ title: "Steal", status: "Lead", contactId: aliceContact.id })
    ).rejects.toThrow(/contact not found/i);
    // The transaction rolled back: nothing was created for Bob.
    expect(await db.opportunity.count({ where: { userId: bob.id } })).toBe(0);
    expect(await db.interaction.count({ where: { userId: bob.id } })).toBe(0);
  });

  it("cannot re-point their own opportunity at another user's contact", async () => {
    const own = await opportunities.createOpportunity({ title: "Mine", status: "Lead" });
    await expect(
      opportunities.updateOpportunity(own.id, { title: "Mine", status: "Lead", contactId: aliceContact.id })
    ).rejects.toThrow(/contact not found/i);
    expect((await db.opportunity.findUniqueOrThrow({ where: { id: own.id } })).contactId).toBeNull();
  });

  it("cannot attach another user's contact or opportunity to a follow-up", async () => {
    await expect(
      followups.createFollowUp({ title: "x", dueDate: new Date(), contactId: aliceContact.id })
    ).rejects.toThrow(/contact not found/i);
    await expect(
      followups.createFollowUp({ title: "x", dueDate: new Date(), opportunityId: aliceOpp.id })
    ).rejects.toThrow(/opportunity not found/i);
    expect(await db.followUp.count({ where: { userId: bob.id } })).toBe(0);
  });

  it("cannot add another user's contact as a meeting participant", async () => {
    const mine = await contacts.createContact({ name: "Bob's contact" });
    await expect(
      meetings.createMeeting({ title: "x", meetingDate: new Date(), participantIds: [mine.id, aliceContact.id] })
    ).rejects.toThrow(/contact not found/i);
    expect(await db.meeting.count({ where: { userId: bob.id } })).toBe(0);
  });

  it("cannot log an interaction on another user's contact", async () => {
    await expect(contacts.logCustomInteraction(aliceContact.id, "CALL", "spoof")).rejects.toThrow(
      /contact not found/i
    );
    expect(await db.interaction.count({ where: { contactId: aliceContact.id, userId: bob.id } })).toBe(0);
  });

  it("gives the same answer for a missing id as for someone else's", async () => {
    const missing = "00000000-0000-4000-8000-000000000000";
    await expect(
      opportunities.createOpportunity({ title: "x", status: "Lead", contactId: missing })
    ).rejects.toThrow("Contact not found");
    await expect(
      opportunities.createOpportunity({ title: "x", status: "Lead", contactId: aliceContact.id })
    ).rejects.toThrow("Contact not found");
  });
});

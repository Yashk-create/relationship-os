// Fills the local demo user (the one used when Clerk keys are not set) with
// fictional sample data, so the app has something to show.
//
//   npm run db:seed            # skips if the demo user already has contacts
//
// Every person and company here is invented.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const MOCK_CLERK_ID = "user_mock_000000000000000001"; // must match src/lib/auth.ts

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const day = (offset, hour = 11) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d;
};

async function main() {
  const user = await db.userProfile.upsert({
    where: { clerkId: MOCK_CLERK_ID },
    update: { role: "JOB_SEEKER" },
    create: { clerkId: MOCK_CLERK_ID, email: "alexander@relationshipos.dev", name: "Alexander Pierce", role: "JOB_SEEKER" },
  });
  if (await db.contact.count({ where: { userId: user.id } })) {
    console.log("Demo user already has data; nothing to do.");
    return;
  }

  const contact = (name, company, role, tags, extra = {}) =>
    db.contact.create({ data: { userId: user.id, name, company, role, tags, ...extra } });

  const [maya, arjun, lena, omar, sofia] = await Promise.all([
    contact("Maya Chen", "Northwind Labs", "Engineering Manager", ["hiring-manager", "backend"],
      { email: "maya.chen@example.com", linkedin: "https://www.linkedin.com/in/example-maya" }),
    contact("Arjun Mehta", "Bluepeak Systems", "Technical Recruiter", ["recruiter"], { email: "arjun@example.com" }),
    contact("Lena Fischer", "Orbital Data", "Senior Engineer", ["referral", "python"]),
    contact("Omar Haddad", "Contoso Cloud", "Talent Partner", ["recruiter", "cloud"]),
    contact("Sofia Rossi", "Fabrikam AI", "ML Lead", ["ml", "mentor"], { notes: "Met at a meetup; offered a referral." }),
  ]);

  const opp = (title, status, contactId, priority, nextActionDate) =>
    db.opportunity.create({ data: { userId: user.id, title, status, contactId, priority, nextActionDate } });

  const [northwind, bluepeak, , fabrikam] = await Promise.all([
    opp("Backend Engineer - Northwind Labs", "Interviewing", maya.id, "HIGH", day(2)),
    opp("Software Engineer II - Bluepeak", "Applied", arjun.id, "MEDIUM", day(5)),
    opp("Platform Engineer - Contoso Cloud", "Rejected", omar.id, "LOW", null),
    opp("Applied ML Engineer - Fabrikam AI", "Offer Received", sofia.id, "HIGH", day(1)),
    opp("Data Engineer - Orbital Data", "Applied", lena.id, "MEDIUM", day(7)),
  ]);

  await db.followUp.createMany({
    data: [
      { userId: user.id, title: "Send thank-you note after panel", dueDate: day(0), contactId: maya.id, opportunityId: northwind.id },
      { userId: user.id, title: "Ask Arjun about interview timeline", dueDate: day(-1), contactId: arjun.id, opportunityId: bluepeak.id },
      { userId: user.id, title: "Reply to offer with questions", dueDate: day(1), contactId: sofia.id, opportunityId: fabrikam.id },
      { userId: user.id, title: "Coffee chat follow-up", dueDate: day(-6), contactId: lena.id, completed: true },
    ],
  });

  await db.meeting.create({
    data: {
      userId: user.id, title: "System design round", meetingDate: day(2, 15),
      notes: "Focus on queues and idempotency.", actionItems: ["Review rate limiting", "Prepare questions"],
      participants: { connect: [{ id: maya.id }] },
    },
  });
  await db.meeting.create({
    data: {
      userId: user.id, title: "Offer discussion", meetingDate: day(4, 17),
      actionItems: ["Compare compensation", "Ask about mentorship"], participants: { connect: [{ id: sofia.id }] },
    },
  });

  await db.interaction.createMany({
    data: [
      { userId: user.id, contactId: sofia.id, opportunityId: fabrikam.id, type: "STATUS_CHANGE", description: 'Changed status of "Applied ML Engineer - Fabrikam AI" from "Interviewing" to "Offer Received"', occurredAt: day(-1, 18) },
      { userId: user.id, contactId: maya.id, type: "CALL", description: "Intro call: team uses Go and Postgres; panel next week.", occurredAt: day(-3, 12) },
      { userId: user.id, contactId: arjun.id, type: "LINKEDIN_MESSAGE", description: "Shared updated resume and portfolio link.", occurredAt: day(-4, 10) },
      { userId: user.id, contactId: lena.id, type: "MEETING", description: "Coffee chat about the data platform team.", occurredAt: day(-6, 16) },
    ],
  });

  await db.globalNote.create({
    data: { userId: user.id, content: "Prep list:\n- STAR stories\n- System design: caching, queues\n- Questions for each team" },
  });

  console.log("Seeded fictional demo data for the local demo user.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });

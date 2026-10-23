import type { Prisma } from "@prisma/client";

// Authorization for referenced records (OWASP "IDOR").
//
// Filtering list queries by userId is not enough: when an action accepts the id
// of *another* record (a contact on an opportunity, meeting participants, ...),
// it must check that the caller owns that record too. Otherwise a user who
// learns someone else's contact id could link it to their own data and then
// read it back through `include: { contact: true }`.

type Reader = Pick<Prisma.TransactionClient, "contact" | "opportunity">;

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export async function assertOwned(
  db: Reader,
  userId: string,
  refs: { contactIds?: (string | null | undefined)[]; opportunityIds?: (string | null | undefined)[] }
): Promise<void> {
  const contactIds = [...new Set((refs.contactIds ?? []).filter((id): id is string => !!id))];
  const opportunityIds = [...new Set((refs.opportunityIds ?? []).filter((id): id is string => !!id))];

  if (contactIds.length) {
    const owned = await db.contact.count({ where: { userId, id: { in: contactIds } } });
    // Same message whether the record is missing or belongs to someone else,
    // so the response doesn't reveal that the id exists.
    if (owned !== contactIds.length) throw new NotFoundError("Contact not found");
  }
  if (opportunityIds.length) {
    const owned = await db.opportunity.count({ where: { userId, id: { in: opportunityIds } } });
    if (owned !== opportunityIds.length) throw new NotFoundError("Opportunity not found");
  }
}

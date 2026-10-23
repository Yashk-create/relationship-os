import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  const payload = await req.json();
  const body = JSON.stringify(payload);

  // If no secret is configured, bypass validation in development mode
  if (!WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === "development") {
      const { id, email_addresses, first_name, last_name } = payload.data || {};
      const email = email_addresses?.[0]?.email_address || "";
      const name = [first_name, last_name].filter(Boolean).join(" ");
      
      if (payload.type === "user.created" || payload.type === "user.updated") {
        await db.userProfile.upsert({
          where: { clerkId: id },
          update: { email, name },
          create: { clerkId: id, email, name, role: null },
        });
      } else if (payload.type === "user.deleted") {
        await db.userProfile.deleteMany({ where: { clerkId: id } });
      }
      return NextResponse.json({ success: true, mode: "development_bypass" });
    }
    return new Response("Error: Please add CLERK_WEBHOOK_SECRET", { status: 400 });
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing svix headers", { status: 400 });
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error: Verification failed", { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses?.[0]?.email_address || "";
    const name = [first_name, last_name].filter(Boolean).join(" ");

    await db.userProfile.upsert({
      where: { clerkId: id },
      update: { email, name },
      create: { clerkId: id, email, name, role: null },
    });
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      await db.userProfile.deleteMany({
        where: { clerkId: id },
      });
    }
  }

  return NextResponse.json({ success: true });
}
export async function GET() {
  return new Response("Method Not Allowed", { status: 405 });
}

import { desc, eq, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { rsvps } from "../../../db/schema";

const validStatuses = new Set(["Hadir", "Tidak hadir", "Belum pasti"]);

async function readyDb() {
  const db = getDb();
  await db.$client.prepare(`CREATE TABLE IF NOT EXISTS rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    pax INTEGER DEFAULT 0 NOT NULL,
    note TEXT DEFAULT '' NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`).run();
  return db;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; status?: string; pax?: number; note?: string };
    const name = body.name?.trim().slice(0, 100) ?? "";
    const status = body.status?.trim() ?? "";
    const note = body.note?.trim().slice(0, 300) ?? "";
    const pax = status === "Hadir" ? Math.max(1, Math.min(6, Number(body.pax) || 1)) : 0;
    if (!name || !validStatuses.has(status)) return Response.json({ error: "Maklumat tidak lengkap." }, { status: 400 });

    const db = await readyDb();
    const [entry] = await db.insert(rsvps).values({ name, status, pax, note }).returning();
    return Response.json({ entry }, { status: 201 });
  } catch {
    return Response.json({ error: "Jawapan belum dapat disimpan. Sila cuba lagi." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("public") === "1") {
    try {
      const db = await readyDb();
      const entries = await db
        .select({ id: rsvps.id, name: rsvps.name, note: rsvps.note, createdAt: rsvps.createdAt })
        .from(rsvps)
        .where(ne(rsvps.note, ""))
        .orderBy(desc(rsvps.createdAt), desc(rsvps.id))
        .limit(50);
      return Response.json({ entries });
    } catch {
      return Response.json({ entries: [] });
    }
  }

  const adminPin = process.env.RSVP_ADMIN_PIN ?? "10127";
  if (request.headers.get("x-admin-pin") !== adminPin) {
    return Response.json({ error: "PIN tidak sah." }, { status: 401 });
  }
  try {
    const db = await readyDb();
    const entries = await db.select().from(rsvps).orderBy(desc(rsvps.createdAt), desc(rsvps.id)).limit(1000);
    return Response.json({ entries });
  } catch {
    return Response.json({ error: "Senarai belum dapat dibuka." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const adminPin = process.env.RSVP_ADMIN_PIN ?? "10127";
  if (request.headers.get("x-admin-pin") !== adminPin) {
    return Response.json({ error: "PIN tidak sah." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { id?: number };
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "ID tidak sah." }, { status: 400 });
    const db = await readyDb();
    await db.delete(rsvps).where(eq(rsvps.id, id));
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: "Catatan belum dapat dipadam." }, { status: 500 });
  }
}

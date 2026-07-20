import { getDb } from "../../../db";

const validStatuses = new Set([
  "Hadir",
  "Tidak hadir",
  "Belum pasti",
]);

const ADMIN_PIN = "10127";

async function readyDb() {
  const db = getDb();

  await db.$client
    .prepare(`
      CREATE TABLE IF NOT EXISTS rsvps (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        pax INTEGER DEFAULT 0 NOT NULL,
        note TEXT DEFAULT '' NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `)
    .run();

  return db;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      status?: string;
      pax?: number;
      note?: string;
    };

    const name = body.name?.trim().slice(0, 100) ?? "";
    const status = body.status?.trim() ?? "";
    const note = body.note?.trim().slice(0, 300) ?? "";

    const pax =
      status === "Hadir"
        ? Math.max(1, Math.min(6, Number(body.pax) || 1))
        : 0;

    if (!name || !validStatuses.has(status)) {
      return Response.json(
        { error: "Maklumat tidak lengkap." },
        { status: 400 }
      );
    }

    const db = await readyDb();

    await db.$client
      .prepare(`
        INSERT INTO rsvps (name, status, pax, note)
        VALUES (?, ?, ?, ?)
      `)
      .bind(name, status, pax, note)
      .run();

    return Response.json({ saved: true }, { status: 201 });
  } catch (error) {
    console.error("RSVP POST error:", error);

    return Response.json(
      { error: "Jawapan belum dapat disimpan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const db = await readyDb();

    if (url.searchParams.get("public") === "1") {
      const result = await db.$client
        .prepare(`
          SELECT
            id,
            name,
            note,
            created_at AS createdAt
          FROM rsvps
          WHERE note <> ''
          ORDER BY created_at DESC, id DESC
          LIMIT 50
        `)
        .all();

      return Response.json({
        entries: result.results ?? [],
      });
    }

    if (request.headers.get("x-admin-pin") !== ADMIN_PIN) {
      return Response.json(
        { error: "PIN tidak sah." },
        { status: 401 }
      );
    }

    const result = await db.$client
      .prepare(`
        SELECT
          id,
          name,
          status,
          pax,
          note,
          created_at AS createdAt
        FROM rsvps
        ORDER BY created_at DESC, id DESC
        LIMIT 1000
      `)
      .all();

    return Response.json({
      entries: result.results ?? [],
    });
  } catch (error) {
    console.error("RSVP GET error:", error);

    return Response.json(
      { error: "Senarai belum dapat dibuka." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (request.headers.get("x-admin-pin") !== ADMIN_PIN) {
    return Response.json(
      { error: "PIN tidak sah." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as { id?: number };
    const id = Number(body.id);

    if (!Number.isInteger(id) || id < 1) {
      return Response.json(
        { error: "ID tidak sah." },
        { status: 400 }
      );
    }

    const db = await readyDb();

    await db.$client
      .prepare(`DELETE FROM rsvps WHERE id = ?`)
      .bind(id)
      .run();

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("RSVP DELETE error:", error);

    return Response.json(
      { error: "Catatan belum dapat dipadam." },
      { status: 500 }
    );
  }
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { SavedSet } from "@/lib/music/types";

const payloadSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  createdAt: z.string(),
  set: z.unknown(),
});

export const listCloudSets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      name: string;
      created_at: string;
      payload: string;
    }>`
      select id, name, created_at, payload
      from studio_sets
      where user_id = ${context.userId}
      order by created_at desc
      limit 40
    `;
    return rows
      .map((row) => {
        try {
          const parsed = JSON.parse(row.payload) as SavedSet;
          return {
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            set: parsed.set,
          } satisfies SavedSet;
        } catch {
          return null;
        }
      })
      .filter((x): x is SavedSet => x !== null);
  });

export const saveCloudSet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => payloadSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const payload = JSON.stringify(data);
    await sql`
      insert into studio_sets (id, user_id, name, payload)
      values (${data.id}, ${context.userId}, ${data.name}, ${payload})
    `;
    return { ok: true as const };
  });

export const deleteCloudSet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => z.string().parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`
      delete from studio_sets
      where id = ${id} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

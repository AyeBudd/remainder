import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { MAX_WALLETS, normalizeAddress } from "@/lib/wallet";
import type { LinkedWallet } from "@/lib/types";

export const listUserWallets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LinkedWallet[]> => {
    const sql = await getSql();
    const rows = await sql<{ address: string; label: string | null }>`
      select address, label from user_wallets
      where user_id = ${context.userId}
      order by id asc
    `;
    return rows.map((row) => ({ address: row.address, label: row.label }));
  });

export const addUserWallet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.string().parse(input))
  .handler(async ({ context, data }): Promise<LinkedWallet[]> => {
    const address = normalizeAddress(data);
    const sql = await getSql();
    const count = await sql<{ n: string | number }>`
      select count(*) as n from user_wallets where user_id = ${context.userId}
    `;
    if (Number(count[0]?.n ?? 0) >= MAX_WALLETS) {
      throw new Error(`You can link up to ${MAX_WALLETS} wallets.`);
    }
    await sql`
      insert into user_wallets (user_id, address)
      values (${context.userId}, ${address})
      on conflict (user_id, address) do nothing
    `;
    const rows = await sql<{ address: string; label: string | null }>`
      select address, label from user_wallets
      where user_id = ${context.userId}
      order by id asc
    `;
    return rows.map((row) => ({ address: row.address, label: row.label }));
  });

export const removeUserWallet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.string().parse(input))
  .handler(async ({ context, data }): Promise<LinkedWallet[]> => {
    const address = normalizeAddress(data);
    const sql = await getSql();
    await sql`
      delete from user_wallets
      where user_id = ${context.userId} and address = ${address}
    `;
    const rows = await sql<{ address: string; label: string | null }>`
      select address, label from user_wallets
      where user_id = ${context.userId}
      order by id asc
    `;
    return rows.map((row) => ({ address: row.address, label: row.label }));
  });

import { Pool } from "pg";

type CheckoutSessionRecord = {
  sessionId: string;
  customerEmail: string | null;
  eventType: string;
  rawPayload: unknown;
};

declare global {
  var __pqePool: Pool | undefined;
  var __pqeBillingTableReady: Promise<void> | undefined;
}

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}

export function getPgPool(): Pool {
  if (!global.__pqePool) {
    global.__pqePool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    });
  }

  return global.__pqePool;
}

async function ensureBillingTable(): Promise<void> {
  if (!global.__pqeBillingTableReady) {
    global.__pqeBillingTableReady = (async () => {
      const pool = getPgPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS stripe_paid_sessions (
          session_id TEXT PRIMARY KEY,
          customer_email TEXT,
          event_type TEXT NOT NULL,
          raw_payload JSONB NOT NULL,
          paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    })();
  }

  await global.__pqeBillingTableReady;
}

export async function runExplainQuery(sqlQuery: string): Promise<unknown> {
  const pool = getPgPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '8s'");
    const explainResult = await client.query(
      `EXPLAIN (FORMAT JSON, VERBOSE TRUE, BUFFERS TRUE, COSTS TRUE) ${sqlQuery}`
    );
    await client.query("COMMIT");

    const rawPlan = explainResult.rows?.[0]?.["QUERY PLAN"];
    if (!rawPlan) {
      throw new Error("PostgreSQL did not return an execution plan.");
    }

    return rawPlan;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function recordPaidCheckoutSession(record: CheckoutSessionRecord): Promise<void> {
  await ensureBillingTable();
  const pool = getPgPool();

  await pool.query(
    `
      INSERT INTO stripe_paid_sessions (session_id, customer_email, event_type, raw_payload)
      VALUES ($1, $2, $3, $4::jsonb)
      ON CONFLICT (session_id)
      DO UPDATE SET
        customer_email = EXCLUDED.customer_email,
        event_type = EXCLUDED.event_type,
        raw_payload = EXCLUDED.raw_payload,
        paid_at = NOW();
    `,
    [record.sessionId, record.customerEmail, record.eventType, JSON.stringify(record.rawPayload)]
  );
}

export async function isPaidCheckoutSession(sessionId: string): Promise<boolean> {
  await ensureBillingTable();
  const pool = getPgPool();

  const result = await pool.query(
    `
      SELECT 1
      FROM stripe_paid_sessions
      WHERE session_id = $1
      LIMIT 1;
    `,
    [sessionId]
  );

  return (result.rowCount ?? 0) > 0;
}

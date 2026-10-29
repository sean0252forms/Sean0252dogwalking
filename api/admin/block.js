import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

const D = /^\d{4}-\d{2}-\d{2}$/;

// Block or unblock one day or a range of days (inclusive). Body: { from, to?, reason?, remove? } (or { day }).
export default async function (req, res) {
  const { day, from, to, remove, reason } = req.body || {};
  const a = from || day;
  const z = to || a;
  if (!D.test(a || "") || !D.test(z || "")) return res.status(400).json({ error: "Bad date" });
  if (z < a) return res.status(400).json({ error: "End date is before the start date" });
  const span = (await db.query("SELECT ($2::date - $1::date) AS n", [a, z])).rows[0].n;
  if (span > 365) return res.status(400).json({ error: "Please block at most a year at a time" });

  if (remove) {
    await db.query("DELETE FROM blocked_days WHERE day BETWEEN $1::date AND $2::date", [a, z]);
  } else {
    await db.query(
      "INSERT INTO blocked_days (day, reason) SELECT g::date, $3::text FROM generate_series($1::date, $2::date, interval '1 day') AS g WHERE NOT EXISTS (SELECT 1 FROM blocked_days WHERE day = g::date)",
      [a, z, reason || null]
    );
  }
  const aff = (await db.query("SELECT count(*)::int AS n FROM bookings WHERE walk_date BETWEEN $1::date AND $2::date AND status IN ('pending','paid')", [a, z])).rows[0].n;
  res.json({ ok: true, affected: remove ? 0 : aff });
}
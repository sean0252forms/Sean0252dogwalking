import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

const D = /^\d{4}-\d{2}-\d{2}$/;
const START = /^(0[7-9]|1[0-8]):(00|30)$/;
const END = /^(0[7-9]|1[0-9]):(00|30)$/;
const nxt = t => { let [h, m] = t.split(":").map(Number); m += 30; if (m >= 60) { h++; m = 0; } return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"); };

// Block or unblock half-hour slots on one day: from (inclusive) to to (exclusive).
export default async function (req, res) {
  const { day, from, to, remove, reason } = req.body || {};
  if (!D.test(day || "") || !START.test(from || "") || !END.test(to || "") || to <= from) {
    return res.status(400).json({ error: "Pick a date and a start time before the end time" });
  }
  const slots = [];
  for (let t = from; t < to; t = nxt(t)) if (START.test(t)) slots.push(t);

  if (remove) {
    await db.query("DELETE FROM blocked_times WHERE day = $1::date AND time >= $2 AND time < $3", [day, from, to]);
  } else {
    await db.transaction(slots.map(t => ({
      sql: "INSERT INTO blocked_times (day, time, reason) SELECT $1::date, $2::text, $3::text WHERE NOT EXISTS (SELECT 1 FROM blocked_times WHERE day = $1::date AND time = $2::text)",
      params: [day, t, reason || null],
    })));
  }
  const aff = (await db.query("SELECT count(*)::int AS n FROM bookings WHERE walk_date = $1::date AND walk_time >= $2 AND walk_time < $3 AND status IN ('pending','paid')", [day, from, to])).rows[0].n;
  res.json({ ok: true, affected: remove ? 0 : aff });
}
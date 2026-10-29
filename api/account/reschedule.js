import { db } from "hatchable";
import { notify } from "lib/notice.js";

export const access = "user";
export const methods = ["POST"];

export default async function (req, res) {
  const { id, walk_date, walk_time } = req.body || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(walk_date || "") || !/^(0[7-9]|1[0-8]):(00|30)$/.test(walk_time || "")) {
    return res.status(400).json({ error: "Pick a valid date and time." });
  }
  const bk = (await db.query(
    "SELECT b.*, (b.walk_date > CURRENT_DATE) AS can_change, ($4::date > CURRENT_DATE) AS new_ok FROM bookings b WHERE b.id = $1 AND (b.user_id = $2 OR lower(b.email) = lower($3))",
    [id, req.user.id, req.user.email, walk_date]
  )).rows[0];
  if (!bk) return res.status(404).json({ error: "Booking not found" });
  if (!["pending", "paid"].includes(bk.status)) return res.status(400).json({ error: "This booking can't be rescheduled." });
  if (!bk.can_change) return res.status(400).json({ error: "Online changes close the day before the walk. Please contact us directly." });
  if (!bk.new_ok) return res.status(400).json({ error: "Pick a date in the future." });
  const blocked = await db.query("SELECT 1 FROM blocked_days WHERE day = $1::date", [walk_date]);
  if (blocked.rows.length) return res.status(400).json({ error: "We're unavailable on that date. Please pick another day." });
  const bt = await db.query("SELECT 1 FROM blocked_times WHERE day = $1::date AND time = $2", [walk_date, walk_time]);
  if (bt.rows.length) return res.status(400).json({ error: "That time isn't available. Please pick another time." });
  await db.query("UPDATE bookings SET walk_date = $1::date, walk_time = $2 WHERE id = $3", [walk_date, walk_time, id]);
  await notify(id, "Booking #" + id + " rescheduled", "Your walk has been moved to the new date and time below.");
  res.json({ ok: true });
}
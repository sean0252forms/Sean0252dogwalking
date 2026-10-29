import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

export default async function (req, res) {
  const { day, remove, reason } = req.body || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "")) return res.status(400).json({ error: "Bad date" });
  if (remove) {
    await db.query("DELETE FROM blocked_days WHERE day = $1", [day]);
  } else {
    await db.query("INSERT INTO blocked_days (day, reason) SELECT $1::date, $2 WHERE NOT EXISTS (SELECT 1 FROM blocked_days WHERE day = $1::date)", [day, reason || null]);
  }
  res.json({ ok: true });
}
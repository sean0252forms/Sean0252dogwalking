import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

const OK = ["pending", "paid", "completed", "cancelled"];

export default async function (req, res) {
  const { id, status } = req.body || {};
  if (!id || !OK.includes(status)) return res.status(400).json({ error: "Bad id or status" });
  const r = await db.query("UPDATE bookings SET status = $1 WHERE id = $2", [status, id]);
  res.json({ ok: true, changed: r.rowCount });
}
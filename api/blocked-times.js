import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { rows } = await db.query("SELECT to_char(day, 'YYYY-MM-DD') AS day, time, reason FROM blocked_times WHERE day >= CURRENT_DATE ORDER BY day, time");
  res.json(rows);
}
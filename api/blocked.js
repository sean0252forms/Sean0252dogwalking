import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { rows } = await db.query("SELECT to_char(day, 'YYYY-MM-DD') AS day, reason FROM blocked_days WHERE day >= CURRENT_DATE ORDER BY day");
  res.json(rows);
}
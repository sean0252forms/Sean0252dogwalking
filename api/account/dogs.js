import { db } from "hatchable";

export const access = "user";
export const methods = ["GET", "POST", "DELETE"];

export default async function (req, res) {
  const uid = req.user.id;
  if (req.method === "GET") {
    const { rows } = await db.query("SELECT id, name, notes FROM dogs WHERE user_id = $1 ORDER BY name", [uid]);
    return res.json(rows);
  }
  const b = req.body || {};
  if (req.method === "DELETE") {
    await db.query("DELETE FROM dogs WHERE id = $1 AND user_id = $2", [b.id, uid]);
    return res.json({ ok: true });
  }
  const name = String(b.name || "").trim();
  if (!name) return res.status(400).json({ error: "Dog's name is required" });
  const notes = b.notes ? String(b.notes) : null;
  if (b.id) {
    await db.query("UPDATE dogs SET name = $1, notes = $2 WHERE id = $3 AND user_id = $4", [name, notes, b.id, uid]);
  } else {
    await db.query("INSERT INTO dogs (user_id, name, notes) VALUES ($1, $2, $3)", [uid, name, notes]);
  }
  res.json({ ok: true });
}
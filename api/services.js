import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

const SEED = [
  ["Quick Stroll", "A 20-minute neighborhood loop for potty breaks and sniffs.", 20, 1500],
  ["Standard Walk", "30 minutes of exercise with fresh water and a paw wipe.", 30, 2200],
  ["Adventure Walk", "An hour on trails or at the park for high-energy pups.", 60, 3800],
];

export default async function (req, res) {
  let { rows } = await db.query("SELECT * FROM services ORDER BY price_cents");
  if (rows.length === 0) {
    for (const s of SEED) {
      await db.query(
        "INSERT INTO services (name, description, minutes, price_cents) VALUES ($1,$2,$3,$4)",
        s
      );
    }
    rows = (await db.query("SELECT * FROM services ORDER BY price_cents")).rows;
  }
  res.json(rows);
}
import { db } from "hatchable";

export const access = "admin";
export const methods = ["GET"];

export default async function (req, res) {
  const { rows } = await db.query(
    "SELECT b.id, b.owner_name, b.email, b.phone, b.dog_name, b.dog_notes, b.address, b.walk_date, b.walk_time, b.status, s.name AS service, s.price_cents FROM bookings b JOIN services s ON s.id = b.service_id ORDER BY b.walk_date, b.walk_time"
  );
  res.json(rows);
}
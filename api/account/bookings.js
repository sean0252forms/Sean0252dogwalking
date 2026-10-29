import { db } from "hatchable";

export const access = "user";
export const methods = ["GET"];

export default async function (req, res) {
  const { rows } = await db.query(
    "SELECT b.id, b.dog_name, b.address, to_char(b.walk_date, 'YYYY-MM-DD') AS walk_date, b.walk_time, b.status, (b.walk_date > CURRENT_DATE AND b.status IN ('pending','paid')) AS can_change, s.name AS service, s.price_cents FROM bookings b JOIN services s ON s.id = b.service_id WHERE b.user_id = $1 OR lower(b.email) = lower($2) ORDER BY b.walk_date DESC, b.walk_time DESC",
    [req.user.id, req.user.email]
  );
  res.json(rows);
}
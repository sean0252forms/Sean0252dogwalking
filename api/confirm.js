import { db, api } from "hatchable";
import { sendConfirmation } from "lib/mail.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { id, session_id } = req.query || {};
  if (!id || !session_id) return res.status(400).json({ error: "Missing id or session_id" });
  const bk = (await db.query("SELECT b.*, s.name AS service FROM bookings b JOIN services s ON s.id = b.service_id WHERE b.id = $1", [id])).rows[0];
  if (!bk || bk.stripe_session !== session_id) return res.status(404).json({ error: "Booking not found" });
  try {
    const r = await api.stripe.get("/v1/checkout/sessions/" + session_id);
    const s = r.data || r.body || r;
    if (s.payment_status === "paid") {
      await db.query("UPDATE bookings SET status = 'paid' WHERE id = $1", [id]);
      bk.status = "paid";
      await sendConfirmation(bk.id);
    }
  } catch (e) {}
  res.json({ id: bk.id, status: bk.status, service: bk.service, dog_name: bk.dog_name, walk_date: bk.walk_date, walk_time: bk.walk_time });
}
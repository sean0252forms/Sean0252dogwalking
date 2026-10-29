import { db, api } from "hatchable";
import { notify } from "lib/notice.js";

export const access = "user";
export const methods = ["POST"];

export default async function (req, res) {
  const id = (req.body || {}).id;
  const bk = (await db.query(
    "SELECT b.*, (b.walk_date > CURRENT_DATE) AS can_change FROM bookings b WHERE b.id = $1 AND (b.user_id = $2 OR lower(b.email) = lower($3))",
    [id, req.user.id, req.user.email]
  )).rows[0];
  if (!bk) return res.status(404).json({ error: "Booking not found" });
  if (!["pending", "paid"].includes(bk.status)) return res.status(400).json({ error: "This booking can't be cancelled." });
  if (!bk.can_change) return res.status(400).json({ error: "Online changes close the day before the walk. Please contact us directly." });

  let refund = null;
  if (bk.status === "paid") {
    refund = "none";
    if (bk.stripe_session) {
      try {
        const r = await api.stripe.get("/v1/checkout/sessions/" + bk.stripe_session);
        const s = r.data || r.body || r;
        if (s.payment_status === "paid" && s.payment_intent) {
          await api.stripe.post("/v1/refunds", { body: { payment_intent: s.payment_intent } });
          refund = "refunded";
        }
      } catch (e) { refund = "manual"; }
    }
  }
  await db.query("UPDATE bookings SET status = 'cancelled', refund = $1 WHERE id = $2", [refund, id]);
  const line = refund === "refunded" ? "Your booking is cancelled and your payment has been refunded to your card (it can take 5-10 days to show up)."
    : refund === "none" || refund === "manual" ? "Your booking is cancelled. We'll be in touch about your refund shortly."
    : "Your booking is cancelled.";
  await notify(id, "Booking #" + id + " cancelled", line);
  res.json({ ok: true, refund });
}
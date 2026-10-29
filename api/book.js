import { db, api, auth } from "hatchable";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const b = req.body || {};
  const need = ["service_id", "owner_name", "email", "dog_name", "address", "walk_date", "walk_time"];
  for (const k of need) {
    if (!b[k] || String(b[k]).trim() === "") return res.status(400).json({ error: "Missing field: " + k });
  }
  const svc = (await db.query("SELECT * FROM services WHERE id = $1", [b.service_id])).rows[0];
  if (!svc) return res.status(400).json({ error: "Unknown service" });
  if (new Date(b.walk_date) < new Date(new Date().toDateString())) {
    return res.status(400).json({ error: "Pick a date in the future" });
  }
  const blocked = await db.query("SELECT reason FROM blocked_days WHERE day = $1::date", [b.walk_date]);
  if (blocked.rows.length) return res.status(400).json({ error: "Sorry, we're unavailable on that date. Please pick another day." });

  const user = await auth.getUser(req);
  const ins = await db.query(
    "INSERT INTO bookings (service_id, owner_name, email, phone, dog_name, dog_notes, address, walk_date, walk_time, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id",
    [svc.id, b.owner_name, b.email, b.phone || null, b.dog_name, b.dog_notes || null, b.address, b.walk_date, b.walk_time, user ? user.id : null]
  );
  const id = ins.rows[0].id;
  const origin = "https://" + (req.headers.host || "paws-stride-dog.hatchable.site");

  try {
    const session = await api.stripe.post("/v1/checkout/sessions", {
      body: {
        mode: "payment",
        customer_email: b.email,
        success_url: origin + "/?paid=" + id + "&session_id={CHECKOUT_SESSION_ID}",
        cancel_url: origin + "/?cancelled=" + id,
        "line_items[0][quantity]": 1,
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": svc.price_cents,
        "line_items[0][price_data][product_data][name]": svc.name + " for " + b.dog_name,
        "metadata[booking_id]": String(id),
      },
    });
    const data = session.data || session.body || session;
    await db.query("UPDATE bookings SET stripe_session = $1 WHERE id = $2", [data.id, id]);
    res.json({ id, checkout_url: data.url });
  } catch (e) {
    res.status(503).json({ error: "Payments aren't connected yet. Your booking request (#" + id + ") was saved.", id });
  }
}
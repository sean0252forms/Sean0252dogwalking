import { db, email } from "hatchable";

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Sends the confirmation once per booking. Safe to call repeatedly.
export async function sendConfirmation(id) {
  const claimed = await db.query("UPDATE bookings SET emailed = true WHERE id = $1 AND emailed = false AND status IN ('paid','completed') RETURNING id", [id]);
  if (claimed.rows.length === 0) return false;
  const b = (await db.query("SELECT b.*, s.name AS service, s.minutes, s.price_cents FROM bookings b JOIN services s ON s.id = b.service_id WHERE b.id = $1", [id])).rows[0];
  if (!b) return false;
  const day = String(b.walk_date).slice(0, 10);
  const html = "<div style='font-family:sans-serif;max-width:480px'>" +
    "<h2>You're booked! \ud83d\udc3e</h2>" +
    "<p>Hi " + esc(b.owner_name) + ", thanks for booking with Paws &amp; Stride. Here are the details for " + esc(b.dog_name) + ":</p>" +
    "<ul><li><b>Walk:</b> " + esc(b.service) + " (" + b.minutes + " min)</li>" +
    "<li><b>When:</b> " + esc(day) + " at " + esc(b.walk_time) + "</li>" +
    "<li><b>Pickup:</b> " + esc(b.address) + "</li>" +
    "<li><b>Paid:</b> $" + (b.price_cents / 100).toFixed(2) + "</li>" +
    "<li><b>Booking #:</b> " + b.id + "</li></ul>" +
    "<p>Need to change something? Just reply to this email.</p></div>";
  try {
    await email.send({ to: b.email, subject: "Booking confirmed: " + b.dog_name + " on " + day, html });
    return true;
  } catch (e) {
    await db.query("UPDATE bookings SET emailed = false WHERE id = $1", [id]);
    return false;
  }
}
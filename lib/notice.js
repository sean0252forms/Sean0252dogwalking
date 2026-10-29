import { db, email } from "hatchable";

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Best-effort notice email about a booking change. Never throws.
export async function notify(id, subject, line) {
  try {
    const b = (await db.query("SELECT owner_name, email, dog_name, to_char(walk_date, 'YYYY-MM-DD') AS day, walk_time FROM bookings WHERE id = $1", [id])).rows[0];
    if (!b) return;
    const html = "<div style='font-family:sans-serif;max-width:480px'><h2>Paws &amp; Stride</h2><p>Hi " + esc(b.owner_name) + ",</p><p>" + esc(line) + "</p><p><b>Booking #" + id + "</b> for " + esc(b.dog_name) + ": " + esc(b.day) + " at " + esc(b.walk_time) + "</p></div>";
    await email.send({ to: b.email, subject, html });
  } catch (e) {}
}
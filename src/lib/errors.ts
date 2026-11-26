/** Turn a Supabase/PostgREST error into a message safe to show an admin. */
export function friendlyDbError(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";
  const { code, message = "" } = error;
  // Errors raised deliberately by our SQL functions (errcode 22023 / P0002) are user-facing.
  if (code === "22023" || code === "P0002") return message;
  if (code === "42501") return "You are not authorised to perform this action.";
  if (code === "23505") return "A record with these details already exists.";
  if (code === "23503") return "This record is referenced by other data and cannot be removed.";
  if (code === "23514") {
    if (message.includes("phone")) return "Enter a valid phone number.";
    if (message.includes("fee_dues_paid_range")) return "Amount cannot be lower than what has already been paid.";
    return "Some values are out of the allowed range.";
  }
  console.error("Database error", { code, message });
  return "Something went wrong. Please try again.";
}

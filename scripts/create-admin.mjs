#!/usr/bin/env node
/**
 * Creates (or promotes) an admin account.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/create-admin.mjs admin@institute.com "Full Name"
 *
 * The password is read from ADMIN_PASSWORD, or prompted for, so it never
 * appears in shell history. Public sign-up stays disabled; this is the only
 * way an account gains access to the app.
 */
import { createClient } from "@supabase/supabase-js";
import readline from "node:readline";

const [email, fullName = null] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!email || !url || !key) {
  console.error("Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-admin.mjs <email> [full name]");
  process.exit(1);
}

async function readPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl._writeToOutput = (s) => {
    if (s.includes("Password")) process.stdout.write(s);
  };
  const pw = await new Promise((resolve) => rl.question("Password (min 10 chars, upper+lower+digit): ", resolve));
  rl.close();
  process.stdout.write("\n");
  return pw;
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// Find existing user (paginate through the admin list).
let user = null;
for (let page = 1; page < 50 && !user; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
  if (data.users.length < 200) break;
}

if (!user) {
  const password = await readPassword();
  if (!password || password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    console.error("Password must be at least 10 characters with upper case, lower case and a digit.");
    process.exit(1);
  }
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  user = data.user;
  console.log(`Created user ${email}`);
} else {
  console.log(`User ${email} already exists; granting admin access.`);
}

const { error } = await supabase.from("admins").upsert({ user_id: user.id, full_name: fullName }, { onConflict: "user_id" });
if (error) throw error;
console.log(`✔ ${email} is now an admin.`);

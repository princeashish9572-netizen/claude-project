import "server-only";

/**
 * Server-only configuration. Nothing here uses the NEXT_PUBLIC_ prefix, so
 * none of these values can be inlined into client bundles. Values are read
 * lazily so `next build` works without secrets present.
 */
function required(name: string, ...fallbacks: string[]): string {
  for (const key of [name, ...fallbacks]) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }
  throw new Error(`Missing required environment variable: ${name}`);
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export const env = {
  get supabaseUrl() {
    return required("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
  },
  get cronSecret() {
    return optional("CRON_SECRET");
  },
  get telegramBotToken() {
    return optional("TELEGRAM_BOT_TOKEN");
  },
  get telegramChatId() {
    return optional("TELEGRAM_CHAT_ID");
  },
  /** Override only when using a self-hosted Telegram Bot API server. */
  get telegramApiBase() {
    return (optional("TELEGRAM_API_BASE_URL") ?? "https://api.telegram.org").replace(/\/$/, "");
  },
  get appUrl() {
    return optional("APP_URL");
  },
  get institute() {
    return {
      name: optional("INSTITUTE_NAME") ?? "Institute",
      address: optional("INSTITUTE_ADDRESS"),
      phone: optional("INSTITUTE_PHONE"),
    };
  },
};

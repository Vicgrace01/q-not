type TestDatabaseEnvironment = {
  NODE_ENV?: string;
  DATABASE_URL?: string;
  QNOT_TEST_DATABASE_HOST?: string;
  QNOT_TEST_DATABASE_NAME?: string;
};

/** Fail closed before a test helper performs any destructive database query. */
export function assertSafeTestDatabase(env: TestDatabaseEnvironment = process.env): {
  host: string;
  database: string;
} {
  if (env.NODE_ENV !== "test") {
    throw new Error("Refusing to reset data unless NODE_ENV is exactly 'test'.");
  }
  if (!env.DATABASE_URL) {
    throw new Error("Refusing to reset data: DATABASE_URL is missing.");
  }
  if (!env.QNOT_TEST_DATABASE_HOST || !env.QNOT_TEST_DATABASE_NAME) {
    throw new Error(
      "Refusing to reset data: set QNOT_TEST_DATABASE_HOST and QNOT_TEST_DATABASE_NAME in .env.test.",
    );
  }

  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw new Error("Refusing to reset data: DATABASE_URL is not a valid URL.");
  }

  const host = url.hostname.toLowerCase().replace(/-pooler(?=\.)/, "").replace(/\.$/, "");
  const expectedHost = env.QNOT_TEST_DATABASE_HOST.toLowerCase().replace(/\.$/, "");
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const expectedDatabase = env.QNOT_TEST_DATABASE_NAME;

  if (host !== expectedHost) {
    throw new Error(
      `Refusing to reset data: database host '${host}' does not match the allowlisted test host.`,
    );
  }
  if (database !== expectedDatabase) {
    throw new Error(
      `Refusing to reset data: database '${database}' does not match the allowlisted test database.`,
    );
  }

  return { host, database };
}

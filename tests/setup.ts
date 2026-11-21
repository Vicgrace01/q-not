import { config } from "dotenv";

// Load test env before anything else.
// .env.test must point to an isolated test database and declare its exact
// QNOT_TEST_DATABASE_HOST and QNOT_TEST_DATABASE_NAME allowlist values.
config({ path: ".env.test", override: true });

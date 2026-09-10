import { config } from "dotenv";

// Load test env before anything else.
// .env.test points DATABASE_URL at q_not_test, never the dev DB.
config({ path: ".env.test", override: true });

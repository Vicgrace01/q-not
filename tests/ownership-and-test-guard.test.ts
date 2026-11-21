import { describe, expect, it } from "vitest";
import { assertOperatorMayManageDriver } from "@/lib/driver/operator-association";
import { assertSafeTestDatabase } from "./helpers/test-database-guard";

describe("release safety guards", () => {
  it("allows a new driver record when the phone is not already registered", () => {
    expect(assertOperatorMayManageDriver(null, "operator-a")).toBe("CREATE_NEW");
  });

  it("allows an operator to manage a driver already belonging to that operator", () => {
    expect(assertOperatorMayManageDriver({ id: "driver-1", operatorId: "operator-a" }, "operator-a"))
      .toBe("SAME_OPERATOR");
  });

  it("rejects an operator attempting to claim an independent driver account", () => {
    expect(() => assertOperatorMayManageDriver({ id: "driver-1", operatorId: null }, "operator-a"))
      .toThrow("driver-claim-required");
  });

  it("rejects a driver already attached to another operator", () => {
    expect(() => assertOperatorMayManageDriver({ id: "driver-1", operatorId: "operator-b" }, "operator-a"))
      .toThrow("driver-already-assigned");
  });

  const safeTestEnv = {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@ep-test-pooler.c-8.aws.neon.tech/neondb?sslmode=verify-full",
    QNOT_TEST_DATABASE_HOST: "ep-test.c-8.aws.neon.tech",
    QNOT_TEST_DATABASE_NAME: "neondb",
  };

  it("accepts the pooled endpoint when its underlying Neon branch is allowlisted", () => {
    expect(assertSafeTestDatabase(safeTestEnv)).toEqual({
      host: "ep-test.c-8.aws.neon.tech",
      database: "neondb",
    });
  });

  it("fails closed when the URL points to production", () => {
    expect(() => assertSafeTestDatabase({
      ...safeTestEnv,
      DATABASE_URL: "postgresql://test:test@ep-production.c-8.aws.neon.tech/neondb",
    })).toThrow("does not match the allowlisted test host");
  });

  it("fails closed when the test allowlist is absent", () => {
    expect(() => assertSafeTestDatabase({
      NODE_ENV: "test",
      DATABASE_URL: safeTestEnv.DATABASE_URL,
    })).toThrow("QNOT_TEST_DATABASE_HOST and QNOT_TEST_DATABASE_NAME");
  });

  it("fails closed outside the test environment", () => {
    expect(() => assertSafeTestDatabase({ ...safeTestEnv, NODE_ENV: "production" }))
      .toThrow("NODE_ENV is exactly 'test'");
  });
});

export type ExistingDriverOwnership = {
  id: string;
  operatorId: string | null;
};

/**
 * Decide whether an operator can use a driver record they found by phone.
 * Existing self-managed (operatorId=null) accounts must be claimed by the
 * driver through an authenticated invitation flow; phone knowledge alone is
 * not authority to attach that account to an operator.
 */
export function assertOperatorMayManageDriver(
  driver: ExistingDriverOwnership | null,
  operatorId: string,
): "CREATE_NEW" | "SAME_OPERATOR" {
  if (!driver) return "CREATE_NEW";
  if (driver.operatorId === null) throw new Error("driver-claim-required");
  if (driver.operatorId !== operatorId) throw new Error("driver-already-assigned");
  return "SAME_OPERATOR";
}

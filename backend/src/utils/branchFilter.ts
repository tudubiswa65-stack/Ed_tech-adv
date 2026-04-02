import { JWTPayload } from '../types';

/**
 * Returns the branch_id that should be used to scope database queries for
 * the given authenticated user.
 *
 * - branch_admin → their own branch_id (data is strictly limited to one branch)
 * - super_admin / admin → null (no branch restriction; full access to all data)
 */
export function getUserBranchId(user: JWTPayload): string | null {
  if (user.role === 'branch_admin') {
    return user.branch_id ?? null;
  }
  return null;
}

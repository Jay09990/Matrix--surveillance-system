import type { Role } from '../types/user';

const RANK: Record<Role, number> = { VIEWER: 0, ADMIN: 1, SUPER_ADMIN: 2 };

export const normalizeRole = (role?: string | null): Role | undefined =>
  role ? (role.toUpperCase().replace(' ', '_') as Role) : undefined;

export const isAdminOrAbove = (role?: string | null) => {
  const r = normalizeRole(role);
  return r === 'ADMIN' || r === 'SUPER_ADMIN';
};

export const isSuperAdmin = (role?: string | null) => normalizeRole(role) === 'SUPER_ADMIN';

// Mirrors the backend's MANAGEABLE_TARGETS table in users.service.ts.
// Used purely for UI — hiding buttons the user isn't allowed to use.
// The backend re-enforces this regardless of what the frontend sends.
const MANAGEABLE_TARGETS: Record<Role, Role[]> = {
  SUPER_ADMIN: ['ADMIN', 'VIEWER'],
  ADMIN: ['VIEWER'],
  VIEWER: [],
};

export const canManageRole = (actorRole?: string | null, targetRole?: string | null) => {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  if (!actor || !target) return false;
  return MANAGEABLE_TARGETS[actor].includes(target);
};

// Roles the given actor is allowed to assign when creating/editing a user.
export const assignableRolesFor = (actorRole?: string | null): Role[] => {
  const actor = normalizeRole(actorRole);
  if (actor === 'SUPER_ADMIN') return ['ADMIN', 'VIEWER'];
  if (actor === 'ADMIN') return ['VIEWER'];
  return [];
};

// Keep RANK exported in case it's needed elsewhere
export { RANK };

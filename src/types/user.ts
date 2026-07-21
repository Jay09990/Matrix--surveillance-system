export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  name?: string; // legacy — backend does not currently return this; keep optional, do not remove usages elsewhere
}

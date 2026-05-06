export interface User {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
  name: string;
}

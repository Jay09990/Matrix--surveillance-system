import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Pencil, Trash2, Loader2, Search, AlertCircle, KeyRound, ShieldOff, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDistanceToNow } from 'date-fns';

import { useSessionStore } from '../../store/useSessionStore';
import { canManageRole } from '../../lib/roles';
import { useUsers, useDeleteUser, useSetUserStatus, useResetUserPassword } from './useUsers';
import { resetPasswordSchema, type ResetPasswordFormData } from '../../schemas/user.schema';
import type { User } from '../../types/user';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';

// ── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: User['role'] }) {
  const styles: Record<User['role'], string> = {
    SUPER_ADMIN: 'bg-[#7c3aed]/15 text-[#a78bfa] border border-[#7c3aed]/30',
    ADMIN: 'bg-[#2563eb]/15 text-[#2563eb] border border-[#2563eb]/30',
    VIEWER: 'bg-[#8d90a0]/15 text-[#8d90a0] border border-[#8d90a0]/30',
  };
  const labels: Record<User['role'], string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    VIEWER: 'Viewer',
  };
  return (
    <Badge
      variant="secondary"
      className={`text-[10px] font-mono rounded-[2px] px-2 py-0.5 ${styles[role]}`}
    >
      {labels[role]}
    </Badge>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function UserStatusBadge({ isActive }: { isActive?: boolean }) {
  if (isActive === false) {
    return (
      <Badge
        variant="secondary"
        className="text-[10px] font-mono rounded-[2px] px-2 py-0.5 bg-[#e03e3e]/15 text-[#e03e3e] border border-[#e03e3e]/30"
      >
        Disabled
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="text-[10px] font-mono rounded-[2px] px-2 py-0.5 bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
    >
      Active
    </Badge>
  );
}

// ── Reset Password Dialog ─────────────────────────────────────────────────────
function ResetPasswordDialog({
  open,
  userId,
  userEmail,
  onClose,
}: {
  open: boolean;
  userId: string | null;
  userEmail: string;
  onClose: () => void;
}) {
  const resetPassword = useResetUserPassword();
  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!userId) return;
    try {
      await resetPassword.mutateAsync({ id: userId, password: data.password });
      toast.success('Password reset successfully');
      form.reset();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#131313] border border-[#2a2a2a] text-[#e5e2e1] rounded-[2px] sm:max-w-md [&>button]:text-[#8d90a0] [&>button]:hover:text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-bold uppercase tracking-wider">
            Reset Password
          </DialogTitle>
          <DialogDescription className="text-[#8d90a0] text-sm">
            Set a new password for <span className="text-[#e5e2e1] font-mono">{userEmail}</span>.
            The user will need to use this new password to log in.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">
                    New Password
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Min 8 chars, upper, lower, number"
                      {...field}
                      className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb] text-[#e5e2e1]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-[#8d90a0] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[2px]"
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Set Password'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main UserTable ─────────────────────────────────────────────────────────────
export function UserTable() {
  const navigate = useNavigate();
  const { user: currentUser } = useSessionStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ id: string; email: string; isActive: boolean } | null>(null);
  const [resetTarget, setResetTarget] = useState<{ id: string; email: string } | null>(null);

  const { data: users, isLoading, isError, error } = useUsers();
  const deleteUser = useDeleteUser();
  const setUserStatus = useSetUserStatus();

  const deleteUserEmail = users?.find((u) => u.id === deleteUserId)?.email ?? '';

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => !q || u.email.toLowerCase().includes(q));
  }, [users, searchQuery]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-[#8d90a0]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#2563eb]" />
        <p className="text-xs uppercase tracking-widest font-bold">Loading Users</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="w-full p-6 border border-[#93000a] bg-[#93000a]/10 text-[#ffb4ab] flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold mb-1">Failed to load users</h3>
          <p className="text-sm">{(error as any)?.message || 'An unexpected error occurred.'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8d90a0] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 bg-[#131313] border border-[#2a2a2a] pl-10 pr-3 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[0px]"
          />
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {filteredUsers.length === 0 ? (
        <div className="w-full flex flex-col items-center justify-center p-12 text-[#8d90a0] border border-[#2a2a2a]">
          <span className="font-mono text-xl text-[#383838] block mb-2">00</span>
          <p className="text-sm font-semibold uppercase tracking-widest">No users found</p>
          <p className="text-xs mt-1">Try adjusting your search.</p>
        </div>
      ) : (
        <div className="border border-[#2a2a2a] rounded-[0px] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#131313] border-b border-[#2a2a2a] hover:bg-[#131313]">
                <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">Email</TableHead>
                <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">Role</TableHead>
                <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">Created</TableHead>
                <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const isSelf = user.id === currentUser?.id;
                const canManage = canManageRole(currentUser?.role, user.role);

                return (
                  <TableRow
                    key={user.id}
                    className="bg-[#0d0d0d] border-b border-[#2a2a2a] hover:bg-[#131313] transition-colors"
                  >
                    {/* Email */}
                    <TableCell>
                      <span className="text-sm font-mono text-[#e5e2e1]">{user.email}</span>
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <UserStatusBadge isActive={user.isActive} />
                    </TableCell>

                    {/* Created */}
                    <TableCell>
                      <span className="text-sm font-mono text-[#8d90a0]">
                        {user.createdAt
                          ? `${formatDistanceToNow(new Date(user.createdAt as unknown as string))} ago`
                          : '—'}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      {isSelf ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono rounded-[2px] px-2 py-0.5 bg-[#2563eb]/15 text-[#2563eb] border border-[#2563eb]/30"
                        >
                          You
                        </Badge>
                      ) : canManage ? (
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#8d90a0] hover:text-white hover:bg-[#2a2a2a]"
                            title="Edit User"
                            onClick={() => navigate(`/admin/users/edit/${user.id}`)}
                          >
                            <Pencil className="w-3.5 h-3.5 text-[#2563eb]" />
                          </Button>

                          {/* Enable / Disable */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${
                              user.isActive === false
                                ? 'text-[#22c55e] hover:text-[#22c55e] hover:bg-[#22c55e]/10'
                                : 'text-[#8d90a0] hover:text-[#e03e3e] hover:bg-[#e03e3e]/10'
                            }`}
                            title={user.isActive === false ? 'Enable User' : 'Disable User'}
                            onClick={() =>
                              setStatusTarget({ id: user.id, email: user.email, isActive: user.isActive !== false })
                            }
                          >
                            {user.isActive === false ? (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            ) : (
                              <ShieldOff className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          {/* Reset Password */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#8d90a0] hover:text-white hover:bg-[#2a2a2a]"
                            title="Reset Password"
                            onClick={() => setResetTarget({ id: user.id, email: user.email })}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#8d90a0] hover:text-[#e03e3e] hover:bg-[#e03e3e]/10"
                            title="Delete User"
                            onClick={() => setDeleteUserId(user.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[#383838] text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Delete User confirmation ──────────────────────────────────────── */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(o) => !o && setDeleteUserId(null)}>
        <AlertDialogContent className="bg-[#131313] border border-[#2a2a2a] text-[#e5e2e1] rounded-[2px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete User?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8d90a0]">
              This will permanently remove{' '}
              <span className="text-[#e5e2e1] font-mono">{deleteUserEmail}</span> and all their
              data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#e5e2e1] hover:bg-[#2a2a2a] rounded-[2px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#e03e3e] hover:bg-[#c53030] text-white rounded-[2px]"
              onClick={() => {
                if (deleteUserId) {
                  deleteUser.mutate(deleteUserId, {
                    onSuccess: () => toast.success('User deleted'),
                    onError: (err: any) =>
                      toast.error(err.response?.data?.message || 'Failed to delete user'),
                  });
                }
                setDeleteUserId(null);
              }}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Enable/Disable confirmation ───────────────────────────────────── */}
      <AlertDialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <AlertDialogContent className="bg-[#131313] border border-[#2a2a2a] text-[#e5e2e1] rounded-[2px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {statusTarget?.isActive ? 'Disable User?' : 'Enable User?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8d90a0]">
              {statusTarget?.isActive ? (
                <>
                  This will immediately block{' '}
                  <span className="text-[#e5e2e1] font-mono">{statusTarget.email}</span> from
                  logging in or accessing any resources.
                </>
              ) : (
                <>
                  This will re-enable{' '}
                  <span className="text-[#e5e2e1] font-mono">{statusTarget?.email}</span>, allowing
                  them to log in again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#e5e2e1] hover:bg-[#2a2a2a] rounded-[2px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={`text-white rounded-[2px] ${
                statusTarget?.isActive
                  ? 'bg-[#e03e3e] hover:bg-[#c53030]'
                  : 'bg-[#22c55e] hover:bg-[#16a34a]'
              }`}
              onClick={() => {
                if (statusTarget) {
                  setUserStatus.mutate(
                    { id: statusTarget.id, isActive: !statusTarget.isActive },
                    {
                      onSuccess: () =>
                        toast.success(
                          statusTarget.isActive ? 'User disabled' : 'User enabled'
                        ),
                      onError: (err: any) =>
                        toast.error(
                          err.response?.data?.message ||
                            `Failed to ${statusTarget.isActive ? 'disable' : 'enable'} user`
                        ),
                    }
                  );
                }
                setStatusTarget(null);
              }}
            >
              {statusTarget?.isActive ? 'Disable User' : 'Enable User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Reset Password dialog ─────────────────────────────────────────── */}
      <ResetPasswordDialog
        open={!!resetTarget}
        userId={resetTarget?.id ?? null}
        userEmail={resetTarget?.email ?? ''}
        onClose={() => setResetTarget(null)}
      />
    </>
  );
}

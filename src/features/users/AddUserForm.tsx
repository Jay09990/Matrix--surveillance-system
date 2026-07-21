import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { useSessionStore } from '../../store/useSessionStore';
import { assignableRolesFor } from '../../lib/roles';
import { useUser, useCreateUser, useUpdateUser } from './useUsers';
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormData,
  type UpdateUserFormData,
} from '../../schemas/user.schema';
import type { Role } from '../../types/user';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  VIEWER: 'Viewer',
};

// ── Create mode form ───────────────────────────────────────────────────────────
function CreateUserForm({ assignableRoles }: { assignableRoles: Role[] }) {
  const navigate = useNavigate();
  const createUser = useCreateUser();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      role: assignableRoles[0] ?? 'VIEWER',
    },
  });

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      await createUser.mutateAsync(data);
      toast.success('User created successfully');
      navigate('/admin/users');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* ── Account Details ────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-[#2a2a2a]">
            <div className="w-1.5 h-4 bg-[#2563eb] rounded-sm" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#8d90a0]">Account Details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      {...field}
                      className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-[#0d0d0d] border-[#2a2a2a] text-[#e5e2e1]">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#131313] border-[#2a2a2a] text-[#e5e2e1]">
                      {assignableRoles.map((role) => (
                        <SelectItem key={role} value={role} className="focus:bg-[#2563eb] focus:text-white">
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ── Password ───────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-[#2a2a2a]">
            <div className="w-1.5 h-4 bg-[#2563eb] rounded-sm" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#8d90a0]">Password</span>
          </div>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="max-w-sm">
                <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">Initial Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Min 8 chars, upper, lower, number"
                    {...field}
                    className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ── Actions ─────────────────────────────────────────── */}
        <div className="flex justify-end gap-4 pt-4 border-t border-[#2a2a2a]">
          <Button type="button" variant="ghost" onClick={() => navigate('/admin/users')} className="text-[#8d90a0]">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="bg-[#2563eb] hover:bg-[#2563eb]/90 px-8"
          >
            {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── Edit mode form ─────────────────────────────────────────────────────────────
function EditUserForm({ userId, assignableRoles }: { userId: string; assignableRoles: Role[] }) {
  const navigate = useNavigate();
  const updateUser = useUpdateUser();

  const { data: existingUser, isLoading: userLoading } = useUser(userId);

  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      email: '',
      role: assignableRoles[0] ?? 'VIEWER',
    },
  });

  useEffect(() => {
    if (existingUser) {
      form.reset({
        email: existingUser.email,
        // If the existing role isn't in assignableRoles (e.g. editing a SUPER_ADMIN),
        // fall back to first assignable role to avoid an invalid state.
        role: (assignableRoles.includes(existingUser.role as any)
          ? existingUser.role
          : assignableRoles[0] ?? 'VIEWER') as 'ADMIN' | 'VIEWER',
      });
    }
  }, [existingUser, form, assignableRoles]);

  const onSubmit = async (data: UpdateUserFormData) => {
    try {
      await updateUser.mutateAsync({ id: userId, data });
      toast.success('User updated successfully');
      navigate('/admin/users');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  if (userLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#8d90a0]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#2563eb]" />
        <p className="text-xs uppercase tracking-widest font-bold">Loading User Details</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* ── Account Details ────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-[#2a2a2a]">
            <div className="w-1.5 h-4 bg-[#2563eb] rounded-sm" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#8d90a0]">Account Details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      {...field}
                      className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-[#0d0d0d] border-[#2a2a2a] text-[#e5e2e1]">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#131313] border-[#2a2a2a] text-[#e5e2e1]">
                      {assignableRoles.map((role) => (
                        <SelectItem key={role} value={role} className="focus:bg-[#2563eb] focus:text-white">
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────── */}
        <div className="flex justify-end gap-4 pt-4 border-t border-[#2a2a2a]">
          <Button type="button" variant="ghost" onClick={() => navigate('/admin/users')} className="text-[#8d90a0]">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="bg-[#2563eb] hover:bg-[#2563eb]/90 px-8"
          >
            {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update User'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── Exported component — decides create vs edit based on route params ──────────
export const AddUserForm = () => {
  const { userId } = useParams<{ userId: string }>();
  const isEdit = !!userId;
  const { user: currentUser } = useSessionStore();

  const assignableRoles = assignableRolesFor(currentUser?.role);

  if (isEdit) {
    return <EditUserForm userId={userId} assignableRoles={assignableRoles} />;
  }
  return <CreateUserForm assignableRoles={assignableRoles} />;
};

import { Topbar } from '../components/Topbar';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { UserTable } from '../features/users/UserTable';
import { useSessionStore } from '../store/useSessionStore';
import { assignableRolesFor } from '../lib/roles';

export default function UserManagementPage() {
  const navigate = useNavigate();
  const { user } = useSessionStore();

  const canAddUser = assignableRolesFor(user?.role).length > 0;

  return (
    <div className="min-h-screen w-full bg-[#0d0d0d] flex flex-col">
      <Topbar />

      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-[#8d90a0] hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-semibold uppercase tracking-wider">Back to Admin</span>
          </button>

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[2px]">
                <Users className="w-6 h-6 text-[#2563eb]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1">User Management</h1>
                <p className="text-[#8d90a0] text-sm">Create, update, and manage Admin and Viewer accounts.</p>
              </div>
            </div>

            {canAddUser && (
              <Button
                variant="default"
                size="sm"
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[2px] h-8 px-3 text-xs font-semibold flex items-center gap-1.5"
                onClick={() => navigate('/admin/users/add')}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add User
              </Button>
            )}
          </div>

          <UserTable />
        </div>
      </main>
    </div>
  );
}

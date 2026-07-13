import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { adminService } from "../../services/adminService";
import { useAuth } from "../../hooks/useAuth";

function UserManagement() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ["admin", "users"], queryFn: () => adminService.getUsers().then((response) => response.data.data.users) });
  const statusMutation = useMutation({
    mutationFn: ({ userId, status }) => adminService.updateUserStatus(userId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });

  if (usersQuery.isLoading) return <Loader label="Loading users..." />;
  if (usersQuery.isError) return <p className="rounded-2xl bg-red-500/10 p-4 text-red-200">Unable to load users.</p>;

  return <div><h2 className="text-3xl font-black">User management</h2><p className="mt-2 text-brand-mist/60">Review real accounts and control access to the platform.</p>{statusMutation.isError && <p className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-200">{statusMutation.error.response?.data?.message || "Unable to update user"}</p>}<div className="mt-7 overflow-x-auto rounded-3xl border border-white/10"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-white/5 text-xs uppercase tracking-wider text-brand-mist/50"><tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4">Joined</th><th className="p-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-white/10">{usersQuery.data.map((user) => <tr key={user._id}><td className="p-4"><p className="font-semibold">{user.name}</p><p className="mt-1 text-xs text-brand-mist/45">@{user.username} · {user.email}</p></td><td className="p-4 capitalize">{user.role}</td><td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.status === "active" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{user.status}</span></td><td className="p-4 text-brand-mist/60">{new Date(user.createdAt).toLocaleDateString()}</td><td className="p-4 text-right"><Button disabled={statusMutation.isPending || currentUser?.id === user._id} onClick={() => statusMutation.mutate({ userId: user._id, status: user.status === "active" ? "suspended" : "active" })} variant={user.status === "active" ? "ghost" : "secondary"}>{user.status === "active" ? "Suspend" : "Activate"}</Button></td></tr>)}</tbody></table></div></div>;
}

export default UserManagement;

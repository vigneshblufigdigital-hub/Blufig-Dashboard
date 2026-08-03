import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MOCK_USERS } from '@/src/mockData';
import { Mail, Briefcase, Tag, Shield, ShieldAlert, CheckCircle2, XCircle, Plus, UserPlus, BarChart3, TrendingUp, UserCheck, AlertCircle, Clock, ArrowRight, ChevronDown, ChevronRight, ChevronUp, Network, Search, Building2, Crown, User, FolderTree, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserRole, UserProfile, Department, ADMIN_ROLES, Task, TaskStatus, isSuperAdmin, isUserOnline } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TeamViewProps {
  users?: UserProfile[];
  setUsers?: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  tasks?: Task[];
}

export function TeamView({ users: propUsers, setUsers: propSetUsers, tasks = [] }: TeamViewProps = {}) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser && (ADMIN_ROLES.includes(currentUser.role) || isSuperAdmin(currentUser));
  
  const [localUsers, setLocalUsers] = useState<UserProfile[]>(MOCK_USERS as UserProfile[]);
  const users = propUsers || localUsers;
  const setUsers = propSetUsers || setLocalUsers;
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    role: UserRole.CONTENT_WRITER,
    department: Department.CONTENT,
    designation: '',
    skillTags: [],
    avatarUrl: ''
  });

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [tempTag, setTempTag] = useState('');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  const getTaskDepartment = (task: Task) => {
    const assignee = users.find(u => u.id === task.assigneeId);
    if (assignee && assignee.department) {
      return assignee.department;
    }
    const typeLower = (task.type || '').toLowerCase();
    if (typeLower.includes('web') || typeLower.includes('dev') || typeLower.includes('tech') || typeLower.includes('database')) {
      return Department.WEB_DEVELOPMENT;
    }
    if (typeLower.includes('design') || typeLower.includes('creative') || typeLower.includes('ui') || typeLower.includes('ux')) {
      return Department.DESIGN;
    }
    if (typeLower.includes('content') || typeLower.includes('write') || typeLower.includes('copy') || typeLower.includes('seo')) {
      return Department.CONTENT;
    }
    if (typeLower.includes('hubspot') || typeLower.includes('crm') || typeLower.includes('marketing automation')) {
      return Department.WEB_DEVELOPMENT;
    }
    if (typeLower.includes('social') || typeLower.includes('ads') || typeLower.includes('paid') || typeLower.includes('digital') || typeLower.includes('media')) {
      return Department.DIGITAL;
    }
    return Department.MANAGEMENT;
  };
  const [editTempTag, setEditTempTag] = useState('');
  const [hierarchySearch, setHierarchySearch] = useState('');
  const [hierarchyDeptFilter, setHierarchyDeptFilter] = useState<string>('all');
  const [collapsedHierarchyDepts, setCollapsedHierarchyDepts] = useState<Record<string, boolean>>({});
  const [hierarchyLayout, setHierarchyLayout] = useState<'tree' | 'tier'>('tree');
  const [treeZoom, setTreeZoom] = useState<number>(100);
  const [reassignDeptLead, setReassignDeptLead] = useState<Department | null>(null);

  const agencyUsers = users.filter(u => u.role !== UserRole.CLIENT);
  const clientUsers = users.filter(u => u.role === UserRole.CLIENT);

  const handleAssignDeptLead = (dept: Department, leadUserId: string) => {
    const updatedUsers = users.map(u => {
      if (u.department === dept) {
        return { ...u, isDeptLead: u.id === leadUserId };
      }
      return u;
    });
    setUsers(updatedUsers);
    toast.success(`Updated ${dept} Department Lead!`);
    setReassignDeptLead(null);
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Please fill in Name and Email fields!");
      return;
    }
    const userToAdd: UserProfile = {
      ...newUser as UserProfile,
      id: Math.random().toString(36).substr(2, 9),
      avatarUrl: newUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.name}`,
      designation: newUser.designation || (newUser.role === UserRole.CLIENT ? 'Client Partner' : 'Specialist'),
      skillTags: newUser.skillTags || []
    };

    // If marked as dept lead, clear isDeptLead for other users in the same department
    const nextUsers = newUser.isDeptLead
      ? users.map(u => u.department === newUser.department ? { ...u, isDeptLead: false } : u)
      : users;

    setUsers([...nextUsers, userToAdd]);
    setIsAddUserOpen(false);
    setNewUser({
      name: '',
      email: '',
      role: UserRole.CONTENT_WRITER,
      department: Department.CONTENT,
      designation: '',
      skillTags: [],
      avatarUrl: ''
    });
    setTempTag('');
    toast.success("Teammate profile created successfully!");
  };

  const handleEditUser = () => {
    if (!editingUser) return;
    if (!editingUser.name || !editingUser.email) {
      toast.error("Name and Email fields are required!");
      return;
    }
    setUsers(prev => prev.map(u => {
      if (u.id === editingUser.id) return editingUser;
      if (editingUser.isDeptLead && u.department === editingUser.department && u.id !== editingUser.id) {
        return { ...u, isDeptLead: false };
      }
      return u;
    }));
    setEditingUser(null);
    setEditTempTag('');
    toast.success("Teammate details updated successfully!");
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="agency" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-white dark:bg-zinc-950 p-1 rounded-xl shadow-sm border dark:border-zinc-800 h-auto flex gap-1">
            <TabsTrigger 
              value="agency"
              className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900 shadow-none data-[state=active]:shadow-md transition-all cursor-pointer"
            >
              Agency Team
            </TabsTrigger>
            <TabsTrigger 
              value="clients"
              className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900 shadow-none data-[state=active]:shadow-md transition-all cursor-pointer"
            >
              Clients
            </TabsTrigger>
            <TabsTrigger 
              value="capacity"
              className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900 shadow-none data-[state=active]:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              📊 Department Capacity
            </TabsTrigger>
            <TabsTrigger 
              value="hierarchy"
              className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900 shadow-none data-[state=active]:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              🌳 Team Hierarchy
            </TabsTrigger>
          </TabsList>

          {isAdmin && (
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger 
                className={cn(
                  buttonVariants({}),
                  "bg-zinc-900 text-white rounded-xl h-10 px-6 font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center cursor-pointer"
                )}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add New User
              </DialogTrigger>
              <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold tracking-tight">Add User / Client Profile</DialogTitle>
                  <DialogDescription className="text-zinc-500">
                    Invite a new teammate or external client partner to the Blufig workspace.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5 py-4 max-h-[60vh] overflow-y-auto px-1">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Full Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Enter name" 
                      className="rounded-xl border-zinc-200" 
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Work Email</Label>
                    <Input 
                      id="email" 
                      placeholder="name@blufig.digital" 
                      className="rounded-xl border-zinc-200" 
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Department</Label>
                      <Select 
                        value={newUser.department} 
                        onValueChange={(v) => setNewUser({...newUser, department: v as Department})}
                      >
                        <SelectTrigger className="rounded-xl border-zinc-200">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(Department).map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Role</Label>
                      <Select 
                        value={newUser.role} 
                        onValueChange={(v) => {
                          const updatedDept = v === UserRole.CLIENT ? Department.MANAGEMENT : newUser.department;
                          setNewUser({...newUser, role: v as UserRole, department: updatedDept});
                        }}
                      >
                        <SelectTrigger className="rounded-xl border-zinc-200">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(UserRole).map(role => (
                            <SelectItem key={role} value={role}>{role.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="designation" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Designation</Label>
                    <Input 
                      id="designation" 
                      placeholder="e.g. Senior Content Writer" 
                      className="rounded-xl border-zinc-200" 
                      value={newUser.designation}
                      onChange={(e) => setNewUser({...newUser, designation: e.target.value})}
                    />
                  </div>

                  {/* Skill Tags Section for Creating inside Add User */}
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-sans">Skill Tags</Label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl min-h-[38px]">
                      {newUser.skillTags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[9px] font-semibold flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {tag}
                          <button
                            type="button"
                            onClick={() => setNewUser({
                              ...newUser,
                              skillTags: newUser.skillTags?.filter(t => t !== tag) || []
                            })}
                            className="hover:bg-zinc-200 rounded-full w-3 h-3 flex items-center justify-center text-[10px] cursor-pointer"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                      {(!newUser.skillTags || newUser.skillTags.length === 0) && (
                        <span className="text-[10px] text-zinc-404 self-center px-1">No tags added yet.</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a skill/tag and press Add"
                        className="rounded-xl flex-1 text-xs"
                        value={tempTag}
                        onChange={(e) => setTempTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (tempTag.trim()) {
                              const tag = tempTag.trim();
                              if (!newUser.skillTags?.includes(tag)) {
                                setNewUser({
                                  ...newUser,
                                  skillTags: [...(newUser.skillTags || []), tag]
                                });
                              }
                              setTempTag('');
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-xl text-xs h-9 font-bold"
                        onClick={() => {
                          if (tempTag.trim()) {
                            const tag = tempTag.trim();
                            if (!newUser.skillTags?.includes(tag)) {
                              setNewUser({
                                ...newUser,
                                skillTags: [...(newUser.skillTags || []), tag]
                              });
                            }
                            setTempTag('');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Profile Photo Option (Emoji/Logo Selection Setup) */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 gap-4 flex flex-col">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Profile Photo / Logo</Label>
                      {newUser.avatarUrl && (
                        <span className="text-[10px] text-zinc-400 font-bold">Selected: {newUser.avatarUrl.length > 5 ? 'Custom Logo' : newUser.avatarUrl}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border flex items-center justify-center text-2xl shadow-inner font-mono select-none">
                        {newUser.avatarUrl && newUser.avatarUrl.length <= 4 ? newUser.avatarUrl : (newUser.avatarUrl ? '🖼️' : '👤')}
                      </div>
                      <div className="flex-1">
                        <Input 
                          placeholder="Paste Logo URL or Type Custom Emoji" 
                          className="rounded-xl h-10 text-xs border-zinc-200 bg-white"
                          value={newUser.avatarUrl}
                          onChange={(e) => setNewUser({...newUser, avatarUrl: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase font-extrabold tracking-widest text-zinc-400 block">Quick Emojis / Logo Presets</span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-0.5 bg-white rounded bg-card border">
                        {['💼', '🏢', '🚀', '🎨', '📊', '🌍', '🛡️', '💎', '💡', '⚡', '☕', '🎯', '🦁', '🦊', '🦉', '🍕', '🚗', '🏔️'].map((emoji) => (
                          <button
                            type="button"
                            key={emoji}
                            onClick={() => setNewUser({...newUser, avatarUrl: emoji})}
                            className={cn(
                              "w-7 h-7 flex items-center justify-center text-xs rounded bg-zinc-50 hover:bg-zinc-100 transition-all border",
                              newUser.avatarUrl === emoji ? "border-zinc-900 bg-zinc-100" : "border-transparent"
                            )}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
                <DialogFooter className="pt-4 border-t">
                  <Button 
                    type="submit" 
                    className="w-full bg-zinc-900 text-white rounded-xl h-12 font-bold uppercase tracking-widest text-xs"
                    onClick={handleAddUser}
                  >
                    {newUser.role === UserRole.CLIENT ? 'Confirm Client Addition' : 'Confirm Teammate Addition'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="agency">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {agencyUsers.map((user) => (
              <UserCard 
                key={user.id} 
                user={user} 
                isAdmin={isAdmin} 
                onEditClick={(u) => {
                  setEditingUser(u);
                  setEditTempTag('');
                }} 
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="clients">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {clientUsers.map((user) => (
              <Card key={user.id} className="hover:shadow-md transition-shadow border-zinc-100 dark:border-zinc-800 overflow-hidden relative group">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setEditTempTag('');
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 cursor-pointer z-10"
                    title="Edit Client Details"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="w-20 h-20 border-2 border-white shadow-sm mb-4 overflow-hidden">
                      {user.avatarUrl && (user.avatarUrl.startsWith('http') || user.avatarUrl.startsWith('/') || user.avatarUrl.startsWith('data:')) ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <AvatarFallback className="text-3xl bg-orange-100 text-orange-600 flex items-center justify-center select-none font-bold">
                          {user.avatarUrl && user.avatarUrl.length <= 4 ? user.avatarUrl : user.name.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <h3 className="font-bold text-lg tracking-tight">{user.name}</h3>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest mt-1">
                      {user.designation}
                    </p>
                    
                    <div className="mt-4 flex flex-wrap justify-center gap-1">
                      <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-tight px-2 py-0">
                        External Client
                      </Badge>
                    </div>

                    <div className="w-full mt-6 space-y-3 border-t dark:border-zinc-800 pt-4">
                      <div className="flex items-center text-xs text-zinc-500">
                        <Mail className="w-3 h-3 mr-2 text-zinc-400" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      
                      {isAdmin && (
                        <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-3 mt-4">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                 <Shield className={cn("w-3 h-3", user.isActive ? "text-emerald-500" : "text-zinc-300")} />
                                 <Label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Portal Access</Label>
                              </div>
                              <Switch 
                                checked={user.isActive !== false} 
                                onCheckedChange={(val) => {
                                  setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: val } : u));
                                  toast.success(`${user.name} access state modified!`);
                                }}
                                className="data-[state=checked]:bg-emerald-500" 
                              />
                           </div>
                           <p className="text-[9px] text-zinc-400 text-left leading-tight italic">
                             Granting access allows this client to view shared deliverables and project progress.
                           </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="capacity">
          {(() => {
            // Active tasks calculation
            const activeTasksList = (tasks || []).filter(t => 
              t.status !== TaskStatus.DONE && 
              t.status !== TaskStatus.APPROVED && 
              t.status !== TaskStatus.CANCELLED
            );

            // Initialize department workload counts
            const departmentWorkload: Record<Department, { total: number; open: number; inProgress: number; review: number; revision: number; blocked: number }> = {} as any;
            Object.values(Department).forEach(dept => {
              departmentWorkload[dept] = { total: 0, open: 0, inProgress: 0, review: 0, revision: 0, blocked: 0 };
            });

            // Calculate workloads
            activeTasksList.forEach(task => {
              const dept = getTaskDepartment(task);
              if (departmentWorkload[dept]) {
                departmentWorkload[dept].total += 1;
                if (task.status === TaskStatus.OPEN) departmentWorkload[dept].open += 1;
                else if (task.status === TaskStatus.IN_PROGRESS) departmentWorkload[dept].inProgress += 1;
                else if (task.status === TaskStatus.REVIEW) departmentWorkload[dept].review += 1;
                else if (task.status === TaskStatus.REVISION_REQUESTED) departmentWorkload[dept].revision += 1;
                else if (task.status === TaskStatus.BLOCKED) departmentWorkload[dept].blocked += 1;
              }
            });

            // Compile capacity details per department
            const capacityData = Object.values(Department).map(dept => {
              const deptUsers = users.filter(u => u.department === dept && u.role !== UserRole.CLIENT);
              const userCount = deptUsers.length;
              const taskCount = departmentWorkload[dept]?.total || 0;
              
              // Max capacity = userCount * 4 active tasks. Default to 4 if empty dept.
              const maxCapacity = Math.max(userCount * 4, 4);
              const utilizationRate = Math.min(Math.round((taskCount / maxCapacity) * 100), 150);
              
              let status: 'Under-utilized' | 'Optimal' | 'At Capacity' | 'Overloaded' = 'Optimal';
              let statusColor = 'text-emerald-650 bg-emerald-500/5 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/40';
              let progressBarColor = 'bg-emerald-500';
              
              if (userCount === 0 && taskCount > 0) {
                status = 'Overloaded';
                statusColor = 'text-rose-650 bg-rose-500/5 border-rose-500/20 dark:text-rose-400 dark:bg-rose-950/20 dark:border-rose-900/40';
                progressBarColor = 'bg-rose-500';
              } else if (utilizationRate > 100) {
                status = 'Overloaded';
                statusColor = 'text-rose-650 bg-rose-500/5 border-rose-500/20 dark:text-rose-400 dark:bg-rose-950/20 dark:border-rose-900/40';
                progressBarColor = 'bg-rose-500';
              } else if (utilizationRate >= 80) {
                status = 'At Capacity';
                statusColor = 'text-amber-650 bg-amber-500/5 border-amber-500/20 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/40';
                progressBarColor = 'bg-amber-500';
              } else if (utilizationRate < 35 || taskCount === 0) {
                status = 'Under-utilized';
                statusColor = 'text-zinc-500 bg-zinc-500/5 border-zinc-500/20 dark:text-zinc-400 dark:bg-zinc-900/20 dark:border-zinc-800';
                progressBarColor = 'bg-zinc-400 dark:bg-zinc-600';
              }

              return {
                department: dept,
                activeTasks: taskCount,
                usersCount: userCount,
                utilizationRate,
                status,
                statusColor,
                progressBarColor,
                open: departmentWorkload[dept]?.open || 0,
                inProgress: departmentWorkload[dept]?.inProgress || 0,
                review: departmentWorkload[dept]?.review || 0,
                revision: departmentWorkload[dept]?.revision || 0,
                blocked: departmentWorkload[dept]?.blocked || 0,
              };
            }).sort((a, b) => b.activeTasks - a.activeTasks);

            const activeDept = selectedDept || capacityData[0]?.department || Department.CONTENT;
            const selectedDeptData = capacityData.find(d => d.department === activeDept);
            const selectedDeptTeammates = users.filter(u => u.department === activeDept && u.role !== UserRole.CLIENT);

            return (
              <div className="space-y-6">
                {/* 1. Header Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Card className="border-zinc-100/80 dark:border-zinc-800 shadow-sm">
                    <CardContent className="pt-5 flex items-center gap-4">
                      <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-100 shrink-0">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Total Active Tasks</p>
                        <h4 className="text-2xl font-black tracking-tight mt-0.5">{activeTasksList.length}</h4>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-zinc-100/80 dark:border-zinc-800 shadow-sm">
                    <CardContent className="pt-5 flex items-center gap-4">
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Heaviest Department</p>
                        <h4 className="text-base font-black tracking-tight mt-0.5 truncate max-w-[200px]">
                          {capacityData[0]?.department || 'None'} ({capacityData[0]?.activeTasks || 0} tasks)
                        </h4>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-zinc-100/80 dark:border-zinc-800 shadow-sm">
                    <CardContent className="pt-5 flex items-center gap-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Agency Staff Active</p>
                        <h4 className="text-2xl font-black tracking-tight mt-0.5">
                          {users.filter(u => u.role !== UserRole.CLIENT).length} Members
                        </h4>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 2. Main Interactive Workspace Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column - Horizontal Bar Chart */}
                  <Card className="lg:col-span-7 border-zinc-100 dark:border-zinc-800 shadow-sm">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-black tracking-tight">Department Active Workload</CardTitle>
                        <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase tracking-wider">
                          Click a department bar to analyze team resource constraints
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full h-[320px] min-w-0 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <BarChart
                            layout="vertical"
                            data={capacityData}
                            margin={{ top: 10, right: 15, left: 20, bottom: 5 }}
                            onClick={(state) => {
                              if (state && state.activeLabel) {
                                setSelectedDept(state.activeLabel as Department);
                              }
                            }}
                          >
                            <XAxis type="number" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis 
                              dataKey="department" 
                              type="category" 
                              stroke="#888888" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              width={110}
                            />
                            <Tooltip 
                              cursor={{ fill: 'rgba(240, 240, 245, 0.3)' }} 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl shadow-lg">
                                      <p className="font-extrabold text-xs text-zinc-900 dark:text-zinc-50 mb-1">{data.department}</p>
                                      <div className="space-y-1 text-[10px] font-bold text-zinc-500">
                                        <p className="text-blue-500 flex justify-between gap-4"><span>In Progress:</span> <span>{data.inProgress}</span></p>
                                        <p className="text-zinc-400 flex justify-between gap-4"><span>Open / Todo:</span> <span>{data.open}</span></p>
                                        <p className="text-amber-500 flex justify-between gap-4"><span>In Review:</span> <span>{data.review}</span></p>
                                        <p className="text-pink-500 flex justify-between gap-4"><span>Revision Req:</span> <span>{data.revision}</span></p>
                                        <p className="text-rose-500 flex justify-between gap-4"><span>Blocked:</span> <span>{data.blocked}</span></p>
                                        <p className="border-t pt-1 mt-1 text-zinc-800 dark:text-zinc-200 flex justify-between gap-4 font-black">
                                          <span>Total Active:</span> <span>{data.activeTasks}</span>
                                        </p>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend 
                              verticalAlign="bottom" 
                              height={36} 
                              iconType="circle" 
                              iconSize={7}
                              formatter={(value) => <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest">{value}</span>}
                            />
                            <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#3b82f6" />
                            <Bar dataKey="open" name="Open / Todo" stackId="a" fill="#9ca3af" />
                            <Bar dataKey="review" name="In Review" stackId="a" fill="#f59e0b" />
                            <Bar dataKey="revision" name="Revision Requested" stackId="a" fill="#ec4899" />
                            <Bar dataKey="blocked" name="Blocked" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Manual department list selector fallback */}
                      <div className="mt-4 pt-4 border-t dark:border-zinc-800 flex flex-wrap gap-2">
                        {capacityData.map(d => (
                          <button
                            key={d.department}
                            onClick={() => setSelectedDept(d.department)}
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-xl border transition-all cursor-pointer",
                              activeDept === d.department
                                ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900"
                                : "bg-white border-zinc-100 hover:bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:bg-zinc-900"
                            )}
                          >
                            {d.department} ({d.activeTasks})
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right Column - Selected Department Breakdown & Load Allocator */}
                  <Card className="lg:col-span-5 border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
                    <CardHeader className="pb-3 border-b dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-black tracking-tight truncate max-w-[200px]">
                          🔎 {activeDept} Team Detail
                        </CardTitle>
                        {selectedDeptData && (
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
                            selectedDeptData.statusColor
                          )}>
                            {selectedDeptData.status}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
                      
                      {/* Department capacity utilization breakdown */}
                      {selectedDeptData && (
                        <div className="bg-zinc-50 dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                            <span>Capacity Utilization</span>
                            <span className="font-mono text-zinc-700 dark:text-zinc-300">{selectedDeptData.utilizationRate}%</span>
                          </div>
                          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-300", selectedDeptData.progressBarColor)} 
                              style={{ width: `${selectedDeptData.utilizationRate}%` }} 
                            />
                          </div>
                          <p className="text-[9px] text-zinc-500 mt-2 font-medium leading-normal">
                            Assigned <strong>{selectedDeptData.activeTasks} active tasks</strong> across <strong>{selectedDeptData.usersCount} team members</strong> in this department.
                          </p>
                        </div>
                      )}

                      {/* Teammates task workload lists */}
                      <div className="flex-1 overflow-y-auto max-h-[240px] pr-1 space-y-3">
                        <h5 className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 pb-1 border-b border-dashed dark:border-zinc-800">
                          Individual Workloads
                        </h5>
                        {selectedDeptTeammates.length === 0 ? (
                          <div className="text-center py-6 text-zinc-400 text-xs">
                            <AlertCircle className="w-5 h-5 mx-auto mb-2 text-zinc-300" />
                            No agency staff assigned to {activeDept} yet.
                          </div>
                        ) : (
                          selectedDeptTeammates.map(teammate => {
                            const teammateTasks = activeTasksList.filter(t => t.assigneeId === teammate.id);
                            const teammateLoadPct = Math.min((teammateTasks.length / 4) * 100, 100);
                            
                            return (
                              <div key={teammate.id} className="p-3 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-2">
                                <div className="flex items-center gap-2.5">
                                  <Avatar className="w-8 h-8 shrink-0">
                                    {teammate.avatarUrl && teammate.avatarUrl.length <= 4 ? (
                                      <AvatarFallback className="text-xs bg-zinc-100 font-bold">
                                        {teammate.avatarUrl}
                                      </AvatarFallback>
                                    ) : (
                                      <>
                                        <AvatarImage src={teammate.avatarUrl} />
                                        <AvatarFallback className="text-xs bg-zinc-900 text-white">
                                          {teammate.name.charAt(0)}
                                        </AvatarFallback>
                                      </>
                                    )}
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <h6 className="text-xs font-black text-zinc-800 dark:text-zinc-100 truncate">{teammate.name}</h6>
                                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">{teammate.designation}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-[10px] font-mono font-black text-zinc-800 dark:text-zinc-200">
                                      {teammateTasks.length} active
                                    </span>
                                  </div>
                                </div>

                                {/* Mini task progress bar */}
                                <div>
                                  <div className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-full h-1 overflow-hidden">
                                    <div 
                                      className={cn(
                                        "h-full rounded-full",
                                        teammateTasks.length > 4 ? "bg-rose-500" : teammateTasks.length >= 3 ? "bg-amber-500" : "bg-emerald-500"
                                      )}
                                      style={{ width: `${teammateLoadPct}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Active Task Titles list */}
                                {teammateTasks.length > 0 && (
                                  <div className="pt-1.5 border-t border-dashed dark:border-zinc-900 space-y-1">
                                    {teammateTasks.slice(0, 3).map(task => (
                                      <div key={task.id} className="flex items-center justify-between text-[9px] text-zinc-500 dark:text-zinc-400">
                                        <span className="truncate max-w-[150px] font-medium">• {task.name}</span>
                                        <span className="px-1 bg-zinc-100 dark:bg-zinc-900 rounded text-[7px] font-bold uppercase tracking-tight shrink-0">{task.status}</span>
                                      </div>
                                    ))}
                                    {teammateTasks.length > 3 && (
                                      <p className="text-[8px] text-zinc-400 font-extrabold italic text-right">+{teammateTasks.length - 3} more active tasks</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                    </CardContent>
                  </Card>

                </div>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="hierarchy">
          <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden bg-card">
            <CardHeader className="pb-4 border-b dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <CardTitle className="text-lg font-black tracking-tight">Organization & Team Tree Hierarchy</CardTitle>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Visual reporting structure across Executive Leadership, Department Managers/Leads, and Specialized Teammates.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <Input
                      placeholder="Search member or title..."
                      value={hierarchySearch}
                      onChange={(e) => setHierarchySearch(e.target.value)}
                      className="pl-8 h-9 text-xs rounded-xl w-[190px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                    />
                  </div>

                  <Select value={hierarchyDeptFilter} onValueChange={setHierarchyDeptFilter}>
                    <SelectTrigger className="h-9 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[150px] bg-white dark:bg-zinc-950">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all" className="text-xs font-bold">🌐 All Departments</SelectItem>
                      {Object.values(Department).map(dept => (
                        <SelectItem key={dept} value={dept} className="text-xs">{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl gap-0.5">
                    <button
                      onClick={() => setHierarchyLayout('tree')}
                      className={cn(
                        "px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1",
                        hierarchyLayout === 'tree' ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      <Network className="w-3 h-3" />
                      Tree
                    </button>
                    <button
                      onClick={() => setHierarchyLayout('tier')}
                      className={cn(
                        "px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1",
                        hierarchyLayout === 'tier' ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      <Layers className="w-3 h-3" />
                      Tiers
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allDepts = Object.values(Department);
                      const areAllCollapsed = allDepts.every(d => collapsedHierarchyDepts[d]);
                      const nextState: Record<string, boolean> = {};
                      allDepts.forEach(d => { nextState[d] = !areAllCollapsed; });
                      setCollapsedHierarchyDepts(nextState);
                    }}
                    className="h-9 px-3 rounded-xl text-xs font-bold border-zinc-200 dark:border-zinc-800 cursor-pointer"
                  >
                    {Object.values(Department).every(d => collapsedHierarchyDepts[d]) ? "Expand All" : "Collapse All"}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {(() => {
                // Determine top CEO node (Amit Thakkar) or top admin
                const ceoNode = agencyUsers.find(u => u.id === '001' || (u.designation || '').toLowerCase().includes('ceo') || (u.name || '').toLowerCase().includes('amit')) || agencyUsers.find(u => u.role === UserRole.AGENCY_ADMIN || isSuperAdmin(u)) || agencyUsers[0];
                
                // Helper to classify hierarchy ranks across 5 organizational tiers
                const getHierarchyRank = (u: UserProfile) => {
                  const isAmitCEO = u.id === '001' || (u.designation || '').toLowerCase().includes('ceo') || (u.name || '').toLowerCase().includes('amit');

                  if (u.hierarchyLevel) {
                    switch (u.hierarchyLevel) {
                      case 'executive':
                        return { level: 1, title: 'Executive Leadership', type: isAmitCEO ? 'CEO' : 'Admin', badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' };
                      case 'director':
                        return { level: 2, title: 'Director', type: 'Director', badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' };
                      case 'manager':
                        return { level: 3, title: 'Manager', type: 'Manager', badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' };
                      case 'lead':
                        return { level: 4, title: 'Team Lead', type: u.designation || 'Team Lead', badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20' };
                      case 'specialist':
                      default:
                        return { level: 5, title: 'Team Specialist', type: u.designation || 'Specialist', badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20' };
                    }
                  }

                  if (isAmitCEO) {
                    return { level: 1, title: 'Executive Leadership', type: 'CEO', badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' };
                  }

                  if (u.isSuperAdmin || u.role === UserRole.AGENCY_ADMIN) {
                    return { level: 1, title: 'Executive Leadership', type: 'Admin', badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' };
                  }

                  const r = (u.role || '').toLowerCase();
                  const d = (u.designation || '').toLowerCase();

                  if (u.isDeptLead) {
                    return { level: 3, title: 'Department Lead', type: u.designation || 'Dept Lead', badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20' };
                  }

                  if (d.includes('hr head') || d.includes('hr manager') || d.includes('hr lead')) {
                    return { level: 3, title: 'HR & Operations Lead', type: u.designation || 'HR Lead', badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' };
                  }

                  // Level 2: Director
                  if (u.role === UserRole.ACCOUNT_DIRECTOR || d.includes('director') || d.includes('head of')) {
                    return { level: 2, title: 'Director', type: u.designation || 'Director', badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' };
                  }

                  // Level 3: Manager
                  if (u.role === UserRole.WEB_DEV_MANAGER || u.role === UserRole.ACCOUNT_MANAGER || (d.includes('manager') && !d.includes('key account manager'))) {
                    return { level: 3, title: 'Manager', type: u.designation || 'Manager', badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' };
                  }

                  // Level 4: Team Lead
                  if (
                    u.role === UserRole.DESIGN_LEAD ||
                    u.role === UserRole.DIGITAL_LEAD ||
                    u.role === UserRole.CONTENT_LEAD ||
                    d.includes('team lead') ||
                    d.includes('lead')
                  ) {
                    return { level: 4, title: 'Team Lead', type: u.designation || 'Team Lead', badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20' };
                  }

                  // Level 5: Specialist / Individual Member
                  return { level: 5, title: 'Team Specialist', type: u.designation || 'Specialist', badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20' };
                };

                // Smart resolution of Department Head (Explicit setting -> Director -> Manager -> Team Lead -> CEO)
                const getDeptHeadInfo = (deptMembers: UserProfile[]) => {
                  if (deptMembers.length === 0) return { lead: null, label: 'Unassigned', badgeText: 'Unassigned' };

                  // 1. Check for explicit designation
                  const explicitLead = deptMembers.find(m => m.isDeptLead);
                  if (explicitLead) {
                    const rank = getHierarchyRank(explicitLead);
                    return {
                      lead: explicitLead,
                      label: 'Dept Head / Lead',
                      badgeText: rank.type || 'Dept Lead'
                    };
                  }

                  // 2. Sort members by highest rank (Level 2 Director -> Level 3 Manager -> Level 4 Team Lead -> Level 5 Specialist)
                  const sorted = [...deptMembers].sort((a, b) => {
                    const rankA = getHierarchyRank(a).level;
                    const rankB = getHierarchyRank(b).level;
                    if (rankA !== rankB) return rankA - rankB;
                    return a.name.localeCompare(b.name);
                  });

                  const topCandidate = sorted[0];
                  const topRank = getHierarchyRank(topCandidate);

                  if (topRank.level <= 4) {
                    let label = 'Dept Lead';
                    if (topRank.level === 2) label = 'Dept Director';
                    if (topRank.level === 3) label = 'Dept Manager';
                    if (topRank.level === 4) label = 'Team Lead';

                    return {
                      lead: topCandidate,
                      label,
                      badgeText: topRank.type
                    };
                  }

                  return {
                    lead: null,
                    label: 'Managed by CEO / Executive',
                    badgeText: 'Executive Lead'
                  };
                };

                // Filter staff based on search & dept
                const searchLower = hierarchySearch.toLowerCase();
                const matchesFilter = (u: UserProfile) => {
                  if (hierarchyDeptFilter !== 'all' && u.department !== hierarchyDeptFilter) return false;
                  if (!searchLower) return true;
                  return u.name.toLowerCase().includes(searchLower) ||
                         (u.designation || '').toLowerCase().includes(searchLower) ||
                         (u.email || '').toLowerCase().includes(searchLower) ||
                         (u.department || '').toLowerCase().includes(searchLower);
                };

                // Group agency users by department (excluding redundant or empty departments)
                const deptList = Object.values(Department).filter(dept => {
                  if (dept === Department.HUBSPOT || dept === Department.DIGITAL_MARKETING) return false;
                  if (hierarchyDeptFilter !== 'all' && dept !== hierarchyDeptFilter) return false;
                  const deptUsers = agencyUsers.filter(u => u.department === dept && u.id !== ceoNode?.id);
                  return deptUsers.length > 0;
                });

                return (
                  <div className="space-y-6">
                    {/* Canvas Zoom & Scroll Controls */}
                    {hierarchyLayout === 'tree' && (
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-100/90 dark:bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pl-1">Tree Canvas Controls:</span>
                          <button
                            onClick={() => setTreeZoom(z => Math.max(60, z - 10))}
                            className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700 cursor-pointer text-zinc-700 dark:text-zinc-200"
                            title="Zoom Out"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-mono font-black px-1 text-indigo-600 dark:text-indigo-400 min-w-[36px] text-center">{treeZoom}%</span>
                          <button
                            onClick={() => setTreeZoom(z => Math.min(150, z + 10))}
                            className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700 cursor-pointer text-zinc-700 dark:text-zinc-200"
                            title="Zoom In"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTreeZoom(100)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-white dark:bg-zinc-800 hover:bg-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer text-zinc-700 dark:text-zinc-200"
                          >
                            Reset (100%)
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                          <span className="hidden sm:inline italic">✨ Scroll horizontally & vertically to navigate department branches</span>
                          <Badge variant="outline" className="text-[9px] font-bold uppercase bg-white dark:bg-zinc-950">
                            {deptList.length} Active Depts
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Scrollable & Pan-enabled Tree Canvas Wrapper */}
                    <div className="overflow-x-auto overflow-y-auto max-h-[75vh] w-full border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 bg-zinc-50/50 dark:bg-zinc-950/40 relative custom-scrollbar">
                      <div 
                        style={{ transform: `scale(${treeZoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
                        className="min-w-max pb-8"
                      >
                        {/* LEVEL 1: EXECUTIVE LEVEL (CEO / AGENCY ADMIN) */}
                        {ceoNode && matchesFilter(ceoNode) && (
                          <div className="flex flex-col items-center text-center relative mb-8">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                              <Crown className="w-3.5 h-3.5 text-amber-500" />
                              Executive Leadership (CEO / Agency Head)
                            </div>

                            <div 
                              onClick={() => {
                                if (isAdmin) {
                                  setEditingUser(ceoNode);
                                  setEditTempTag('');
                                }
                              }}
                              className="group relative bg-gradient-to-b from-white to-amber-50/30 dark:from-zinc-900 dark:to-zinc-900/80 border-2 border-amber-500/40 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all cursor-pointer min-w-[280px] max-w-[340px]"
                            >
                              <div className="flex items-center space-x-4">
                                <div className="relative shrink-0">
                                  <Avatar className="w-14 h-14 border-2 border-amber-400 shadow-md">
                                    <AvatarImage src={ceoNode.avatarUrl} referrerPolicy="no-referrer" />
                                    <AvatarFallback className="bg-amber-500 text-white font-bold text-lg">{ceoNode.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className={cn("absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900", isUserOnline(ceoNode, currentUser?.id) ? "bg-emerald-500" : "bg-zinc-400")} />
                                </div>

                                <div className="text-left flex-1 min-w-0">
                                  <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                    {ceoNode.name}
                                  </h3>
                                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400 truncate">
                                    {ceoNode.designation || 'Agency CEO'}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge className="text-[8.5px] font-black uppercase bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 px-2 py-0">
                                      {ceoNode.role.replace('_', ' ')}
                                    </Badge>
                                    <span className="text-[9px] text-zinc-400 font-mono font-bold">
                                      {agencyUsers.length - 1} Direct / Indirect Reports
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Connecting Line Down */}
                            <div className="w-0.5 h-8 bg-gradient-to-b from-amber-400 to-zinc-300 dark:to-zinc-700 mx-auto my-1" />
                          </div>
                        )}

                        {/* LEVEL 2, 3, 4 & 5: DEPARTMENT BRANCHES & TEAM MEMBERS */}
                        <div className="relative">
                          {hierarchyLayout === 'tree' ? (
                            /* Tree View with Connecting Horizontal Bar & Vertical Cards */
                            <div className="space-y-8">
                              {/* Top Horizontal Connector Line across departments */}
                              <div className="hidden lg:block w-full max-w-5xl mx-auto h-0.5 bg-zinc-300 dark:bg-zinc-700 -mb-4" />

                              <div className="flex flex-nowrap items-start justify-center gap-8">
                                {deptList.map((dept) => {
                                  const deptStaff = agencyUsers.filter(u => u.department === dept && u.id !== ceoNode?.id && matchesFilter(u));
                                  const deptHead = getDeptHeadInfo(deptStaff);
                                  const manager = deptHead.lead;
                                  const teamMembers = deptStaff.filter(u => u.id !== manager?.id);
                                  const isCollapsed = collapsedHierarchyDepts[dept];

                                  if (deptStaff.length === 0 && hierarchySearch) return null;

                                  return (
                                    <div key={dept} className="flex flex-col items-center space-y-3 relative w-[320px] shrink-0">
                                      {/* Stem from top bar */}
                                      <div className="w-0.5 h-4 bg-zinc-300 dark:bg-zinc-700" />

                                      {/* Department Branch Header Card */}
                                      <div className="w-full bg-white dark:bg-zinc-900 border-2 border-indigo-500/30 dark:border-indigo-500/20 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between pb-2 border-b dark:border-zinc-800 mb-3">
                                          <div className="flex items-center space-x-2 min-w-0">
                                            <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                                            <h4 className="font-extrabold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100 truncate">
                                              {dept}
                                            </h4>
                                          </div>
                                          <div className="flex items-center space-x-1.5 shrink-0">
                                            {isAdmin && (
                                              <button
                                                onClick={() => setReassignDeptLead(dept as Department)}
                                                className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
                                                title="Change or Assign Department Lead"
                                              >
                                                Change Lead
                                              </button>
                                            )}
                                            <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                                              {deptStaff.length}
                                            </Badge>
                                            <button
                                              onClick={() => setCollapsedHierarchyDepts(prev => ({ ...prev, [dept]: !prev[dept] }))}
                                              className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
                                            >
                                              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                          </div>
                                        </div>

                                    {/* Department Manager/Lead Card */}
                                    {manager ? (
                                      <div 
                                        onClick={() => {
                                          if (isAdmin) {
                                            setEditingUser(manager);
                                            setEditTempTag('');
                                          }
                                        }}
                                        className="bg-indigo-500/5 hover:bg-indigo-500/10 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15 border border-indigo-500/20 rounded-xl p-3 flex items-center space-x-3 cursor-pointer transition-all mb-2"
                                      >
                                        <Avatar className="w-10 h-10 border border-indigo-400 shrink-0">
                                          <AvatarImage src={manager.avatarUrl} referrerPolicy="no-referrer" />
                                          <AvatarFallback className="bg-indigo-600 text-white text-xs font-bold">{manager.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                                              {deptHead.label}
                                            </span>
                                            <Badge className="text-[8px] font-bold uppercase bg-indigo-500 text-white px-1.5 py-0">
                                              {deptHead.badgeText}
                                            </Badge>
                                          </div>
                                          <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">{manager.name}</h5>
                                          <p className="text-[9.5px] text-zinc-500 dark:text-zinc-400 truncate">{manager.designation}</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-2.5 text-center bg-amber-500/5 dark:bg-amber-950/20 rounded-xl border border-dashed border-amber-500/20 mb-2">
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">No Local Lead assigned</p>
                                        <p className="text-[9px] text-zinc-400 italic">Managed directly by CEO / Executive Leadership</p>
                                      </div>
                                    )}

                                    {/* Expandable List of Specialists/Members */}
                                    {!isCollapsed && (
                                      <div className="space-y-2 mt-3 pt-2 border-t border-dashed dark:border-zinc-800">
                                        <span className="text-[9px] font-extrabold uppercase text-zinc-400 tracking-widest block mb-1.5">
                                          Team Members ({teamMembers.length})
                                        </span>

                                        {teamMembers.length === 0 ? (
                                          <p className="text-[10px] text-zinc-400 italic text-center py-2">No direct team members assigned</p>
                                        ) : (
                                          teamMembers.map(member => {
                                            const memberTasks = tasks.filter(t => t.assigneeId === member.id && t.status !== TaskStatus.DONE);
                                            const memberRank = getHierarchyRank(member);
                                            const reportedUser = member.reportsToId ? agencyUsers.find(u => u.id === member.reportsToId) : manager || ceoNode;

                                            return (
                                              <div 
                                                key={member.id}
                                                onClick={() => {
                                                  if (isAdmin) {
                                                    setEditingUser(member);
                                                    setEditTempTag('');
                                                  }
                                                }}
                                                className="group bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-800 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all"
                                              >
                                                <div className="flex items-center space-x-2.5 min-w-0">
                                                  <Avatar className="w-8 h-8 border shrink-0">
                                                    <AvatarImage src={member.avatarUrl} referrerPolicy="no-referrer" />
                                                    <AvatarFallback className="bg-zinc-700 text-white text-[10px] font-bold">{member.name.charAt(0)}</AvatarFallback>
                                                  </Avatar>
                                                  <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                      <h6 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                                        {member.name}
                                                      </h6>
                                                      <Badge variant="outline" className={cn("text-[7.5px] font-extrabold uppercase px-1 py-0 border", memberRank.badgeClass)}>
                                                        {memberRank.type}
                                                      </Badge>
                                                    </div>
                                                    <p className="text-[9px] text-zinc-400 truncate">{member.designation || member.role.replace('_', ' ')}</p>
                                                    {reportedUser && (
                                                      <p className="text-[8px] text-indigo-500/80 dark:text-indigo-400/80 font-medium truncate mt-0.5">
                                                        Reports to: {reportedUser.name}
                                                      </p>
                                                    )}
                                                  </div>
                                                </div>

                                                <div className="flex items-center space-x-1.5 shrink-0">
                                                  <span className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    !isUserOnline(member, currentUser?.id) ? "bg-zinc-400" :
                                                    (member.workLocation || '').toLowerCase().includes('home') ? "bg-blue-500" :
                                                    (member.workLocation || '').toLowerCase().includes('leave') ? "bg-rose-500" :
                                                    "bg-emerald-500"
                                                  )} title={isUserOnline(member, currentUser?.id) ? (member.workLocation || 'Online') : 'Offline'} />
                                                  <Badge variant="outline" className="text-[8px] font-mono font-bold px-1.5 py-0">
                                                    {memberTasks.length} tasks
                                                  </Badge>
                                                </div>
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        /* Tiered View */
                        <div className="space-y-6">
                          {deptList.map(dept => {
                            const deptStaff = agencyUsers.filter(u => u.department === dept && u.id !== ceoNode?.id && matchesFilter(u));
                            const deptHead = getDeptHeadInfo(deptStaff);
                            if (deptStaff.length === 0) return null;

                            return (
                              <div key={dept} className="bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center justify-between pb-3 border-b dark:border-zinc-800 mb-4">
                                  <div className="flex items-center space-x-2">
                                    <Building2 className="w-4 h-4 text-indigo-500" />
                                    <h4 className="font-black text-sm uppercase tracking-wider text-zinc-900 dark:text-zinc-100">{dept}</h4>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-400 italic">Head: {deptHead.lead ? deptHead.lead.name : 'CEO'}</span>
                                    <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-[10px]">
                                      {deptStaff.length} Members
                                    </Badge>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {deptStaff.map(member => {
                                    const memberRank = getHierarchyRank(member);
                                    const isLead = deptHead.lead?.id === member.id;
                                    return (
                                      <div 
                                        key={member.id}
                                        onClick={() => {
                                          if (isAdmin) {
                                            setEditingUser(member);
                                            setEditTempTag('');
                                          }
                                        }}
                                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl flex items-center justify-between hover:border-indigo-400 transition-all cursor-pointer"
                                      >
                                        <div className="flex items-center space-x-3 min-w-0">
                                          <Avatar className="w-9 h-9 border shrink-0">
                                            <AvatarImage src={member.avatarUrl} referrerPolicy="no-referrer" />
                                            <AvatarFallback className="bg-zinc-800 text-white font-bold text-xs">{member.name.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <div className="min-w-0">
                                            <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">{member.name}</h5>
                                            <p className="text-[10px] text-zinc-400 truncate">{member.designation}</p>
                                          </div>
                                        </div>
                                        <Badge variant="secondary" className={cn("text-[9px] font-extrabold uppercase px-2 py-0.5 shrink-0 border", isLead ? "bg-indigo-600 text-white border-indigo-600" : memberRank.badgeClass)}>
                                          {isLead ? deptHead.badgeText : memberRank.type}
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight">Edit Teammate Profile</DialogTitle>
              <DialogDescription className="text-zinc-500 text-xs">
                Modify team member designations, department alignment, and professional skill tags.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid gap-2">
                <Label htmlFor="edit-name" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  placeholder="John Doe"
                  className="rounded-xl h-11"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-email" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  placeholder="john@example.com"
                  className="rounded-xl h-11"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-reportsTo" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Reports To (Upper Post / Manager)</Label>
                {(() => {
                  const reportsToUser = users.find(
                    u => u.id === editingUser.reportsToId || u.email === editingUser.reportsToId
                  );
                  const resolvedValue = reportsToUser
                    ? reportsToUser.id
                    : (editingUser.reportsToId && editingUser.reportsToId !== 'auto' ? editingUser.reportsToId : 'auto');

                  return (
                    <Select
                      value={resolvedValue}
                      onValueChange={(val) => setEditingUser({ ...editingUser, reportsToId: val === 'auto' ? undefined : val })}
                    >
                      <SelectTrigger id="edit-reportsTo" className="h-11 rounded-xl">
                        <SelectValue placeholder="Auto-assign to Department Head / CEO" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto" textValue="Auto-assign to Department Head / CEO">
                          ⚡ Auto-assign to Department Head / CEO
                        </SelectItem>
                        {agencyUsers.filter(u => u.id !== editingUser.id).map(u => (
                          <SelectItem 
                            key={u.id} 
                            value={u.id}
                            textValue={`${u.name} — ${u.designation || u.role} (${u.department})`}
                          >
                            {u.name} — {u.designation || u.role} ({u.department})
                          </SelectItem>
                        ))}
                        {editingUser.reportsToId && editingUser.reportsToId !== 'auto' && !agencyUsers.some(u => u.id === resolvedValue) && (
                          <SelectItem 
                            value={editingUser.reportsToId}
                            textValue={reportsToUser ? `${reportsToUser.name} — ${reportsToUser.designation || reportsToUser.role} (${reportsToUser.department})` : `User (${editingUser.reportsToId})`}
                          >
                            {reportsToUser ? `${reportsToUser.name} — ${reportsToUser.designation || reportsToUser.role} (${reportsToUser.department})` : `User (${editingUser.reportsToId})`}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-role" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Workforce Role</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(val: UserRole) => setEditingUser({ ...editingUser, role: val })}
                  >
                    <SelectTrigger id="edit-role" className="h-11 rounded-xl">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(UserRole).map((role) => (
                        <SelectItem key={role} value={role} className="capitalize">
                          {role.replace('_', ' ').toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-dept" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Department</Label>
                  <Select
                    value={editingUser.department}
                    onValueChange={(val: Department) => setEditingUser({ ...editingUser, department: val })}
                  >
                    <SelectTrigger id="edit-dept" className="h-11 rounded-xl">
                      <SelectValue placeholder="Select dept" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Department).map((dept) => (
                        <SelectItem key={dept} value={dept} className="capitalize">
                          {dept.replace('_', ' ').toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-desig" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Designation / Title</Label>
                  <Input
                    id="edit-desig"
                    value={editingUser.designation}
                    onChange={(e) => setEditingUser({ ...editingUser, designation: e.target.value })}
                    placeholder="e.g. Senior Specialist"
                    className="rounded-xl h-11"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-location" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Work Location Status</Label>
                  <Select
                    value={editingUser.workLocation || 'In Office'}
                    onValueChange={(val: any) => setEditingUser({ ...editingUser, workLocation: val })}
                  >
                    <SelectTrigger id="edit-location" className="h-11 rounded-xl">
                      <SelectValue placeholder="In Office" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In Office">🏢 In Office</SelectItem>
                      <SelectItem value="Work From Home">🏠 Work From Home</SelectItem>
                      <SelectItem value="Leave">🌴 On Leave</SelectItem>
                      <SelectItem value="Appear Away">🌙 Appear Away</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Department Lead Toggle Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/20">
                <div>
                  <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                    Designate as Department Head / Lead
                  </Label>
                  <p className="text-[10px] text-zinc-400">
                    Makes this person the primary Lead / Manager for their department in the Org Tree.
                  </p>
                </div>
                <Switch
                  checked={!!editingUser.isDeptLead}
                  onCheckedChange={(checked) => setEditingUser({ ...editingUser, isDeptLead: checked })}
                />
              </div>

              {/* Organizational Tier / Badge Selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Organizational Level & Card Badge
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'specialist', label: 'Designation Badge', sub: 'Shows exact Designation', icon: '🎨' },
                    { id: 'lead', label: 'Team Lead', sub: 'Badge: Team Lead', icon: '🎯' },
                    { id: 'manager', label: 'Manager', sub: 'Badge: Manager', icon: '💼' },
                    { id: 'director', label: 'Director', sub: 'Badge: Director', icon: '🏢' },
                    { id: 'executive', label: 'Executive', sub: 'Badge: Executive / CEO', icon: '👑' },
                  ].map((tier) => {
                    const isSelected = (editingUser.hierarchyLevel || 'specialist') === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setEditingUser({ ...editingUser, hierarchyLevel: tier.id as any })}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-sm ring-1 ring-indigo-500"
                            : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs">{tier.icon}</span>
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{tier.label}</span>
                        </div>
                        <span className="text-[9px] text-zinc-400 font-medium leading-tight">{tier.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags Section for Editing */}
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Professional Skill Tags</Label>
                <div className="flex flex-wrap gap-1.5 p-2.5 border border-zinc-200 rounded-xl min-h-[44px] bg-white dark:bg-zinc-950">
                  {editingUser.skillTags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[9px] font-semibold flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {tag}
                      <button
                        type="button"
                        onClick={() => setEditingUser({
                          ...editingUser,
                          skillTags: editingUser.skillTags?.filter(t => t !== tag) || []
                        })}
                        className="hover:bg-zinc-200 rounded-full w-3 h-3 flex items-center justify-center text-[10px] cursor-pointer"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  {(!editingUser.skillTags || editingUser.skillTags.length === 0) && (
                    <span className="text-[10px] text-zinc-400 self-center px-1">No tags added yet.</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a skill/tag and press Add"
                    className="rounded-xl flex-1 text-xs"
                    value={editTempTag}
                    onChange={(e) => setEditTempTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (editTempTag.trim()) {
                          const tag = editTempTag.trim();
                          if (!editingUser.skillTags?.includes(tag)) {
                            setEditingUser({
                              ...editingUser,
                              skillTags: [...(editingUser.skillTags || []), tag]
                            });
                          }
                          setEditTempTag('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-xl text-xs uppercase font-extrabold tracking-widest px-4 h-9"
                    onClick={() => {
                      if (editTempTag.trim()) {
                        const tag = editTempTag.trim();
                        if (!editingUser.skillTags?.includes(tag)) {
                          setEditingUser({
                            ...editingUser,
                            skillTags: [...(editingUser.skillTags || []), tag]
                          });
                        }
                        setEditTempTag('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="submit"
                className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl h-12 font-bold uppercase tracking-widest text-xs"
                onClick={handleEditUser}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog to Reassign Department Lead */}
      {reassignDeptLead && (
        <Dialog open={!!reassignDeptLead} onOpenChange={(open) => { if (!open) setReassignDeptLead(null); }}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold tracking-tight">
                Set Department Lead — <span className="text-indigo-600 dark:text-indigo-400">{reassignDeptLead}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Select who will lead and manage the {reassignDeptLead} department in the organizational hierarchy.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 max-h-[50vh] overflow-y-auto pr-1">
              {(() => {
                const topCeo = agencyUsers.find(u => u.role === UserRole.AGENCY_ADMIN || isSuperAdmin(u) || u.id === '001') || agencyUsers[0];
                const deptMembers = agencyUsers.filter(u => u.department === reassignDeptLead && u.id !== topCeo?.id);
                if (deptMembers.length === 0) {
                  return <p className="text-xs text-zinc-400 italic text-center py-4">No team members assigned to this department yet.</p>;
                }
                const explicitLead = deptMembers.find(m => m.isDeptLead);

                return deptMembers.map((member) => {
                  const isCurrentLead = explicitLead ? explicitLead.id === member.id : member.isDeptLead;

                  return (
                    <div 
                      key={member.id}
                      className={cn(
                        "p-3 rounded-xl border flex items-center justify-between transition-all",
                        isCurrentLead 
                          ? "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600" 
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                      )}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <Avatar className="w-9 h-9 border shrink-0">
                          <AvatarImage src={member.avatarUrl} referrerPolicy="no-referrer" />
                          <AvatarFallback className="bg-zinc-800 text-white text-xs font-bold">{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">{member.name}</h5>
                            {isCurrentLead && (
                              <Badge className="text-[7.5px] font-black uppercase bg-indigo-600 text-white px-1.5 py-0">Current Lead</Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400 truncate">{member.designation || member.role}</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isCurrentLead ? "secondary" : "default"}
                        disabled={isCurrentLead}
                        onClick={() => handleAssignDeptLead(reassignDeptLead, member.id)}
                        className="h-8 text-[10px] font-bold uppercase rounded-lg shrink-0 cursor-pointer"
                      >
                        {isCurrentLead ? "Active Lead" : "Set as Lead"}
                      </Button>
                    </div>
                  );
                });
              })()}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setReassignDeptLead(null)} className="rounded-xl text-xs font-bold">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface UserCardProps {
  user: UserProfile;
  key?: string | number | null;
  isAdmin?: boolean;
  onEditClick?: (user: UserProfile) => void;
}

function UserCard({ user, isAdmin, onEditClick }: UserCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow border-zinc-100 dark:border-zinc-800 relative group overflow-hidden">
      {isAdmin && (
        <button
          onClick={() => onEditClick?.(user)}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 transition-all cursor-pointer z-10"
          title="Edit Teammate Details"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <Avatar className="w-20 h-20 border-2 border-white shadow-sm mb-4 overflow-hidden">
            {user.avatarUrl && (user.avatarUrl.startsWith('http') || user.avatarUrl.startsWith('/') || user.avatarUrl.startsWith('data:')) ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <AvatarFallback className="text-3xl bg-zinc-50 flex items-center justify-center select-none font-bold">
                {user.avatarUrl && user.avatarUrl.length <= 4 ? user.avatarUrl : user.name.charAt(0)}
              </AvatarFallback>
            )}
          </Avatar>
          <h3 className="font-bold text-lg tracking-tight">{user.name}</h3>

          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
            {user.designation}
          </p>

          {/* Work Location Badge BELOW Designation */}
          <div className="mt-1.5 shrink-0">
            <span className={cn(
              "inline-flex items-center text-[9px] font-black uppercase tracking-wider py-0.5 px-2.5 rounded-full border shadow-sm",
              user.workLocation === 'Work From Home' ? "bg-blue-500/5 text-blue-600 border-blue-500/20 dark:text-blue-400" :
              user.workLocation === 'Leave' ? "bg-rose-500/5 text-rose-600 border-rose-500/20 dark:text-rose-450" :
              user.workLocation === 'Appear Away' ? "bg-zinc-500/5 text-zinc-500 border-zinc-500/20 dark:text-zinc-400" :
              "bg-emerald-500/5 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
            )}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse shrink-0",
                user.workLocation === 'Work From Home' ? "bg-blue-500" :
                user.workLocation === 'Leave' ? "bg-rose-500" :
                user.workLocation === 'Appear Away' ? "bg-zinc-400" :
                "bg-emerald-500"
              )} />
              {user.workLocation || 'In Office'}
            </span>
          </div>
          
          <div className="mt-3 flex flex-wrap justify-center gap-1">
            <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-tight px-2 py-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {user.department}
            </Badge>
          </div>

          <div className="w-full mt-6 space-y-3 border-t dark:border-zinc-800 pt-4">
            <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400">
              <Mail className="w-3 h-3 mr-2 text-zinc-400 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400">
              <Briefcase className="w-3 h-3 mr-2 text-zinc-400 shrink-0" />
              <span className="truncate text-[10px] uppercase font-bold tracking-tight">{user.role.replace('_', ' ')}</span>
            </div>
            <div className="flex flex-wrap gap-1 pt-1 justify-center">
              {(user.skillTags || []).slice(0, 3).map(skill => (
                <div key={skill} className="flex items-center text-[10px] text-zinc-500 dark:text-zinc-400 font-medium bg-zinc-50 dark:bg-zinc-900 px-2 py-0.5 rounded border border-zinc-100 dark:border-zinc-800">
                  <Tag className="w-2 h-2 mr-1 text-zinc-400 shrink-0" />
                  {skill}
                </div>
              ))}
              {user.skillTags && user.skillTags.length > 3 && (
                <span className="text-[10px] text-zinc-400 font-bold self-center">+{user.skillTags.length - 3}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


import React, { useState } from 'react';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Search, 
  MoreVertical, 
  Mail, 
  Shield, 
  Briefcase, 
  Trash2, 
  UserCheck,
  UserX,
  Plus,
  Edit2
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserProfile, UserRole, Department, UserPermissions, isSuperAdmin } from '@/src/types';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { Checkbox } from '@/components/ui/checkbox';

interface UserManagementProps {
  users: UserProfile[];
  onAddUser: (user: UserProfile) => void;
  onRemoveUser: (userId: string) => void;
  onUpdateUsers?: (updated: UserProfile[]) => void;
  currentUser?: UserProfile | null;
}

const DEFAULT_MALE_AVATAR = "https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver";
const DEFAULT_FEMALE_AVATAR = "https://api.dicebear.com/7.x/adventurer/svg?seed=Emma";

export function UserManagement({ users, onAddUser, onRemoveUser, onUpdateUsers, currentUser }: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'agency' | 'client'>('all');
  const [newClientProjects, setNewClientProjects] = useState<{ name: string; timingHours: number; websiteUrl: string; type: string }[]>([
    { name: '', timingHours: 10, websiteUrl: '', type: 'Retainer' }
  ]);
  const [newUser, setNewUser] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    role: UserRole.DESIGNER,
    department: Department.DESIGN,
    status: 'active',
    gender: 'male',
    avatarUrl: DEFAULT_MALE_AVATAR,
    isSuperAdmin: false,
    permissions: {
      canCreateProject: false,
      canDeleteProject: false,
      canManageInvoices: false,
      canManageUsers: false,
    }
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all'
      ? true
      : roleFilter === 'client'
        ? u.role === UserRole.CLIENT
        : u.role !== UserRole.CLIENT;
        
    return matchesSearch && matchesRole;
  });

  const EMOJI_PRESETS = ['💼', '🏢', '🚀', '🎨', '📊', '🌍', '🛡️', '💎', '💡', '⚡', '☕', '🎯', '🦁', '🦊', '🦉', '🍕', '🚗', '🏔️'];

  // Edit User State & Handlers
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>(UserRole.DESIGNER);
  const [editDepartment, setEditDepartment] = useState<Department>(Department.DESIGN);
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editGender, setEditGender] = useState<'male' | 'female'>('male');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editIsSuperAdmin, setEditIsSuperAdmin] = useState(false);
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({
    canCreateProject: false,
    canDeleteProject: false,
    canManageInvoices: false,
    canManageUsers: false,
  });

  const handleStartEdit = (userProfile: UserProfile) => {
    setEditingUser(userProfile);
    setEditName(userProfile.name);
    setEditEmail(userProfile.email);
    setEditRole(userProfile.role);
    setEditDepartment(userProfile.department);
    setEditStatus(userProfile.status || 'active');
    setEditGender(userProfile.gender || 'male');
    setEditAvatarUrl(userProfile.avatarUrl || '');
    setEditDesignation(userProfile.designation || '');
    setEditIsSuperAdmin(!!userProfile.isSuperAdmin);
    setEditPermissions(userProfile.permissions || {
      canCreateProject: false,
      canDeleteProject: false,
      canManageInvoices: false,
      canManageUsers: false,
    });
    setIsEditUserOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingUser || !editName || !editEmail) return;

    const defaultAvatar = editGender === 'female' 
      ? DEFAULT_FEMALE_AVATAR
      : DEFAULT_MALE_AVATAR;

    const updatedUser: UserProfile = {
      ...editingUser,
      name: editName.trim(),
      email: editEmail.trim(),
      role: editRole,
      department: editDepartment,
      status: editStatus,
      gender: editGender,
      avatarUrl: editAvatarUrl || defaultAvatar,
      designation: editDesignation.trim() || (editRole === UserRole.CLIENT ? 'Client Partner' : editRole.replace('_', ' ')),
      permissions: editPermissions,
      isSuperAdmin: editIsSuperAdmin
    };

    if (onUpdateUsers) {
      const updatedList = users.map(u => u.id === editingUser.id ? updatedUser : u);
      onUpdateUsers(updatedList);
    }

    setIsEditUserOpen(false);
    setEditingUser(null);
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) return;

    const defaultAvatar = newUser.gender === 'female' 
      ? DEFAULT_FEMALE_AVATAR
      : DEFAULT_MALE_AVATAR;

    const userToAdd: UserProfile = {
      ...newUser as UserProfile,
      id: Math.random().toString(36).substr(2, 9),
      avatarUrl: newUser.avatarUrl || defaultAvatar,
      designation: newUser.role === UserRole.CLIENT ? 'Client Partner' : (newUser.role?.replace('_', ' ') || 'Specialist'),
      skillTags: [],
      clientProjects: newUser.role === UserRole.CLIENT ? newClientProjects : undefined
    };

    onAddUser(userToAdd);
    setIsAddUserOpen(false);
    setNewClientProjects([
      { name: '', timingHours: 10, websiteUrl: '', type: 'Retainer' }
    ]);
    setNewUser({
      name: '',
      email: '',
      role: UserRole.DESIGNER,
      department: Department.DESIGN,
      status: 'active',
      gender: 'male',
      avatarUrl: DEFAULT_MALE_AVATAR,
      isSuperAdmin: false,
      permissions: {
        canCreateProject: false,
        canDeleteProject: false,
        canManageInvoices: false,
        canManageUsers: false,
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-sans">User Management</h1>
          <p className="text-zinc-500 text-sm font-medium">Add, remove, and manage agency team permissions.</p>
        </div>

        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger 
            className={cn(
              buttonVariants({}),
              "bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl px-6 h-11 font-bold text-xs uppercase tracking-widest shadow-lg shadow-zinc-200 flex items-center justify-center cursor-pointer"
            )}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Team Member
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight">Create User / Client Profile</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-5 max-h-[65vh] overflow-y-auto px-1">
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Full Name</Label>
                <Input 
                  placeholder="e.g. Sarah Jenkins" 
                  className="rounded-xl border-zinc-200 h-10"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Work Email</Label>
                <Input 
                  type="email"
                  placeholder="sarah@nexus.agency" 
                  className="rounded-xl border-zinc-200 h-10"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                />
              </div>

              {isSuperAdmin(currentUser) && (
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Access Level / System Tier</Label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'super', label: 'Super Admin', emoji: '👑', desc: 'All privileges' },
                      { id: 'admin', label: 'Admin', emoji: '🛡️', desc: 'Ops & Invoices' },
                      { id: 'normal', label: 'Normal User', emoji: '👤', desc: 'Standard Access' }
                    ].map((tier) => {
                      const isSelected = tier.id === 'super' 
                        ? !!newUser.isSuperAdmin
                        : tier.id === 'admin'
                          ? (!newUser.isSuperAdmin && newUser.permissions?.canCreateProject)
                          : (!newUser.isSuperAdmin && !newUser.permissions?.canCreateProject);
                      
                      return (
                        <button
                          type="button"
                          key={tier.id}
                          onClick={() => {
                            if (tier.id === 'super') {
                              setNewUser({
                                ...newUser,
                                isSuperAdmin: true,
                                role: UserRole.AGENCY_ADMIN,
                                designation: 'Super Admin',
                                permissions: {
                                  canCreateProject: true,
                                  canDeleteProject: true,
                                  canManageInvoices: true,
                                  canManageUsers: true
                                }
                              });
                            } else if (tier.id === 'admin') {
                              setNewUser({
                                ...newUser,
                                isSuperAdmin: false,
                                role: UserRole.AGENCY_ADMIN,
                                designation: 'Administrator',
                                permissions: {
                                  canCreateProject: true,
                                  canDeleteProject: false,
                                  canManageInvoices: true,
                                  canManageUsers: true
                                }
                              });
                            } else {
                              setNewUser({
                                ...newUser,
                                isSuperAdmin: false,
                                role: UserRole.DESIGNER,
                                designation: 'Specialist',
                                permissions: {
                                  canCreateProject: false,
                                  canDeleteProject: false,
                                  canManageInvoices: false,
                                  canManageUsers: false
                                }
                              });
                            }
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer h-[76px]",
                            isSelected
                              ? "border-orange-500 bg-orange-50/10 text-orange-700 shadow-sm dark:bg-orange-950/20 dark:text-orange-400"
                              : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                          )}
                        >
                          <span className="text-lg mb-1">{tier.emoji}</span>
                          <span className="text-[10px] font-bold tracking-tight block">{tier.label}</span>
                          <span className="text-[8px] text-zinc-400 font-medium block leading-none mt-0.5">{tier.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Organizational Role</Label>
                  <Select 
                    value={newUser.role} 
                    onValueChange={(v) => {
                      const updatedDept = v === UserRole.CLIENT ? Department.MANAGEMENT : newUser.department;
                      setNewUser({...newUser, role: v as UserRole, department: updatedDept});
                    }}
                  >
                    <SelectTrigger className="rounded-xl border-zinc-200 h-10">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UserRole).map(([key, value]) => (
                        <SelectItem key={key} value={value}>{value.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Primary Department</Label>
                  <Select 
                    value={newUser.department} 
                    onValueChange={(v) => setNewUser({...newUser, department: v as Department})}
                  >
                    <SelectTrigger className="rounded-xl border-zinc-200 h-10">
                      <SelectValue placeholder="Select Dept" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Department).map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Gender / Profile Type Selector */}
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Gender / Identification</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNewUser({
                        ...newUser,
                        gender: 'male',
                        avatarUrl: DEFAULT_MALE_AVATAR
                      });
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                      newUser.gender === 'male'
                        ? "border-blue-500 bg-blue-50/10 text-blue-700 shadow-sm dark:bg-blue-950/20 dark:text-blue-400"
                        : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <span className="text-base">👨‍💻</span>
                    <span>Male Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewUser({
                        ...newUser,
                        gender: 'female',
                        avatarUrl: DEFAULT_FEMALE_AVATAR
                      });
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                      newUser.gender === 'female'
                        ? "border-pink-500 bg-pink-50/10 text-pink-700 shadow-sm dark:bg-pink-950/20 dark:text-pink-400"
                        : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <span className="text-base">👩‍💻</span>
                    <span>Female / Ladies</span>
                  </button>
                </div>
              </div>

              {/* Profile Photo Option (Emoji/Logo Selection Setup) */}
              <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 gap-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Profile Photo / Logo</Label>
                  {newUser.avatarUrl && (
                    <span className="text-[10px] text-zinc-400 font-bold">Selected: {newUser.avatarUrl.length > 30 ? 'Custom Photo' : newUser.avatarUrl}</span>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border flex items-center justify-center text-2xl shadow-inner font-mono select-none overflow-hidden shrink-0">
                    {newUser.avatarUrl && (newUser.avatarUrl.startsWith('http') || newUser.avatarUrl.startsWith('/') || newUser.avatarUrl.startsWith('data:')) ? (
                      <img src={newUser.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : newUser.avatarUrl && newUser.avatarUrl.length <= 4 ? (
                      newUser.avatarUrl
                    ) : (
                      '👤'
                    )}
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
                  <span className="text-[9px] uppercase font-extrabold tracking-widest text-zinc-400 block">Dummy Gender Avatars</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewUser({...newUser, avatarUrl: DEFAULT_MALE_AVATAR, gender: 'male'})}
                      className={cn(
                        "flex items-center space-x-2 p-1.5 rounded-lg border transition-all cursor-pointer text-left bg-white dark:bg-zinc-950",
                        newUser.avatarUrl === DEFAULT_MALE_AVATAR ? "border-blue-500 bg-blue-50/10" : "border-zinc-200 hover:bg-zinc-50"
                      )}
                    >
                      <img src={DEFAULT_MALE_AVATAR} className="w-8 h-8 rounded-full object-cover border" alt="Male" />
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">Dummy Men</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewUser({...newUser, avatarUrl: DEFAULT_FEMALE_AVATAR, gender: 'female'})}
                      className={cn(
                        "flex items-center space-x-2 p-1.5 rounded-lg border transition-all cursor-pointer text-left bg-white dark:bg-zinc-950",
                        newUser.avatarUrl === DEFAULT_FEMALE_AVATAR ? "border-pink-500 bg-pink-50/10" : "border-zinc-200 hover:bg-zinc-50"
                      )}
                    >
                      <img src={DEFAULT_FEMALE_AVATAR} className="w-8 h-8 rounded-full object-cover border" alt="Female" />
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">Dummy Women</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] uppercase font-extrabold tracking-widest text-zinc-400 block">Quick Emojis / Logo Presets</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white rounded-lg border">
                    {EMOJI_PRESETS.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setNewUser({...newUser, avatarUrl: emoji})}
                        className={cn(
                          "w-7 h-7 flex items-center justify-center text-sm rounded bg-zinc-50 hover:bg-zinc-100 transition-all border",
                          newUser.avatarUrl === emoji ? "border-zinc-900 bg-zinc-100" : "border-transparent"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Client Projects Configuration */}
              {newUser.role === UserRole.CLIENT && (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-900/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 block">
                        Client Projects
                      </Label>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        Onboard client with one or more managed projects.
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewClientProjects([...newClientProjects, { name: '', timingHours: 10, websiteUrl: '', type: 'Retainer' }])}
                      className="h-8 text-[10px] font-bold uppercase tracking-wider rounded-lg border-zinc-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Project
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {newClientProjects.map((proj, idx) => (
                      <div key={idx} className="border border-zinc-100 dark:border-zinc-800/60 p-3.5 rounded-xl bg-white dark:bg-zinc-950 space-y-3 relative">
                        {newClientProjects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setNewClientProjects(newClientProjects.filter((_, i) => i !== idx))}
                            className="absolute right-3 top-3 text-zinc-400 hover:text-rose-500 transition-colors p-1 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          Project #{idx + 1}
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                          <div className="grid gap-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Project Name</Label>
                            <Input
                              placeholder="e.g. Website Overhaul"
                              value={proj.name}
                              onChange={(e) => {
                                const list = [...newClientProjects];
                                list[idx].name = e.target.value;
                                setNewClientProjects(list);
                              }}
                              className="h-9 rounded-xl text-xs border-zinc-200"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="grid gap-1.5">
                              <Label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Timing (Weekly Budget Hours)</Label>
                              <Input
                                type="number"
                                min="1"
                                placeholder="e.g. 10"
                                value={proj.timingHours}
                                onChange={(e) => {
                                  const list = [...newClientProjects];
                                  list[idx].timingHours = parseFloat(e.target.value) || 10;
                                  setNewClientProjects(list);
                                }}
                                className="h-9 rounded-xl text-xs border-zinc-200"
                              />
                            </div>

                            <div className="grid gap-1.5">
                              <Label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Project Type</Label>
                              <Select
                                value={proj.type}
                                onValueChange={(val) => {
                                  const list = [...newClientProjects];
                                  list[idx].type = val;
                                  setNewClientProjects(list);
                                }}
                              >
                                <SelectTrigger className="h-9 rounded-xl text-xs border-zinc-200">
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Retainer" className="text-xs">Retainer</SelectItem>
                                  <SelectItem value="One-Off" className="text-xs">One-Off Project</SelectItem>
                                  <SelectItem value="Always-On" className="text-xs">Always-On</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid gap-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Project Link / Website URL</Label>
                            <Input
                              placeholder="e.g. www.acme.com"
                              value={proj.websiteUrl}
                              onChange={(e) => {
                                const list = [...newClientProjects];
                                list[idx].websiteUrl = e.target.value;
                                setNewClientProjects(list);
                              }}
                              className="h-9 rounded-xl text-xs border-zinc-200"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button 
                onClick={handleAddUser}
                className="w-full bg-zinc-900 text-white rounded-xl h-12 font-bold uppercase tracking-widest text-xs"
              >
                {newUser.role === UserRole.CLIENT ? 'Onboard Client Partner' : 'Onboard New Expert'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-zinc-200 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="bg-white border-b border-zinc-100 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input 
                placeholder="Search by name or email..." 
                className="pl-9 h-9 text-xs rounded-lg border-zinc-200 bg-zinc-50/50 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex rounded-lg border bg-zinc-50/50 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={cn("px-3 py-1 rounded-md font-bold transition-all", roleFilter === 'all' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500")}
                >
                  All ({users.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('agency')}
                  className={cn("px-3 py-1 rounded-md font-bold transition-all", roleFilter === 'agency' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500")}
                >
                  Agency ({users.filter(u => u.role !== UserRole.CLIENT).length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('client')}
                  className={cn("px-3 py-1 rounded-md font-bold transition-all", roleFilter === 'client' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500")}
                >
                  Clients ({users.filter(u => u.role === UserRole.CLIENT).length})
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow className="hover:bg-transparent border-zinc-100">
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4 pl-6">Profile / Partner</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4">Role & Access</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4">Department</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4">Status</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4 text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((expert) => (
                  <TableRow key={expert.id} className="group hover:bg-zinc-50/30 border-zinc-50 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-9 h-9 border-2 border-white shadow-sm ring-1 ring-zinc-100">
                          {expert.avatarUrl && !expert.avatarUrl.startsWith('http') && !expert.avatarUrl.startsWith('/') && expert.avatarUrl.length <= 4 ? (
                            <AvatarFallback className="bg-orange-50 text-orange-650 dark:bg-zinc-800 dark:text-zinc-200 text-sm font-bold flex items-center justify-center">
                              {expert.avatarUrl}
                            </AvatarFallback>
                          ) : (
                            <>
                              <AvatarImage src={expert.avatarUrl} referrerPolicy="no-referrer" />
                              <AvatarFallback className="bg-zinc-100 text-xs font-bold">{expert.name.charAt(0)}</AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <p className="text-sm font-bold tracking-tight text-zinc-900 leading-tight">{expert.name}</p>
                            {expert.role === UserRole.CLIENT && (
                              <Badge className="bg-orange-100 text-orange-700 text-[8px] font-black uppercase tracking-widest px-1.5 h-3.5 leading-none rounded">
                                Client
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 flex items-center font-medium">
                            <Mail className="w-3 h-3 mr-1 opacity-50" />
                            {expert.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-xs font-semibold text-zinc-700">
                        <Shield className="w-3 h-3 mr-2 text-zinc-400" />
                        {expert.role.replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-xs font-semibold text-zinc-700">
                        <Briefcase className="w-3 h-3 mr-2 text-zinc-400" />
                        {expert.department}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isSuperAdmin(currentUser) ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const newStatus: 'active' | 'inactive' = expert.status === 'active' ? 'inactive' : 'active';
                                const updatedUser: UserProfile = { ...expert, status: newStatus };
                                if (onUpdateUsers) {
                                  const updatedList = users.map(u => u.id === expert.id ? updatedUser : u);
                                  onUpdateUsers(updatedList);
                                  toast.success(`User ${expert.name} is now ${newStatus.toUpperCase()}`);
                                }
                              }}
                              className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-orange-500",
                                expert.status === 'active' ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                              )}
                              title={`Click to ${expert.status === 'active' ? 'Deactivate' : 'Activate'} user`}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                                  expert.status === 'active' ? "translate-x-4" : "translate-x-0"
                                )}
                              />
                            </button>
                            <Badge className={cn(
                              "text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded",
                              expert.status === 'active' 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30" 
                                : "bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-900/40 dark:text-zinc-400 dark:border-zinc-800"
                            )}>
                              {expert.status === 'active' ? 'ON' : 'OFF'}
                            </Badge>
                          </div>
                        ) : (
                          <Badge className={cn(
                            "text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded",
                            expert.status === 'active' 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30" 
                              : "bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-900/40 dark:text-zinc-400 dark:border-zinc-800"
                          )}>
                            {expert.status || 'active'}
                          </Badge>
                        )}
                        
                        {/* Display if Away or Out of Office helper tag */}
                        {expert.workLocation && expert.workLocation !== 'In Office' && (
                          <span className="text-[9px] text-orange-500 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/30 px-1 py-0.5 rounded flex items-center gap-0.5" title={`Current Work Location: ${expert.workLocation}`}>
                            {expert.workLocation === 'Leave' ? '🌴 Out' : '🏡 WFH'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6 space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() => handleStartEdit(expert)}
                        title="Edit User Profile"
                      >
                        <Edit2 className="w-4 h-4 text-orange-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() => onRemoveUser(expert.id)}
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Admin Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto rounded-2xl bg-card border-zinc-200 dark:border-zinc-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Edit User Profile: <span className="text-orange-500">{editName}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-user-name" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Full Name</Label>
                <Input 
                  id="edit-user-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-xl border-zinc-200 h-10 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-user-email" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Work Email</Label>
                <Input 
                  id="edit-user-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="rounded-xl border-zinc-200 h-10 text-xs font-semibold"
                />
              </div>

              {isSuperAdmin(currentUser) && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Access Level / System Tier</Label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'super', label: 'Super Admin', emoji: '👑', desc: 'All privileges' },
                      { id: 'admin', label: 'Admin', emoji: '🛡️', desc: 'Ops & Invoices' },
                      { id: 'normal', label: 'Normal User', emoji: '👤', desc: 'Standard Access' }
                    ].map((tier) => {
                      const isSelected = tier.id === 'super' 
                        ? !!editIsSuperAdmin
                        : tier.id === 'admin'
                          ? (!editIsSuperAdmin && editPermissions.canCreateProject)
                          : (!editIsSuperAdmin && !editPermissions.canCreateProject);
                      
                      return (
                        <button
                          type="button"
                          key={tier.id}
                          onClick={() => {
                            if (tier.id === 'super') {
                              setEditIsSuperAdmin(true);
                              setEditRole(UserRole.AGENCY_ADMIN);
                              setEditDesignation('Super Admin');
                              setEditPermissions({
                                canCreateProject: true,
                                canDeleteProject: true,
                                canManageInvoices: true,
                                canManageUsers: true
                              });
                            } else if (tier.id === 'admin') {
                              setEditIsSuperAdmin(false);
                              setEditRole(UserRole.AGENCY_ADMIN);
                              setEditDesignation('Administrator');
                              setEditPermissions({
                                canCreateProject: true,
                                canDeleteProject: false,
                                canManageInvoices: true,
                                canManageUsers: true
                              });
                            } else {
                              setEditIsSuperAdmin(false);
                              setEditRole(UserRole.DESIGNER);
                              setEditDesignation('Specialist');
                              setEditPermissions({
                                canCreateProject: false,
                                canDeleteProject: false,
                                canManageInvoices: false,
                                canManageUsers: false
                              });
                            }
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer h-[76px]",
                            isSelected
                              ? "border-orange-500 bg-orange-50/10 text-orange-700 shadow-sm dark:bg-orange-950/20 dark:text-orange-400"
                              : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                          )}
                        >
                          <span className="text-lg mb-1">{tier.emoji}</span>
                          <span className="text-[10px] font-bold tracking-tight block">{tier.label}</span>
                          <span className="text-[8px] text-zinc-400 font-medium block leading-none mt-0.5">{tier.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-role" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Access Role</Label>
                  <Select 
                    value={editRole} 
                    onValueChange={(v: UserRole) => {
                      const updatedDept = v === UserRole.CLIENT ? Department.MANAGEMENT : editDepartment;
                      setEditRole(v);
                      setEditDepartment(updatedDept);
                    }}
                  >
                    <SelectTrigger id="edit-user-role" className="rounded-xl border-zinc-200 h-10 text-xs font-semibold">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UserRole).map(([key, value]) => (
                        <SelectItem key={key} value={value}>{value.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-dept" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Primary Department</Label>
                  <Select 
                    value={editDepartment} 
                    onValueChange={(v: Department) => setEditDepartment(v)}
                  >
                    <SelectTrigger id="edit-user-dept" className="rounded-xl border-zinc-200 h-10 text-xs font-semibold">
                      <SelectValue placeholder="Select Dept" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Department).map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="edit-user-desig" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Designation</Label>
                  <Input 
                    id="edit-user-desig"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    placeholder={editRole.replace('_', ' ')}
                    className="rounded-xl border-zinc-200 h-10 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="edit-user-status" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</Label>
                  <Select 
                    value={editStatus} 
                    onValueChange={(v: 'active' | 'inactive') => setEditStatus(v)}
                  >
                    <SelectTrigger id="edit-user-status" className="rounded-xl border-zinc-200 h-10 text-xs font-semibold">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">🟢 Active</SelectItem>
                      <SelectItem value="inactive">🔴 Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="edit-user-gender" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Gender</Label>
                  <Select 
                    value={editGender} 
                    onValueChange={(v: 'male' | 'female') => {
                      setEditGender(v);
                      // Auto-update to correct gender avatar if it is currently using default or empty
                      if (!editAvatarUrl || editAvatarUrl.includes('dicebear.com') || editAvatarUrl === DEFAULT_MALE_AVATAR || editAvatarUrl === DEFAULT_FEMALE_AVATAR) {
                        setEditAvatarUrl(v === 'female' ? DEFAULT_FEMALE_AVATAR : DEFAULT_MALE_AVATAR);
                      }
                    }}
                  >
                    <SelectTrigger id="edit-user-gender" className="rounded-xl border-zinc-200 h-10 text-xs font-semibold">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">👨 Male</SelectItem>
                      <SelectItem value="female">👩 Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isSuperAdmin(currentUser) && (
                <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center space-x-1.5">
                    <Shield className="w-4 h-4 text-orange-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
                      Super Admin: Delegate Permissions
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-medium leading-normal">
                    As a Super Admin, you can delegate specific operational permissions to other team managers.
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="perm-create-project"
                        checked={editPermissions.canCreateProject || false}
                        onCheckedChange={(checked) => setEditPermissions(prev => ({ ...prev, canCreateProject: !!checked }))}
                        className="brand-checkbox"
                      />
                      <Label htmlFor="perm-create-project" className="text-xs font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300">
                        Create Projects
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="perm-delete-project"
                        checked={editPermissions.canDeleteProject || false}
                        onCheckedChange={(checked) => setEditPermissions(prev => ({ ...prev, canDeleteProject: !!checked }))}
                        className="brand-checkbox"
                      />
                      <Label htmlFor="perm-delete-project" className="text-xs font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300">
                        Delete Projects
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="perm-manage-invoices"
                        checked={editPermissions.canManageInvoices || false}
                        onCheckedChange={(checked) => setEditPermissions(prev => ({ ...prev, canManageInvoices: !!checked }))}
                        className="brand-checkbox"
                      />
                      <Label htmlFor="perm-manage-invoices" className="text-xs font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300">
                        Manage Invoices
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="perm-manage-users"
                        checked={editPermissions.canManageUsers || false}
                        onCheckedChange={(checked) => setEditPermissions(prev => ({ ...prev, canManageUsers: !!checked }))}
                        className="brand-checkbox"
                      />
                      <Label htmlFor="perm-manage-users" className="text-xs font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300">
                        Manage Users
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Photo Option */}
              <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 gap-3 flex flex-col">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Profile Photo / Logo</Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border flex items-center justify-center text-2xl shadow-inner font-mono select-none overflow-hidden shrink-0">
                    {editAvatarUrl && (editAvatarUrl.startsWith('http') || editAvatarUrl.startsWith('/') || editAvatarUrl.startsWith('data:')) ? (
                      <img src={editAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{editAvatarUrl || '👤'}</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Input 
                      placeholder="Paste Logo URL or Type Custom Emoji" 
                      className="rounded-xl h-9 text-xs border-zinc-200 bg-white"
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                    />
                    
                    {/* Drag & Drop File Upload */}
                    <label className="flex flex-col items-center justify-center h-10 px-3 py-1 bg-white dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl cursor-pointer hover:border-brand-secondary transition-all">
                      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider text-center">
                        Upload Image File (<span className="text-orange-500">Browse</span>)
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error("File size exceeds 2MB limit!");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditAvatarUrl(reader.result as string);
                              toast.success("Profile photo uploaded!");
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-extrabold tracking-widest text-zinc-400 block">Dummy Gender Avatars</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditAvatarUrl(DEFAULT_MALE_AVATAR);
                        setEditGender('male');
                      }}
                      className={cn(
                        "flex items-center space-x-2 p-1.5 rounded-lg border transition-all cursor-pointer text-left bg-white dark:bg-zinc-950",
                        editAvatarUrl === DEFAULT_MALE_AVATAR ? "border-blue-500 bg-blue-50/10 dark:bg-blue-950/20" : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800"
                      )}
                    >
                      <img src={DEFAULT_MALE_AVATAR} className="w-8 h-8 rounded-full object-cover border" alt="Male" />
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">Dummy Men</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditAvatarUrl(DEFAULT_FEMALE_AVATAR);
                        setEditGender('female');
                      }}
                      className={cn(
                        "flex items-center space-x-2 p-1.5 rounded-lg border transition-all cursor-pointer text-left bg-white dark:bg-zinc-950",
                        editAvatarUrl === DEFAULT_FEMALE_AVATAR ? "border-pink-500 bg-pink-50/10 dark:bg-pink-950/20" : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800"
                      )}
                    >
                      <img src={DEFAULT_FEMALE_AVATAR} className="w-8 h-8 rounded-full object-cover border" alt="Female" />
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">Dummy Women</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-extrabold tracking-widest text-zinc-400 block">Quick Emojis / Logo Presets</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white dark:bg-zinc-950 rounded-lg border">
                    {EMOJI_PRESETS.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setEditAvatarUrl(emoji)}
                        className={cn(
                          "w-7 h-7 flex items-center justify-center text-sm rounded bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all border",
                          editAvatarUrl === emoji ? "border-zinc-900 bg-zinc-100 dark:border-white" : "border-transparent"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t mt-4 flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditUserOpen(false)}
              className="rounded-xl h-10 text-xs font-bold uppercase tracking-wider px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              className="bg-zinc-900 hover:bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-xl h-10 text-xs font-bold uppercase tracking-wider px-6 cursor-pointer"
            >
              Save Profile Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MOCK_USERS } from '@/src/mockData';
import { Mail, Briefcase, Tag, Shield, ShieldAlert, CheckCircle2, XCircle, Plus, UserPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserRole, UserProfile, Department, ADMIN_ROLES } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
}

export function TeamView({ users: propUsers, setUsers: propSetUsers }: TeamViewProps = {}) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser && ADMIN_ROLES.includes(currentUser.role);
  
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
  const [editTempTag, setEditTempTag] = useState('');

  const agencyUsers = users.filter(u => u.role !== UserRole.CLIENT);
  const clientUsers = users.filter(u => u.role === UserRole.CLIENT);

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
    setUsers([...users, userToAdd]);
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
    setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
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
              className="px-6 py-3.5 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900 shadow-none data-[state=active]:shadow-md transition-all cursor-pointer"
            >
              Clients
            </TabsTrigger>
          </TabsList>

          {isAdmin && (
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger 
                render={
                  <Button className="bg-zinc-900 text-white rounded-xl h-10 px-6 font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add New User
                  </Button>
                }
              />
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
                        <Badge key={tag} variant="secondary" className="text-[9px] font-semibold flex items-center gap-1 bg-zinc-100 dark:bg-zinc-805 text-zinc-700 dark:text-zinc-300">
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
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-150 gap-4 flex flex-col">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Profile Photo / Logo</Label>
                      {newUser.avatarUrl && (
                        <span className="text-[10px] text-zinc-450 font-bold">Selected: {newUser.avatarUrl.length > 5 ? 'Custom Logo' : newUser.avatarUrl}</span>
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
                    <Avatar className="w-20 h-20 border-2 border-white shadow-sm mb-4">
                      {user.avatarUrl && !user.avatarUrl.startsWith('http') && !user.avatarUrl.startsWith('/') && user.avatarUrl.length <= 4 ? (
                        <AvatarFallback className="text-3xl bg-orange-100 text-orange-655 flex items-center justify-center select-none font-bold">
                          {user.avatarUrl}
                        </AvatarFallback>
                      ) : (
                        <>
                          <AvatarImage src={user.avatarUrl} referrerPolicy="no-referrer" />
                          <AvatarFallback className="text-xl font-bold bg-brand-secondary text-white">
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </>
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
                        <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-805 space-y-3 mt-4">
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

              {/* Tags Section for Editing */}
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Professional Skill Tags</Label>
                <div className="flex flex-wrap gap-1.5 p-2.5 border border-zinc-200 rounded-xl min-h-[44px] bg-white dark:bg-zinc-950">
                  {editingUser.skillTags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[9px] font-semibold flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-350">
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
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:border-zinc-805 text-zinc-500 hover:text-zinc-800 transition-all cursor-pointer z-10"
          title="Edit Teammate Details"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <Avatar className="w-20 h-20 border-2 border-white shadow-sm mb-4">
            {user.avatarUrl && !user.avatarUrl.startsWith('http') && !user.avatarUrl.startsWith('/') && !user.avatarUrl.startsWith('data:') && user.avatarUrl.length <= 4 ? (
              <AvatarFallback className="text-3xl bg-zinc-50 flex items-center justify-center select-none font-bold">
                {user.avatarUrl}
              </AvatarFallback>
            ) : (
              <>
                <AvatarImage src={user.avatarUrl} referrerPolicy="no-referrer" />
                <AvatarFallback className="text-xl font-bold bg-zinc-900 text-white">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </>
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
              user.workLocation === 'Appear Away' ? "bg-zinc-500/5 text-zinc-550 border-zinc-500/20 dark:text-zinc-455" :
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
            <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-tight px-2 py-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-750 dark:text-zinc-300">
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
                <span className="text-[10px] text-zinc-450 font-bold self-center">+{user.skillTags.length - 3}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

export function TeamView() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser && ADMIN_ROLES.includes(currentUser.role);
  
  const [users, setUsers] = useState<UserProfile[]>(MOCK_USERS as UserProfile[]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    role: UserRole.CONTENT_WRITER,
    department: Department.CONTENT,
    designation: '',
    skillTags: []
  });

  const agencyUsers = users.filter(u => u.role !== UserRole.CLIENT);
  const clientUsers = users.filter(u => u.role === UserRole.CLIENT);

  const handleAddUser = () => {
    const userToAdd: UserProfile = {
      ...newUser as UserProfile,
      id: Math.random().toString(36).substr(2, 9),
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
      skillTags: []
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="agency" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-white p-1 rounded-xl shadow-sm border h-auto">
            <TabsTrigger 
              value="agency"
              className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white shadow-none data-[state=active]:shadow-md transition-all"
            >
              Agency Team
            </TabsTrigger>
            <TabsTrigger 
              value="clients"
              className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white shadow-none data-[state=active]:shadow-md transition-all"
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
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold tracking-tight">Add Team Member</DialogTitle>
                  <DialogDescription className="text-zinc-500">
                    Invite a new user to the Blufig workspace.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
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
                        onValueChange={(v) => setNewUser({...newUser, role: v as UserRole})}
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
                </div>
                <DialogFooter className="pt-4 border-t">
                  <Button 
                    type="submit" 
                    className="w-full bg-zinc-900 text-white rounded-xl h-12 font-bold uppercase tracking-widest text-xs"
                    onClick={handleAddUser}
                  >
                    Confirm Addition
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="agency">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {agencyUsers.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="clients">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {clientUsers.map((user) => (
              <Card key={user.id} className="hover:shadow-md transition-shadow border-zinc-100 overflow-hidden">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="w-20 h-20 border-2 border-white shadow-sm mb-4">
                      <AvatarFallback className="text-xl font-bold bg-brand-secondary text-white">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-bold text-lg tracking-tight">{user.name}</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                      {user.designation}
                    </p>
                    
                    <div className="mt-4 flex flex-wrap justify-center gap-1">
                      <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-tight px-2 py-0">
                        External Client
                      </Badge>
                    </div>

                    <div className="w-full mt-6 space-y-3 border-t pt-4">
                      <div className="flex items-center text-xs text-zinc-500">
                        <Mail className="w-3 h-3 mr-2 text-zinc-400" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      
                      {isAdmin && (
                        <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 space-y-3 mt-4">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                 <Shield className={cn("w-3 h-3", user.isActive ? "text-emerald-500" : "text-zinc-300")} />
                                 <Label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Portal Access</Label>
                              </div>
                              <Switch 
                                checked={user.isActive !== false} 
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
    </div>
  );
}

interface UserCardProps {
  user: UserProfile;
  key?: string;
}

function UserCard({ user }: UserCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow border-zinc-100">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <Avatar className="w-20 h-20 border-2 border-white shadow-sm mb-4">
            <AvatarFallback className="text-xl font-bold bg-zinc-900 text-white">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-bold text-lg tracking-tight">{user.name}</h3>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
            {user.designation}
          </p>
          
          <div className="mt-4 flex flex-wrap justify-center gap-1">
            <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-tight px-2 py-0">
              {user.department}
            </Badge>
          </div>

          <div className="w-full mt-6 space-y-3 border-t pt-4">
            <div className="flex items-center text-xs text-zinc-500">
              <Mail className="w-3 h-3 mr-2 text-zinc-400" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center text-xs text-zinc-500">
              <Briefcase className="w-3 h-3 mr-2 text-zinc-400" />
              <span className="truncate text-[10px] uppercase font-bold tracking-tight">{user.role.replace('_', ' ')}</span>
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {user.skillTags.slice(0, 3).map(skill => (
                <div key={skill} className="flex items-center text-[10px] text-zinc-400 font-medium bg-zinc-50 px-2 py-0.5 rounded border border-zinc-100">
                  <Tag className="w-2 h-2 mr-1" />
                  {skill}
                </div>
              ))}
              {user.skillTags.length > 3 && <span className="text-[10px] text-zinc-400 font-bold">+{user.skillTags.length - 3}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


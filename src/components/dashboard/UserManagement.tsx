import React, { useState } from 'react';
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
  Plus
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { UserProfile, UserRole, Department } from '@/src/types';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface UserManagementProps {
  users: UserProfile[];
  onAddUser: (user: UserProfile) => void;
  onRemoveUser: (userId: string) => void;
}

export function UserManagement({ users, onAddUser, onRemoveUser }: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    role: UserRole.DESIGNER,
    department: Department.DESIGN,
    status: 'active'
  });

  const teamMembers = users.filter(u => 
    u.role !== UserRole.CLIENT && 
    (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) return;

    const userToAdd: UserProfile = {
      ...newUser as UserProfile,
      id: Math.random().toString(36).substr(2, 9),
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.name}`,
      designation: newUser.role?.replace('_', ' ') || 'Specialist',
      skillTags: []
    };

    onAddUser(userToAdd);
    setIsAddUserOpen(false);
    setNewUser({
      name: '',
      email: '',
      role: UserRole.DESIGNER,
      department: Department.DESIGN,
      status: 'active'
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
            render={
              <Button className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl px-6 h-11 font-bold text-xs uppercase tracking-widest shadow-lg shadow-zinc-200">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Team Member
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight">Create Expert Profile</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-6">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Organizational Role</Label>
                  <Select 
                    value={newUser.role} 
                    onValueChange={(v) => setNewUser({...newUser, role: v as UserRole})}
                  >
                    <SelectTrigger className="rounded-xl border-zinc-200 h-10">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UserRole).filter(([k]) => k !== 'CLIENT').map(([key, value]) => (
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
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button 
                onClick={handleAddUser}
                className="w-full bg-zinc-900 text-white rounded-xl h-12 font-bold uppercase tracking-widest text-xs"
              >
                Onboard New Expert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-zinc-200 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="bg-white border-b border-zinc-100 py-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input 
                placeholder="Search experts by name or email..." 
                className="pl-9 h-9 text-xs rounded-lg border-zinc-200 bg-zinc-50/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 px-3">
                {teamMembers.length} ACTIVE EXPERTS
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow className="hover:bg-transparent border-zinc-100">
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4 pl-6">Expert</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4">Role & Access</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4">Department</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4">Status</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4 text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((expert) => (
                  <TableRow key={expert.id} className="group hover:bg-zinc-50/30 border-zinc-50 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-9 h-9 border-2 border-white shadow-sm ring-1 ring-zinc-100">
                          <AvatarImage src={expert.avatarUrl} />
                          <AvatarFallback className="bg-zinc-100 text-xs font-bold">{expert.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold tracking-tight text-zinc-900 leading-tight">{expert.name}</p>
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
                      <Badge className={cn(
                        "text-[9px] font-bold uppercase tracking-widest px-2 h-5 rounded-md",
                        expert.status === 'active' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-zinc-100 text-zinc-400 border border-zinc-200"
                      )}>
                        {expert.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() => onRemoveUser(expert.id)}
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
    </div>
  );
}

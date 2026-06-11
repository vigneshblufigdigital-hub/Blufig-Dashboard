import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  FileText, 
  CheckCircle2, 
  MessageSquare, 
  Download, 
  Clock, 
  ExternalLink,
  AlertCircle,
  ThumbsUp,
  RotateCcw,
  BarChart3,
  Search,
  Users,
  ArrowLeft,
  Layers,
  CreditCard,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, Project, Task, ClientReport, ClientInvoice, UserProfile, TaskStatus, ADMIN_ROLES } from '@/src/types';
import { ClientReports } from '../dashboard/ClientReports';
import { ClientInvoices } from '../dashboard/ClientInvoices';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface ClientPortalProps {
  users: UserProfile[];
  tasks: Task[];
  projects: Project[];
  reports: ClientReport[];
  invoices: ClientInvoice[];
  onAddReport: (report: ClientReport) => void;
  onRemoveReport: (id: string) => void;
  onAddInvoice: (invoice: ClientInvoice) => void;
  onRemoveInvoice: (id: string) => void;
}

export function ClientPortal({ 
  users, 
  tasks, 
  projects, 
  reports, 
  invoices, 
  onAddReport, 
  onRemoveReport, 
  onAddInvoice, 
  onRemoveInvoice 
}: ClientPortalProps) {
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = user && ADMIN_ROLES.includes(user.role);
  
  // If user is a client, fix their selected client to themselves
  const effectiveClientId = user?.role === UserRole.CLIENT ? user.id : selectedClientId;
  const selectedClient = users.find(u => u.id === effectiveClientId);

  const clients = users.filter(u => u.role === UserRole.CLIENT && 
    (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const clientProjects = projects.filter(p => p.clientId === effectiveClientId);
  const clientProjectIds = clientProjects.map(p => p.id);
  const clientTasks = tasks.filter(t => clientProjectIds.includes(t.projectId));
  const clientReports = reports.filter(r => clientProjectIds.includes(r.projectId));
  const clientInvoices = invoices.filter(i => clientProjectIds.includes(i.projectId));

  if (isAdmin && !selectedClientId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Client Directory</h2>
            <p className="text-zinc-500 text-sm">Select a client to manage their portal, tasks, and financials.</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input 
            placeholder="Search clients by name or company..." 
            className="pl-10 h-11 rounded-xl border-zinc-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(client => (
            <Card 
              key={client.id} 
              className="border-zinc-200 hover:border-zinc-900 transition-all cursor-pointer group rounded-xl overflow-hidden shadow-sm hover:shadow-md"
              onClick={() => setSelectedClientId(client.id)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-12 h-12 border-2 border-white shadow-sm ring-1 ring-zinc-100">
                    <AvatarImage src={client.avatarUrl} />
                    <AvatarFallback className="bg-zinc-100 text-sm font-bold">{client.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg font-bold tracking-tight">{client.name}</CardTitle>
                    <CardDescription className="text-xs font-medium text-zinc-500">{client.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-zinc-50 rounded-lg">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Projects</p>
                    <p className="text-sm font-bold text-zinc-900 mt-1">
                      {projects.filter(p => p.clientId === client.id && p.status === 'Active').length}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-lg">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pending Tasks</p>
                    <p className="text-sm font-bold text-zinc-900 mt-1">
                      {tasks.filter(t => projects.find(p => p.id === t.projectId && p.clientId === client.id) && t.status !== TaskStatus.DONE).length}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-zinc-50/50 p-4 flex justify-between items-center group-hover:bg-zinc-100 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Access Portal Hub</span>
                <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {isAdmin && (
        <Button 
          variant="ghost" 
          onClick={() => setSelectedClientId(null)} 
          className="rounded-xl px-0 hover:bg-transparent text-zinc-500 hover:text-zinc-900 font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Client Directory
        </Button>
      )}

      {/* Branded Portal Header */}
      <div className="bg-zinc-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-secondary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <Avatar className="w-20 h-20 border-4 border-white/10 shadow-2xl rounded-2xl">
              <AvatarImage src={selectedClient?.avatarUrl} />
              <AvatarFallback className="bg-zinc-800 text-xl font-bold">{selectedClient?.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Badge className="bg-brand-secondary text-white border-none text-[10px] uppercase font-bold tracking-widest px-3">
                {isAdmin ? 'Managing Portal' : 'Client Portal'}
              </Badge>
              <h2 className="text-4xl font-bold tracking-tight">{selectedClient?.name || 'Acme Corp'} Hub</h2>
              <p className="text-zinc-400 font-medium">{selectedClient?.designation || 'Marketing Strategy & Digital Operations Hub'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-3xl font-bold font-mono">
                {clientTasks.length > 0 
                  ? Math.round((clientTasks.filter(t => t.status === TaskStatus.DONE).length / clientTasks.length) * 100) 
                  : 0}%
              </p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Global Completion</p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
              <CheckCircle2 className="w-8 h-8 text-brand-secondary" />
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-white p-1 rounded-xl shadow-sm border h-auto">
            <TabsTrigger 
              value="tasks"
              className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white shadow-none data-[state=active]:shadow-md transition-all"
            >
              <Layers className="w-3.5 h-3.5 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger 
              value="reports"
              className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white shadow-none data-[state=active]:shadow-md transition-all"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger 
              value="billing"
              className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white shadow-none data-[state=active]:shadow-md transition-all"
            >
              <CreditCard className="w-3.5 h-3.5 mr-2" />
              Billing
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-3">
             <div className="flex items-center space-x-2 text-xs font-bold text-zinc-400 px-4 py-2 rounded-full border bg-white">
                <Clock className="w-3 h-3 text-brand-secondary" />
                <span>NDA Protected Session</span>
             </div>
          </div>
        </div>

        <TabsContent value="tasks" className="space-y-6">
          <Card className="border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="bg-white border-b px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight">In-Progress Tasks</CardTitle>
                  <CardDescription className="text-xs font-medium text-zinc-500">Live tracker of all agency assignments for your organization.</CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest px-4 h-7 border-zinc-200 shadow-none">
                  {clientTasks.length} TOTAL ASSIGNMENTS
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow className="border-zinc-100 hover:bg-transparent">
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 pl-8">Task Name</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Project</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Status</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientTasks.map(task => {
                      const project = projects.find(p => p.id === task.projectId);
                      return (
                        <TableRow key={task.id} className="border-zinc-50 group hover:bg-zinc-50/50 transition-colors">
                          <TableCell className="pl-8 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold tracking-tight text-zinc-900 group-hover:text-brand-secondary transition-colors">{task.name}</span>
                              <span className="text-[10px] font-medium text-zinc-400 mt-0.5">{task.type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-xs font-semibold text-zinc-600">
                              <Briefcase className="w-3 h-3 mr-2 opacity-40" />
                              {project?.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "text-[9px] font-bold uppercase tracking-widest px-2 h-5 rounded-md",
                              task.status === TaskStatus.DONE ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                              task.status === TaskStatus.IN_PROGRESS ? "bg-blue-50 text-blue-600 border border-blue-100" :
                              "bg-zinc-100 text-zinc-500 border border-zinc-200"
                            )}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-zinc-500">
                            {new Date(task.dueDate).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {clientTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-40 text-center py-10">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="p-3 bg-zinc-100 rounded-full">
                              <Layers className="w-6 h-6 text-zinc-300" />
                            </div>
                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No active assignments</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <ClientReports 
            reports={clientReports}
            projects={clientProjects}
            onAddReport={onAddReport}
            onRemoveReport={onRemoveReport}
          />
        </TabsContent>

        <TabsContent value="billing">
          <ClientInvoices 
            invoices={clientInvoices}
            projects={clientProjects}
            onAddInvoice={onAddInvoice}
            onRemoveInvoice={onRemoveInvoice}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}


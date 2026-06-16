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
  LifeBuoy,
  AlertCircle,
  ThumbsUp,
  RotateCcw,
  BarChart3,
  Search,
  Users,
  ArrowLeft,
  Layers,
  CreditCard,
  Briefcase,
  Play,
  Mail,
  UserCheck,
  TrendingUp,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '@/components/ui/input';
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
  elapsedTimes: Record<string, number>;
  formatTime: (seconds: number) => string;
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
  onRemoveInvoice,
  elapsedTimes,
  formatTime
}: ClientPortalProps) {
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'ongoing' | 'completed'>('all');

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

  // Compute the dedicated Campaign Support & Delivery Team
  const ceo = users.find(u => u.role === UserRole.AGENCY_ADMIN);
  const activeAMIds = clientProjects.map(p => p.accountManagerId).filter(Boolean);
  const campaignManagers = users.filter(u => activeAMIds.includes(u.id));
  const taskAssigneeIds = clientTasks.map(t => t.assigneeId).filter(Boolean);
  const workingSpecialists = users.filter(u => 
    taskAssigneeIds.includes(u.id) && 
    (!ceo || u.id !== ceo.id) && 
    !activeAMIds.includes(u.id)
  );

  // Timesheet computations for client tasks
  const clientTimesheetLogs = clientTasks.map(t => {
    const proj = clientProjects.find(p => p.id === t.projectId);
    const rawSeconds = elapsedTimes[t.id] ?? t.timeLoggedSeconds ?? (t.timeLogged ? Math.round(t.timeLogged * 3600) : 0);
    return {
      id: t.id,
      taskName: t.name,
      projectName: proj?.name || 'Assigned Project',
      expert: t.assigneeId ? users.find(u => u.id === t.assigneeId) : null,
      seconds: rawSeconds,
      billing: t.type === 'Strategy' || t.type === 'Production' ? 'Billable' : 'Non-Billable',
      status: t.status,
      dueDate: t.dueDate
    };
  });

  const totalTimeSeconds = clientTimesheetLogs.reduce((sum, item) => sum + item.seconds, 0);
  const totalHoursNumeric = parseFloat((totalTimeSeconds / 3600).toFixed(2));
  const totalBillableSeconds = clientTimesheetLogs
    .filter(t => t.billing === 'Billable')
    .reduce((sum, item) => sum + item.seconds, 0);
  const billableRatio = totalTimeSeconds > 0 ? Math.round((totalBillableSeconds / totalTimeSeconds) * 100) : 100;

  const ongoingWorksCount = clientTasks.filter(t => t.status !== TaskStatus.DONE).length;
  const completedWorksCount = clientTasks.filter(t => t.status === TaskStatus.DONE).length;

  const totalOutstandingBilling = clientInvoices
    .filter(inv => inv.status === 'Pending')
    .reduce((sum, inv) => sum + inv.amount, 0);

  // If Admin selected Client Directory view (meaning first step)
  if (isAdmin && !selectedClientId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Client Hub Directory</h2>
            <p className="text-zinc-500 text-sm">Select a Client Partner below to inspect, upload billing, or audit their live workspace.</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input 
            placeholder="Search clients by name, email or stakeholder company..." 
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
                    {client.avatarUrl && !client.avatarUrl.startsWith('http') && !client.avatarUrl.startsWith('/') && client.avatarUrl.length <= 4 ? (
                      <AvatarFallback className="bg-orange-100 text-orange-655 text-lg font-bold flex items-center justify-center select-none">
                        {client.avatarUrl}
                      </AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage src={client.avatarUrl} referrerPolicy="no-referrer" />
                        <AvatarFallback className="bg-orange-500 text-white text-sm font-bold">{client.name.charAt(0)}</AvatarFallback>
                      </>
                    )}
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
                    <p className="text-[10px] font-bold text-zinc-400 p-0 uppercase tracking-widest">Active Channels</p>
                    <p className="text-sm font-bold text-zinc-900 mt-1">
                      {projects.filter(p => p.clientId === client.id && p.status === 'Active').length} Projects
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-lg">
                    <p className="text-[10px] font-bold text-zinc-400 p-0 uppercase tracking-widest">Active Works</p>
                    <p className="text-sm font-bold text-zinc-900 mt-1">
                      {tasks.filter(t => projects.find(p => p.id === t.projectId && p.clientId === client.id) && t.status !== TaskStatus.DONE).length} Tasks
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-zinc-50/50 p-4 flex justify-between items-center group-hover:bg-zinc-100 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Impersonate Client Portal</span>
                <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Support tasks tab filters
  const filteredClientTasks = clientTasks.filter(t => {
    if (taskFilter === 'ongoing') return t.status !== TaskStatus.DONE;
    if (taskFilter === 'completed') return t.status === TaskStatus.DONE;
    return true;
  });

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
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-secondary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <Avatar className="w-20 h-20 border-4 border-white/10 shadow-2xl rounded-2xl">
              {selectedClient?.avatarUrl && !selectedClient.avatarUrl.startsWith('http') && !selectedClient.avatarUrl.startsWith('/') && selectedClient.avatarUrl.length <= 4 ? (
                <AvatarFallback className="bg-orange-100 text-orange-655 text-3xl font-bold flex items-center justify-center select-none">
                  {selectedClient.avatarUrl}
                </AvatarFallback>
              ) : (
                <>
                  <AvatarImage src={selectedClient?.avatarUrl} referrerPolicy="no-referrer" />
                  <AvatarFallback className="bg-orange-500 text-white text-xl font-bold">{selectedClient?.name.charAt(0)}</AvatarFallback>
                </>
              )}
            </Avatar>
            <div className="space-y-2">
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none text-[10px] uppercase font-bold tracking-widest px-3">
                {isAdmin ? 'ADMIN VIEW: CLIENT DISPATCH' : 'CLIENT HUB DASHBOARD'}
              </Badge>
              <h2 className="text-4xl font-bold tracking-tight">{selectedClient?.name || 'Acme Corp'} Hub</h2>
              <p className="text-zinc-400 font-semibold">{selectedClient?.designation || 'Strategic Marketing Partner'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-3xl font-bold font-mono">
                {clientTasks.length > 0 
                  ? Math.round((clientTasks.filter(t => t.status === TaskStatus.DONE).length / clientTasks.length) * 100) 
                  : 0}%
              </p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Global Progress</p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
              <CheckCircle2 className="w-8 h-8 text-brand-secondary" />
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="w-full sm:w-auto overflow-x-auto max-w-full pb-1.5 -mb-1.5 custom-scrollbar-none">
            <TabsList className="bg-white dark:bg-zinc-900 p-1 rounded-xl shadow-sm border h-auto flex flex-nowrap whitespace-nowrap min-w-max gap-1">
              <TabsTrigger 
                value="overview"
                className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white shadow-none data-[state=active]:shadow-md transition-all shrink-0 flex items-center"
              >
                <BarChart3 className="w-3.5 h-3.5 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="tasks"
                className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white shadow-none data-[state=active]:shadow-md transition-all shrink-0 flex items-center"
              >
                <Layers className="w-3.5 h-3.5 mr-2" />
                Active Works ({ongoingWorksCount})
              </TabsTrigger>
              <TabsTrigger 
                value="timesheets"
                className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white shadow-none data-[state=active]:shadow-md transition-all shrink-0 flex items-center"
              >
                <Clock className="w-3.5 h-3.5 mr-2" />
                Timesheets
              </TabsTrigger>
              <TabsTrigger 
                value="reports"
                className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white shadow-none data-[state=active]:shadow-md transition-all shrink-0 flex items-center"
              >
                <FileText className="w-3.5 h-3.5 mr-2" />
                Reports ({clientReports.length})
              </TabsTrigger>
              <TabsTrigger 
                value="billing"
                className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-zinc-900 data-[state=active]:text-white shadow-none data-[state=active]:shadow-md transition-all shrink-0 flex items-center"
              >
                <CreditCard className="w-3.5 h-3.5 mr-2" />
                Invoices ({clientInvoices.length})
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-500 bg-white dark:bg-zinc-900 px-4 py-2 rounded-full border shadow-sm self-start sm:self-center shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Secure NDA Vault Access</span>
          </div>
        </div>

        {/* 1. OVERVIEW HUB */}
        <TabsContent value="overview" className="space-y-6">
          
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-zinc-900 border rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="p-2.5 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl">
                  <Clock className="w-5 h-5" />
                </span>
                <Badge variant="secondary" className="font-mono text-[9px] uppercase font-bold tracking-wider">Live Time</Badge>
              </div>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-4">TIME INVESTED BY AGENCY</p>
              <p className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
                {totalHoursNumeric.toFixed(1)}h
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 border rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="p-2.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </span>
                <Badge variant="secondary" className="font-mono text-[9px] uppercase font-bold tracking-wider">{billableRatio}% Ratio</Badge>
              </div>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-4">BILLING CLASSIFICATION</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
                {billableRatio}% Billable
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 border rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="p-2.5 bg-blue-100 dark:bg-blue-50/10 text-blue-650 dark:text-blue-400 rounded-xl">
                  <Layers className="w-5 h-5" />
                </span>
                <Badge variant="secondary" className="font-mono text-[9px] uppercase font-bold tracking-wider">{completedWorksCount} Completed</Badge>
              </div>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-4">WORKS IN ACTION</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
                {ongoingWorksCount} Ongoing <span className="text-xs text-zinc-400 font-medium font-sans">/ {clientTasks.length} Tot</span>
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 border rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="p-2.5 bg-teal-100 dark:bg-teal-500/10 text-teal-650 dark:text-teal-400 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </span>
                <Badge variant={totalOutstandingBilling > 0 ? "destructive" : "secondary"} className="font-mono text-[9px] uppercase font-bold tracking-wider">
                  {totalOutstandingBilling > 0 ? 'Due' : 'Paid'}
                </Badge>
              </div>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-4">OUTSTANDING INVOICES Balance</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
                ${totalOutstandingBilling.toLocaleString()} <span className="text-xs text-zinc-400 font-medium">USD</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Content Column - Projects & Campaign Channels */}
            <div className="lg:col-span-8 space-y-6">
              
              <Card className="border-zinc-200/60 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-zinc-50/60">
                  <CardTitle className="text-lg font-extrabold tracking-tight">Active Deliverables Campaigns</CardTitle>
                  <CardDescription className="text-xs">Your connected organization projects under current execution at BluFig.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {clientProjects.map((project) => {
                    const projectTasks = clientTasks.filter(t => t.projectId === project.id);
                    const completedProjectTasks = projectTasks.filter(t => t.status === TaskStatus.DONE);
                    const completePercent = projectTasks.length > 0 ? Math.round((completedProjectTasks.length / projectTasks.length) * 100) : 0;
                    
                    // Fine Account Manager Assigned
                    const am = users.find(u => u.id === project.accountManagerId);

                    return (
                      <div key={project.id} className="p-5 rounded-2xl border border-zinc-150 bg-white/50 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                          <div>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">PROJECT CHANNEL</span>
                            <h4 className="text-lg font-bold tracking-tight text-zinc-900 mt-0.5">{project.name}</h4>
                          </div>
                          <div className="flex items-center gap-1.5 self-start sm:self-center">
                            <Badge variant="outline" className="text-[9px] uppercase font-bold">{project.type}</Badge>
                            <Badge className="bg-emerald-500 text-white text-[9px] font-bold uppercase">Active</Badge>
                          </div>
                        </div>

                        {/* Project completion status */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-500">Milestone Progress ({completedProjectTasks.length}/{projectTasks.length} Done)</span>
                            <span className="text-zinc-900">{completePercent}%</span>
                          </div>
                          <Progress value={completePercent} className="h-2 rounded-full" />
                        </div>

                        {/* High-touch Account Manager info */}
                        {am && (
                          <div className="flex items-center justify-between pt-3 bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-9 h-9 border border-zinc-200 shadow-sm rounded-lg">
                                <AvatarImage src={am.avatarUrl} />
                                <AvatarFallback className="bg-zinc-800 text-white text-xs font-bold">{am.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">PROJECT LEAD ACCOUNT MANAGER</p>
                                <p className="text-xs font-bold text-zinc-900">{am.name}</p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                window.location.href = `mailto:${am.email}`;
                              }}
                              className="h-8 text-xs font-bold font-mono text-zinc-650 hover:text-zinc-900"
                            >
                              <Mail className="w-3.5 h-3.5 mr-2" />
                              Contact AM
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {clientProjects.length === 0 && (
                    <div className="text-center py-8">
                      <Briefcase className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No projects initialized yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Works Ongoing Area */}
              <Card className="border-zinc-200/60 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-extrabold tracking-tight">Works Ongoing & High-Priority Sprints</CardTitle>
                  <CardDescription className="text-xs">
                    Current active assignments currently routed through the production queue.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-zinc-55/40">
                        <TableRow className="border-b">
                          <TableHead className="text-[9px] font-bold uppercase tracking-widest pl-6">Active Task</TableHead>
                          <TableHead className="text-[9px] font-bold uppercase tracking-widest">Assignee / Expert</TableHead>
                          <TableHead className="text-[9px] font-bold uppercase tracking-widest">Status / Stage</TableHead>
                          <TableHead className="text-[9px] font-bold uppercase tracking-widest pr-6">Target Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientTasks.filter(t => t.status !== TaskStatus.DONE).slice(0, 5).map(task => {
                          const expert = users.find(u => u.id === task.assigneeId);
                          return (
                            <TableRow key={task.id} className="hover:bg-zinc-50/50">
                              <TableCell className="pl-6 font-bold text-xs tracking-tight text-zinc-900 py-3.5">
                                <div>
                                  <p>{task.name}</p>
                                  <span className="text-[9px] font-bold uppercase text-zinc-400">{task.type}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3.5">
                                <div className="flex items-center space-x-2">
                                  <Avatar className="w-6 h-6 rounded-md">
                                    <AvatarImage src={expert?.avatarUrl} />
                                    <AvatarFallback className="text-[10px] bg-zinc-100 flex items-center justify-center font-bold">
                                      {expert?.name ? expert.name.split(' ').map(n=>n[0]).join('') : '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-medium text-zinc-750">{expert?.name || 'Assigned Agent'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3.5">
                                <Badge className={cn(
                                  "text-[8px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5",
                                  task.status === TaskStatus.IN_PROGRESS ? "bg-blue-500 text-white" :
                                  task.status === TaskStatus.REVIEW ? "bg-purple-500 text-white" : "bg-zinc-100 text-zinc-550"
                                )}>
                                  {task.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs font-mono text-zinc-500 pr-6 py-3.5">
                                {new Date(task.dueDate).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {clientTasks.filter(t => t.status !== TaskStatus.DONE).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6">
                              <ThumbsUp className="w-6 h-6 text-emerald-500 mx-auto mb-1 animate-bounce" />
                              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Zero pending assignments! Everything delivered.</p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right Side Column - Live Reports and Contacts */}
            <div className="lg:col-span-4 space-y-6">

              {/* Branded Support Desk Card */}
              <Card className="border border-zinc-200/60 dark:border-zinc-800/80 shadow-lg rounded-2xl overflow-hidden bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md">
                <CardHeader className="bg-zinc-50/60 dark:bg-zinc-950/40 pb-4 border-b border-zinc-100 dark:border-zinc-850">
                  <div className="flex items-center space-x-2">
                    <LifeBuoy className="w-5 h-5 text-brand-secondary animate-pulse" />
                    <div>
                      <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">BluFig Support Desk</CardTitle>
                      <CardDescription className="text-[10px] mt-0.5 font-semibold text-zinc-550 dark:text-zinc-400">Need assistance? Your dedicated BluFig support squad is standing by.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    Submit your tickets and inquiry briefings directly to our support desk. We deliver change-rolls, updates, and live assistance globally.
                  </p>

                  <Button 
                    className="w-full bg-brand-secondary hover:bg-brand-secondary/95 text-white font-extrabold text-xs uppercase tracking-wider h-10 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-brand-secondary/5"
                    onClick={() => {
                      window.location.href = "mailto:connect@blufig.digital?cc=pintu@blufig.digital,vignesh@blufig.digital,ankit@blufig.digital&subject=Support%20Desk%20Inquiry%20-%20BluFig%20Operations";
                    }}
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    Contact Support Desk
                  </Button>

                  <div className="flex flex-col gap-2 pt-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest leading-none">
                    <div className="flex items-center justify-between">
                      <span>Primary Email Desk:</span>
                      <span className="font-mono text-zinc-650 dark:text-zinc-300 select-all font-extrabold text-[11px] lowercase">connect@blufig.digital</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>CC Addresses:</span>
                      <span className="font-mono text-zinc-500 select-all font-extrabold text-[9px] lowercase">pintu, vignesh, ankit</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-200/60 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-zinc-50/60">
                  <CardTitle className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">Project Files & Reports</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {clientReports.slice(0, 3).map((rep) => (
                    <div key={rep.id} className="p-3.5 rounded-xl border border-dashed border-zinc-200 hover:border-zinc-800 transition-colors flex items-center justify-between gap-2 bg-white">
                      <div className="flex items-center space-x-3 min-w-0">
                        <FileText className="w-7 h-7 text-orange-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 truncate leading-none mb-1">{rep.title}</p>
                          <span className="text-[9px] font-bold uppercase text-zinc-400 block tracking-widest">
                            PUBLISHED REPORT • {new Date(rep.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-zinc-500 hover:text-zinc-900 shrink-0"
                        title="Download Campaign Document"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {clientReports.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No reports posted yet</p>
                      <p className="text-[10px] text-zinc-400/80 mt-1">Our agency managers will upload campaign reviews shortly.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-zinc-200/60 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-zinc-50/60">
                  <CardTitle className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">Recent Invoices</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {clientInvoices.slice(0, 2).map((inv) => (
                    <div key={inv.id} className="p-3 rounded-xl border border-zinc-150 flex items-center justify-between gap-3 bg-white">
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{inv.invoiceNumber}</p>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mt-0.5">
                          Amount: ${inv.amount.toLocaleString()} USD
                        </span>
                      </div>
                      <Badge className={cn(
                        "text-[8px] font-black uppercase tracking-wider rounded h-5 px-1.5",
                        inv.status === 'Paid' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                      )}>
                        {inv.status}
                      </Badge>
                    </div>
                  ))}
                  {clientInvoices.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No invoices logged</p>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

          </div>
        </TabsContent>

        {/* 2. TASKS WORKSPACE */}
        <TabsContent value="tasks" className="space-y-6">
          <Card className="border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="bg-white border-b px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">Scoped Production Deliverables</CardTitle>
                <CardDescription className="text-xs font-medium text-zinc-500">Live tracker of all agency assignments assigned to your business.</CardDescription>
              </div>

              <div className="flex items-center space-x-2">
                <Button 
                  variant={taskFilter === 'all' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setTaskFilter('all')}
                  className="text-xs h-8 font-bold px-3 rounded-lg"
                >
                  All ({clientTasks.length})
                </Button>
                <Button 
                  variant={taskFilter === 'ongoing' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setTaskFilter('ongoing')}
                  className="text-xs h-8 font-bold px-3 rounded-lg"
                >
                  Ongoing ({ongoingWorksCount})
                </Button>
                <Button 
                  variant={taskFilter === 'completed' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setTaskFilter('completed')}
                  className="text-xs h-8 font-bold px-3 rounded-lg"
                >
                  Completed ({completedWorksCount})
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow className="border-zinc-100 hover:bg-transparent">
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 pl-8">Deliverable / Task Name</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Project Channel</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Assigned Expert</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Status / Stage</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 pr-8">Target Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClientTasks.map(task => {
                      const project = projects.find(p => p.id === task.projectId);
                      const expert = users.find(u => u.id === task.assigneeId);
                      return (
                        <TableRow key={task.id} className="border-zinc-50 group hover:bg-zinc-50/50 transition-colors">
                          <TableCell className="pl-8 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold tracking-tight text-zinc-900 group-hover:text-brand-secondary transition-colors">{task.name}</span>
                              <span className="text-[10px] font-medium text-zinc-450 uppercase mt-0.5">{task.type} • Priority: {task.priority}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-xs font-semibold text-zinc-650">
                              <Briefcase className="w-3.5 h-3.5 mr-2 opacity-50" />
                              {project?.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={expert?.avatarUrl} />
                                <AvatarFallback className="text-[9px] bg-zinc-150 flex items-center justify-center font-bold">
                                  {expert?.name ? expert.name.split(' ').map(n=>n[0]).join('') : '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-semibold text-zinc-700">{expert?.name || 'Digital Strategist'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "text-[9px] font-bold uppercase tracking-widest px-2.5 h-5 rounded-md",
                              task.status === TaskStatus.DONE ? "bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-none" :
                              task.status === TaskStatus.IN_PROGRESS ? "bg-blue-50 text-blue-600 border border-blue-100 shadow-none" :
                              "bg-zinc-100 text-zinc-500 border border-zinc-200 shadow-none"
                            )}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono font-semibold text-zinc-550 pr-8">
                            {new Date(task.dueDate).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredClientTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center py-10">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Layers className="w-6 h-6 text-zinc-300" />
                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No active deliverables found for this filter</p>
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

        {/* 3. TIMESHEETS WORKSPACE */}
        <TabsContent value="timesheets" className="space-y-6">
          <Card className="border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="bg-white border-b px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">Direct Project Hour Timesheets</CardTitle>
                <CardDescription className="text-xs font-medium text-zinc-500">
                  Transparent, direct overview of which task was tracked, who worked, and exactly resource time invested.
                </CardDescription>
              </div>
              
              <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-500 border bg-white dark:bg-zinc-900 px-4 py-2 h-9 rounded-xl">
                <FileSpreadsheet className="w-4 h-4 mr-1 text-emerald-555" />
                <span>Hour Sync Status: Live</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow className="border-zinc-100 hover:bg-transparent">
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 pl-8">Tracked Deliverable</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Campaign Project</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Logged Expert</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Invested Time</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 pr-8">Billing Class</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientTimesheetLogs.map((item) => {
                      const isRunningNow = elapsedTimes[item.id] > 0 && item.status === TaskStatus.IN_PROGRESS;
                      return (
                        <TableRow key={item.id} className={cn(
                          "border-zinc-50 hover:bg-zinc-50/50 transition-colors",
                          isRunningNow ? "bg-orange-50/10 hover:bg-orange-50/20" : ""
                        )}>
                          <TableCell className="pl-8 py-4 font-bold text-xs">
                            <div className="flex items-center space-x-2">
                              {isRunningNow && (
                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping shrink-0" title="Live tracking in action!" />
                              )}
                              <div>
                                <p className="text-sm font-bold tracking-tight text-zinc-900">{item.taskName}</p>
                                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide">TASK ID: #{item.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-zinc-500">
                            {item.projectName}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={item.expert?.avatarUrl} />
                                <AvatarFallback className="text-[9px] bg-zinc-150 flex items-center justify-center font-bold">
                                  {item.expert?.name ? item.expert.name.split(' ').map(n=>n[0]).join('') : '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-semibold text-zinc-700">{item.expert?.name || 'Operations Lead'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn(
                              "font-mono text-xs border-none px-2.5 py-0.5 tabular-nums rounded-md font-bold",
                              isRunningNow 
                                ? "bg-orange-500 text-white animate-pulse" 
                                : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300"
                            )}>
                              {formatTime(item.seconds)}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-8">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-wider",
                              item.billing === 'Billable' ? "text-emerald-500" : "text-amber-500"
                            )}>
                              {item.billing}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {clientTimesheetLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center py-10">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Clock className="w-6 h-6 text-zinc-350" />
                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No logged hours recorded yet</p>
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

        {/* 4. REPORTS WORKSPACE */}
        <TabsContent value="reports">
          <ClientReports 
            reports={clientReports}
            projects={clientProjects}
            onAddReport={onAddReport}
            onRemoveReport={onRemoveReport}
          />
        </TabsContent>

        {/* 5. INVOICES / BILLING WORKSPACE */}
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

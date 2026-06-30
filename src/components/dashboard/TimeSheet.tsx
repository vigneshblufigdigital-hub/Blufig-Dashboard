import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Clock, Calendar, ArrowUpRight, BarChart3, MoreHorizontal, Play, Pause, Square, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Task, Project, UserRole, UserProfile } from '@/src/types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface TimeSheetProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  projects: Project[];
  activeTimerTaskId: string | null;
  elapsedTimes: Record<string, number>;
  toggleTimer: (taskId: string, e?: React.MouseEvent) => void;
  formatTime: (seconds: number) => string;
}

export function TimeSheet({
  tasks,
  setTasks,
  projects,
  activeTimerTaskId,
  elapsedTimes,
  toggleTimer,
  formatTime,
}: TimeSheetProps) {
  const { user: currentUser } = useAuth();
  
  // Find current running task
  const activeTask = tasks.find(t => t.id === activeTimerTaskId);
  const activeProject = activeTask ? projects.find(p => p.id === activeTask.projectId) : null;

  // Track manual billing overrides for static logs that aren't backed by tasks
  const [staticBillingOverrides, setStaticBillingOverrides] = React.useState<Record<string, 'Billable' | 'Non-Billable'>>({});

  const getFirstDayOfMonth = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const getTodayDate = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);
  const [startDate, setStartDate] = React.useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = React.useState(getTodayDate());

  // Auth privilege check for deciding billable status (Super Admins, Account Managers, Account Directors)
  const canModifyBilling = currentUser && (
    currentUser.role === UserRole.AGENCY_ADMIN || 
    currentUser.role === UserRole.ACCOUNT_MANAGER || 
    currentUser.role === UserRole.ACCOUNT_DIRECTOR
  );

  // Build current activity logs using real task logged values combined with historical logs
  const realLogs = tasks
    .filter(t => ((elapsedTimes && elapsedTimes[t.id]) || 0) > 0)
    .map(t => {
      const proj = projects.find(p => p.id === t.projectId);
      const isRunning = t.id === activeTimerTaskId;
      const isTaskBillable = t.isBillable !== undefined ? t.isBillable : (t.type === 'Strategy' || t.type === 'Production');
      return {
        id: t.id,
        task: t.name,
        project: proj?.name || 'Global Project',
        user: 'You',
        date: t.updatedAt ? t.updatedAt.split('T')[0] : '2026-06-16',
        durationSecs: (elapsedTimes && elapsedTimes[t.id]) || 0,
        billing: isTaskBillable ? 'Billable' : 'Non-Billable' as 'Billable' | 'Non-Billable',
        isRunning,
        isReal: true
      };
    });

  // Calculate dynamic metrics based on live updates
  const totalRealSeconds = Object.values(elapsedTimes || {}).reduce((sum, current) => sum + current, 0);
  const totalBaseHours = 124.5;
  const liveTotalHours = (totalBaseHours + (totalRealSeconds / 3600)).toFixed(1);

  // Fallback default static logs if no tasks are manually logged yet
  const staticLogs = [
    { id: 'static-1', task: 'Monthly SEO Audit', project: 'Acme Corp Retainer', user: 'Rashmi Alurkar', date: '2026-06-15', durationSecs: 9000, billing: 'Billable' as 'Billable' | 'Non-Billable', isRunning: false },
    { id: 'static-2', task: 'Google Ads Optimization', project: 'Paid Social Campaigns', user: 'Ajay Kulkarni', date: '2026-06-14', durationSecs: 4320, billing: 'Billable' as 'Billable' | 'Non-Billable', isRunning: false },
    { id: 'static-3', task: 'Internal Strategy Sync', project: 'Strategy & Ops', user: 'Nishi Kant', date: '2026-06-12', durationSecs: 2880, billing: 'Non-Billable' as 'Billable' | 'Non-Billable', isRunning: false },
  ];

  // Combine and apply overrides
  const displayedLogs = [
    ...realLogs,
    ...staticLogs.filter(s => !realLogs.some(r => r.task === s.task))
  ].map(log => {
    if (staticBillingOverrides[log.id]) {
      return { ...log, billing: staticBillingOverrides[log.id] };
    }
    return log;
  });

  // Handler to toggle billing
  const handleToggleBilling = (logId: string, currentBilling: 'Billable' | 'Non-Billable') => {
    if (!canModifyBilling) {
      toast.error("Only Super Admins and Account Managers can decide billing status!");
      return;
    }

    const nextBilling = currentBilling === 'Billable' ? 'Non-Billable' : 'Billable';

    // If it's a real task log, update the task state globally, otherwise write to local static overrides
    const realTaskExists = tasks.some(t => t.id === logId);
    if (realTaskExists) {
      setTasks(prev => prev.map(t => {
        if (t.id === logId) {
          return { ...t, isBillable: nextBilling === 'Billable' };
        }
        return t;
      }));
    } else {
      setStaticBillingOverrides(prev => ({ ...prev, [logId]: nextBilling }));
    }

    toast.success(`Billing status of "${displayedLogs.find(l => l.id === logId)?.task}" changed to ${nextBilling}!`);
  };

  // Monthly timesheet CSV downloader
  const handleExportCSV = (from?: string, to?: string) => {
    const filterFrom = from || startDate;
    const filterTo = to || endDate;

    const filteredLogs = displayedLogs.filter(log => {
      if (!log.date) return true;
      return log.date >= filterFrom && log.date <= filterTo;
    });

    if (filteredLogs.length === 0) {
      toast.error(`No timesheet logs found between ${filterFrom} and ${filterTo}.`);
      return;
    }

    const headers = ['Task / Activity', 'Project', 'Expert / User', 'Date', 'Duration (Formatted)', 'Duration (Seconds)', 'Billing Type'];
    
    const rows = filteredLogs.map(log => [
      `"${log.task.replace(/"/g, '""')}"`,
      `"${log.project.replace(/"/g, '""')}"`,
      `"${log.user.replace(/"/g, '""')}"`,
      `"${log.date}"`,
      typeof log.durationSecs === 'number' ? formatTime(log.durationSecs) : log.durationSecs,
      log.durationSecs,
      log.billing
    ]);
    
    const totalDurationSecs = filteredLogs.reduce((sum, log) => sum + (typeof log.durationSecs === 'number' ? log.durationSecs : 0), 0);
    const totalRow = [
      '"Total Timing Summary (Filtered)"',
      '""',
      '""',
      '""',
      formatTime(totalDurationSecs),
      totalDurationSecs,
      '""'
    ];
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(',')),
      totalRow.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `blufig_timesheet_export_${filterFrom}_to_${filterTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Timesheet from ${filterFrom} to ${filterTo} exported successfully!`);
    setIsExportDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Active Live Timer Header Board */}
      <Card className={cn(
        "border-none shadow-xl overflow-hidden transition-all duration-500",
        activeTimerTaskId ? "bg-zinc-950 text-white ring-1 ring-zinc-800" : "bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/40 dark:to-zinc-950/20 border border-zinc-200/50 dark:border-zinc-800"
      )}>
        <CardContent className="p-6">
          {activeTimerTaskId && activeTask ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              {/* Left Column: Active Duty Details */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-brand-secondary ring-4 ring-orange-500/10 shrink-0">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-secondary">
                    LIVE TRACKER RUNNING
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <h3 className="text-base font-bold tracking-tight truncate max-w-[240px]">{activeTask.name}</h3>
                    <Badge variant="outline" className="text-[9px] border-zinc-850 bg-zinc-900/60 text-zinc-400 capitalize">
                      {activeProject?.name || 'Assigned Project'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Right Column: Timer & Controls */}
              <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 border-t sm:border-t-0 border-zinc-900 pt-4 sm:pt-0">
                <div className="text-left sm:text-right">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Live Spent</span>
                  <span className="font-mono text-3xl font-extrabold tracking-tighter text-white tabular-nums">
                    {formatTime(elapsedTimes[activeTask.id] || 0)}
                  </span>
                </div>

                <div className="flex items-center space-x-2.5">
                  <Button 
                    onClick={(e) => toggleTimer(activeTask.id, e)} 
                    size="icon" 
                    className="w-11 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="w-11 h-11 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-900"
                    onClick={(e) => {
                      toggleTimer(activeTask.id, e);
                    }}
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-250/20 shrink-0">
                  <Clock className="w-5 h-5 text-zinc-400 dark:text-zinc-650" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">No active timer running</p>
                  <p className="text-[10px] text-zinc-400 font-medium">Start the timer for any task of your choice directly in the Tasks workspace.</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  // Prompt user or guide
                }}
                className="text-[10px] font-black uppercase tracking-widest border-zinc-250 dark:border-zinc-800"
              >
                Timer Standby
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Logged" value={`${liveTotalHours}h`} trend="+12%" icon={Clock} />
        <StatCard title="Billable Ratio" value="88%" trend="+2%" icon={ArrowUpRight} />
        <StatCard title="Avg Daily" value="6.2h" trend="-0.5%" icon={Calendar} />
        <StatCard title="Productivity" value="94%" trend="+4%" icon={BarChart3} />
      </div>

      <Card className="border-zinc-100 dark:border-zinc-900 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
           <div>
             <CardTitle className="text-xl font-bold tracking-tight">Recent Activity Log</CardTitle>
             <p className="text-xs text-zinc-400 font-medium mt-1">Cross-department time synchronization</p>
           </div>
           <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
             <DialogTrigger
               render={
                 <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest gap-1.5 flex items-center">
                   <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-500" />
                   Export Timesheet
                 </Button>
               }
             />
             <DialogContent className="sm:max-w-[400px]">
               <DialogHeader>
                 <DialogTitle className="text-lg font-bold tracking-tight">Export Timesheet Data</DialogTitle>
                 <p className="text-xs text-zinc-400 mt-1">Select the date range for your CSV timesheet report.</p>
               </DialogHeader>
               <div className="grid gap-4 py-4">
                 <div className="grid gap-2">
                   <Label htmlFor="from-date" className="text-xs font-bold uppercase tracking-widest text-zinc-400">From Date</Label>
                   <Input 
                     id="from-date" 
                     type="date" 
                     value={startDate}
                     onChange={(e) => setStartDate(e.target.value)}
                   />
                 </div>
                 <div className="grid gap-2">
                   <Label htmlFor="to-date" className="text-xs font-bold uppercase tracking-widest text-zinc-400">To Date</Label>
                   <Input 
                     id="to-date" 
                     type="date" 
                     value={endDate}
                     onChange={(e) => setEndDate(e.target.value)}
                   />
                 </div>
               </div>
               <DialogFooter className="gap-2 sm:gap-0">
                 <Button 
                   variant="outline" 
                   onClick={() => setIsExportDialogOpen(false)}
                   className="h-10 text-xs font-bold uppercase tracking-widest"
                 >
                   Cancel
                 </Button>
                 <Button 
                   onClick={() => handleExportCSV()}
                   className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 rounded-lg font-bold uppercase tracking-widest text-xs"
                 >
                   Export CSV
                 </Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/20">
                <TableRow>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest pl-6">Task / Category</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest">Expert</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest">Date</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest">Duration</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest">Billing</TableHead>
                  <TableHead className="w-[80px] pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedLogs.map((log) => (
                  <TableRow key={log.id} className={cn(
                    "group transition-colors",
                    log.isRunning ? "bg-orange-50/10 hover:bg-orange-50/20" : "hover:bg-zinc-50/80 dark:hover:bg-zinc-950/20"
                  )}>
                    <TableCell className="pl-6">
                      <div className="flex items-center space-x-2">
                        {log.isRunning && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
                        )}
                        <div>
                          <p className="font-bold text-sm tracking-tight">{log.task}</p>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{log.project}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{log.user}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-zinc-500">{log.date}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(
                        "font-mono text-xs border-none px-2 h-5 tabular-nums",
                        log.isRunning 
                          ? "bg-orange-500 text-white" 
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-300"
                      )}>
                        {typeof log.durationSecs === 'number' ? formatTime(log.durationSecs) : log.durationSecs}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canModifyBilling ? (
                        <button
                          onClick={() => handleToggleBilling(log.id, log.billing)}
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700",
                            log.billing === 'Billable' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                          )}
                          title="Click to toggle (Super Admins & AM Only)"
                        >
                          <span className={cn("w-1 h-1 rounded-full", log.billing === 'Billable' ? "bg-emerald-500" : "bg-amber-500")} />
                          {log.billing}
                          <span className="text-[8.5px] opacity-75">▼</span>
                        </button>
                      ) : (
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 px-2 py-0.5 border border-transparent",
                          log.billing === 'Billable' ? "text-emerald-500" : "text-amber-500"
                        )}>
                          <span className={cn("w-1 h-1 rounded-full", log.billing === 'Billable' ? "bg-emerald-500" : "bg-amber-500")} />
                          {log.billing}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end space-x-1">
                        {/* Inline playback controls directly inside the activity log list! */}
                        {tasks.some(t => t.id === log.id) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => toggleTimer(log.id, e)}
                            className="h-7 w-7 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                          >
                            {log.isRunning ? (
                              <Pause className="w-3 h-3 text-orange-500 fill-current" />
                            ) : (
                              <Play className="w-3 h-3 hover:text-emerald-500 fill-current" />
                            )}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                           <MoreHorizontal className="w-3 h-3 text-zinc-400" />
                        </Button>
                      </div>
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

function StatCard({ title, value, trend, icon: Icon }: any) {
  return (
    <Card className="border-zinc-100 dark:border-zinc-900 bg-card shadow-sm overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-400 border border-zinc-100 dark:border-zinc-850">
            <Icon className="w-5 h-5 text-zinc-450 dark:text-zinc-500" />
          </div>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            trend.startsWith('+') ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600" : "bg-amber-50 dark:bg-amber-950/20 text-amber-600"
          )}>
            {trend}
          </span>
        </div>
        <div className="mt-4">
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

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
import { Clock, Calendar, ArrowUpRight, BarChart3, MoreHorizontal, Play, Pause, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Task, Project } from '@/src/types';

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
  // Find current running task
  const activeTask = tasks.find(t => t.id === activeTimerTaskId);
  const activeProject = activeTask ? projects.find(p => p.id === activeTask.projectId) : null;

  // Build current activity logs using real task logged values combined with historical logs
  const realLogs = tasks
    .filter(t => (elapsedTimes[t.id] || 0) > 0)
    .map(t => {
      const proj = projects.find(p => p.id === t.projectId);
      const isRunning = t.id === activeTimerTaskId;
      return {
        id: t.id,
        task: t.name,
        project: proj?.name || 'Global Project',
        user: 'You',
        date: t.updatedAt ? t.updatedAt.split('T')[0] : '2024-05-12',
        durationSecs: elapsedTimes[t.id] || 0,
        billing: t.type === 'Strategy' || t.type === 'Production' ? 'Billable' : 'Non-Billable',
        isRunning,
      };
    });

  // Calculate dynamic metrics based on live updates
  const totalRealSeconds = Object.values(elapsedTimes).reduce((sum, current) => sum + current, 0);
  const totalBaseHours = 124.5;
  const liveTotalHours = (totalBaseHours + (totalRealSeconds / 3600)).toFixed(1);

  // Fallback default static logs if no tasks are manually logged yet
  const staticLogs = [
    { id: 'static-1', task: 'Monthly SEO Audit', project: 'Acme Corp Retainer', user: 'Rashmi Alurkar', date: '2024-05-12', durationSecs: 9000, billing: 'Billable', isRunning: false },
    { id: 'static-2', task: 'Google Ads Optimization', project: 'Paid Social Campaigns', user: 'Ajay Kulkarni', date: '2024-05-12', durationSecs: 4320, billing: 'Billable', isRunning: false },
    { id: 'static-3', task: 'Internal Strategy Sync', project: 'Strategy & Ops', user: 'Nishi Kant', date: '2024-05-11', durationSecs: 2880, billing: 'Non-Billable', isRunning: false },
  ];

  // Filter out any overlap from static logs to keep display clean
  const displayedLogs = [
    ...realLogs,
    ...staticLogs.filter(s => !realLogs.some(r => r.task === s.task))
  ];

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
           <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest">
             Export Timesheet
           </Button>
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
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        log.billing === 'Billable' ? "text-emerald-500" : "text-amber-500"
                      )}>
                        {log.billing}
                      </span>
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

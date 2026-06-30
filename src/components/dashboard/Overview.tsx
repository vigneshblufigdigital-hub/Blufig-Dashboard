import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Activity,
  Pin,
  Briefcase,
  ExternalLink,
  Users,
  Calendar,
  ArrowRight,
  Layers
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

import { useAuth } from '../../contexts/AuthContext';
import { MOCK_USERS } from '../../mockData';
import { ADMIN_ROLES, UserRole } from '../../types';

export function Overview({ 
  projects, 
  tasks,
  pinnedProjectIds = [],
  onTogglePin,
  onClickProject,
  onNavigateToProjects
}: { 
  projects: any[], 
  tasks: any[],
  pinnedProjectIds?: string[],
  onTogglePin?: (id: string) => void,
  onClickProject?: (id: string) => void,
  onNavigateToProjects?: () => void
}) {
  const { user } = useAuth();
  const isLeadOrAdmin = user && ADMIN_ROLES.includes(user.role);

  // Scoped tasks list for current user
  const visibleTasks = tasks.filter(t => {
    if (isLeadOrAdmin) return true;
    const isWorkflowAssignee = t.workflowSteps?.some(step => step.assigneeId === user?.id);
    return t.assigneeId === user?.id || isWorkflowAssignee;
  });
  
  // --- Calculate Live Weekly Task Velocity ---
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const weeklyDataMap = weekdays.reduce((acc, day) => {
    acc[day] = { day, completed: 0, pending: 0 };
    return acc;
  }, {} as Record<string, { day: string; completed: number; pending: number }>);

  visibleTasks.forEach(task => {
    const dateStr = task.dueDate || task.createdAt;
    if (!dateStr) return;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;
    const dayIdx = date.getDay();
    const dayName = daysOfWeek[dayIdx];
    
    if (weekdays.includes(dayName)) {
      const isCompleted = task.status === 'Done' || task.status === 'Approved';
      const isCancelled = task.status === 'Cancelled';
      if (isCancelled) return;
      
      if (isCompleted) {
        weeklyDataMap[dayName].completed += 1;
      } else {
        weeklyDataMap[dayName].pending += 1;
      }
    }
  });

  const calculatedWeeklyData = Object.values(weeklyDataMap);

  // --- Calculate Live Project Delivery Health Status ---
  const todayStr = new Date().toISOString().split('T')[0];
  let onTrackCount = 0;
  let atRiskCount = 0;
  let delayedCount = 0;

  projects.forEach(project => {
    const projectTasks = visibleTasks.filter(t => t.projectId === project.id);
    
    if (projectTasks.length === 0) {
      onTrackCount++;
      return;
    }
    
    // Delayed check: active tasks that are overdue
    const hasOverdue = projectTasks.some(t => {
      const isCompleted = t.status === 'Done' || t.status === 'Approved';
      const isCancelled = t.status === 'Cancelled';
      if (isCompleted || isCancelled) return false;
      return t.dueDate && t.dueDate < todayStr;
    });
    
    if (hasOverdue) {
      delayedCount++;
      return;
    }
    
    // At Risk check: active tasks with High/Critical priority or Blocked status
    const hasHighPriorityOrBlocked = projectTasks.some(t => {
      const isCompleted = t.status === 'Done' || t.status === 'Approved';
      const isCancelled = t.status === 'Cancelled';
      if (isCompleted || isCancelled) return false;
      return t.priority === 'High' || t.priority === 'Critical' || t.status === 'Blocked';
    });
    
    if (hasHighPriorityOrBlocked) {
      atRiskCount++;
    } else {
      onTrackCount++;
    }
  });

  const calculatedHealthData = [
    { name: 'On Track', value: onTrackCount, color: '#10b981' },
    { name: 'At Risk', value: atRiskCount, color: '#f59e0b' },
    { name: 'Delayed', value: delayedCount, color: '#ef4444' },
  ];

  const activeProjectsCount = projects.filter(p => p.status === 'Active').length;
  const tasksDueTodayCount = visibleTasks.filter(t => t.dueDate === new Date().toISOString().split('T')[0]).length;
  
  // Tasks completed in the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString();

  const completedLastSevenDaysCount = visibleTasks.filter(t => {
    const isCompleted = t.status === 'Done' || t.status === 'Approved';
    if (!isCompleted) return false;
    const dateStr = t.updatedAt || t.createdAt;
    return dateStr && dateStr >= sevenDaysAgoStr;
  }).length;

  const totalProjects = projects.length;
  const deliveryHealthVal = totalProjects > 0 
    ? Math.round((onTrackCount / totalProjects) * 100) 
    : 100;
  const deliveryHealthStr = `${deliveryHealthVal}%`;
  const deliveryHealthChange = deliveryHealthVal >= 90 ? 'Excellent' : deliveryHealthVal >= 75 ? 'Stable' : 'Needs Focus';

  const pinnedProjects = projects.filter(p => pinnedProjectIds.includes(p.id));

  // Personal active tasks for the logged-in user
  const myActiveTasks = tasks.filter(t => {
    const isAssignee = t.assigneeId === user?.id;
    const isWorkflowStepAssignee = t.workflowSteps?.some(step => step.assigneeId === user?.id);
    const isNotDone = !['Done', 'Approved', 'Cancelled'].includes(t.status);
    return (isAssignee || isWorkflowStepAssignee) && isNotDone;
  });

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h3 className="text-xl font-bold tracking-tight text-zinc-900">
          Good day, {user?.name ? user.name.split(' ')[0] : 'Guest'}
        </h3>
        <p className="text-sm text-zinc-500">Here's what's happening in your workspace today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Active Projects" 
          value={activeProjectsCount.toString()} 
          change={`${projects.filter(p => p.status === 'Completed').length} Solved`} 
          icon={Activity} 
          color="blue" 
        />
        <StatCard 
          title="Tasks Due Today" 
          value={tasksDueTodayCount.toString()} 
          change={`${visibleTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'Done' && t.status !== 'Approved' && t.status !== 'Cancelled').length} Overdue`} 
          icon={Clock} 
          color="orange" 
        />
        <StatCard 
          title="Completed (7d)" 
          value={completedLastSevenDaysCount.toString()} 
          change="Live Sync" 
          icon={CheckCircle2} 
          color="emerald" 
        />
        <StatCard 
          title="Delivery Health" 
          value={deliveryHealthStr} 
          change={deliveryHealthChange} 
          icon={TrendingUp} 
          color="indigo" 
        />
      </div>

      {/* My Active Assignments Section */}
      <Card className="border-zinc-200/50 dark:border-zinc-850">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-850/50 flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-500" />
              <span>My Active Assignments</span>
            </CardTitle>
            <p className="text-xs text-zinc-400">Your personalized active sprint tasks and collaborative workflow pipeline deliverables.</p>
          </div>
          <Badge className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold font-mono">
            {myActiveTasks.length} Pending
          </Badge>
        </CardHeader>
        <CardContent className="pt-4">
          {myActiveTasks.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-xs italic">
              ✨ All caught up! No active tasks are assigned to you right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {myActiveTasks.slice(0, 6).map(task => {
                const project = projects.find(p => p.id === task.projectId);
                
                // Determine current workflow step progress if any
                const currentStepIdx = task.workflowSteps?.findIndex(step => step.status !== 'Approved');
                const totalSteps = task.workflowSteps?.length || 0;
                const hasWorkflow = totalSteps > 0;
                
                // Priority styling
                const priorityColors: Record<string, string> = {
                  'Critical': 'text-rose-500 bg-rose-500/10 border-rose-500/20',
                  'High': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
                  'Normal': 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20',
                  'Low': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                };
                
                // Status styling
                const statusColors: Record<string, string> = {
                  'Open': 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
                  'In Progress': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                  'Review': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  'Revision Requested': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  'Blocked': 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                };

                return (
                  <div key={task.id} className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-850 bg-white dark:bg-zinc-900/50 flex flex-col justify-between space-y-4 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all group">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider truncate max-w-[140px]">
                          📁 {project?.name || 'Internal Workspace'}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityColors[task.priority] || priorityColors.Normal}`}>
                            {task.priority}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${statusColors[task.status] || 'bg-zinc-100 text-zinc-800'}`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                      
                      <h4 className="text-xs font-bold text-zinc-950 dark:text-zinc-50 leading-snug group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">
                        {task.name}
                      </h4>
                      
                      {task.description && (
                        <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-850/50 flex items-center justify-between">
                      {hasWorkflow && task.workflowSteps ? (
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                            Pipeline Stage
                          </p>
                          <p className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-1 leading-none">
                            <span className="text-orange-500">{currentStepIdx !== undefined && currentStepIdx !== -1 ? currentStepIdx + 1 : totalSteps}</span>
                            <span className="text-zinc-400 font-normal">/</span>
                            <span>{totalSteps}</span>
                            <span className="text-zinc-400 font-medium truncate max-w-[100px]">
                              - {task.workflowSteps[currentStepIdx !== undefined && currentStepIdx !== -1 ? currentStepIdx : totalSteps - 1]?.name}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                            Task Type
                          </p>
                          <p className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">
                            {task.type}
                          </p>
                        </div>
                      )}

                      <div className="text-right space-y-1">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                          Due Date
                        </p>
                        <p className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-end gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'No Date'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pinned Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center space-x-2">
              <Pin className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span>Pinned Focus Projects</span>
            </h3>
            <p className="text-xs text-zinc-400">Track real-time velocity, performance metrics, and task progress of your key priorities.</p>
          </div>
          {pinnedProjects.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToProjects}
              className="text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-800 flex items-center space-x-1"
            >
              <span>Manage Pins</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {pinnedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedProjects.map((project) => {
              const projectTasks = tasks.filter(t => t.projectId === project.id);
              const totalTasksCount = projectTasks.length;
              const completedTasksCount = projectTasks.filter(
                t => t.status === 'Done' || t.status === 'Approved'
              ).length;
              const activeTasksCount = projectTasks.filter(
                t => t.status === 'In Progress' || t.status === 'Review' || t.status === 'Revision Requested'
              ).length;
              const todoTasksCount = projectTasks.filter(
                t => t.status === 'Open'
              ).length;
              const blockedTasksCount = projectTasks.filter(
                t => t.status === 'Blocked'
              ).length;

              const progressPct = totalTasksCount > 0
                ? Math.round((completedTasksCount / totalTasksCount) * 100)
                : 0;

              const am = MOCK_USERS.find(u => u.id === project.accountManagerId);
              const amName = am?.name || 'Unassigned';

              let healthText = "Stable";
              let healthColor = "text-emerald-500 bg-emerald-500/[0.08]";
              
              const hasBlocked = blockedTasksCount > 0;
              const hasOverdue = projectTasks.some(t => {
                const isCompleted = t.status === 'Done' || t.status === 'Approved';
                const isCancelled = t.status === 'Cancelled';
                if (isCompleted || isCancelled) return false;
                return t.dueDate && t.dueDate < todayStr;
              });

              if (hasOverdue) {
                healthText = "Delayed";
                healthColor = "text-red-500 bg-red-500/[0.08]";
              } else if (hasBlocked || activeTasksCount > 4) {
                healthText = "At Risk";
                healthColor = "text-amber-500 bg-amber-500/[0.08]";
              }

              return (
                <Card key={project.id} className="border-zinc-150 transition-all hover:shadow-md hover:border-zinc-250 flex flex-col justify-between">
                  <span className="sr-only">Card header layout helper</span>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider text-zinc-500 py-0 px-1.5">
                            {project.type}
                          </Badge>
                          <span className={cn("text-[1px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full text-[9px]", healthColor)}>
                            {healthText}
                          </span>
                        </div>
                        <h4 className="text-base font-bold tracking-tight mt-1 items-center flex text-zinc-900">
                          <span className="truncate max-w-[150px]">{project.name}</span>
                          {project.websiteUrl && (
                            <a 
                              href={project.websiteUrl}
                              target="_blank" 
                              rel="noreferrer noopener"
                              className="ml-1.5 text-zinc-400 hover:text-brand-secondary transition-colors"
                              title={`Visit ${project.websiteUrl}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-orange-500 hover:text-orange-600 bg-orange-500/[0.06] rounded-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin?.(project.id);
                        }}
                        title="Unpin from Overview"
                      >
                        <Pin className="w-3.5 h-3.5 fill-orange-500" />
                      </Button>
                    </div>

                    {/* Live Progress Tracker */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500 font-medium font-mono text-[11px]">Tasks Solved ({completedTasksCount}/{totalTasksCount})</span>
                        <span className="font-bold">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-zinc-800 h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Live Task breakdown velocity indicator */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-zinc-50 border border-zinc-100 p-1.5 rounded-lg text-center">
                        <p className="text-zinc-400 uppercase font-bold tracking-wider">In Flight</p>
                        <p className="font-bold text-zinc-800 text-sm">{activeTasksCount}</p>
                      </div>
                      <div className="bg-zinc-50 border border-zinc-100 p-1.5 rounded-lg text-center">
                        <p className="text-zinc-400 uppercase font-bold tracking-wider">Backlog</p>
                        <p className="font-bold text-zinc-800 text-sm">{todoTasksCount}</p>
                      </div>
                    </div>

                    {/* Account stats / timeline info */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-50 font-medium">
                      <span className="truncate">AM: {amName}</span>
                      <span>Created {project.startDate ? new Date(project.startDate).toLocaleDateString('en', {month:'short', day:'numeric'}) : 'Pending'}</span>
                    </div>
                  </CardContent>

                  <CardFooter className="bg-zinc-50/50 border-t py-2 px-4 flex justify-between items-center text-xs">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Velocity Tracker ready</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] uppercase font-bold tracking-widest text-brand-secondary hover:text-brand-secondary/80 p-0 hover:bg-transparent"
                      onClick={() => onClickProject?.(project.id)}
                    >
                      Workspace <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-zinc-200 bg-zinc-50/30">
            <CardContent className="py-6 flex flex-col items-center text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-zinc-700 text-sm">No Pinned Projects Yet</p>
                <p className="text-xs text-zinc-400 max-w-sm">Pin your most important active projects from the Projects board to view their live delivery velocity from your overview dashboard.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToProjects}
                className="mt-2 text-xs font-bold uppercase tracking-wider h-8"
              >
                Go pin a project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Weekly Task Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={calculatedWeeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                  />
                  <Bar dataKey="completed" name="Completed" fill="#141414" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar dataKey="pending" name="Open / Review" fill="#e4e4e7" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Project Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={calculatedHealthData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {calculatedHealthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {calculatedHealthData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-zinc-600">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={cn("p-2 rounded-lg", colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
          <Badge variant="outline" className={cn(
            "text-[10px] font-bold",
            change.startsWith('+') ? "text-emerald-600 border-emerald-100 bg-emerald-50" : "text-zinc-500"
          )}>
            {change}
          </Badge>
        </div>
        <div className="mt-4">
          <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mt-1">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

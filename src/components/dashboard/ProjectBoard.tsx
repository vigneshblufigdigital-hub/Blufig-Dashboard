import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Briefcase, 
  Users, 
  Calendar, 
  MoreVertical,
  ExternalLink,
  Lock,
  Pin,
  CheckCircle,
  AlertTriangle,
  Play,
  Trash2,
  UserPlus,
  Download,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MOCK_USERS } from '@/src/mockData';
import { Project, Task, UserProfile, UserRole, ADMIN_ROLES, ClientInvoice } from '@/src/types';
import { toast } from 'sonner';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ProjectBoard({ 
  onProjectClick, 
  projects,
  tasks = [],
  invoices = [],
  onAddProjectClick,
  pinnedProjectIds = [],
  onTogglePin,
  users,
  onUpdateProjectAM,
  onDeleteProject,
  onUpdateProjectStatus,
  currentUser
}: { 
  onProjectClick?: (id: string) => void;
  projects: Project[];
  tasks?: Task[];
  invoices?: ClientInvoice[];
  onAddProjectClick?: () => void;
  pinnedProjectIds?: string[];
  onTogglePin?: (id: string) => void;
  users?: UserProfile[];
  onUpdateProjectAM?: (projectId: string, amId: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onUpdateProjectStatus?: (projectId: string, status: 'Active' | 'Completed' | 'On Hold' | 'Pending' | 'In Review' | 'Client Review') => void;
  currentUser?: UserProfile;
}) {
  const isAdminUser = currentUser && ADMIN_ROLES.includes(currentUser.role);
  const eligibleAssignees = (users || MOCK_USERS).filter(u => u.role !== UserRole.CLIENT);

  const handleExportProjectDetails = (project: Project) => {
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const projectInvoices = (invoices || []).filter((i: any) => i.projectId === project.id);
    
    const csvLines: string[] = [];
    csvLines.push('--- PROJECT OVERVIEW ---');
    csvLines.push(`Project Name,${project.name.replace(/,/g, ' ')}`);
    csvLines.push(`Project ID,${project.id}`);
    csvLines.push(`Type,${project.type}`);
    csvLines.push(`Status,${project.status}`);
    csvLines.push(`Start Date,${project.startDate}`);
    csvLines.push(`Website URL,${project.websiteUrl || 'N/A'}`);
    csvLines.push(`Client Coordinator,${project.clientCoordinator || 'N/A'}`);
    csvLines.push('');
    
    csvLines.push('--- PROJECT TASKS ---');
    csvLines.push('Task ID,Task Name,Status,Priority,Type,Due Date,Time Estimate (Hrs),Time Logged (Hrs),Billable');
    
    projectTasks.forEach(t => {
      const timeHrs = t.timeLoggedSeconds ? (t.timeLoggedSeconds / 3600).toFixed(2) : (t.timeLogged || 0);
      csvLines.push(`${t.id},"${t.name.replace(/"/g, '""')}",${t.status},${t.priority},${t.type},${t.dueDate},${t.timeEstimate || 0},${timeHrs},${t.isBillable ? 'Yes' : 'No'}`);
    });
    csvLines.push('');

    csvLines.push('--- TIMESHEET LOGS ---');
    csvLines.push('Task Name,Expert / User,Date,Duration (Formatted),Duration (Seconds),Billing');
    
    let totalSecs = 0;
    projectTasks.forEach(t => {
      const durationSecs = t.timeLoggedSeconds || (t.timeLogged ? t.timeLogged * 3600 : 0);
      if (durationSecs > 0) {
        totalSecs += durationSecs;
        const assignee = users?.find(u => u.id === t.assigneeId)?.name || 'Specialist';
        const dateStr = t.updatedAt ? t.updatedAt.split('T')[0] : t.createdAt ? t.createdAt.split('T')[0] : 'N/A';
        
        const hrs = Math.floor(durationSecs / 3600);
        const mins = Math.floor((durationSecs % 3600) / 60);
        const secs = durationSecs % 60;
        const formatted = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        
        csvLines.push(`"${t.name.replace(/"/g, '""')}","${assignee}",${dateStr},${formatted},${durationSecs},${t.isBillable ? 'Billable' : 'Non-Billable'}`);
      }
    });
    
    const projectStaticLogs = [
      { id: 'static-1', task: 'Monthly SEO Audit', project: 'Acme Corp Retainer', user: 'Rashmi Alurkar', date: '2026-06-15', durationSecs: 9000, billing: 'Billable' },
      { id: 'static-2', task: 'Google Ads Optimization', project: 'Paid Social Campaigns', user: 'Ajay Kulkarni', date: '2026-06-14', durationSecs: 4320, billing: 'Billable' },
      { id: 'static-3', task: 'Internal Strategy Sync', project: 'Strategy & Ops', user: 'Nishi Kant', date: '2026-06-12', durationSecs: 2880, billing: 'Non-Billable' },
    ].filter(s => s.project.toLowerCase().includes(project.name.toLowerCase()) || project.name.toLowerCase().includes(s.project.toLowerCase()));

    projectStaticLogs.forEach(s => {
      totalSecs += s.durationSecs;
      const hrs = Math.floor(s.durationSecs / 3600);
      const mins = Math.floor((s.durationSecs % 3600) / 60);
      const secs = s.durationSecs % 60;
      const formatted = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      csvLines.push(`"${s.task.replace(/"/g, '""')}","${s.user}",${s.date},${formatted},${s.durationSecs},${s.billing}`);
    });
    
    const totHrs = Math.floor(totalSecs / 3600);
    const totMins = Math.floor((totalSecs % 3600) / 60);
    const totSecs = totalSecs % 60;
    const totalFormatted = `${String(totHrs).padStart(2, '0')}:${String(totMins).padStart(2, '0')}:${String(totSecs).padStart(2, '0')}`;
    csvLines.push(`TOTAL TIME LOGGED,,,,,${totalFormatted}`);
    csvLines.push('');

    csvLines.push('--- BILLINGS & INVOICES ---');
    csvLines.push('Invoice Number,Amount,Currency,Date,Due Date,Status');
    projectInvoices.forEach((inv: any) => {
      csvLines.push(`${inv.invoiceNumber},${inv.amount},${inv.currency},${inv.date},${inv.dueDate},${inv.status}`);
    });
    
    const totalBilled = projectInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
    csvLines.push(`TOTAL AMOUNT BILLED,${totalBilled},,,,`);

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_full_details_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Full export of "${project.name}" generated successfully!`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {projects.map((project) => {
        const am = (users || MOCK_USERS).find(u => u.id === project.accountManagerId);
        
        // Dynamic Task Progress Calculation
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        const totalProjectTasksCount = projectTasks.length;
        const completedProjectTasksCount = projectTasks.filter(
          t => t.status === 'Done' || t.status === 'Approved'
        ).length;
        
        const progressPercentage = totalProjectTasksCount > 0
          ? Math.round((completedProjectTasksCount / totalProjectTasksCount) * 100)
          : 0;

        // Dynamic State / Phase display based on status or progress
        let displayPhase = "Planning";
        if (progressPercentage > 0 && progressPercentage < 100) {
          displayPhase = "In Progress";
        } else if (progressPercentage === 100 && totalProjectTasksCount > 0) {
          displayPhase = "Completed";
        }

        // Project Creation Date
        const formattedCreationDate = project.startDate 
          ? new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Pending';

        const isPinned = pinnedProjectIds.includes(project.id);
        
        return (
          <Card 
            key={project.id} 
            className="group hover:shadow-lg transition-all border-zinc-100 overflow-hidden cursor-pointer"
            onClick={(e) => {
              const target = e.target as HTMLElement;
              // Ignore clicks inside buttons, selects, links, or dropdown/menus
              if (
                target.closest('button') || 
                target.closest('select') ||
                target.closest('a') ||
                target.closest('[role="menu"]') ||
                target.closest('[role="menuitem"]') || 
                target.closest('[data-slot="dropdown-menu-content"]') ||
                target.closest('[data-slot="dropdown-menu-trigger"]')
              ) {
                return;
              }
              onProjectClick?.(project.id);
            }}
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                      {project.type}
                    </Badge>
                    <Badge className={cn(
                      "text-[10px] uppercase font-bold tracking-wider border-none",
                      project.status === 'Active' && "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
                      project.status === 'Completed' && "bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
                      project.status === 'On Hold' && "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
                      project.status === 'In Review' && "bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
                      project.status === 'Client Review' && "bg-teal-500/15 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400",
                      (project.status === 'Pending' || !project.status) && "bg-zinc-500/15 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400"
                    )}>
                      {project.status || 'Pending'}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold tracking-tight mt-2 flex items-center">
                    {project.name}
                    {project.websiteUrl && (
                      <a 
                        href={project.websiteUrl}
                        target="_blank" 
                        rel="noreferrer noopener"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent clicking card workspace
                        }}
                        className="ml-2 inline-flex items-center text-zinc-400 hover:text-brand-secondary transition-colors"
                        title={`Visit ${project.websiteUrl}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </CardTitle>
                </div>
                <div className="flex items-center space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-8 w-8 transition-colors rounded-lg",
                      isPinned 
                        ? "text-orange-500 hover:text-orange-600 bg-orange-500/[0.08]" 
                        : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin?.(project.id);
                    }}
                    title={isPinned ? "Unpin Project" : "Pin Project to Overview"}
                  >
                    <Pin className={cn("w-4 h-4", isPinned && "fill-orange-500")} />
                  </Button>
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg animate-none"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                          />
                        }
                      >
                        <MoreVertical className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        className="w-48 border-zinc-200 dark:border-zinc-800"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-450 px-3 py-1.5">Project Actions</div>
                        <DropdownMenuSeparator />
                        
                        {onTogglePin && (
                          <DropdownMenuItem onClick={() => onTogglePin(project.id)} className="text-xs cursor-pointer">
                            <Pin className="w-3.5 h-3.5 mr-2 text-zinc-550" />
                            <span>{isPinned ? "Unpin Project" : "Pin Project"}</span>
                          </DropdownMenuItem>
                        )}

                        {currentUser && onUpdateProjectAM && project.accountManagerId !== currentUser.id && currentUser.role !== UserRole.CLIENT && (
                          <DropdownMenuItem onClick={() => onUpdateProjectAM(project.id, currentUser.id)} className="text-xs cursor-pointer">
                            <UserPlus className="w-3.5 h-3.5 mr-2 text-zinc-550" />
                            <span>Assign to Me</span>
                          </DropdownMenuItem>
                        )}

                        {onUpdateProjectStatus && (
                          <>
                            <DropdownMenuSeparator />
                            <div className="text-[9px] uppercase font-bold tracking-widest text-zinc-450 px-3 py-1.5">Set Status</div>
                            {project.status !== 'Active' && (
                              <DropdownMenuItem onClick={() => onUpdateProjectStatus(project.id, 'Active')} className="text-xs cursor-pointer">
                                <Play className="w-3.5 h-3.5 mr-2 text-emerald-550" />
                                <span>Set Active</span>
                              </DropdownMenuItem>
                            )}
                            {project.status !== 'In Review' && (
                              <DropdownMenuItem onClick={() => onUpdateProjectStatus(project.id, 'In Review')} className="text-xs cursor-pointer">
                                <Eye className="w-3.5 h-3.5 mr-2 text-purple-500" />
                                <span>Set In Review</span>
                              </DropdownMenuItem>
                            )}
                            {project.status !== 'Client Review' && (
                              <DropdownMenuItem onClick={() => onUpdateProjectStatus(project.id, 'Client Review')} className="text-xs cursor-pointer">
                                <Users className="w-3.5 h-3.5 mr-2 text-teal-500" />
                                <span>Set Client Review</span>
                              </DropdownMenuItem>
                            )}
                            {project.status !== 'Completed' && (
                              <DropdownMenuItem onClick={() => onUpdateProjectStatus(project.id, 'Completed')} className="text-xs cursor-pointer">
                                <CheckCircle className="w-3.5 h-3.5 mr-2 text-indigo-550" />
                                <span>Set Completed</span>
                              </DropdownMenuItem>
                            )}
                            {project.status !== 'On Hold' && (
                              <DropdownMenuItem onClick={() => onUpdateProjectStatus(project.id, 'On Hold')} className="text-xs cursor-pointer">
                                <AlertTriangle className="w-3.5 h-3.5 mr-2 text-amber-550" />
                                <span>Set On Hold</span>
                              </DropdownMenuItem>
                            )}
                          </>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleExportProjectDetails(project)} 
                          className="text-xs cursor-pointer text-zinc-700 dark:text-zinc-300 focus:bg-zinc-50 dark:focus:bg-zinc-900"
                        >
                          <Download className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                          <span>Export Project Details</span>
                        </DropdownMenuItem>

                        {onDeleteProject && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => onDeleteProject(project.id)} 
                              className="text-xs cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2 text-red-500" />
                              <span>Delete Project</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-500 uppercase tracking-widest px-1">Phase: {displayPhase}</span>
                  <span className="font-bold">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2 bg-zinc-50" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 p-2 rounded-lg bg-zinc-50 border border-zinc-100 min-w-0">
                  <Users className="w-3 h-3 text-zinc-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Project AM / Assignee</p>
                    {isAdminUser ? (
                      <select
                        value={project.accountManagerId || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          onUpdateProjectAM?.(project.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-semibold bg-transparent border-none outline-none focus:ring-0 p-0 m-0 text-zinc-900 dark:text-zinc-100 w-full cursor-pointer pr-2"
                      >
                        <option value="" className="bg-white dark:bg-zinc-900">Unassigned</option>
                        {eligibleAssignees.map(u => (
                          <option key={u.id} value={u.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                            {u.name} ({u.role.replace('_', ' ')})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs font-semibold truncate">{am?.name || 'Unassigned'}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Created At</p>
                    <p className="text-xs font-semibold truncate">{formattedCreationDate}</p>
                  </div>
                </div>
              </div>

              {project.clientCoordinator && (
                <div className="flex items-center space-x-2.5 p-2.5 mt-3 rounded-lg bg-emerald-50/40 border border-emerald-150/40 dark:bg-emerald-950/10 dark:border-emerald-900/20">
                  <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-tight">Client Coordinator</p>
                    <p className="text-xs font-semibold truncate text-zinc-900 dark:text-zinc-100">{project.clientCoordinator}</p>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="bg-zinc-50/50 border-t flex items-center justify-between py-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                    {MOCK_USERS[i]?.name.charAt(0) || '?'}
                  </div>
                ))}
                <div className="w-7 h-7 rounded-full border-2 border-white bg-white flex items-center justify-center text-[10px] font-bold text-zinc-400 shadow-sm">
                  +2
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 text-xs font-bold uppercase tracking-tighter"
                onClick={(e) => {
                  e.stopPropagation();
                  onProjectClick?.(project.id);
                }}
              >
                Open Workspace
              </Button>
            </CardFooter>
          </Card>
        );
      })}

      <button 
        onClick={onAddProjectClick}
        className="h-[300px] border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center text-zinc-400 hover:bg-zinc-150 hover:border-zinc-300 transition-all space-y-4 w-full"
      >
        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200">
          <Briefcase className="w-6 h-6 text-zinc-500" />
        </div>
        <div className="text-center">
          <p className="font-bold text-zinc-900">Add New Project</p>
          <p className="text-sm">Initiate from template</p>
        </div>
      </button>
    </div>
  );
}

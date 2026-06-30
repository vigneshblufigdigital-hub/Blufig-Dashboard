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
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MOCK_USERS } from '@/src/mockData';
import { Project, Task, UserProfile, UserRole, ADMIN_ROLES } from '@/src/types';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ProjectBoard({ 
  onProjectClick, 
  projects,
  tasks = [],
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
  onAddProjectClick?: () => void;
  pinnedProjectIds?: string[];
  onTogglePin?: (id: string) => void;
  users?: UserProfile[];
  onUpdateProjectAM?: (projectId: string, amId: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onUpdateProjectStatus?: (projectId: string, status: 'Active' | 'Completed' | 'On Hold' | 'Pending') => void;
  currentUser?: UserProfile;
}) {
  const isAdminUser = currentUser && ADMIN_ROLES.includes(currentUser.role);
  const eligibleAssignees = (users || MOCK_USERS).filter(u => u.role !== UserRole.CLIENT);

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
            onClick={() => onProjectClick?.(project.id)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                      {project.type}
                    </Badge>
                    <Badge className="text-[10px] uppercase font-bold tracking-wider bg-zinc-100 text-zinc-900 border-none">
                      {project.status}
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 border-zinc-200 dark:border-zinc-800" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-widest text-zinc-450">Project Actions</DropdownMenuLabel>
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
                          <DropdownMenuLabel className="text-[9px] uppercase font-bold tracking-widest text-zinc-450 px-2 py-1">Set Status</DropdownMenuLabel>
                          {project.status !== 'Active' && (
                            <DropdownMenuItem onClick={() => onUpdateProjectStatus(project.id, 'Active')} className="text-xs cursor-pointer">
                              <Play className="w-3.5 h-3.5 mr-2 text-emerald-550" />
                              <span>Set Active</span>
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

                      {isAdminUser && onDeleteProject && (
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

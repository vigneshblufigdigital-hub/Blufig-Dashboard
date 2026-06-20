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
  Pin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MOCK_USERS } from '@/src/mockData';
import { Project, Task } from '@/src/types';

export function ProjectBoard({ 
  onProjectClick, 
  projects,
  tasks = [],
  onAddProjectClick,
  pinnedProjectIds = [],
  onTogglePin
}: { 
  onProjectClick?: (id: string) => void;
  projects: Project[];
  tasks?: Task[];
  onAddProjectClick?: () => void;
  pinnedProjectIds?: string[];
  onTogglePin?: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {projects.map((project) => {
        const am = MOCK_USERS.find(u => u.id === project.accountManagerId);
        
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
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-zinc-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Additional menu logic if needed
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
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
                <div className="flex items-center space-x-2 p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                  <Users className="w-3 h-3 text-zinc-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Project AM</p>
                    <p className="text-xs font-semibold truncate">{am?.name || 'Unassigned'}</p>
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

import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Clock, 
  MoreHorizontal, 
  AlertCircle,
  CheckCircle2,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  PlusCircle,
  Play,
  Pause,
  Square,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TaskStatus, Priority, Task, SubTask, UserRole, Project, UserProfile, ADMIN_ROLES } from '@/src/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { useAuth } from '../../contexts/AuthContext';
import { suggestAssignee } from '../../lib/gemini';
import { toast } from 'sonner';

import { emailService } from '@/src/services/emailService';

interface TaskEngineProps {
  filterProjectId?: string | null;
  onClearFilter?: () => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  projects: Project[];
  users: UserProfile[];
}

export function TaskEngine({ filterProjectId, onClearFilter, tasks, setTasks, projects, users }: TaskEngineProps) {
  const { user } = useAuth();
  const [filter, setFilter] = useState('active');
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  
  // Timer State
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({});
  
  // Track timers in real-time
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimerTaskId) {
      interval = setInterval(() => {
        setElapsedTimes(prev => ({
          ...prev,
          [activeTimerTaskId]: (prev[activeTimerTaskId] || 0) + 1
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimerTaskId]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleTimer = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTimerTaskId === taskId) {
      setActiveTimerTaskId(null);
    } else {
      setActiveTimerTaskId(taskId);
      // Automatically set task to "In Progress" if it wasn't
      setTasks(prev => prev.map(t => 
        t.id === taskId && t.status === TaskStatus.OPEN 
          ? { ...t, status: TaskStatus.IN_PROGRESS } 
          : t
      ));
    }
  };
  
  // Task Creation State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionReason, setSuggestionReason] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    name: '',
    projectId: filterProjectId || '',
    type: 'Web Development',
    status: TaskStatus.OPEN,
    priority: Priority.NORMAL,
    dueDate: new Date().toISOString().split('T')[0],
    assigneeId: user?.id || '',
    description: '',
    timeEstimate: 0
  });

  const handleCreateTask = () => {
    if (!newTask.name || !newTask.projectId || !newTask.assigneeId) return;

    const taskToAdd: Task = {
      ...newTask as Task,
      id: 't' + Math.random().toString(36).substr(2, 9),
      deliverableId: 'custom-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subTasks: []
    };

    setTasks([taskToAdd, ...tasks]);

    // Send email notification if creator is an admin/manager and assignee is different
    const isLeadOrAdmin = user && ADMIN_ROLES.includes(user.role);

    if (isLeadOrAdmin && taskToAdd.assigneeId !== user?.id) {
      const assignee = users.find(u => u.id === taskToAdd.assigneeId);
      if (assignee && user) {
        emailService.sendTaskAssignmentEmail(assignee, taskToAdd, user);
      }
    }

    setIsCreateDialogOpen(false);
    setNewTask({
      name: '',
      projectId: filterProjectId || '',
      type: 'Web Development',
      status: TaskStatus.OPEN,
      priority: Priority.NORMAL,
      dueDate: new Date().toISOString().split('T')[0],
      assigneeId: user?.id || '',
      description: '',
      timeEstimate: 0
    });
  };

  const handleSuggestAssignee = async () => {
    if (!newTask.name) {
      toast.error("Please enter a task name first");
      return;
    }
    
    setIsSuggesting(true);
    setSuggestionReason(null);
    
    try {
      const experts = users.filter(u => u.role !== UserRole.CLIENT);
      const suggestion = await suggestAssignee(
        newTask.description || newTask.name || '',
        newTask.type || 'Production',
        experts
      );
      
      if (suggestion?.assigneeId) {
        setNewTask(prev => ({ ...prev, assigneeId: suggestion.assigneeId }));
        setSuggestionReason(suggestion.reason);
        toast.success("AI suggested a suitable expert");
      }
    } catch (error) {
      console.error(error);
      toast.error("AI engine encountered an error");
    } finally {
      setIsSuggesting(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    // Project filter logic
    if (filterProjectId && t.projectId !== filterProjectId) {
      return false;
    }

    // Role based visibility
    const isLeadOrAdmin = user && ADMIN_ROLES.includes(user.role);

    // If not lead/admin, only see assigned tasks
    if (!isLeadOrAdmin && t.assigneeId !== user?.id) {
      return false;
    }

    switch (filter) {
      case 'active':
        return [TaskStatus.IN_PROGRESS, TaskStatus.OPEN].includes(t.status as TaskStatus);
      case 'review':
        return [TaskStatus.REVIEW, TaskStatus.REVISION_REQUESTED].includes(t.status as TaskStatus);
      case 'backlog':
        return [TaskStatus.BLOCKED].includes(t.status as TaskStatus);
      case 'archived':
        return [TaskStatus.DONE, TaskStatus.CANCELLED].includes(t.status as TaskStatus);
      default:
        return true;
    }
  });

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    );
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subTasks) {
        return {
          ...t,
          subTasks: t.subTasks.map(st => 
            st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
          )
        };
      }
      return t;
    }));
  };

  const addSubtask = (taskId: string, name: string) => {
    if (!name.trim()) return;
    const newSubtask: SubTask = {
      id: Math.random().toString(36).substr(2, 9),
      taskId,
      name,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subTasks: [...(t.subTasks || []), newSubtask]
        };
      }
      return t;
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const selectedProject = filterProjectId ? projects.find(p => p.id === filterProjectId) : null;

  return (
    <div className="space-y-4">
      {filterProjectId && (
        <div className="bg-zinc-900 text-white px-4 py-3 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs uppercase">
              {selectedProject?.name.charAt(0)}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Filtering Tasks for</p>
              <p className="text-sm font-bold tracking-tight">{selectedProject?.name || 'Selected Project'}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilter}
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10"
          >
            Clear Filter
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b">
        <div className="flex items-center space-x-4 sm:space-x-6 text-xs sm:text-sm font-medium overflow-x-auto whitespace-nowrap scrollbar-none pb-1 sm:pb-0">
          <button 
            onClick={() => setFilter('active')}
            className={cn(
              "pb-2 transition-all",
              filter === 'active' ? "text-zinc-900 border-b-2 border-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            Active Tasks
          </button>
          <button 
            onClick={() => setFilter('review')}
            className={cn(
              "pb-2 transition-all",
              filter === 'review' ? "text-zinc-900 border-b-2 border-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            Review Required
          </button>
          <button 
            onClick={() => setFilter('backlog')}
            className={cn(
              "pb-2 transition-all",
              filter === 'backlog' ? "text-zinc-900 border-b-2 border-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            Backlog
          </button>
          <button 
            onClick={() => setFilter('archived')}
            className={cn(
              "pb-2 transition-all",
              filter === 'archived' ? "text-zinc-900 border-b-2 border-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            Archived
          </button>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger 
            render={
              <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl px-4 font-bold text-[10px] uppercase tracking-widest transition-all">
                <PlusCircle className="w-3.5 h-3.5 mr-2" />
                Create New Task
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight">Create New Task</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Task Name</Label>
                <Input 
                  placeholder="What needs to be done?" 
                  className="rounded-xl border-zinc-200"
                  value={newTask.name}
                  onChange={(e) => setNewTask({...newTask, name: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Description (Optional)</Label>
                <Textarea 
                  placeholder="Provide context for better AI assignment..." 
                  className="rounded-xl border-zinc-200 resize-none h-20"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Project</Label>
                  <Select 
                    value={newTask.projectId} 
                    onValueChange={(v) => setNewTask({...newTask, projectId: v})}
                  >
                    <SelectTrigger className="rounded-xl border-zinc-200">
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Type</Label>
                  <Select 
                    value={newTask.type} 
                    onValueChange={(v) => setNewTask({...newTask, type: v})}
                  >
                    <SelectTrigger className="rounded-xl border-zinc-200">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Web Development">Web Development</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Adhoc">Adhoc</SelectItem>
                      <SelectItem value="Strategy">Strategy</SelectItem>
                      <SelectItem value="Content">Content</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Priority</Label>
                  <Select 
                    value={newTask.priority} 
                    onValueChange={(v) => setNewTask({...newTask, priority: v as Priority})}
                  >
                    <SelectTrigger className="rounded-xl border-zinc-200">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Priority).map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Due Date</Label>
                  <Input 
                    type="date" 
                    className="rounded-xl border-zinc-200"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Assignee</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[9px] font-bold uppercase tracking-widest text-orange-500 hover:text-orange-600 hover:bg-orange-50 px-2"
                    onClick={handleSuggestAssignee}
                    disabled={isSuggesting}
                  >
                    <Activity className={cn("w-3 h-3 mr-1", isSuggesting && "animate-pulse")} />
                    {isSuggesting ? "Analyzing..." : "Suggest Expert"}
                  </Button>
                </div>
                <Select 
                  value={newTask.assigneeId} 
                  onValueChange={(v) => {
                    setNewTask({...newTask, assigneeId: v});
                    setSuggestionReason(null);
                  }}
                >
                  <SelectTrigger className="rounded-xl border-zinc-200">
                    <SelectValue placeholder="Select Expert" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.role !== UserRole.CLIENT).map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {suggestionReason && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] text-orange-600 bg-orange-50/50 p-2 rounded-lg border border-orange-100/50 mt-1 flex items-start space-x-2"
                  >
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>AI Logic: {suggestionReason}</span>
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</Label>
                  <Select 
                    value={newTask.status} 
                    onValueChange={(v) => setNewTask({...newTask, status: v as TaskStatus})}
                  >
                    <SelectTrigger className="rounded-xl border-zinc-200">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TaskStatus.OPEN}>Open</SelectItem>
                      <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                      <SelectItem value={TaskStatus.REVIEW}>Review</SelectItem>
                      <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                      <SelectItem value={TaskStatus.BLOCKED}>Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Allocated Time (Hours)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="E.g. 4.5" 
                      className="rounded-xl border-zinc-200 pl-8"
                      value={newTask.timeEstimate || ''}
                      onChange={(e) => setNewTask({...newTask, timeEstimate: parseFloat(e.target.value) || 0})}
                    />
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button 
                onClick={handleCreateTask}
                className="w-full bg-zinc-900 text-white rounded-xl h-12 font-bold uppercase tracking-widest text-xs"
              >
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader className="bg-zinc-50/50">
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[300px] text-[10px] uppercase font-bold tracking-widest py-4">Task Name</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4">Assignee</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4">Priority</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4">Allocated</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4">Due Date</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4 text-center">Timer</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-zinc-500 font-medium italic text-sm">
                  No tasks found in this category.
                </TableCell>
              </TableRow>
            ) : filteredTasks.map((task) => {
              const assignee = users.find(u => u.id === task.assigneeId);
              const project = projects.find(p => p.id === task.projectId);
              const isExpanded = expandedTasks.includes(task.id);
              const subtaskCount = task.subTasks?.length || 0;
              const completedCount = task.subTasks?.filter(st => st.isCompleted).length || 0;
              
              return (
                <React.Fragment key={task.id}>
                  <TableRow 
                    className={cn(
                      "group transition-colors cursor-pointer border-zinc-50",
                      isExpanded ? "bg-zinc-50/50" : "hover:bg-zinc-50/80"
                    )}
                    onClick={() => toggleExpand(task.id)}
                  >
                    <TableCell className="py-4">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm tracking-tight">{task.name}</span>
                          {subtaskCount > 0 && (
                            <div className="flex items-center space-x-1">
                              <div className="flex -space-x-1">
                                <div className="w-3 h-3 rounded-full bg-zinc-200" />
                                <div className="w-3 h-3 rounded-full bg-zinc-300" />
                              </div>
                              <span className="text-[10px] font-bold text-zinc-400">{completedCount}/{subtaskCount}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                          {project?.name || 'Global'} / {task.type || 'Production'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select 
                        value={task.assigneeId} 
                        onValueChange={(newAssigneeId) => {
                          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, assigneeId: newAssigneeId } : t));
                        }}
                      >
                        <SelectTrigger className="h-8 border-none shadow-none focus:ring-0 p-0 hover:bg-zinc-100 rounded-lg pr-2">
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6 border shadow-sm">
                              <AvatarFallback className="text-[10px] font-bold bg-zinc-100">{assignee?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-semibold">{assignee?.name}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {users.filter(u => u.role !== UserRole.CLIENT).map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              <div className="flex items-center space-x-2">
                                <Avatar className="w-5 h-5 border shadow-sm">
                                  <AvatarFallback className="text-[8px] font-bold bg-zinc-100">{u.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs">{u.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select 
                        value={task.status} 
                        onValueChange={(newStatus) => {
                          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus as TaskStatus } : t));
                        }}
                      >
                        <SelectTrigger className={cn(
                          "h-8 px-3 text-[10px] font-bold uppercase tracking-wider rounded-xl border transition-all",
                          task.status === TaskStatus.OPEN && "bg-zinc-50 text-zinc-600 border-zinc-200",
                          task.status === TaskStatus.IN_PROGRESS && "bg-blue-50 text-blue-600 border-blue-100",
                          task.status === TaskStatus.REVIEW && "bg-amber-50 text-amber-600 border-amber-100",
                          task.status === TaskStatus.DONE && "bg-emerald-50 text-emerald-600 border-emerald-100",
                          task.status === TaskStatus.BLOCKED && "bg-red-50 text-red-600 border-red-100"
                        )}>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-zinc-200">
                          <SelectItem value={TaskStatus.OPEN} className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 focus:bg-zinc-50">Open</SelectItem>
                          <SelectItem value={TaskStatus.IN_PROGRESS} className="text-[10px] font-bold uppercase tracking-widest text-blue-600 focus:bg-blue-50">In Progress</SelectItem>
                          <SelectItem value={TaskStatus.REVIEW} className="text-[10px] font-bold uppercase tracking-widest text-amber-600 focus:bg-amber-50">Review</SelectItem>
                          <SelectItem value={TaskStatus.DONE} className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 focus:bg-emerald-50">Done</SelectItem>
                          <SelectItem value={TaskStatus.BLOCKED} className="text-[10px] font-bold uppercase tracking-widest text-red-600 focus:bg-red-50">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1.5">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          task.priority === Priority.HIGH ? "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.3)]" : "bg-zinc-300"
                        )} />
                        <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-tight">{task.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-xs font-semibold text-zinc-600 bg-zinc-100 px-2 py-1 rounded-md w-fit">
                        {task.timeEstimate ? `${task.timeEstimate}h` : '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-xs font-medium text-zinc-500">
                        <Clock className="w-3 h-3 mr-1.5 text-zinc-400" />
                        {task.dueDate}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Button 
                          variant={activeTimerTaskId === task.id ? "destructive" : "ghost"} 
                          size="sm"
                          className={cn(
                            "h-8 px-3 rounded-lg flex items-center space-x-2 transition-all",
                            activeTimerTaskId === task.id ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                          )}
                          onClick={(e) => toggleTimer(task.id, e)}
                        >
                          {activeTimerTaskId === task.id ? (
                            <>
                              <Square className="w-3 h-3 fill-current" />
                              <span className="font-mono text-xs tabular-nums">{formatTime(elapsedTimes[task.id] || 0)}</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span className="font-mono text-xs tabular-nums font-bold">
                                {elapsedTimes[task.id] ? formatTime(elapsedTimes[task.id]) : '00:00:00'}
                              </span>
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            />
                          }
                        >
                          <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            variant="destructive"
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-xs font-bold uppercase tracking-widest cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete Task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>

                  {/* Sub-tasks Row */}
                  <AnimatePresence>
                    {isExpanded && (
                      <TableRow className="border-none hover:bg-transparent">
                        <TableCell colSpan={8} className="p-0 border-none">
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-zinc-50/30 overflow-hidden"
                          >
                            <div className="px-14 py-6 space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Granular Breakdown (Sub-tasks)</h4>
                                <div className="flex items-center space-x-3">
                                   <div className="text-[10px] font-bold text-zinc-400">PROGRESS</div>
                                   <div className="w-32 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-brand-secondary transition-all duration-500" 
                                        style={{ width: `${(completedCount / (subtaskCount || 1)) * 100}%` }}
                                      />
                                   </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {task.subTasks?.map((subtask) => (
                                  <div 
                                    key={subtask.id} 
                                    className="flex items-center justify-between bg-white p-3 rounded-xl border border-zinc-100 group/st shadow-sm"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <Checkbox 
                                        checked={subtask.isCompleted} 
                                        onCheckedChange={() => toggleSubtask(task.id, subtask.id)}
                                        className="brand-checkbox"
                                      />
                                      <span className={cn(
                                        "text-sm font-medium transition-all",
                                        subtask.isCompleted ? "text-zinc-400 line-through" : "text-zinc-700"
                                      )}>
                                        {subtask.name}
                                      </span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/st:opacity-100 transition-opacity">
                                      <Trash2 className="w-3 h-3 text-red-400" />
                                    </Button>
                                  </div>
                                ))}

                                <div className="flex items-center space-x-2 pt-2">
                                  <div className="relative flex-1">
                                    <Input 
                                      placeholder="Add sub-task..." 
                                      className="h-9 bg-white border-zinc-200 text-xs pl-8 focus-visible:ring-brand-secondary/20"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          addSubtask(task.id, (e.target as HTMLInputElement).value);
                                          (e.target as HTMLInputElement).value = '';
                                        }
                                      }}
                                    />
                                    <Plus className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
                                  </div>
                                  <p className="text-[10px] text-zinc-400 font-medium italic">Press Enter to add</p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </TableCell>
                      </TableRow>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

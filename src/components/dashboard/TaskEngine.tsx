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
  Activity,
  LayoutGrid,
  List,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TaskStatus, Priority, Task, SubTask, TaskWorkflowStep, UserRole, Project, UserProfile, ADMIN_ROLES } from '@/src/types';
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
import { suggestAssignee, suggestTaskDetails } from '../../lib/gemini';
import { toast } from 'sonner';

import { emailService } from '@/src/services/emailService';

interface TaskEngineProps {
  filterProjectId?: string | null;
  onClearFilter?: () => void;
  filterAssigneeId?: string | null;
  onClearFilterAssignee?: () => void;
  filterStatus?: string | null;
  onClearFilterStatus?: () => void;
  filterPriority?: string | null;
  onClearFilterPriority?: () => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  projects: Project[];
  users: UserProfile[];
  activeTimerTaskId: string | null;
  setActiveTimerTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  elapsedTimes: Record<string, number>;
  setElapsedTimes: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  formatTime: (seconds: number) => string;
  toggleTimer: (taskId: string, e?: any) => void;
}

export function TaskEngine({ 
  filterProjectId, 
  onClearFilter, 
  filterAssigneeId,
  onClearFilterAssignee,
  filterStatus,
  onClearFilterStatus,
  filterPriority,
  onClearFilterPriority,
  tasks, 
  setTasks, 
  projects, 
  users,
  activeTimerTaskId,
  setActiveTimerTaskId,
  elapsedTimes,
  setElapsedTimes,
  formatTime,
  toggleTimer
}: TaskEngineProps) {
  const { user } = useAuth();
  const [filter, setFilter] = useState('active');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  
  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedOverTaskId, setDraggedOverTaskId] = useState<string | null>(null);
  const [draggedOverColumnId, setDraggedOverColumnId] = useState<string | null>(null);

  const COLUMNS = [
    { 
      id: 'open', 
      title: 'Open', 
      targetStatus: TaskStatus.OPEN, 
      statuses: [TaskStatus.OPEN], 
      colorClass: 'text-zinc-500 bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800' 
    },
    { 
      id: 'in_progress', 
      title: 'In Progress', 
      targetStatus: TaskStatus.IN_PROGRESS, 
      statuses: [TaskStatus.IN_PROGRESS], 
      colorClass: 'text-blue-500 bg-blue-50/20 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/35' 
    },
    { 
      id: 'review', 
      title: 'In Review', 
      targetStatus: TaskStatus.REVIEW, 
      statuses: [TaskStatus.REVIEW, TaskStatus.REVISION_REQUESTED], 
      colorClass: 'text-amber-500 bg-amber-50/20 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/35' 
    },
    { 
      id: 'blocked', 
      title: 'Blocked', 
      targetStatus: TaskStatus.BLOCKED, 
      statuses: [TaskStatus.BLOCKED], 
      colorClass: 'text-red-500 bg-red-50/20 dark:bg-red-950/10 border-red-100 dark:border-red-900/35' 
    },
    { 
      id: 'completed', 
      title: 'Completed', 
      targetStatus: TaskStatus.DONE, 
      statuses: [TaskStatus.DONE, TaskStatus.APPROVED, TaskStatus.CANCELLED], 
      colorClass: 'text-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/35' 
    },
  ];

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDraggedOverTaskId(null);
    setDraggedOverColumnId(null);
  };

  const handleDragOver = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (draggedTaskId === targetTaskId) return;
    setDraggedOverTaskId(targetTaskId);
  };

  const handleDragLeave = () => {
    setDraggedOverTaskId(null);
  };

  const handleDropOnTask = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const sourceIndex = tasks.findIndex(t => t.id === draggedTaskId);
    const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const updatedTasks = [...tasks];
      const [draggedTask] = updatedTasks.splice(sourceIndex, 1);
      
      const targetTask = updatedTasks[targetIndex];
      if (draggedTask.status !== targetTask.status) {
        draggedTask.status = targetTask.status;
        draggedTask.updatedAt = new Date().toISOString();
      }

      updatedTasks.splice(targetIndex, 0, draggedTask);
      setTasks(updatedTasks);
      toast.success("Task reordered");
    }

    setDraggedTaskId(null);
    setDraggedOverTaskId(null);
  };

  const handleDragOverColumn = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDraggedOverColumnId(columnId);
  };

  const handleDragLeaveColumn = () => {
    setDraggedOverColumnId(null);
  };

  const handleDropOnColumn = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    const sourceTask = tasks.find(t => t.id === draggedTaskId);
    if (sourceTask) {
      if (sourceTask.status !== targetStatus) {
        handleUpdateTaskStatus(draggedTaskId, targetStatus);
      }
    }

    setDraggedTaskId(null);
    setDraggedOverTaskId(null);
    setDraggedOverColumnId(null);
  };
  
  // Task Creation State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [selectedDetailTask, setSelectedDetailTask] = useState<Task | null>(null);
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

  const [enableWorkflow, setEnableWorkflow] = useState(false);
  const [workflowTemplate, setWorkflowTemplate] = useState<string>('none');
  const [customWorkflowSteps, setCustomWorkflowSteps] = useState<Array<{ name: string; assigneeId: string }>>([
    { name: '🎨 Page Design Layout', assigneeId: '' },
    { name: '💻 Web Implementation & Code', assigneeId: '' }
  ]);

  const handleTemplateChange = (template: string) => {
    setWorkflowTemplate(template);
    if (template === 'none') {
      return;
    }
    
    // Auto-map roles based on staff roles
    const getAssigneeByRole = (roles: UserRole[]) => {
      const found = users.find(u => roles.includes(u.role) && u.role !== UserRole.CLIENT);
      return found ? found.id : (users.find(u => u.role !== UserRole.CLIENT)?.id || '');
    };

    const designerId = getAssigneeByRole([UserRole.DESIGNER, UserRole.DESIGN_LEAD]);
    const developerId = getAssigneeByRole([UserRole.WEB_DEVELOPER, UserRole.WEB_DEVELOPER]);
    const seoId = getAssigneeByRole([UserRole.SEO_SPECIALIST]);
    const writerId = getAssigneeByRole([UserRole.CONTENT_WRITER, UserRole.CONTENT_LEAD]);
    
    if (template === 'design_dev') {
      setCustomWorkflowSteps([
        { name: '🎨 Visual Page Design', assigneeId: designerId },
        { name: '💻 Web Dev Frontend Code', assigneeId: developerId }
      ]);
    } else if (template === 'seo_dev') {
      setCustomWorkflowSteps([
        { name: '🔍 Detailed SEO Sheet & Audit', assigneeId: seoId },
        { name: '🛠️ Web Technical Implementation', assigneeId: developerId }
      ]);
    } else if (template === 'copy_design_dev') {
      setCustomWorkflowSteps([
        { name: '✍️ Copywriting Content Draft', assigneeId: writerId },
        { name: '🎨 Asset Graphics & Artwork', assigneeId: designerId },
        { name: '💻 Launch Development Coding', assigneeId: developerId }
      ]);
    }
  };

  const addWorkflowStepInput = () => {
    setCustomWorkflowSteps([...customWorkflowSteps, { name: 'Next Pipeline Phase', assigneeId: '' }]);
  };

  const removeWorkflowStepInput = (index: number) => {
    setCustomWorkflowSteps(customWorkflowSteps.filter((_, idx) => idx !== index));
  };

  const updateWorkflowStepInputName = (index: number, name: string) => {
    setCustomWorkflowSteps(prev => prev.map((s, idx) => idx === index ? { ...s, name } : s));
  };

  const updateWorkflowStepInputAssignee = (index: number, assigneeId: string) => {
    setCustomWorkflowSteps(prev => prev.map((s, idx) => idx === index ? { ...s, assigneeId } : s));
  };

  const handleCreateTask = () => {
    if (!newTask.name || !newTask.projectId) {
      toast.error("Please enter a task name and select a project");
      return;
    }

    let assigneeId = newTask.assigneeId || '';
    let steps: TaskWorkflowStep[] = [];

    if (enableWorkflow && customWorkflowSteps.length > 0) {
      // Validate steps assignees
      const missingAssignee = customWorkflowSteps.some(s => !s.assigneeId);
      if (missingAssignee) {
        toast.error("Please assign a person to all workflow steps");
        return;
      }

      steps = customWorkflowSteps.map((s, idx) => ({
        id: 'ws' + Math.random().toString(36).substr(2, 9),
        name: s.name || `Stage ${idx + 1}`,
        assigneeId: s.assigneeId,
        isCompleted: false
      }));

      // The primary assignee initially is step 0's assignee
      assigneeId = steps[0].assigneeId;
    }

    if (!assigneeId) {
      toast.error("Please specify an assignee or set up the workflow pipeline");
      return;
    }

    const baseDueDate = newTask.dueDate && newTask.dueDate.trim() !== "" 
      ? newTask.dueDate 
      : new Date().toISOString().split('T')[0];

    const taskToAdd: Task = {
      ...newTask as Task,
      id: 't' + Math.random().toString(36).substr(2, 9),
      deliverableId: 'custom-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assigneeId,
      subTasks: [],
      workflowSteps: enableWorkflow ? steps : undefined,
      currentStepIndex: enableWorkflow ? 0 : undefined,
      isRecurring: newTask.isRecurring || false,
      recurrenceInterval: newTask.recurrenceInterval || 1,
      recurrenceTimes: newTask.recurrenceTimes || 1,
      recurrencePeriod: newTask.recurrencePeriod || 'week',
      recurrenceProgress: 1,
      dueDate: baseDueDate
    };

    const generatedRecurrenceTasks: Task[] = [];
    if (newTask.isRecurring && newTask.recurrenceTimes && newTask.recurrenceTimes > 1) {
      const times = newTask.recurrenceTimes;
      const period = newTask.recurrencePeriod || 'week';
      
      for (let i = 2; i <= times; i++) {
        let duedateObj = new Date(baseDueDate);
        if (isNaN(duedateObj.getTime())) {
          duedateObj = new Date();
        }
        if (period === 'week') {
          const daysToAdd = Math.round((i - 1) * (7 / (times - 1 || 1)));
          duedateObj.setDate(duedateObj.getDate() + (isNaN(daysToAdd) ? 1 : daysToAdd));
        } else {
          const daysToAdd = Math.round((i - 1) * (30 / (times - 1 || 1)));
          duedateObj.setDate(duedateObj.getDate() + (isNaN(daysToAdd) ? 1 : daysToAdd));
        }
        
        generatedRecurrenceTasks.push({
          ...taskToAdd,
          id: 't' + Math.random().toString(36).substr(2, 9),
          name: `${taskToAdd.name} (Recurring #${i})`,
          dueDate: duedateObj.toISOString().split('T')[0],
          isRecurring: true,
          recurrenceProgress: i
        });
      }
    }

    if (generatedRecurrenceTasks.length > 0) {
      setTasks([taskToAdd, ...generatedRecurrenceTasks, ...tasks]);
      toast.success(`Active schedule registered! Spawned ${generatedRecurrenceTasks.length + 1} recurring tasks.`);
    } else {
      setTasks([taskToAdd, ...tasks]);
    }

    // Send email notification for first assignee if different from creator
    const isLeadOrAdmin = user && ADMIN_ROLES.includes(user.role);
    if (isLeadOrAdmin && taskToAdd.assigneeId !== user?.id) {
      const assignee = users.find(u => u.id === taskToAdd.assigneeId);
      if (assignee && user) {
        emailService.sendTaskAssignmentEmail(assignee, taskToAdd, user);
      }
    }

    setIsCreateDialogOpen(false);
    
    // Reset inputs
    setNewTask({
      name: '',
      projectId: filterProjectId || '',
      type: 'Web Development',
      status: TaskStatus.OPEN,
      priority: Priority.NORMAL,
      dueDate: new Date().toISOString().split('T')[0],
      assigneeId: user?.id || '',
      description: '',
      timeEstimate: 0,
      isRecurring: false,
      recurrenceInterval: 1,
      recurrenceTimes: 1,
      recurrencePeriod: 'week'
    });
    setEnableWorkflow(false);
    setWorkflowTemplate('none');
    setCustomWorkflowSteps([
      { name: '🎨 Page Design Layout', assigneeId: '' },
      { name: '💻 Web Implementation & Code', assigneeId: '' }
    ]);
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

  const handleAutoFillDetails = async () => {
    if (!newTask.name) {
      toast.error("Please enter a task name first");
      return;
    }
    setIsAutoFilling(true);
    try {
      const result = await suggestTaskDetails(newTask.name);
      if (result) {
        setNewTask(prev => ({
          ...prev,
          priority: result.priority as Priority,
          type: result.type
        }));
        toast.success(`AI suggested: ${result.type} | ${result.priority}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("AI could not classify the task details");
    } finally {
      setIsAutoFilling(false);
    }
  };

  const baseFilteredTasks = tasks.filter(t => {
    // Project filter logic
    if (filterProjectId && t.projectId !== filterProjectId) {
      return false;
    }

    // External Assignee filter logic
    if (filterAssigneeId && t.assigneeId !== filterAssigneeId) {
      return false;
    }

    // External Status filter logic
    if (filterStatus) {
      const normalizedStatus = filterStatus.toString().replace('_', ' ');
      if (t.status.toString().replace('_', ' ').toLowerCase() !== normalizedStatus.toLowerCase()) {
        return false;
      }
    }

    // External Priority filter logic
    if (filterPriority && t.priority.toString().toLowerCase() !== filterPriority.toString().toLowerCase()) {
      return false;
    }

    // Role based visibility
    const isLeadOrAdmin = user && ADMIN_ROLES.includes(user.role);

    // If not lead/admin, only see assigned tasks
    if (!isLeadOrAdmin && t.assigneeId !== user?.id) {
      return false;
    }

    return true;
  });

  const filteredTasks = baseFilteredTasks.filter(t => {
    switch (filter) {
      case 'active':
        return [TaskStatus.IN_PROGRESS, TaskStatus.OPEN].includes(t.status as TaskStatus);
      case 'review':
        return [TaskStatus.REVIEW, TaskStatus.REVISION_REQUESTED].includes(t.status as TaskStatus);
      case 'backlog':
        return [TaskStatus.BLOCKED].includes(t.status as TaskStatus);
      case 'archived':
        return [TaskStatus.DONE, TaskStatus.CANCELLED, TaskStatus.APPROVED].includes(t.status as TaskStatus);
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

  const completeWorkflowStep = (taskId: string, stepId: string) => {
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id !== taskId || !task.workflowSteps) return task;

        const updatedSteps = task.workflowSteps.map(step => {
          if (step.id === stepId) {
            return { ...step, isCompleted: true, completedAt: new Date().toISOString() };
          }
          return step;
        });

        const currentIndex = task.currentStepIndex ?? 0;
        const nextIndex = currentIndex + 1;
        
        let newAssigneeId = task.assigneeId;
        let newStatus = task.status;
        let newCurrentStepIndex = currentIndex;

        const completedStep = task.workflowSteps[currentIndex];

        if (nextIndex < updatedSteps.length) {
          // Reassign to the next step's assignee!
          newAssigneeId = updatedSteps[nextIndex].assigneeId;
          newCurrentStepIndex = nextIndex;
          newStatus = TaskStatus.OPEN; // Reset status for the next team member to start

          // Trigger handoff notification
          const previousAssigneeProfile = users.find(u => u.id === completedStep.assigneeId);
          const nextAssigneeProfile = users.find(u => u.id === newAssigneeId);
          if (nextAssigneeProfile && previousAssigneeProfile) {
            emailService.sendWorkflowHandoffEmail(
              nextAssigneeProfile,
              task,
              previousAssigneeProfile,
              completedStep.name
            );
          }
        } else {
          // All steps completed! Final task completion!
          newStatus = TaskStatus.DONE;
          toast.success(`All workflow stages for "${task.name}" are complete! 🎉`);
        }

        return {
          ...task,
          workflowSteps: updatedSteps,
          currentStepIndex: newCurrentStepIndex,
          assigneeId: newAssigneeId,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
      });
    });
  };

  const resetWorkflowStep = (taskId: string, stepId: string) => {
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id !== taskId || !task.workflowSteps) return task;

        const targetStepIndex = task.workflowSteps.findIndex(s => s.id === stepId);
        if (targetStepIndex === -1) return task;

        const updatedSteps = task.workflowSteps.map((step, idx) => {
          if (idx >= targetStepIndex) {
            return { ...step, isCompleted: false, completedAt: undefined };
          }
          return step;
        });

        const newAssigneeId = updatedSteps[targetStepIndex].assigneeId;

        return {
          ...task,
          workflowSteps: updatedSteps,
          currentStepIndex: targetStepIndex,
          assigneeId: newAssigneeId,
          status: TaskStatus.REVISION_REQUESTED,
          updatedAt: new Date().toISOString()
        };
      });
    });
  };

  const handleUpdateTaskStatus = (taskId: string, targetStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      if (t.status === targetStatus) return t;

      // Check if task has workflow steps and user is completing the phase
      if (t.workflowSteps && t.workflowSteps.length > 0 && (targetStatus === TaskStatus.DONE || targetStatus === TaskStatus.APPROVED)) {
        const currentIndex = t.currentStepIndex ?? 0;
        
        if (currentIndex < t.workflowSteps.length) {
          const currentStep = t.workflowSteps[currentIndex];
          const nextIndex = currentIndex + 1;
          const updatedSteps = t.workflowSteps.map((step, idx) => 
            idx === currentIndex ? { ...step, isCompleted: true, completedAt: new Date().toISOString() } : step
          );

          if (nextIndex < updatedSteps.length) {
            // Reassign to next step assignee and keep task open!
            const newAssigneeId = updatedSteps[nextIndex].assigneeId;
            const previousAssigneeProfile = users.find(u => u.id === currentStep.assigneeId);
            const nextAssigneeProfile = users.find(u => u.id === newAssigneeId);

            if (nextAssigneeProfile && previousAssigneeProfile) {
              emailService.sendWorkflowHandoffEmail(
                nextAssigneeProfile,
                t,
                previousAssigneeProfile,
                currentStep.name
              );
            }

            return {
              ...t,
              status: TaskStatus.OPEN, // Return to Open for the next developer
              assigneeId: newAssigneeId,
              currentStepIndex: nextIndex,
              workflowSteps: updatedSteps,
              updatedAt: new Date().toISOString()
            };
          } else {
            // All steps finished!
            toast.success(`All workflow stages for "${t.name}" are complete! 🎉`);
            return {
              ...t,
              status: TaskStatus.DONE,
              workflowSteps: updatedSteps,
              updatedAt: new Date().toISOString()
            };
          }
        }
      }

      // Default status update if no workflow active or not finalizing
      return { ...t, status: targetStatus, updatedAt: new Date().toISOString() };
    }));
  };

  const selectedProject = filterProjectId ? projects.find(p => p.id === filterProjectId) : null;

  return (
    <div className="space-y-4">
      {(filterProjectId || filterAssigneeId || filterStatus || filterPriority) && (
        <div className="bg-zinc-950 dark:bg-zinc-900 border border-zinc-850 text-white p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
          <div className="flex flex-wrap items-center gap-1.5 text-zinc-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mr-1.5">ACTIVE FILTERS:</span>
            {filterProjectId && (
              <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-400 px-2.5 py-0.5 rounded-md border border-orange-500/25">
                📁 Project: {selectedProject?.name || 'Selected'}
                <button onClick={onClearFilter} className="ml-1.5 text-zinc-400 hover:text-white font-extrabold cursor-pointer text-[12px] leading-none">×</button>
              </span>
            )}
            {filterAssigneeId && (
              <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 px-2.5 py-0.5 rounded-md border border-purple-500/25">
                👨‍💻 Assignee: {users.find(u => u.id === filterAssigneeId)?.name || 'Selected'}
                <button onClick={onClearFilterAssignee} className="ml-1.5 text-zinc-400 hover:text-white font-extrabold cursor-pointer text-[12px] leading-none">×</button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-md border border-blue-500/25">
                📈 Status: {filterStatus.replace('_', ' ')}
                <button onClick={onClearFilterStatus} className="ml-1.5 text-zinc-400 hover:text-white font-extrabold cursor-pointer text-[12px] leading-none">×</button>
              </span>
            )}
            {filterPriority && (
              <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 px-2.5 py-0.5 rounded-md border border-rose-500/25">
                ⚡ Priority: {filterPriority}
                <button onClick={onClearFilterPriority} className="ml-1.5 text-zinc-400 hover:text-white font-extrabold cursor-pointer text-[12px] leading-none">×</button>
              </span>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              if (onClearFilter) onClearFilter();
              if (onClearFilterAssignee) onClearFilterAssignee();
              if (onClearFilterStatus) onClearFilterStatus();
              if (onClearFilterPriority) onClearFilterPriority();
            }}
            className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 h-7 rounded-lg cursor-pointer px-3"
          >
            Clear All
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
        {viewMode === 'list' ? (
          <div className="flex items-center space-x-4 sm:space-x-6 text-xs sm:text-sm font-medium overflow-x-auto whitespace-nowrap scrollbar-none pb-1 sm:pb-0">
            <button 
              onClick={() => setFilter('active')}
              className={cn(
                "pb-2 transition-all cursor-pointer text-xs sm:text-sm",
                filter === 'active' ? "text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 font-bold" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-655"
              )}
            >
              Active Tasks
            </button>
            <button 
              onClick={() => setFilter('review')}
              className={cn(
                "pb-2 transition-all cursor-pointer text-xs sm:text-sm",
                filter === 'review' ? "text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 font-bold" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-655"
              )}
            >
              Review Required
            </button>
            <button 
              onClick={() => setFilter('backlog')}
              className={cn(
                "pb-2 transition-all cursor-pointer text-xs sm:text-sm",
                filter === 'backlog' ? "text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 font-bold" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-655"
              )}
            >
              Backlog
            </button>
            <button 
              onClick={() => setFilter('archived')}
              className={cn(
                "pb-2 transition-all cursor-pointer text-xs sm:text-sm",
                filter === 'archived' ? "text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 font-bold" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-655"
              )}
            >
              Archived
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2 py-1">
            <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">Interactive Sprint Board</span>
            <Badge variant="outline" className="text-[10px] font-bold uppercase py-0 px-2 tracking-wider text-brand-secondary border-brand-secondary bg-brand-secondary/5">
              Drag-And-Drop Active
            </Badge>
          </div>
        )}

        <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-all",
                viewMode === 'list' 
                  ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100 font-bold" 
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
              onClick={() => setViewMode('list')}
              title="Switch to Tabular List View"
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-all",
                viewMode === 'board' 
                  ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100 font-bold" 
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
              onClick={() => setViewMode('board')}
              title="Switch to Column Sprint Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </Button>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger 
              render={
                <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-xl px-4 h-10 font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Create Task
                </Button>
              }
            />
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto scrollbar-thin rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight">Create New Task</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Task Name</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    type="button"
                    className="h-6 text-[9px] font-extrabold uppercase tracking-widest text-orange-500 hover:text-orange-600 hover:bg-orange-50 px-2"
                    onClick={handleAutoFillDetails}
                    disabled={isAutoFilling}
                  >
                    <Sparkles className={cn("w-3 h-3 mr-1", isAutoFilling && "animate-spin")} />
                    {isAutoFilling ? "Analyzing..." : "⚡ AI Auto-Fill Details"}
                  </Button>
                </div>
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
              
              {!enableWorkflow && (
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
              )}

              <div className="grid grid-cols-2 gap-4 animate-fade-in">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</Label>
                  <Select 
                    value={newTask.status} 
                    onValueChange={(v) => setNewTask({...newTask, status: v as TaskStatus})}
                    disabled={enableWorkflow}
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

              {/* Recurring Task Period Setup Panel */}
              <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-150 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100 flex items-center">
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-orange-550" />
                      Recurring Task Automation
                    </Label>
                    <p className="text-[10px] text-zinc-500 font-medium">Auto-creates duplicate tasks spaced evenly over week/month.</p>
                  </div>
                  <Checkbox 
                    id="isRecurringCheckbox"
                    checked={newTask.isRecurring || false} 
                    onCheckedChange={(checked) => setNewTask({...newTask, isRecurring: !!checked, recurrenceTimes: checked ? 3 : 1})}
                    className="brand-checkbox border-zinc-350"
                  />
                </div>

                {newTask.isRecurring && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-200/50"
                  >
                    <div className="grid gap-1.5">
                      <Label className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-400">Frequency Period</Label>
                      <Select 
                        value={newTask.recurrencePeriod || 'week'} 
                        onValueChange={(v) => setNewTask({...newTask, recurrencePeriod: v as 'week' | 'month'})}
                      >
                        <SelectTrigger className="rounded-xl border-zinc-200 h-9 text-xs bg-white dark:bg-zinc-950">
                          <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="week">Weekly Recurring</SelectItem>
                          <SelectItem value="month">Monthly Recurring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-400">Times Per Period</Label>
                      <Input 
                        type="number"
                        min="2"
                        max="24"
                        className="rounded-xl border-zinc-200 h-9 text-xs bg-white dark:bg-zinc-950"
                        value={newTask.recurrenceTimes || 3}
                        onChange={(e) => setNewTask({...newTask, recurrenceTimes: parseInt(e.target.value) || 2})}
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Advanced multi-stage visual sequencing panel */}
              <div className="border-t border-zinc-150 dark:border-zinc-800 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Enable Multi-Person Workflow Pipeline</Label>
                    <span className="text-[10px] text-zinc-455 dark:text-zinc-500 font-medium leading-tight mt-1">Automatically hands off task sequentially across multiple assignees upon phase completion</span>
                  </div>
                  <Checkbox 
                    checked={enableWorkflow} 
                    onCheckedChange={(checked) => setEnableWorkflow(!!checked)}
                    className="brand-checkbox"
                  />
                </div>

                {enableWorkflow && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-1"
                  >
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Workflow Template Preset</Label>
                      <Select value={workflowTemplate} onValueChange={handleTemplateChange}>
                        <SelectTrigger className="rounded-xl border-zinc-200">
                          <SelectValue placeholder="Custom (Unpresetted)" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="none">Custom Setup (No Preset)</SelectItem>
                          <SelectItem value="design_dev">🎨 Design Handoff to Web Dev</SelectItem>
                          <SelectItem value="seo_dev">🔍 SEO Sheet Handoff to Tech Dev</SelectItem>
                          <SelectItem value="copy_design_dev">✍️ Copywriting ➜ Art ➜ Web CMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pipeline Progression Phases</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-[9px] font-extrabold uppercase text-brand-secondary hover:underline p-0 cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            addWorkflowStepInput();
                          }}
                        >
                          + Add Progression Step
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin">
                        {customWorkflowSteps.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-zinc-55/40 dark:bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-850 relative group">
                            <span className="text-xs font-black text-zinc-400 w-4">{idx + 1}</span>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <Input 
                                placeholder="Stage Name..." 
                                className="h-8 rounded-lg text-[11px] font-bold"
                                value={step.name}
                                onChange={(e) => updateWorkflowStepInputName(idx, e.target.value)}
                              />
                              <Select 
                                value={step.assigneeId} 
                                onValueChange={(val) => updateWorkflowStepInputAssignee(idx, val)}
                              >
                                <SelectTrigger className="h-8 rounded-lg text-[11px] font-semibold">
                                  <SelectValue placeholder="Assign To" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[160px]">
                                  {users.filter(u => u.role !== UserRole.CLIENT).map(u => (
                                    <SelectItem key={u.id} value={u.id} className="text-xs">{u.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-6 h-6 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-zinc-100 opacity-60 group-hover:opacity-100 transition-colors shrink-0"
                              onClick={(e) => {
                                e.preventDefault();
                                removeWorkflowStepInput(idx);
                              }}
                              disabled={customWorkflowSteps.length <= 1}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button 
                onClick={handleCreateTask}
                className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl h-12 font-bold uppercase tracking-widest text-xs cursor-pointer shadow-md"
              >
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {viewMode === 'list' ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/30">
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
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragOver={(e) => handleDragOver(e, task.id)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDropOnTask(e, task.id)}
                    className={cn(
                      "group transition-colors cursor-pointer border-zinc-50 dark:border-zinc-900",
                      isExpanded ? "bg-zinc-50/50 dark:bg-zinc-900/40" : "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/20",
                      draggedTaskId === task.id && "opacity-40 bg-zinc-100 dark:bg-zinc-800",
                      draggedOverTaskId === task.id && "border-t border-t-brand-secondary bg-brand-secondary/5"
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
                              <AvatarFallback className="text-[10px] font-bold bg-zinc-100">
                                {assignee?.name ? assignee.name.charAt(0) : '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-semibold">{assignee?.name || 'Unassigned'}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="min-w-[240px]">
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
                          handleUpdateTaskStatus(task.id, newStatus as TaskStatus);
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

                              {/* Automated Handoff Pipeline Progression Stepper */}
                              {task.workflowSteps && task.workflowSteps.length > 0 && (
                                <div className="p-5 bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800 rounded-2xl space-y-3.5 mt-4 shadow-sm">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                                        Workflow Pipeline Handoff
                                      </span>
                                      <Badge variant="outline" className="text-[9px] font-extrabold bg-brand-secondary/5 text-brand-secondary border-brand-secondary/20 dark:border-brand-secondary/30 rounded-md">
                                        STAGE { (task.currentStepIndex ?? 0) + 1 } of { task.workflowSteps.length }
                                      </Badge>
                                    </div>
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-extrabold uppercase tracking-widest">
                                      {task.workflowSteps[task.currentStepIndex ?? 0].isCompleted ? "✓ Finished" : "➔ Sequential Route"}
                                    </span>
                                  </div>

                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1">
                                    <div className="flex flex-1 items-center space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                                      {task.workflowSteps.map((step, idx) => {
                                        const isCompleted = step.isCompleted;
                                        const isActive = idx === (task.currentStepIndex ?? 0);
                                        const stepAssignee = users.find(u => u.id === step.assigneeId);

                                        return (
                                          <React.Fragment key={step.id}>
                                            {idx > 0 && (
                                              <div className={cn(
                                                "h-0.5 w-6 shrink-0 transition-colors hidden md:block",
                                                isCompleted ? "bg-brand-secondary" : "bg-zinc-200 dark:bg-zinc-800"
                                              )} />
                                            )}
                                            <div className={cn(
                                              "flex items-center space-x-2.5 p-2 rounded-xl border transition-all shrink-0 min-w-[170px]",
                                              isActive 
                                                ? "bg-brand-secondary/5 dark:bg-brand-secondary/10 border-brand-secondary/30 ring-1 ring-brand-secondary/5 shadow-sm" 
                                                : isCompleted 
                                                  ? "bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-800/50 opacity-80"
                                                  : "bg-white dark:bg-zinc-950/40 border-zinc-100 dark:border-zinc-900 opacity-50"
                                            )}>
                                              <div className={cn(
                                                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                                isCompleted 
                                                  ? "bg-emerald-500 text-white" 
                                                  : isActive 
                                                    ? "bg-brand-secondary text-white animate-pulse" 
                                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                                              )}>
                                                {isCompleted ? "✓" : idx + 1}
                                              </div>
                                              <div className="flex flex-col truncate">
                                                <span className={cn(
                                                  "text-xs font-bold truncate tracking-tight text-zinc-800 dark:text-zinc-200",
                                                  isCompleted && "line-through text-zinc-400 dark:text-zinc-650"
                                                )}>
                                                  {step.name}
                                                </span>
                                                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 truncate">
                                                  {stepAssignee?.name || 'Unassigned'}
                                                </span>
                                              </div>
                                            </div>
                                          </React.Fragment>
                                        );
                                      })}
                                    </div>

                                    {/* Next Step complete trigger CTA */}
                                    {((task.currentStepIndex ?? 0) < task.workflowSteps.length) && (
                                      <Button
                                        size="sm"
                                        className="bg-brand-secondary hover:bg-brand-secondary/95 text-white font-bold text-[9px] uppercase tracking-wider h-8 rounded-xl shrink-0 cursor-pointer shadow-sm transition-all shadow-brand-secondary/10"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          completeWorkflowStep(task.id, task.workflowSteps![task.currentStepIndex ?? 0].id);
                                        }}
                                      >
                                        🚀 Complete Step & Hand off
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Time Log / Estimation Panel */}
                              <div className="p-4 bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800 rounded-2xl space-y-3 mt-4 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center space-x-2">
                                    <Clock className="w-3.5 h-3.5 text-brand-secondary" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                                      Time tracker & Manual Log
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                                    Total Logged: {formatTime(elapsedTimes[task.id] || 0)}
                                  </span>
                                </div>

                                <div className="grid grid-cols-3 gap-6 max-w-sm mt-3">
                                  <div className="flex flex-col gap-1.5">
                                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Hours</label>
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      className="h-8 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center"
                                      value={Math.floor((elapsedTimes[task.id] || 0) / 3600) || ''}
                                      onChange={(e) => {
                                        const hours = Math.max(0, parseInt(e.target.value) || 0);
                                        const currentSecs = elapsedTimes[task.id] || 0;
                                        const mins = Math.floor((currentSecs % 3600) / 60);
                                        const secs = currentSecs % 60;
                                        const newTotal = (hours * 3600) + (mins * 60) + secs;
                                        
                                        setElapsedTimes(prev => ({ ...prev, [task.id]: newTotal }));
                                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeLoggedSeconds: newTotal, timeLogged: parseFloat((newTotal / 3600).toFixed(4)) } : t));
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Minutes</label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="59"
                                      placeholder="0"
                                      className="h-8 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center"
                                      value={Math.floor(((elapsedTimes[task.id] || 0) % 3600) / 60) || ''}
                                      onChange={(e) => {
                                        const mins = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                        const currentSecs = elapsedTimes[task.id] || 0;
                                        const hours = Math.floor(currentSecs / 3600);
                                        const secs = currentSecs % 60;
                                        const newTotal = (hours * 3600) + (mins * 60) + secs;

                                        setElapsedTimes(prev => ({ ...prev, [task.id]: newTotal }));
                                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeLoggedSeconds: newTotal, timeLogged: parseFloat((newTotal / 3600).toFixed(4)) } : t));
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Seconds</label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="59"
                                      placeholder="0"
                                      className="h-8 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-center"
                                      value={((elapsedTimes[task.id] || 0) % 60) || ''}
                                      onChange={(e) => {
                                        const secs = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                        const currentSecs = elapsedTimes[task.id] || 0;
                                        const hours = Math.floor(currentSecs / 3600);
                                        const mins = Math.floor((currentSecs % 3600) / 60);
                                        const newTotal = (hours * 3600) + (mins * 60) + secs;

                                        setElapsedTimes(prev => ({ ...prev, [task.id]: newTotal }));
                                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeLoggedSeconds: newTotal, timeLogged: parseFloat((newTotal / 3600).toFixed(4)) } : t));
                                      }}
                                    />
                                  </div>
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
      ) : (
        <div className="flex flex-row space-x-4 overflow-x-auto pb-6 select-none scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-805">
          {COLUMNS.map((column) => {
            const columnTasks = baseFilteredTasks.filter(t => column.statuses.includes(t.status));
            const isOverColumn = draggedOverColumnId === column.id;

            return (
              <div 
                key={column.id}
                onDragOver={(e) => handleDragOverColumn(e, column.id)}
                onDragLeave={handleDragLeaveColumn}
                onDrop={(e) => handleDropOnColumn(e, column.targetStatus)}
                className={cn(
                  "flex flex-col min-w-[280px] sm:min-w-[325px] max-w-[360px] flex-1 rounded-2xl border p-4 transition-all duration-200 shrink-0",
                  isOverColumn 
                    ? "bg-zinc-100/90 dark:bg-zinc-900/45 border-dashed border-2 border-brand-secondary ring-2 ring-brand-secondary/10" 
                    : "bg-white dark:bg-zinc-950/25 border-zinc-200/80 dark:border-zinc-850 shadow-sm"
                )}
              >
                {/* Column Title Header */}
                <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-850 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className={cn("text-xs font-bold uppercase tracking-wider", column.colorClass.split(' ')[0])}>
                      {column.title}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-extrabold font-mono rounded-full px-2 h-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350">
                      {columnTasks.length}
                    </Badge>
                  </div>
                </div>

                {/* Column Cards Container */}
                <div className="flex flex-col gap-3 min-h-[450px]">
                  {columnTasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-100 dark:border-zinc-850 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/5 text-center text-zinc-400 dark:text-zinc-600 text-xs italic">
                      <span>Drop tasks here</span>
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const assignee = users.find(u => u.id === task.assigneeId);
                      const project = projects.find(p => p.id === task.projectId);
                      const isExpanded = expandedTasks.includes(task.id);
                      const subtaskCount = task.subTasks?.length || 0;
                      const completedCount = task.subTasks?.filter(st => st.isCompleted).length || 0;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragOver={(e) => handleDragOver(e, task.id)}
                          onDragLeave={handleDragLeave}
                          onDragEnd={handleDragEnd}
                          onDrop={(e) => handleDropOnTask(e, task.id)}
                          onClick={() => setSelectedDetailTask(task)}
                          className={cn(
                            "bg-white dark:bg-zinc-90 w-full border border-zinc-200/60 dark:border-zinc-800 p-4 rounded-xl shadow-sm transition-all duration-150 cursor-pointer hover:shadow-md hover:scale-[1.01] hover:border-zinc-300 dark:hover:border-zinc-700",
                            draggedTaskId === task.id && "opacity-45 scale-[0.98] border-dashed border-zinc-300 dark:border-zinc-700",
                            draggedOverTaskId === task.id && "border-t-2 border-brand-secondary pt-2 bg-brand-secondary/5 dark:bg-brand-secondary/10"
                          )}
                        >
                          {/* Card Header Tag & Priority */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest truncate max-w-40">
                              {project?.name || 'Global'}
                            </span>
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                task.priority === Priority.HIGH || task.priority === Priority.CRITICAL ? "bg-red-500" : "bg-zinc-300 dark:bg-zinc-600"
                              )} />
                              <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tighter">
                                {task.priority}
                              </span>
                            </div>
                          </div>

                          {/* Card Main Title */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(task.id);
                            }}
                            className="cursor-pointer group"
                          >
                            <h4 className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-brand-secondary transition-colors line-clamp-2">
                              {task.name}
                            </h4>
                            <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-semibold uppercase tracking-widest mt-1">
                              {task.type}
                            </div>
                          </div>

                          {/* Pipeline Badge on card when not expanded */}
                          {task.workflowSteps && task.workflowSteps.length > 0 && (
                            <div className="mt-3 p-1.5 bg-zinc-55/60 dark:bg-zinc-90 w/40 rounded-xl border border-zinc-150 dark:border-zinc-800/80 flex items-center justify-between text-[10px] font-semibold text-zinc-550 dark:text-zinc-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}>
                              <span className="truncate max-w-[170px] flex items-center gap-1.5">
                                <span className="text-[8px] uppercase font-black text-brand-secondary shrink-0 tracking-wider">🔄 Active:</span>
                                <span className="text-zinc-700 dark:text-zinc-300 font-extrabold truncate">{task.workflowSteps[task.currentStepIndex ?? 0].name}</span>
                              </span>
                              <span className="shrink-0 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-305 font-mono text-[9px] px-1.5 rounded-full">
                                {(task.currentStepIndex ?? 0) + 1}/{task.workflowSteps.length}
                              </span>
                            </div>
                          )}

                          {/* Progress bar inside card if subtasks exist */}
                          {subtaskCount > 0 && (
                            <div className="mt-4 space-y-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}>
                              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                                <span>SUBTASKS</span>
                                <span>{completedCount}/{subtaskCount} ({Math.round((completedCount/subtaskCount)*100)}%)</span>
                              </div>
                              <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-brand-secondary rounded-full transition-all duration-300" 
                                  style={{ width: `${(completedCount / subtaskCount) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Inline Subtasks Details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800/50 mt-3 pt-3"
                              >
                                <div className="space-y-2">
                                  {task.description && (
                                     <div className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-lg border border-zinc-150 dark:border-zinc-800 mb-2 font-medium">
                                       {task.description}
                                     </div>
                                  )}

                                  {task.subTasks?.map((subtask) => (
                                    <div 
                                      key={subtask.id} 
                                      className="flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950 p-2 rounded-lg border border-zinc-100 dark:border-zinc-850 shadow-sm"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <Checkbox 
                                          checked={subtask.isCompleted} 
                                          onCheckedChange={() => toggleSubtask(task.id, subtask.id)}
                                          className="brand-checkbox"
                                        />
                                        <span className={cn(
                                          "text-xs font-semibold text-zinc-700 dark:text-zinc-300",
                                          subtask.isCompleted ? "text-zinc-400 dark:text-zinc-650" : ""
                                        )}>
                                          {subtask.name}
                                        </span>
                                      </div>
                                    </div>
                                  ))}

                                  <div className="flex items-center space-x-1 pt-1">
                                    <div className="relative flex-1">
                                      <Input 
                                        placeholder="Add sub-task..." 
                                        className="h-8 bg-white dark:bg-zinc-900 border-zinc-205 dark:border-zinc-800 text-xs pl-7 focus-visible:ring-brand-secondary/20"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            addSubtask(task.id, (e.target as HTMLInputElement).value);
                                            (e.target as HTMLInputElement).value = '';
                                          }
                                        }}
                                      />
                                      <Plus className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-450" />
                                    </div>
                                  </div>

                                  {/* Compact Pipeline Progression Stepper for Card Drawer Layout */}
                                  {task.workflowSteps && task.workflowSteps.length > 0 && (
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800 rounded-xl space-y-3.5 mt-3 shadow-sm">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-450 dark:text-zinc-500">Pipeline Route</span>
                                        <Badge variant="outline" className="text-[8px] font-extrabold bg-brand-secondary/5 text-brand-secondary border-brand-secondary/20 dark:border-brand-secondary/30 rounded-md py-0 px-1.5 h-4">
                                          STEP { (task.currentStepIndex ?? 0) + 1 } / { task.workflowSteps.length }
                                        </Badge>
                                      </div>
                                      <div className="relative pl-1 space-y-3">
                                        {/* Left connecting timeline vertical bar */}
                                        <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-zinc-200 dark:bg-zinc-850" />
                                        {task.workflowSteps.map((step, idx) => {
                                          const isCompleted = step.isCompleted;
                                          const isActive = idx === (task.currentStepIndex ?? 0);
                                          const stepAssignee = users.find(u => u.id === step.assigneeId);

                                          return (
                                            <div key={step.id} className={cn(
                                              "flex items-center justify-between pl-0.5 relative z-10 transition-all",
                                              isActive ? "scale-[1.01] bg-brand-secondary/[0.03] p-1 rounded-lg border border-brand-secondary/15" : "opacity-80"
                                            )}>
                                              <div className="flex items-center space-x-2.5 min-w-0">
                                                <div className={cn(
                                                  "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold border shrink-0 transition-all",
                                                  isCompleted 
                                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" 
                                                    : isActive 
                                                      ? "bg-brand-secondary border-brand-secondary text-white animate-pulse" 
                                                      : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
                                                )}>
                                                  {isCompleted ? "✓" : idx + 1}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                  <span className={cn(
                                                    "text-[11px] font-bold truncate tracking-tight text-zinc-800 dark:text-zinc-200",
                                                    isCompleted && "line-through text-zinc-450 dark:text-zinc-650"
                                                  )}>
                                                    {step.name}
                                                  </span>
                                                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 truncate">
                                                    {stepAssignee?.name || 'Unassigned'}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Trigger complete handoff action */}
                                      {((task.currentStepIndex ?? 0) < task.workflowSteps.length) && (
                                        <Button
                                          size="sm"
                                          className="w-full bg-brand-secondary hover:bg-brand-secondary/95 text-white font-bold text-[9px] uppercase tracking-wider py-1.5 h-8 rounded-xl shrink-0 cursor-pointer shadow-sm transition-all shadow-brand-secondary/5 mt-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            completeWorkflowStep(task.id, task.workflowSteps![task.currentStepIndex ?? 0].id);
                                          }}
                                        >
                                          🚀 Complete Stage & Hand off
                                        </Button>
                                      )}
                                    </div>
                                  )}

                                  {/* Time Log / Estimation Panel */}
                                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800 rounded-xl space-y-3 mt-3 shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-450 dark:text-zinc-500">Time Settings</span>
                                      <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest bg-zinc-150 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                                        Total: {formatTime(elapsedTimes[task.id] || 0)}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">Hrs</label>
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          className="h-8 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-1.5 text-center"
                                          value={Math.floor((elapsedTimes[task.id] || 0) / 3600) || ''}
                                          onChange={(e) => {
                                            const hours = Math.max(0, parseInt(e.target.value) || 0);
                                            const currentSecs = elapsedTimes[task.id] || 0;
                                            const mins = Math.floor((currentSecs % 3600) / 60);
                                            const secs = currentSecs % 60;
                                            const newTotal = (hours * 3600) + (mins * 60) + secs;
                                            
                                            setElapsedTimes(prev => ({ ...prev, [task.id]: newTotal }));
                                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeLoggedSeconds: newTotal, timeLogged: parseFloat((newTotal / 3600).toFixed(4)) } : t));
                                          }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">Mins</label>
                                        <Input
                                          type="number"
                                          min="0"
                                          max="59"
                                          placeholder="0"
                                          className="h-8 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-1.5 text-center"
                                          value={Math.floor(((elapsedTimes[task.id] || 0) % 3600) / 60) || ''}
                                          onChange={(e) => {
                                            const mins = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                            const currentSecs = elapsedTimes[task.id] || 0;
                                            const hours = Math.floor(currentSecs / 3600);
                                            const secs = currentSecs % 60;
                                            const newTotal = (hours * 3600) + (mins * 60) + secs;

                                            setElapsedTimes(prev => ({ ...prev, [task.id]: newTotal }));
                                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeLoggedSeconds: newTotal, timeLogged: parseFloat((newTotal / 3600).toFixed(4)) } : t));
                                          }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">Secs</label>
                                        <Input
                                          type="number"
                                          min="0"
                                          max="59"
                                          placeholder="0"
                                          className="h-8 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-1.5 text-center"
                                          value={((elapsedTimes[task.id] || 0) % 60) || ''}
                                          onChange={(e) => {
                                            const secs = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                            const currentSecs = elapsedTimes[task.id] || 0;
                                            const hours = Math.floor(currentSecs / 3600);
                                            const mins = Math.floor((currentSecs % 3600) / 60);
                                            const newTotal = (hours * 3600) + (mins * 60) + secs;

                                            setElapsedTimes(prev => ({ ...prev, [task.id]: newTotal }));
                                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeLoggedSeconds: newTotal, timeLogged: parseFloat((newTotal / 3600).toFixed(4)) } : t));
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Card Controls Footer */}
                          <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 mt-4 pt-3 gap-2" onClick={(e) => e.stopPropagation()}>
                            {/* User Selector Dropdown */}
                            <Select 
                              value={task.assigneeId} 
                              onValueChange={(newAssigneeId) => {
                                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, assigneeId: newAssigneeId } : t));
                              }}
                            >
                              <SelectTrigger className="h-7 border-none shadow-none focus:ring-0 p-0 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-lg pr-1.5 shrink min-w-[95px] max-w-[145px] overflow-hidden text-zinc-750 dark:text-zinc-300">
                                <div className="flex items-center space-x-1.5 truncate">
                                  <Avatar className="w-5 h-5 border shadow-sm shrink-0">
                                    <AvatarFallback className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                      {assignee?.name ? assignee.name.charAt(0) : '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-[11px] font-semibold truncate">
                                    {assignee?.name ? assignee.name.split(' ')[0] : 'Unassigned'}
                                  </span>
                                </div>
                              </SelectTrigger>
                              <SelectContent className="min-w-[245px]">
                                {users.filter(u => u.role !== UserRole.CLIENT).map(u => (
                                  <SelectItem key={u.id} value={u.id}>
                                    <div className="flex items-center space-x-2">
                                      <Avatar className="w-5 h-5 border shadow-sm">
                                        <AvatarFallback className="text-[8px] font-bold bg-zinc-100 dark:bg-zinc-800">{u.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs">{u.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Clock timer + Context Trigger Menu */}
                            <div className="flex items-center space-x-1.5 shrink-0">
                              {!(elapsedTimes[task.id] > 0) && (
                                <div className="flex items-center text-[10px] text-zinc-405 dark:text-zinc-500 font-medium whitespace-nowrap font-mono mr-0.5">
                                  <Clock className="w-3 h-3 mr-1 shrink-0" />
                                  <span>{task.dueDate ? task.dueDate.split('-').slice(1).join('/') : 'N/A'}</span>
                                </div>
                              )}

                              {/* Play Timer Button */}
                              {elapsedTimes[task.id] > 0 && (
                                <span className={cn(
                                  "font-mono text-[9px] px-1.5 py-0.5 rounded-md font-semibold tracking-tight shrink-0",
                                  activeTimerTaskId === task.id ? "text-red-500 bg-red-500/10 dark:bg-red-500/20 animate-pulse" : "text-zinc-500 bg-zinc-100 dark:bg-zinc-800"
                                )}>
                                  {formatTime(elapsedTimes[task.id])}
                                </span>
                              )}
                              <Button 
                                variant={activeTimerTaskId === task.id ? "destructive" : "ghost"} 
                                size="icon"
                                className={cn(
                                  "h-7 w-7 rounded-lg transition-all cursor-pointer",
                                  activeTimerTaskId === task.id ? "bg-red-500 hover:bg-red-650 text-white animate-pulse" : "bg-zinc-50 dark:bg-zinc-805 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-550 dark:text-zinc-400"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTimer(task.id, e);
                                }}
                              >
                                {activeTimerTaskId === task.id ? (
                                  <Square className="w-2.5 h-2.5 fill-current" />
                                ) : (
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                )}
                              </Button>

                              {/* More Dropdown Trigger */}
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-7 w-7 text-zinc-400 hover:text-zinc-650 hover:bg-zinc-105 dark:hover:bg-zinc-800 rounded-lg shrink-0 cursor-pointer"
                                    />
                                  }
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 border-zinc-200 dark:border-zinc-800 space-y-1">
                                  <div className="px-2 py-1 text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Change Status</div>
                                  {Object.values(TaskStatus).map((status) => (
                                    <DropdownMenuItem
                                      key={status}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateTaskStatus(task.id, status);
                                      }}
                                      className={cn(
                                        "text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center justify-between",
                                        task.status === status ? "bg-zinc-50 dark:bg-zinc-900 text-brand-secondary font-black" : "text-zinc-600 dark:text-zinc-400"
                                      )}
                                    >
                                      <span>{status}</span>
                                      {task.status === status && <span className="text-[10px]">✓</span>}
                                    </DropdownMenuItem>
                                  ))}
                                  <div className="h-[1px] bg-zinc-100 dark:bg-zinc-850 my-1" />
                                  <DropdownMenuItem 
                                    variant="destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.id);
                                    }}
                                    className="text-xs font-bold uppercase tracking-widest cursor-pointer text-red-500 hover:text-red-650"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2 text-red-500" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Details Dialog Modal */}
      <Dialog open={!!selectedDetailTask} onOpenChange={(open) => !open && setSelectedDetailTask(null)}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto scrollbar-thin rounded-2xl p-6 bg-white dark:bg-zinc-950">
          {(() => {
            if (!selectedDetailTask) return null;
            const task = tasks.find(t => t.id === selectedDetailTask.id);
            if (!task) return null;

            const project = projects.find(p => p.id === task.projectId);
            const assignee = users.find(u => u.id === task.assigneeId);
            const subtaskCount = task.subTasks?.length || 0;
            const completedCount = task.subTasks?.filter(st => st.isCompleted).length || 0;

            return (
              <div className="space-y-6">
                <DialogHeader className="border-b border-zinc-100 dark:border-zinc-850 pb-4">
                  <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">
                    {task.name}
                  </DialogTitle>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-[10px] font-bold border-zinc-200 bg-zinc-50 dark:bg-zinc-900/25 text-zinc-500">
                      {project?.name || 'Global Project'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-bold border-zinc-200 bg-zinc-50 dark:bg-zinc-900/25 text-zinc-500">
                      {task.type}
                    </Badge>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                      Due: {task.dueDate || 'No Due Date'}
                    </span>
                  </div>
                </DialogHeader>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-900/10 p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-850 shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-405 dark:text-zinc-550 block tracking-wider">Status</span>
                    <Select 
                      value={task.status} 
                      onValueChange={(newStatus) => {
                        handleUpdateTaskStatus(task.id, newStatus as TaskStatus);
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-xl border-zinc-200 bg-white dark:bg-zinc-950 font-semibold text-xs">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="min-w-[150px]">
                        {Object.values(TaskStatus).map((status) => (
                          <SelectItem key={status} value={status} className="text-xs uppercase font-semibold">
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-405 dark:text-zinc-550 block tracking-wider">Priority</span>
                    <Select 
                      value={task.priority} 
                      onValueChange={(newPriority) => {
                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, priority: newPriority as Priority } : t));
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-xl border-zinc-200 bg-white dark:bg-zinc-950 font-semibold text-xs">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent className="min-w-[155px]">
                        {Object.values(Priority).map((priority) => (
                          <SelectItem key={priority} value={priority} className="text-xs uppercase font-semibold">
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-1 pb-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-405 dark:text-zinc-550 tracking-wider block">Assignee</span>
                    <div className="flex items-center space-x-3 bg-white dark:bg-zinc-950 border border-zinc-150 rounded-xl p-2.5 shadow-sm">
                      <Avatar className="w-8 h-8 border shadow-sm">
                        <AvatarFallback className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700">
                          {assignee?.name ? assignee.name.charAt(0) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold block text-zinc-900 dark:text-zinc-100 truncate">
                          {assignee?.name || 'Unassigned'}
                        </span>
                        <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 block">
                          {assignee?.role || 'Expert'}
                        </span>
                      </div>
                      <Select 
                        value={task.assigneeId} 
                        onValueChange={(newAssigneeId) => {
                          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, assigneeId: newAssigneeId } : t));
                        }}
                      >
                        <SelectTrigger className="h-8 border-none bg-zinc-100 hover:bg-zinc-200 rounded-lg text-[10px] px-2.5 font-bold uppercase tracking-wider max-w-[105px]">
                          Change
                        </SelectTrigger>
                        <SelectContent className="min-w-[245px]">
                          {users.filter(u => u.role !== UserRole.CLIENT).map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              <div className="flex items-center space-x-2">
                                <Avatar className="w-5 h-5 border shadow-sm">
                                  <AvatarFallback className="text-[8px] font-bold bg-zinc-100 dark:bg-zinc-800">{u.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs">{u.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {task.description && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-bold text-zinc-405 dark:text-zinc-550 tracking-wider block">Description</span>
                    <div className="text-xs text-zinc-650 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900/10 border border-zinc-150 dark:border-zinc-850 p-3.5 rounded-xl font-medium">
                      {task.description}
                    </div>
                  </div>
                )}

                {/* Workflow Stepper Progress */}
                {task.workflowSteps && task.workflowSteps.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-bold text-zinc-450 dark:text-zinc-500 tracking-wider block">Workflow Pipeline Route</span>
                    <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-4 shadow-sm">
                      <div className="relative pl-1 space-y-3.5">
                        <div className="absolute left-3.5 top-2.5 bottom-2.5 w-0.5 bg-zinc-200 dark:bg-zinc-850" />
                        {task.workflowSteps.map((step, idx) => {
                          const isCompleted = step.isCompleted;
                          const isActive = idx === (task.currentStepIndex ?? 0);
                          const stepAssignee = users.find(u => u.id === step.assigneeId);

                          return (
                            <div key={step.id} className={cn(
                              "flex items-center justify-between pl-0.5 relative z-10 transition-all",
                              isActive ? "scale-[1.01] bg-brand-secondary/[0.04] p-1.5 rounded-lg border border-brand-secondary/20" : "opacity-80"
                            )}>
                              <div className="flex items-center space-x-3.5 min-w-0">
                                <div className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold border shrink-0 transition-all",
                                  isCompleted 
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" 
                                    : isActive 
                                      ? "bg-brand-secondary border-brand-secondary text-white animate-pulse" 
                                      : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
                                )}>
                                  {isCompleted ? "✓" : idx + 1}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className={cn(
                                    "text-xs font-bold truncate tracking-tight text-zinc-800 dark:text-zinc-200",
                                    isCompleted && "line-through text-zinc-400 dark:text-zinc-600"
                                  )}>
                                    {step.name}
                                  </span>
                                  <span className="text-[10px] font-bold text-zinc-455 dark:text-zinc-500 truncate">
                                    {stepAssignee?.name || 'Unassigned'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {((task.currentStepIndex ?? 0) < task.workflowSteps.length) && (
                        <Button
                          size="sm"
                          className="w-full bg-brand-secondary hover:bg-brand-secondary/95 text-white font-bold text-xs uppercase tracking-wider py-2 h-9 rounded-xl shrink-0 cursor-pointer shadow-sm transition-all shadow-brand-secondary/5 mt-1"
                          onClick={() => {
                            completeWorkflowStep(task.id, task.workflowSteps![task.currentStepIndex ?? 0].id);
                          }}
                        >
                          🚀 Complete Current Stage & Hand off
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Subtasks */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold text-zinc-405 dark:text-zinc-550 tracking-wider">Subtasks ({completedCount}/{subtaskCount})</span>
                    {subtaskCount > 0 && <span className="text-[10px] font-mono text-zinc-400 font-bold">{Math.round((completedCount/subtaskCount)*100)}% Completed</span>}
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {task.subTasks?.map((subtask) => (
                      <div 
                        key={subtask.id} 
                        className="flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5 rounded-xl border border-zinc-150 dark:border-zinc-850 shadow-sm"
                      >
                        <div className="flex items-center space-x-2.5">
                          <Checkbox 
                            checked={subtask.isCompleted} 
                            onCheckedChange={() => toggleSubtask(task.id, subtask.id)}
                            className="brand-checkbox"
                          />
                          <span className={cn(
                            "text-xs font-semibold text-zinc-700 dark:text-zinc-300",
                            subtask.isCompleted ? "text-zinc-400 dark:text-zinc-600 line-through" : ""
                          )}>
                            {subtask.name}
                          </span>
                        </div>
                      </div>
                    ))}

                    <div className="relative pt-1">
                      <Input 
                        placeholder="Add sub-task & press Enter..." 
                        className="h-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs pl-8 pr-3 focus-visible:ring-brand-secondary/20 rounded-xl"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addSubtask(task.id, (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-450" />
                    </div>
                  </div>
                </div>

                {/* Timesheet Duration and Log Toggle inside Modal */}
                <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-850 pt-5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-extrabold text-zinc-405 dark:text-zinc-550 block">Time Spent Tracker</span>
                    <span className="font-mono text-lg font-black text-zinc-900 dark:text-white block">
                      {formatTime(elapsedTimes[task.id] || 0)}
                    </span>
                  </div>

                  <Button 
                    variant={activeTimerTaskId === task.id ? "destructive" : "ghost"} 
                    size="sm"
                    className={cn(
                      "h-9 px-4 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all cursor-pointer",
                      activeTimerTaskId === task.id ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                    )}
                    onClick={(e) => toggleTimer(task.id, e)}
                  >
                    {activeTimerTaskId === task.id ? (
                      <>Stop Live Tracker</>
                    ) : (
                      <>Start Live Tracker</>
                    )}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

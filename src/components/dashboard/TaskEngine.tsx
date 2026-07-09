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
  Sparkles,
  AlarmClock,
  BellRing,
  AlertTriangle,
  Eye,
  Users,
  Calendar,
  Folder,
  User,
  TrendingUp,
  Zap,
  GitFork,
  Workflow
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TaskStatus, Priority, Task, SubTask, TaskWorkflowStep, UserRole, Project, UserProfile, ADMIN_ROLES, isSuperAdmin } from '@/src/types';
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { useAuth } from '../../contexts/AuthContext';
import { suggestAssignee, suggestTaskDetails, suggestTimeEstimate } from '../../lib/gemini';
import { getApiUrl, safeFetch, safeStringify } from '../../lib/api';
import { toast } from 'sonner';
import { getTemplates, TemplateTask } from '../../utils/templateStorage';

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
  activeTimerSubTaskId?: string | null;
  subTaskElapsedTimes?: Record<string, number>;
  setSubTaskElapsedTimes?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  toggleSubTaskTimer?: (subTaskId: string, parentTaskId: string) => void;
  highlightedTaskId?: string | null;
  setHighlightedTaskId?: (id: string | null) => void;
}

const parseManualDurationString = (input: string): number => {
  let trimmed = input.trim().toLowerCase();
  if (!trimmed) return 0;

  // Strip out trailing labels (mins, hrs, etc.) if any
  trimmed = trimmed.replace(/\s*(?:mins|min|hrs|hr|hours|hour|m|h)\s*$/, '');

  // 1. Check HH:MM format (e.g. 01:26, 1:26)
  const hhmmRegex = /^(\d+):([0-5]?\d)$/;
  const hhmmMatch = trimmed.match(hhmmRegex);
  if (hhmmMatch) {
    const hours = parseInt(hhmmMatch[1], 10);
    const minutes = parseInt(hhmmMatch[2], 10);
    return (hours * 3600) + (minutes * 60);
  }

  // 2. Check textual format with h/m (e.g., 1h 26m, 86m)
  const flexibleHMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/);
  const flexibleMMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)/);
  
  if (flexibleHMatch || flexibleMMatch) {
    let totalSeconds = 0;
    if (flexibleHMatch) {
      totalSeconds += parseFloat(flexibleHMatch[1]) * 3600;
    }
    if (flexibleMMatch) {
      totalSeconds += parseFloat(flexibleMMatch[1]) * 60;
    }
    return totalSeconds;
  }

  // 3. Check plain number (assuming minutes)
  const numRegex = /^(\d+(?:\.\d+)?)$/;
  if (numRegex.test(trimmed)) {
    const val = parseFloat(trimmed);
    if (trimmed.includes('.')) {
      return Math.round(val * 3600);
    } else {
      return val * 60;
    }
  }

  return 0;
};

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
  toggleTimer,
  activeTimerSubTaskId = null,
  subTaskElapsedTimes = {},
  setSubTaskElapsedTimes,
  toggleSubTaskTimer,
  highlightedTaskId,
  setHighlightedTaskId
}: TaskEngineProps) {
  const { user } = useAuth();
  const [templateVersion, setTemplateVersion] = useState(0);

  React.useEffect(() => {
    const handleUpdate = () => {
      setTemplateVersion(prev => prev + 1);
    };
    window.addEventListener('blufig_templates_updated', handleUpdate);
    return () => {
      window.removeEventListener('blufig_templates_updated', handleUpdate);
    };
  }, []);

  const formatHoursMinutes = (hoursFloat: number | undefined) => {
    if (hoursFloat === undefined || hoursFloat === null || isNaN(hoursFloat) || hoursFloat === 0) return '00:00';
    const absoluteHours = Math.abs(hoursFloat);
    const hrs = Math.floor(absoluteHours);
    const mins = Math.round((absoluteHours - hrs) * 60);
    const hrsStr = hrs < 10 ? `0${hrs}` : `${hrs}`;
    const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
    const sign = hoursFloat < 0 ? '-' : '';
    return `${sign}${hrsStr}:${minsStr}`;
  };

  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});
  const [inputErrors, setInputErrors] = useState<Record<string, boolean>>({});

  const parseManualDuration = (input: string): number | null => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return 0;

    // 1. Check HH:MM format (e.g. 1:30 or 0:45)
    const hhmmRegex = /^(\d+):([0-5]?\d)$/;
    const hhmmMatch = trimmed.match(hhmmRegex);
    if (hhmmMatch) {
      const hours = parseInt(hhmmMatch[1], 10);
      const minutes = parseInt(hhmmMatch[2], 10);
      return hours * 60 + minutes;
    }

    // 2. Check textual hours/minutes format (e.g. 1h 30m, 1h, 45m, 1.5h)
    const flexibleHMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/);
    const flexibleMMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)/);
    
    if (flexibleHMatch || flexibleMMatch) {
      let totalMinutes = 0;
      if (flexibleHMatch) {
        totalMinutes += parseFloat(flexibleHMatch[1]) * 60;
      }
      if (flexibleMMatch) {
        totalMinutes += parseFloat(flexibleMMatch[1]);
      }
      return totalMinutes;
    }

    // 3. Check if it's a plain number (minutes)
    const numRegex = /^(\d+(?:\.\d+)?)$/;
    if (numRegex.test(trimmed)) {
      const val = parseFloat(trimmed);
      return val >= 0 ? val : null;
    }

    return null; // Invalid format
  };

  const handleDurationInputChange = (taskId: string, subtaskId: string, field: 'timeEstimate' | 'timeLogged', rawValue: string) => {
    const typeKey = field === 'timeEstimate' ? 'est' : 'spent';
    const draftKey = `${typeKey}-${subtaskId}`;

    setInputDrafts(prev => ({
      ...prev,
      [draftKey]: rawValue
    }));

    const parsedMinutes = parseManualDuration(rawValue);
    const isValid = parsedMinutes !== null;

    setInputErrors(prev => ({
      ...prev,
      [draftKey]: !isValid
    }));

    if (isValid) {
      if (field === 'timeEstimate') {
        updateSubtask(taskId, subtaskId, { timeEstimate: parsedMinutes / 60 });
      } else {
        const secs = Math.round(parsedMinutes * 60);
        updateSubtask(taskId, subtaskId, { 
          timeLogged: parsedMinutes / 60, 
          timeLoggedSeconds: secs 
        });
        if (setSubTaskElapsedTimes) {
          setSubTaskElapsedTimes(prev => ({
            ...prev,
            [subtaskId]: secs
          }));
        }
      }
    }
  };

  const handleDurationInputBlur = (taskId: string, subtaskId: string, field: 'timeEstimate' | 'timeLogged') => {
    const typeKey = field === 'timeEstimate' ? 'est' : 'spent';
    const draftKey = `${typeKey}-${subtaskId}`;
    
    if (!inputErrors[draftKey]) {
      setInputDrafts(prev => {
        const copy = { ...prev };
        delete copy[draftKey];
        return copy;
      });
    } else {
      setInputErrors(prev => {
        const copy = { ...prev };
        delete copy[draftKey];
        return copy;
      });
      setInputDrafts(prev => {
        const copy = { ...prev };
        delete copy[draftKey];
        return copy;
      });
      toast.error("Invalid duration format. Reverted to previous value.");
    }
  };

  const [filter, setFilter] = useState('active');
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'pipeline'>('board');
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  
  // AI status summary states
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setAiSummary(null);
    setIsSummaryDialogOpen(true);
    try {
      const data = await safeFetch(getApiUrl("/api/tasks/summary"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: safeStringify({
          tasks,
          projects,
          users,
        }),
      });

      setAiSummary(data.summary);
      toast.success("AI status summary generated successfully! Sparkles ✨");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate AI status summary.");
      setIsSummaryDialogOpen(false);
    } finally {
      setIsGeneratingSummary(false);
    }
  };
  
  // Listen to highlightedTaskId prop to auto-expand, switch tab mode, and auto-scroll
  React.useEffect(() => {
    if (highlightedTaskId) {
      setViewMode('list');
      setExpandedTasks(prev => prev.includes(highlightedTaskId) ? prev : [...prev, highlightedTaskId]);
      
      const timer = setTimeout(() => {
        const rowEl = document.getElementById(`task-row-${highlightedTaskId}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);

      // Reset selection after 4 seconds to enable re-clicking of the same notification
      const resetTimer = setTimeout(() => {
        if (setHighlightedTaskId) {
          setHighlightedTaskId(null);
        }
      }, 4000);

      return () => {
        clearTimeout(timer);
        clearTimeout(resetTimer);
      };
    }
  }, [highlightedTaskId, setHighlightedTaskId]);
  
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
      id: 'client_review', 
      title: 'Client Review', 
      targetStatus: TaskStatus.CLIENT_REVIEW, 
      statuses: [TaskStatus.CLIENT_REVIEW], 
      colorClass: 'text-teal-500 bg-teal-50/20 dark:bg-teal-950/10 border-teal-100 dark:border-teal-900/35' 
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

  const PIPELINE_COLUMNS = [
    {
      id: 'briefing',
      title: '📝 Phase 1: Briefing & Copywriting',
      colorClass: 'text-sky-600 dark:text-sky-400 bg-sky-50/15 border-sky-100/80 dark:border-sky-950/40',
      description: 'Requirements, copywriting, SEO research, and content brief drafting.'
    },
    {
      id: 'design',
      title: '🎨 Phase 2: Design & Assets',
      colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50/15 border-amber-100/80 dark:border-amber-950/40',
      description: 'Wireframes, UI/UX page designs, graphic assets, and visual artwork.'
    },
    {
      id: 'development',
      title: '💻 Phase 3: Web Dev & Coding',
      colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/15 border-indigo-100/80 dark:border-indigo-950/40',
      description: 'Frontend/backend coding, database schemas, and feature implementation.'
    },
    {
      id: 'feedback',
      title: '🔍 Phase 4: Review & QA Testing',
      colorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50/15 border-purple-100/80 dark:border-purple-950/40',
      description: 'Quality assurance, team review, client feedback, and bug squashing.'
    },
    {
      id: 'release',
      title: '🚀 Phase 5: Release & Deployment',
      colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/15 border-emerald-100/80 dark:border-emerald-950/40',
      description: 'Finished tasks, approved features, deployed pages, and final delivery.'
    }
  ];

  const getTaskPipelineColumnId = (task: Task): string => {
    if (task.status === TaskStatus.APPROVED || task.status === TaskStatus.DONE) {
      return 'release';
    }

    if (task.workflowSteps && task.workflowSteps.length > 0) {
      const currentIdx = task.currentStepIndex ?? 0;
      if (currentIdx >= task.workflowSteps.length) {
        return 'release';
      }
      const currentStep = task.workflowSteps[currentIdx];
      const name = currentStep.name.toLowerCase();

      if (name.includes('brief') || name.includes('draft') || name.includes('copy') || name.includes('seo') || name.includes('audit') || name.includes('writer') || name.includes('research')) {
        return 'briefing';
      }
      if (name.includes('design') || name.includes('layout') || name.includes('wireframe') || name.includes('graphic') || name.includes('asset') || name.includes('artwork') || name.includes('ux') || name.includes('ui')) {
        return 'design';
      }
      if (name.includes('dev') || name.includes('code') || name.includes('implement') || name.includes('coding') || name.includes('technical') || name.includes('engineering') || name.includes('build')) {
        return 'development';
      }
      if (name.includes('review') || name.includes('test') || name.includes('qa') || name.includes('feedback') || name.includes('approve') || name.includes('refine') || name.includes('validation')) {
        return 'feedback';
      }

      // Default by index ratio if name doesn't match
      if (currentIdx === 0) return 'briefing';
      if (currentIdx === 1) return 'design';
      if (currentIdx === 2) return 'development';
      return 'feedback';
    }

    // Ad-hoc task mapping
    switch (task.status) {
      case TaskStatus.OPEN:
        return 'briefing';
      case TaskStatus.IN_PROGRESS:
        return task.priority === Priority.CRITICAL || task.priority === Priority.HIGH ? 'development' : 'design';
      case TaskStatus.REVIEW:
      case TaskStatus.CLIENT_REVIEW:
      case TaskStatus.REVISION_REQUESTED:
        return 'feedback';
      default:
        return 'briefing';
    }
  };

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

  const handleDropOnPipelineColumn = (e: React.DragEvent, pipelineColumnId: string) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    const sourceTask = tasks.find(t => t.id === draggedTaskId);
    if (!sourceTask) return;

    setTasks(prev => prev.map(t => {
      if (t.id !== draggedTaskId) return t;

      let updatedStatus = t.status;
      let updatedStepIndex = t.currentStepIndex;
      let updatedSteps = t.workflowSteps ? [...t.workflowSteps] : undefined;

      // 1. Structured workflow task
      if (t.workflowSteps && t.workflowSteps.length > 0) {
        if (pipelineColumnId === 'release') {
          updatedStepIndex = t.workflowSteps.length;
          updatedSteps = t.workflowSteps.map(step => ({ ...step, isCompleted: true, completedAt: new Date().toISOString() }));
          updatedStatus = TaskStatus.APPROVED;
        } else {
          let targetIndex = -1;
          for (let i = 0; i < t.workflowSteps.length; i++) {
            const stepName = t.workflowSteps[i].name.toLowerCase();
            if (pipelineColumnId === 'briefing' && (stepName.includes('brief') || stepName.includes('draft') || stepName.includes('copy') || stepName.includes('seo') || stepName.includes('audit') || stepName.includes('writer') || stepName.includes('research'))) {
              targetIndex = i;
              break;
            }
            if (pipelineColumnId === 'design' && (stepName.includes('design') || stepName.includes('layout') || stepName.includes('wireframe') || stepName.includes('graphic') || stepName.includes('asset') || stepName.includes('artwork') || stepName.includes('ux') || stepName.includes('ui'))) {
              targetIndex = i;
              break;
            }
            if (pipelineColumnId === 'development' && (stepName.includes('dev') || stepName.includes('code') || stepName.includes('implement') || stepName.includes('coding') || stepName.includes('technical') || stepName.includes('engineering') || stepName.includes('build'))) {
              targetIndex = i;
              break;
            }
            if (pipelineColumnId === 'feedback' && (stepName.includes('review') || stepName.includes('test') || stepName.includes('qa') || stepName.includes('feedback') || stepName.includes('approve') || stepName.includes('refine') || stepName.includes('validation'))) {
              targetIndex = i;
              break;
            }
          }

          if (targetIndex !== -1) {
            updatedStepIndex = targetIndex;
            updatedSteps = t.workflowSteps.map((step, idx) => ({
              ...step,
              isCompleted: idx < targetIndex,
              completedAt: idx < targetIndex ? (step.completedAt || new Date().toISOString()) : undefined
            }));
            updatedStatus = TaskStatus.IN_PROGRESS;
          } else {
            const fallbackIdxs: Record<string, number> = { briefing: 0, design: 1, development: 2, feedback: Math.min(3, t.workflowSteps.length - 1) };
            const idx = fallbackIdxs[pipelineColumnId] ?? 0;
            const finalIdx = Math.min(idx, t.workflowSteps.length - 1);
            updatedStepIndex = finalIdx;
            updatedSteps = t.workflowSteps.map((step, idx) => ({
              ...step,
              isCompleted: idx < finalIdx,
              completedAt: idx < finalIdx ? (step.completedAt || new Date().toISOString()) : undefined
            }));
            updatedStatus = TaskStatus.IN_PROGRESS;
          }
        }
      } else {
        // 2. Ad-hoc Task Status transition
        switch (pipelineColumnId) {
          case 'briefing':
            updatedStatus = TaskStatus.OPEN;
            break;
          case 'design':
            updatedStatus = TaskStatus.IN_PROGRESS;
            break;
          case 'development':
            updatedStatus = TaskStatus.IN_PROGRESS;
            break;
          case 'feedback':
            updatedStatus = TaskStatus.REVIEW;
            break;
          case 'release':
            updatedStatus = TaskStatus.APPROVED;
            break;
        }
      }

      toast.success(`Pipeline progression: "${t.name}" moved to Phase: ${pipelineColumnId.toUpperCase()}`);
      return {
        ...t,
        status: updatedStatus,
        currentStepIndex: updatedStepIndex,
        workflowSteps: updatedSteps,
        updatedAt: new Date().toISOString()
      };
    }));

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
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<string>('none');
  const [isParentManual, setIsParentManual] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
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
    recurrenceTimes: 3,
    recurrencePeriod: 'week',
    recurrenceMode: 'dynamic',
    recurrenceSpacingMode: 'spaced',
    recurrenceDensity: 2,
    recurrenceDays: []
  });

  const findAutoMatchingParentTask = (taskName: string, projectId: string, allTasks: Task[]): string => {
    if (!taskName || !projectId) return 'none';
    const projTasks = allTasks.filter(t => t.projectId === projectId && !t.parentTaskId);
    const lowerName = taskName.toLowerCase();

    // Web Dev Keywords
    if (lowerName.includes('maintenance') || lowerName.includes('bug') || lowerName.includes('fix') || lowerName.includes('update') || lowerName.includes('server') || lowerName.includes('hostinger') || lowerName.includes('vps') || lowerName.includes('deploy')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('maintenance'));
      if (found) return found.id;
    }
    if (lowerName.includes('code') || lowerName.includes('dev') || lowerName.includes('build') || lowerName.includes('implement') || lowerName.includes('feature') || lowerName.includes('frontend') || lowerName.includes('backend') || lowerName.includes('integrate') || lowerName.includes('website')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('new development') || t.name.toLowerCase().includes('maintenance'));
      if (found) return found.id;
    }
    if (lowerName.includes('ad-hoc') || lowerName.includes('quick') || lowerName.includes('task') || lowerName.includes('request') || lowerName.includes('receipt') || lowerName.includes('custom')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('ad-hoc'));
      if (found) return found.id;
    }

    // Design Keywords
    if (lowerName.includes('design') || lowerName.includes('layout') || lowerName.includes('wireframe') || lowerName.includes('figma') || lowerName.includes('ui') || lowerName.includes('ux')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('layout design') || t.name.toLowerCase().includes('ui/ux'));
      if (found) return found.id;
    }
    if (lowerName.includes('graphic') || lowerName.includes('asset') || lowerName.includes('illustration') || lowerName.includes('banner') || lowerName.includes('image') || lowerName.includes('art') || lowerName.includes('logo')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('graphics') || t.name.toLowerCase().includes('asset'));
      if (found) return found.id;
    }
    if (lowerName.includes('review') || lowerName.includes('feedback') || lowerName.includes('approve') || lowerName.includes('comments')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('review') || t.name.toLowerCase().includes('feedback'));
      if (found) return found.id;
    }

    // Content Keywords
    if (lowerName.includes('write') || lowerName.includes('draft') || lowerName.includes('copy') || lowerName.includes('blog') || lowerName.includes('article') || lowerName.includes('text') || lowerName.includes('content')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('writing') || t.name.toLowerCase().includes('drafting') || t.name.toLowerCase().includes('content'));
      if (found) return found.id;
    }
    if (lowerName.includes('edit') || lowerName.includes('proof') || lowerName.includes('check') || lowerName.includes('revision')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('editing') || t.name.toLowerCase().includes('proofreading'));
      if (found) return found.id;
    }
    if (lowerName.includes('seo optimization') || lowerName.includes('meta') || lowerName.includes('title tags') || lowerName.includes('optimize')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('seo') && t.name.toLowerCase().includes('optimization'));
      if (found) return found.id;
    }

    // SEO Strategy Keywords
    if (lowerName.includes('audit') || lowerName.includes('on-page') || lowerName.includes('crawl')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('audit') || t.name.toLowerCase().includes('on-page'));
      if (found) return found.id;
    }
    if (lowerName.includes('keyword') || lowerName.includes('research') || lowerName.includes('strategy')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('keyword') || t.name.toLowerCase().includes('strategy'));
      if (found) return found.id;
    }
    if (lowerName.includes('backlink') || lowerName.includes('competitor') || lowerName.includes('link building')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('backlink') || t.name.toLowerCase().includes('competitor'));
      if (found) return found.id;
    }

    // Ads Campaign Keywords
    if (lowerName.includes('report') || lowerName.includes('monthly report') || lowerName.includes('weekly report')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('report'));
      if (found) return found.id;
    }
    if (lowerName.includes('campaign') || lowerName.includes('setup') || lowerName.includes('ideation') || lowerName.includes('ad group')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('campaign') || t.name.toLowerCase().includes('setup') || t.name.toLowerCase().includes('ideation'));
      if (found) return found.id;
    }
    if (lowerName.includes('budget') || lowerName.includes('pacing') || lowerName.includes('bid') || lowerName.includes('optimization') || lowerName.includes('performance review')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('monthly activities') || t.name.toLowerCase().includes('daily'));
      if (found) return found.id;
    }
    if (lowerName.includes('foundational') || lowerName.includes('tag manager') || lowerName.includes('gtm') || lowerName.includes('ga4') || lowerName.includes('pixel') || lowerName.includes('link')) {
      const found = projTasks.find(t => t.name.toLowerCase().includes('foundational'));
      if (found) return found.id;
    }

    // General Fallbacks
    const adhoc = projTasks.find(t => t.name.toLowerCase().includes('ad-hoc'));
    if (adhoc) return adhoc.id;
    
    const maint = projTasks.find(t => t.name.toLowerCase().includes('maintenance'));
    if (maint) return maint.id;

    const monthly = projTasks.find(t => t.name.toLowerCase().includes('monthly activities'));
    if (monthly) return monthly.id;

    return 'none';
  };

  React.useEffect(() => {
    if (!isParentManual && newTask.name && newTask.projectId) {
      const matchedId = findAutoMatchingParentTask(newTask.name, newTask.projectId, tasks);
      setSelectedParentTaskId(matchedId);
    }
  }, [newTask.name, newTask.projectId, isParentManual, tasks]);

  // Simulated Time Travel System Date
  const [simulatedDate, setSimulatedDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('blufig_simulated_date');
      return saved || new Date().toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('blufig_simulated_date', simulatedDate);
    } catch (e) {
      console.error(e);
    }
  }, [simulatedDate]);

  // Automated Dynamic Recurrence Spawner
  React.useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    let hasUpdates = false;
    const updatedTasks = [...tasks];

    // Find all master tasks that are recurring and in dynamic mode
    const masterTasks = tasks.filter(t => t.isRecurring && t.recurrenceMode === 'dynamic' && !t.parentTaskId);

    masterTasks.forEach(master => {
      const scheduledDates = master.recurringDates || [];
      
      scheduledDates.forEach((appliedDate, index) => {
        // Skip index 0 because the master task itself represents the first task
        if (index === 0) return;

        // If the applied date is on or before our simulatedDate
        if (appliedDate <= simulatedDate) {
          // Check if we've already spawned a task for this master and this appliedDate
          const alreadySpawned = tasks.some(t => t.parentTaskId === master.id && t.dueDate === appliedDate);

          if (!alreadySpawned) {
            const newId = 't' + Math.random().toString(36).substr(2, 9);
            const spawnedTask: Task = {
              ...master,
              id: newId,
              name: `${master.name} (Recurring - ${appliedDate})`,
              dueDate: appliedDate,
              isRecurring: false, // Spawned task itself is not a generator
              parentTaskId: master.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              status: TaskStatus.OPEN,
              timeLogged: 0,
              timeLoggedSeconds: 0,
              subTasks: master.subTasks ? master.subTasks.map(st => ({
                ...st,
                id: 'st' + Math.random().toString(36).substr(2, 9),
                taskId: newId,
                isCompleted: false
              })) : []
            };

            updatedTasks.unshift(spawnedTask);
            hasUpdates = true;

            toast.success(`Automation: Recurred task "${master.name}" auto-created for applied date ${appliedDate}!`, {
              duration: 5000,
              icon: '🔄'
            });
          }
        }
      });
    });

    if (hasUpdates) {
      setTasks(updatedTasks);
    }
  }, [simulatedDate, tasks, setTasks]);

  // Manual Time Log State
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  const [manualLogTask, setManualLogTask] = useState<Task | null>(null);
  const [manualLogDurationInput, setManualLogDurationInput] = useState<string>("01:00 mins");
  const [manualLogNote, setManualLogNote] = useState<string>("");
  const [isEstimatingTime, setIsEstimatingTime] = useState(false);

  const [enableWorkflow, setEnableWorkflow] = useState(false);
  const [workflowTemplate, setWorkflowTemplate] = useState<string>('none');
  const [selectedTeamTemplate, setSelectedTeamTemplate] = useState<string>('none');
  const [selectedTemplateTask, setSelectedTemplateTask] = useState<string>('');
  const [customWorkflowSteps, setCustomWorkflowSteps] = useState<Array<{ name: string; assigneeId: string }>>([
    { name: '🎨 Page Design Layout', assigneeId: '' },
    { name: '💻 Web Implementation & Code', assigneeId: '' }
  ]);
  const [pipelineAssigneeSearch, setPipelineAssigneeSearch] = useState<string>('');
  const [taskAssigneeSearch, setTaskAssigneeSearch] = useState<string>('');
  const [taskScope, setTaskScope] = useState<'all' | 'my'>('all');

  // Local task filter states
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [localPriorityFilter, setLocalPriorityFilter] = useState<string>('all');
  const [localStatusFilter, setLocalStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [localProjectFilter, setLocalProjectFilter] = useState<string>('all');
  const [localAssigneeFilter, setLocalAssigneeFilter] = useState<string>('all');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState<boolean>(false);

  const taskTypes = React.useMemo(() => {
    const types = new Set(tasks.map(t => t.type).filter(Boolean));
    return Array.from(types);
  }, [tasks]);

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (localSearchQuery.trim() !== '') count++;
    if (dateFilter !== 'all') count++;
    if (localPriorityFilter !== 'all') count++;
    if (localStatusFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (localProjectFilter !== 'all') count++;
    if (localAssigneeFilter !== 'all') count++;
    return count;
  }, [localSearchQuery, dateFilter, localPriorityFilter, localStatusFilter, typeFilter, localProjectFilter, localAssigneeFilter]);

  const handleClearLocalFilters = () => {
    setLocalSearchQuery('');
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setLocalPriorityFilter('all');
    setLocalStatusFilter('all');
    setTypeFilter('all');
    setLocalProjectFilter('all');
    setLocalAssigneeFilter('all');
    toast.success("All local filters cleared!");
  };

  const getTeamTasks = (team: string) => {
    switch (team) {
      case 'web_dev':
        return [
          { name: 'Regular maintenance tasks', type: 'Web Development', timeEstimate: 5.0, priority: Priority.NORMAL },
          { name: 'New development', type: 'Web Development', timeEstimate: 10.0, priority: Priority.HIGH },
          { name: 'Ad-hoc tasks', type: 'Web Development', timeEstimate: 2.67, priority: Priority.LOW }
        ];
      case 'design':
        return [
          { name: 'UI/UX Layout Design', type: 'Design', timeEstimate: 8.0, priority: Priority.HIGH },
          { name: 'Graphics & Asset Creation', type: 'Design', timeEstimate: 4.0, priority: Priority.NORMAL },
          { name: 'Review & Feedback Loop', type: 'Design', timeEstimate: 2.0, priority: Priority.LOW }
        ];
      case 'content':
        return [
          { name: 'Content Writing & Drafting', type: 'Content', timeEstimate: 6.0, priority: Priority.NORMAL },
          { name: 'Editing & Proofreading', type: 'Content', timeEstimate: 3.0, priority: Priority.NORMAL },
          { name: 'SEO Content Optimization', type: 'Content', timeEstimate: 2.0, priority: Priority.LOW }
        ];
      case 'seo':
        return [
          { name: 'On-Page SEO Audit', type: 'Strategy', timeEstimate: 4.0, priority: Priority.HIGH },
          { name: 'Keyword Research & Strategy', type: 'Strategy', timeEstimate: 6.0, priority: Priority.HIGH },
          { name: 'Backlink & Competitor Analysis', type: 'Strategy', timeEstimate: 5.0, priority: Priority.NORMAL }
        ];
      case 'ads_campaigns':
        return [
          { name: 'Monthly Report - May 2026', type: 'Strategy', timeEstimate: 4.0, priority: Priority.HIGH },
          { name: 'New Campaigns- Ideation & Setup', type: 'Strategy', timeEstimate: 12.0, priority: Priority.HIGH },
          { name: 'Monthly activities', type: 'Strategy', timeEstimate: 8.0, priority: Priority.NORMAL },
          { name: 'Foundational Activities', type: 'Strategy', timeEstimate: 15.0, priority: Priority.HIGH }
        ];
      default:
        return [];
    }
  };

  const handleTemplateTaskChange = (taskName: string) => {
    setSelectedTemplateTask(taskName);
    const tasksForTeam = getTeamTasks(selectedTeamTemplate);
    const found = tasksForTeam.find(t => t.name === taskName);
    if (found) {
      setNewTask(prev => ({
        ...prev,
        name: found.name,
        type: found.type,
        timeEstimate: found.timeEstimate,
        priority: found.priority
      }));
    }
  };

  const handleTeamTemplateChange = (teamVal: string) => {
    setSelectedTeamTemplate(teamVal);
    if (teamVal === 'none') {
      setSelectedTemplateTask('');
    } else {
      const tasksForTeam = getTeamTasks(teamVal);
      if (tasksForTeam.length > 0) {
        setSelectedTemplateTask(tasksForTeam[0].name);
        setNewTask(prev => ({
          ...prev,
          name: tasksForTeam[0].name,
          type: tasksForTeam[0].type,
          timeEstimate: tasksForTeam[0].timeEstimate,
          priority: tasksForTeam[0].priority
        }));
      }
    }
  };

  const handleGenerateAllTeamTasks = () => {
    if (!newTask.projectId) {
      toast.error("Please select a project first");
      return;
    }
    const tasksForTeam = getTeamTasks(selectedTeamTemplate);
    const newTasksToInject = tasksForTeam.map((tk, idx) => {
      const taskId = 't_tpl_' + Math.random().toString(36).substr(2, 9);
      
      let subTasks: any[] = [];
      if (tk.name === 'Ad-hoc tasks') {
        subTasks = [
          { id: 'st_ah1_' + Math.random().toString(36).substr(2, 9), taskId, name: "Task request receipt & validation", isCompleted: false, createdAt: new Date().toISOString() },
          { id: 'st_ah2_' + Math.random().toString(36).substr(2, 9), taskId, name: "Implementation & smoke testing", isCompleted: false, createdAt: new Date().toISOString() }
        ];
      } else if (tk.name === 'New Campaigns- Ideation & Setup') {
        subTasks = [
          "Client briefing & objective alignment",
          "Competitor ad research & intelligence",
          "Target audience definition & persona building",
          "Keyword research & negative list preparation",
          "Ad copy drafting (Headings & Descriptions)",
          "Creative asset design request (banners/video)",
          "Campaign budget & bidding strategy setup",
          "UTM tracking & conversion pixel verification",
          "Ad group staging & targeting configuration",
          "Draft campaign review & sign-off",
          "Campaign launch & initial bid adjustment"
        ].map((name, sIdx) => ({
          id: `st_ac2_${sIdx}_` + Math.random().toString(36).substr(2, 9),
          taskId,
          name,
          isCompleted: false,
          createdAt: new Date().toISOString()
        }));
      } else if (tk.name === 'Monthly activities') {
        subTasks = [
          "Daily budget & spend pacing monitor",
          "Negative keyword addition",
          "Bid adjustment & optimization",
          "Search terms report analysis",
          "Ad copy A/B performance review",
          "Quality score diagnostic review",
          "Audience segment performance audit",
          "Landing page speed & bounce check",
          "Budget relocation between ad groups",
          "Mid-month client pacing update"
        ].map((name, sIdx) => ({
          id: `st_ac3_${sIdx}_` + Math.random().toString(36).substr(2, 9),
          taskId,
          name,
          isCompleted: false,
          createdAt: new Date().toISOString()
        }));
      } else if (tk.name === 'Foundational Activities') {
        subTasks = [
          "Google Tag Manager container setup",
          "GA4 property configuration & link",
          "Google Ads account linking to GA4",
          "Conversion action setup (Purchases/Leads)",
          "Enhanced conversions activation",
          "Google Merchant Center link (if shopping)",
          "Remarketing tag installation on site",
          "Custom segment creations (All Visitors, Cart Abandoners)",
          "Ad strength standard checklist setup",
          "Billing profile verification & setup",
          "Negative placement list for display/PMax",
          "Brand safety settings & content exclusion",
          "Sitelink extensions creation (min 4)",
          "Callout extensions setup (min 4)",
          "Structured snippet setup",
          "Promo or price extension setup if applicable",
          "Automated rules configuration",
          "Merchant Center feed diagnostics",
          "Final health check & account validation"
        ].map((name, sIdx) => ({
          id: `st_ac4_${sIdx}_` + Math.random().toString(36).substr(2, 9),
          taskId,
          name,
          isCompleted: false,
          createdAt: new Date().toISOString()
        }));
      }

      return {
        id: taskId,
        projectId: newTask.projectId,
        deliverableId: 'custom-' + Date.now() + '-' + idx,
        name: tk.name,
        type: tk.type,
        assigneeId: newTask.assigneeId || user?.id || '',
        status: TaskStatus.OPEN,
        priority: tk.priority,
        dueDate: newTask.dueDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeEstimate: tk.timeEstimate,
        subTasks: subTasks
      } as Task;
    });

    setTasks(prev => [...newTasksToInject, ...prev]);
    const teamName = selectedTeamTemplate === 'web_dev' ? 'Web Dev' : 
                     selectedTeamTemplate === 'design' ? 'Design' : 
                     selectedTeamTemplate === 'content' ? 'Content' : 
                     selectedTeamTemplate === 'seo' ? 'SEO' : 
                     selectedTeamTemplate === 'ads_campaigns' ? 'Ads Campaigns' : 'Selected';
    toast.success(`Generated all ${newTasksToInject.length} tasks for ${teamName} Team!`);
    setIsCreateDialogOpen(false);
    
    // Reset selected templates
    setSelectedTeamTemplate('none');
    setSelectedTemplateTask('');
  };

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

  const handleSaveManualLog = () => {
    if (!manualLogTask) return;
    
    const changeSeconds = parseManualDurationString(manualLogDurationInput);
    if (changeSeconds <= 0) {
      toast.error("Please enter a valid duration (e.g., 01:26 or 01:26 mins)");
      return;
    }

    const changeHours = changeSeconds / 3600;

    // Get current logged seconds
    const currentSeconds = elapsedTimes[manualLogTask.id] !== undefined
      ? elapsedTimes[manualLogTask.id]
      : (manualLogTask.timeLoggedSeconds || ((manualLogTask.timeLogged || 0) * 3600));

    let nextSeconds = currentSeconds + changeSeconds;
    if (nextSeconds < 0) {
      nextSeconds = 0;
    }

    const nextHours = parseFloat((nextSeconds / 3600).toFixed(4));

    // Update elapsedTimes
    setElapsedTimes(prev => ({
      ...prev,
      [manualLogTask.id]: nextSeconds
    }));

    // Update tasks state
    setTasks(prev => prev.map(t => {
      if (t.id === manualLogTask.id) {
        return {
          ...t,
          timeLoggedSeconds: nextSeconds,
          timeLogged: nextHours,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));

    const h = Math.floor(changeSeconds / 3600);
    const m = Math.floor((changeSeconds % 3600) / 60);
    const hStr = h.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');

    toast.success(`Successfully logged manual time for "${manualLogTask.name}"!`, {
      description: `Logged: ${hStr}:${mStr} mins. New total: ${(nextSeconds / 3600).toFixed(2)}h.`
    });

    setIsManualLogOpen(false);
    setManualLogTask(null);
    setManualLogDurationInput("01:00 mins");
    setManualLogNote("");
  };

  const handleAiSuggestEstimateForTask = async (task: Task) => {
    setIsEstimatingTime(true);
    try {
      const project = projects.find(p => p.id === task.projectId);
      const res = await suggestTimeEstimate(
        task.name, 
        task.description, 
        task.type, 
        project?.name
      );
      if (res) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeEstimate: res.timeEstimate } : t));
        if (selectedDetailTask && selectedDetailTask.id === task.id) {
          setSelectedDetailTask(prev => prev ? { ...prev, timeEstimate: res.timeEstimate } : null);
        }
        toast.success(`AI Recommended Estimate: ${res.timeEstimate} hrs`, {
          description: res.justification,
          duration: 6000
        });
      }
    } catch (e) {
      toast.error("Could not generate AI estimate recommendation");
    } finally {
      setIsEstimatingTime(false);
    }
  };

  const calculateRecurringDates = (
    startDateStr: string,
    period: 'daily' | 'week' | 'month',
    times: number,
    spacingMode: 'spaced' | 'custom',
    density: number = 1,
    customDays: string[] = []
  ): string[] => {
    const dates: string[] = [];
    if (!startDateStr) return dates;

    const parseDate = (dStr: string) => {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      return new Date(dStr);
    };

    const formatDate = (dObj: Date) => {
      const yyyy = dObj.getFullYear();
      const mm = String(dObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dObj.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const start = parseDate(startDateStr);
    if (isNaN(start.getTime())) return dates;

    // Start with the initial due date
    dates.push(startDateStr);

    if (times <= 1) return dates;

    if (period === 'daily') {
      for (let i = 1; i < times; i++) {
        const dObj = new Date(start);
        dObj.setDate(start.getDate() + i);
        dates.push(formatDate(dObj));
      }
    } else if (period === 'week') {
      if (spacingMode === 'spaced') {
        for (let i = 1; i < times; i++) {
          const dObj = new Date(start);
          const weekNum = Math.floor(i / density);
          const subWeekIdx = i % density;
          const offsetDays = Math.round(subWeekIdx * (7 / density));
          dObj.setDate(start.getDate() + weekNum * 7 + offsetDays);
          dates.push(formatDate(dObj));
        }
      } else {
        if (customDays.length === 0) {
          for (let i = 1; i < times; i++) {
            const dObj = new Date(start);
            dObj.setDate(start.getDate() + i * 7);
            dates.push(formatDate(dObj));
          }
        } else {
          const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          let current = new Date(start);
          while (dates.length < times) {
            current.setDate(current.getDate() + 1);
            const name = weekdayNames[current.getDay()];
            if (customDays.includes(name)) {
              dates.push(formatDate(new Date(current)));
            }
          }
        }
      }
    } else if (period === 'month') {
      if (spacingMode === 'spaced') {
        for (let i = 1; i < times; i++) {
          const dObj = new Date(start);
          const monthNum = Math.floor(i / density);
          const subMonthIdx = i % density;
          const offsetDays = Math.round(subMonthIdx * (30 / density));
          dObj.setMonth(start.getMonth() + monthNum);
          dObj.setDate(start.getDate() + offsetDays);
          dates.push(formatDate(dObj));
        }
      } else {
        if (customDays.length === 0) {
          for (let i = 1; i < times; i++) {
            const dObj = new Date(start);
            dObj.setMonth(start.getMonth() + i);
            dates.push(formatDate(dObj));
          }
        } else {
          const daysNum = customDays.map(d => parseInt(d, 10)).filter(d => !isNaN(d));
          let current = new Date(start);
          while (dates.length < times) {
            current.setDate(current.getDate() + 1);
            if (daysNum.includes(current.getDate())) {
              dates.push(formatDate(new Date(current)));
            }
          }
        }
      }
    }

    return Array.from(new Set(dates)).sort();
  };

  const handleCreateTask = () => {
    if (selectedTeamTemplate !== 'none') {
      if (!newTask.projectId) {
        toast.error("Please select a project");
        return;
      }
      
      const pId = newTask.projectId;
      const amId = newTask.assigneeId || user?.id || '';
      const baseDueDate = newTask.dueDate || new Date().toISOString().split('T')[0];
      
      const teamTasksToAdd: Task[] = [];
      
      if (selectedTeamTemplate === 'web_dev') {
        teamTasksToAdd.push(
          {
            id: 't_wd1_' + Math.random().toString(36).substr(2, 9),
            projectId: pId,
            deliverableId: 'custom-' + Date.now() + '-1',
            name: 'Regular maintenance tasks',
            type: 'Web Development',
            assigneeId: amId,
            status: TaskStatus.OPEN,
            priority: Priority.NORMAL,
            dueDate: baseDueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeEstimate: 5.0,
            subTasks: []
          },
          {
            id: 't_wd2_' + Math.random().toString(36).substr(2, 9),
            projectId: pId,
            deliverableId: 'custom-' + Date.now() + '-2',
            name: 'New development',
            type: 'Web Development',
            assigneeId: amId,
            status: TaskStatus.OPEN,
            priority: Priority.HIGH,
            dueDate: baseDueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeEstimate: 10.0,
            subTasks: []
          },
          {
            id: 't_wd3_' + Math.random().toString(36).substr(2, 9),
            projectId: pId,
            deliverableId: 'custom-' + Date.now() + '-3',
            name: 'Ad-hoc tasks',
            type: 'Web Development',
            assigneeId: amId,
            status: TaskStatus.OPEN,
            priority: Priority.LOW,
            dueDate: baseDueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeEstimate: 2.67, // 2:40 is 2.67 hrs
            subTasks: []
          }
        );
      } else if (selectedTeamTemplate === 'design') {
        teamTasksToAdd.push(
          {
            id: 't_ds1_' + Math.random().toString(36).substr(2, 9),
            projectId: pId,
            deliverableId: 'custom-' + Date.now() + '-1',
            name: 'UI/UX Layout Design',
            type: 'Design',
            assigneeId: amId,
            status: TaskStatus.OPEN,
            priority: Priority.HIGH,
            dueDate: baseDueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeEstimate: 8.0,
            subTasks: []
          },
          {
            id: 't_ds2_' + Math.random().toString(36).substr(2, 9),
            projectId: pId,
            deliverableId: 'custom-' + Date.now() + '-2',
            name: 'Graphics & Asset Creation',
            type: 'Design',
            assigneeId: amId,
            status: TaskStatus.OPEN,
            priority: Priority.NORMAL,
            dueDate: baseDueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeEstimate: 4.0,
            subTasks: []
          },
          {
            id: 't_ds3_' + Math.random().toString(36).substr(2, 9),
            projectId: pId,
            deliverableId: 'custom-' + Date.now() + '-3',
            name: 'Review & Feedback Loop',
            type: 'Design',
            assigneeId: amId,
            status: TaskStatus.OPEN,
            priority: Priority.LOW,
            dueDate: baseDueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeEstimate: 2.0,
            subTasks: []
          }
        );
      } else if (selectedTeamTemplate === 'content') {
        teamTasksToAdd.push(
          {
            id: 't_co1_' + Math.random().toString(36).substr(2, 9),
            projectId: pId,
            deliverableId: 'custom-' + Date.now() + '-1',
            name: 'Content Writing & Drafting',
            type: 'Content',
            assigneeId: amId,
            status: TaskStatus.OPEN,
            priority: Priority.NORMAL,
            dueDate: baseDueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeEstimate: 6.0,
            subTasks: []
          },
          {
            id: 't_co2_' + Math.random().toString(36).substr(2, 9),
            projectId: pId,
            deliverableId: 'custom-' + Date.now() + '-2',
            name: 'Editing & Proofreading',
            type: 'Content',
            assigneeId: amId,
            status: TaskStatus.OPEN,
            priority: Priority.NORMAL,
            dueDate: baseDueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeEstimate: 3.0,
            subTasks: []
          },
          {
            id: 't_co3_' + Math.random().toString(36).substr(2, 9),
            projectId: pId,
            deliverableId: 'custom-' + Date.now() + '-3',
            name: 'SEO Content Optimization',
            type: 'Content',
            assigneeId: amId,
            status: TaskStatus.OPEN,
            priority: Priority.LOW,
            dueDate: baseDueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeEstimate: 2.0,
            subTasks: []
          }
        );
      } else if (selectedTeamTemplate === 'seo') {
        teamTasksToAdd.push(
          {
            id: 't_seo1_' + Math.random().toString(36).substr(2, 9),
            projectId: pId,
            deliverableId: 'custom-' + Date.now() + '-1',
            name: 'On-Page SEO Audit',
            type: 'Strategy',
            assigneeId: amId,
            status: TaskStatus.OPEN,
            priority: Priority.HIGH,
            dueDate: baseDueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeEstimate: 4.0,
            subTasks: []
          },
          {
            id: 't_seo2_' + Math.random().toString(36).substr(2, 9),
            projectId: pId,
            deliverableId: 'custom-' + Date.now() + '-2',
            name: 'Keyword Research & Strategy',
            type: 'Strategy',
            assigneeId: amId,
            status: TaskStatus.OPEN,
            priority: Priority.HIGH,
            dueDate: baseDueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeEstimate: 6.0,
            subTasks: []
          },
          {
            id: 't_seo3_' + Math.random().toString(36).substr(2, 9),
            projectId: pId,
            deliverableId: 'custom-' + Date.now() + '-3',
            name: 'Backlink & Competitor Analysis',
            type: 'Strategy',
            assigneeId: amId,
            status: TaskStatus.OPEN,
            priority: Priority.NORMAL,
            dueDate: baseDueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeEstimate: 5.0,
            subTasks: []
          }
        );
      }
      
      setTasks([...teamTasksToAdd, ...tasks]);
      toast.success(`Successfully populated standard workflow cards for the team preset!`);
      
      setIsCreateDialogOpen(false);
      setSelectedTeamTemplate('none');
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
      return;
    }

    if (!newTask.name || !newTask.projectId) {
      toast.error("Please enter a task name and select a project");
      return;
    }

    if (selectedParentTaskId !== 'none') {
      const parentTask = tasks.find(t => t.id === selectedParentTaskId);
      if (!parentTask) {
        toast.error("Selected parent task could not be found");
        return;
      }
      
      const newSubtask: SubTask = {
        id: 'st_c_' + Math.random().toString(36).substr(2, 9),
        taskId: selectedParentTaskId,
        name: newTask.name,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        assigneeId: newTask.assigneeId || '',
        status: TaskStatus.OPEN
      };

      setTasks(prev => prev.map(t => {
        if (t.id === selectedParentTaskId) {
          return {
            ...t,
            subTasks: [...(t.subTasks || []), newSubtask]
          };
        }
        return t;
      }));

      // Send email notification for subtask assignment
      if (newSubtask.assigneeId) {
        const assignee = users.find(u => u.id === newSubtask.assigneeId);
        if (assignee && user) {
          const dummyTask: Task = {
            id: selectedParentTaskId,
            projectId: parentTask.projectId,
            deliverableId: parentTask.deliverableId,
            name: `${parentTask.name} - Subtask: ${newSubtask.name}`,
            type: parentTask.type,
            assigneeId: newSubtask.assigneeId,
            status: parentTask.status,
            priority: parentTask.priority,
            dueDate: parentTask.dueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          try {
            emailService.sendTaskAssignmentEmail(assignee, dummyTask, user);
          } catch (e) {
            console.error("Subtask email notification failed", e);
          }
        }
      }

      toast.success(`Successfully added "${newTask.name}" as a subtask under "${parentTask.name}"!`);
      
      // Automatically expand the parent task so the user sees the newly created subtask checklist immediately!
      setExpandedTasks(prev => prev.includes(selectedParentTaskId) ? prev : [...prev, selectedParentTaskId]);

      setIsCreateDialogOpen(false);
      setSelectedParentTaskId('none');
      setIsParentManual(false);
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

    // Compute recurring applied dates if recurring is enabled
    let calculatedDates: string[] = [];
    const isRecur = newTask.isRecurring || false;
    if (isRecur) {
      calculatedDates = calculateRecurringDates(
        baseDueDate,
        newTask.recurrencePeriod || 'week',
        newTask.recurrenceTimes || 3,
        newTask.recurrenceSpacingMode || 'spaced',
        newTask.recurrenceDensity || 2,
        newTask.recurrenceDays || []
      );
    }

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
      isRecurring: isRecur,
      recurrenceInterval: newTask.recurrenceInterval || 1,
      recurrenceTimes: newTask.recurrenceTimes || 3,
      recurrencePeriod: newTask.recurrencePeriod || 'week',
      recurrenceMode: newTask.recurrenceMode || 'dynamic',
      recurrenceSpacingMode: newTask.recurrenceSpacingMode || 'spaced',
      recurrenceDensity: newTask.recurrenceDensity || 2,
      recurrenceDays: newTask.recurrenceDays || [],
      recurringDates: isRecur ? calculatedDates : undefined,
      recurrenceProgress: 1,
      dueDate: isRecur && calculatedDates.length > 0 ? calculatedDates[0] : baseDueDate
    };

    const generatedRecurrenceTasks: Task[] = [];
    if (isRecur && calculatedDates.length > 1) {
      if (newTask.recurrenceMode === 'instant') {
        // Pre-generate copies immediately
        for (let i = 1; i < calculatedDates.length; i++) {
          const nextDate = calculatedDates[i];
          generatedRecurrenceTasks.push({
            ...taskToAdd,
            id: 't' + Math.random().toString(36).substr(2, 9),
            name: `${taskToAdd.name} (Recurring - ${nextDate})`,
            dueDate: nextDate,
            isRecurring: false, // Instances themselves are not recurring generators
            parentTaskId: taskToAdd.id,
            recurrenceProgress: i + 1
          });
        }
      }
    }

    if (generatedRecurrenceTasks.length > 0) {
      setTasks([taskToAdd, ...generatedRecurrenceTasks, ...tasks]);
      toast.success(`Active schedule registered! Spawned ${generatedRecurrenceTasks.length + 1} recurring tasks immediately.`);
    } else if (isRecur && newTask.recurrenceMode === 'dynamic') {
      setTasks([taskToAdd, ...tasks]);
      toast.success(`Dynamic Recurring Automation registered! The automation will auto-create tasks on the applied dates: ${calculatedDates.slice(1).join(', ')}`, {
        duration: 6000
      });
    } else {
      setTasks([taskToAdd, ...tasks]);
    }

    // Send email notification to assignee whenever a task is created
    if (taskToAdd.assigneeId) {
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
      recurrenceTimes: 3,
      recurrencePeriod: 'week',
      recurrenceMode: 'dynamic',
      recurrenceSpacingMode: 'spaced',
      recurrenceDensity: 2,
      recurrenceDays: []
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

  const isUserAssignedToTask = (t: Task, userId: string | null | undefined): boolean => {
    if (!userId) return false;
    if (t.assigneeId === userId) return true;
    if (t.workflowSteps?.some(step => step.assigneeId === userId)) return true;
    if (t.subTasks?.some(st => st.assigneeId === userId)) return true;
    return false;
  };

  const baseFilteredTasks = tasks.filter(t => {
    // Project filter logic
    if (filterProjectId && t.projectId !== filterProjectId) {
      return false;
    }

    // External Assignee filter logic
    if (filterAssigneeId && !isUserAssignedToTask(t, filterAssigneeId)) {
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

    // Task Scope filter ('all' vs 'my' tasks)
    if (taskScope === 'my') {
      if (!isUserAssignedToTask(t, user?.id)) {
        return false;
      }
    }

    // Role based visibility
    const isLeadOrAdmin = user && (ADMIN_ROLES.includes(user.role) || isSuperAdmin(user));

    // If not lead/admin, only see assigned tasks, tasks where they are a workflow step assignee, or subtasks
    if (!isLeadOrAdmin && !isUserAssignedToTask(t, user?.id)) {
      return false;
    }

    // 1. Local Search Query Filter
    if (localSearchQuery.trim() !== '') {
      const query = localSearchQuery.toLowerCase();
      const matchesName = t.name.toLowerCase().includes(query);
      const matchesDesc = t.description ? t.description.toLowerCase().includes(query) : false;
      const matchesId = t.id.toLowerCase().includes(query);
      const assigneeUser = users.find(u => u.id === t.assigneeId);
      const matchesAssignee = assigneeUser ? assigneeUser.name.toLowerCase().includes(query) : false;
      const matchesSteps = t.workflowSteps?.some(step => step.name.toLowerCase().includes(query)) || false;
      const matchesSubtasks = t.subTasks?.some(st => st.name.toLowerCase().includes(query)) || false;

      if (!matchesName && !matchesDesc && !matchesId && !matchesAssignee && !matchesSteps && !matchesSubtasks) {
        return false;
      }
    }

    // 2. Local Project Filter
    if (localProjectFilter !== 'all' && t.projectId !== localProjectFilter) {
      return false;
    }

    // 3. Local Assignee Filter
    if (localAssigneeFilter !== 'all' && !isUserAssignedToTask(t, localAssigneeFilter)) {
      return false;
    }

    // 4. Local Priority Filter
    if (localPriorityFilter !== 'all' && t.priority.toString().toLowerCase() !== localPriorityFilter.toLowerCase()) {
      return false;
    }

    // 5. Local Status Filter
    if (localStatusFilter !== 'all') {
      const normLocal = localStatusFilter.replace('_', ' ').toLowerCase();
      const normTask = t.status.toString().replace('_', ' ').toLowerCase();
      if (normTask !== normLocal) {
        return false;
      }
    }

    // 6. Category / Type Filter
    if (typeFilter !== 'all' && t.type !== typeFilter) {
      return false;
    }

    // 7. Date Filter logic
    if (dateFilter !== 'all') {
      if (!t.dueDate) {
        if (dateFilter !== 'no-due-date') {
          return false;
        }
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        const taskDateStr = t.dueDate;
        
        const todayDate = new Date();
        todayDate.setHours(0,0,0,0);
        
        const taskDate = new Date(taskDateStr + 'T00:00:00');
        
        if (dateFilter === 'today') {
          if (taskDateStr !== todayStr) return false;
        } else if (dateFilter === 'tomorrow') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          if (taskDateStr !== tomorrowStr) return false;
        } else if (dateFilter === 'this-week') {
          const currentDay = todayDate.getDay();
          const startOfWeek = new Date(todayDate);
          startOfWeek.setDate(todayDate.getDate() - currentDay);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23,59,59,999);
          
          if (taskDate < startOfWeek || taskDate > endOfWeek) return false;
        } else if (dateFilter === 'this-month') {
          const currentMonth = todayDate.getMonth();
          const currentYear = todayDate.getFullYear();
          const taskMonth = taskDate.getMonth();
          const taskYear = taskDate.getFullYear();
          if (taskMonth !== currentMonth || taskYear !== currentYear) return false;
        } else if (dateFilter === 'overdue') {
          const isDoneOrCancelled = ['done', 'approved', 'cancelled'].some(st => t.status.toLowerCase() === st.toLowerCase());
          if (taskDate >= todayDate || isDoneOrCancelled) return false;
        } else if (dateFilter === 'no-due-date') {
          return false;
        } else if (dateFilter === 'custom') {
          if (customStartDate) {
            const startLimit = new Date(customStartDate + 'T00:00:00');
            if (taskDate < startLimit) return false;
          }
          if (customEndDate) {
            const endLimit = new Date(customEndDate + 'T23:59:59');
            if (taskDate > endLimit) return false;
          }
        }
      }
    }

    return true;
  });

  const filteredTasks = baseFilteredTasks.filter(t => {
    // If any top level filter or local overriding filter is explicitly applied, bypass the sub-tab category filter
    // so the user can easily see their selected filter matches in full
    if (
      filterProjectId || 
      filterAssigneeId || 
      filterStatus || 
      filterPriority || 
      localStatusFilter !== 'all' || 
      localPriorityFilter !== 'all' || 
      localProjectFilter !== 'all' || 
      localAssigneeFilter !== 'all' || 
      dateFilter !== 'all' || 
      typeFilter !== 'all' || 
      localSearchQuery.trim() !== ''
    ) {
      return true;
    }

    switch (filter) {
      case 'active':
        return [TaskStatus.IN_PROGRESS, TaskStatus.OPEN].includes(t.status as TaskStatus);
      case 'review':
        return [TaskStatus.REVIEW, TaskStatus.REVISION_REQUESTED, TaskStatus.CLIENT_REVIEW].includes(t.status as TaskStatus);
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
          subTasks: t.subTasks.map(st => {
            if (st.id === subtaskId) {
              const nextCompleted = !st.isCompleted;
              return { 
                ...st, 
                isCompleted: nextCompleted,
                status: nextCompleted ? TaskStatus.DONE : TaskStatus.OPEN
              };
            }
            return st;
          })
        };
      }
      return t;
    }));
  };

  const updateSubtaskStatus = (taskId: string, subtaskId: string, status: TaskStatus) => {
    const isCompleted = status === TaskStatus.DONE || status === TaskStatus.APPROVED;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subTasks) {
        return {
          ...t,
          subTasks: t.subTasks.map(st => 
            st.id === subtaskId ? { ...st, status, isCompleted } : st
          )
        };
      }
      return t;
    }));
  };

  const updateSubtask = (taskId: string, subtaskId: string, updates: Partial<SubTask>) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subTasks) {
        return {
          ...t,
          subTasks: t.subTasks.map(st => 
            st.id === subtaskId ? { ...st, ...updates } : st
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
      createdAt: new Date().toISOString(),
      status: TaskStatus.OPEN
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

  const deleteSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subTasks) {
        return {
          ...t,
          subTasks: t.subTasks.filter(st => st.id !== subtaskId)
        };
      }
      return t;
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const isUpcomingDeadline = (dueDateStr?: string): boolean => {
    if (!dueDateStr) return false;
    const dueDate = new Date(dueDateStr);
    if (isNaN(dueDate.getTime())) return false;
    
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);
    // Upcoming within 48 hours (we include a 12 hour window in the past to catch overdue active tasks for today)
    return diffHours <= 48 && diffHours >= -12;
  };

  const handleSnoozeTask = (taskId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      
      const baseDate = t.dueDate ? new Date(t.dueDate) : new Date();
      baseDate.setDate(baseDate.getDate() + 1);
      const newDueDate = baseDate.toISOString().split('T')[0];
      
      toast.success(`Task "${t.name}" successfully snoozed for 24 hours.`, {
        description: `New deadline: ${newDueDate}`,
        icon: '⏰'
      });
      
      return {
        ...t,
        dueDate: newDueDate,
        updatedAt: new Date().toISOString()
      };
    }));
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
      {/* Prominent Real-time Search & Filter Bar */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 pointer-events-none" />
          <Input 
            type="text"
            className="pl-11 pr-10 h-10 w-full rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            placeholder="Search tasks by title, description, assignee name, or dynamic phase step..."
          />
          {localSearchQuery && (
            <button 
              onClick={() => setLocalSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-sm font-bold bg-zinc-200/40 dark:bg-zinc-800/80 rounded-full w-5 h-5 flex items-center justify-center transition-all"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {(filterProjectId || filterAssigneeId || filterStatus || filterPriority) && (
        <div className="bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 text-white p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
          <div className="flex flex-wrap items-center gap-1.5 text-zinc-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mr-1.5">ACTIVE FILTERS:</span>
            {filterProjectId && (
              <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-400 px-2.5 py-0.5 rounded-md border border-orange-500/25">
                <Folder className="w-3 h-3 mr-1" />
                <span>Project: {selectedProject?.name || 'Selected'}</span>
                <button onClick={onClearFilter} className="ml-1.5 text-zinc-400 hover:text-white font-extrabold cursor-pointer text-[12px] leading-none">×</button>
              </span>
            )}
            {filterAssigneeId && (
              <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 px-2.5 py-0.5 rounded-md border border-purple-500/25">
                <User className="w-3 h-3 mr-1" />
                <span>Assignee: {users.find(u => u.id === filterAssigneeId)?.name || 'Selected'}</span>
                <button onClick={onClearFilterAssignee} className="ml-1.5 text-zinc-400 hover:text-white font-extrabold cursor-pointer text-[12px] leading-none">×</button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-md border border-blue-500/25">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>Status: {filterStatus.replace('_', ' ')}</span>
                <button onClick={onClearFilterStatus} className="ml-1.5 text-zinc-400 hover:text-white font-extrabold cursor-pointer text-[12px] leading-none">×</button>
              </span>
            )}
            {filterPriority && (
              <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 px-2.5 py-0.5 rounded-md border border-rose-500/25">
                <Zap className="w-3 h-3 mr-1" />
                <span>Priority: {filterPriority}</span>
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

      {/* Bulk Actions Panel */}
      <AnimatePresence>
        {selectedTaskIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 text-zinc-900 dark:text-zinc-100 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-md">
              <div className="flex items-center space-x-2.5">
                <div className="bg-amber-500 text-white font-extrabold text-xs rounded-full p-1.5 h-6 w-6 flex items-center justify-center animate-bounce">
                  {selectedTaskIds.length}
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Bulk Actions for selected tasks
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Set status dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                      "text-[10px] font-black uppercase tracking-wider h-8 bg-white dark:bg-zinc-900 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-400 cursor-pointer text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    Set Status
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 border-zinc-200 dark:border-zinc-800 space-y-1">
                    {Object.values(TaskStatus).map((statusVal) => (
                      <DropdownMenuItem
                        key={statusVal}
                        onClick={() => {
                          setTasks(prev => prev.map(t => {
                            if (!selectedTaskIds.includes(t.id)) return t;
                            return {
                              ...t,
                              status: statusVal,
                              updatedAt: new Date().toISOString()
                            };
                          }));
                          toast.success(`Successfully moved ${selectedTaskIds.length} tasks to ${statusVal}! 📊`);
                          setSelectedTaskIds([]);
                        }}
                        className="text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        {statusVal}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Update Priority Selector / Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                      "text-[10px] font-black uppercase tracking-wider h-8 bg-white dark:bg-zinc-900 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-400 cursor-pointer text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    Set Priority
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 border-zinc-200 dark:border-zinc-800 space-y-1">
                    {Object.values(Priority).map((priorityVal) => (
                      <DropdownMenuItem
                        key={priorityVal}
                        onClick={() => {
                          setTasks(prev => prev.map(t => {
                            if (!selectedTaskIds.includes(t.id)) return t;
                            return {
                              ...t,
                              priority: priorityVal,
                              updatedAt: new Date().toISOString()
                            };
                          }));
                          toast.success(`Updated priority of ${selectedTaskIds.length} tasks to ${priorityVal}! ⚡`);
                          setSelectedTaskIds([]);
                        }}
                        className="text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        {priorityVal}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Snooze selected */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTasks(prev => prev.map(t => {
                      if (!selectedTaskIds.includes(t.id)) return t;
                      const baseDate = t.dueDate ? new Date(t.dueDate) : new Date();
                      baseDate.setDate(baseDate.getDate() + 1);
                      return {
                        ...t,
                        dueDate: baseDate.toISOString().split('T')[0],
                        updatedAt: new Date().toISOString()
                      };
                    }));
                    toast.success(`Snoozed ${selectedTaskIds.length} tasks for 24 hours! ⏰`);
                    setSelectedTaskIds([]);
                  }}
                  className="text-[10px] font-black uppercase tracking-wider h-8 bg-white dark:bg-zinc-900 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-400 cursor-pointer text-zinc-700 dark:text-zinc-300"
                >
                  Bulk Snooze 24h
                </Button>

                {/* Clear selected */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedTaskIds([])}
                  className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 h-8 cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          {/* Scope Filter Switcher */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-all",
                taskScope === 'all' 
                  ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100 font-bold" 
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
              onClick={() => setTaskScope('all')}
              title="Show all tasks for this scope"
            >
              <span>All Tasks</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-all",
                taskScope === 'my' 
                  ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100 font-bold" 
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
              onClick={() => setTaskScope('my')}
              title="Show only tasks assigned to me or where I am a workflow step assignee"
            >
              <span>My Tasks</span>
            </Button>
          </div>

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
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-all",
                viewMode === 'pipeline' 
                  ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100 font-bold" 
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
              onClick={() => setViewMode('pipeline')}
              title="Switch to Pipeline Progression Phases Board"
            >
              <Workflow className="w-3.5 h-3.5 text-sky-500" />
              <span>Pipeline</span>
            </Button>
          </div>

          {/* AI Status Summary Button */}
          <Button
            size="sm"
            onClick={handleGenerateSummary}
            className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 rounded-xl px-4 h-10 font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer flex items-center shrink-0"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Status Summary
          </Button>

          {/* AI Status Summary Dialog */}
          <Dialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-900">
                <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center space-x-2.5">
                  <div className="bg-amber-505/10 text-amber-600 dark:text-amber-400 p-2 rounded-xl">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <span>AI Ops Status & Progress Summary</span>
                </DialogTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Real-time intelligence report generated from active tasks, milestones, and workloads.
                </p>
              </DialogHeader>

              <div className="flex-1 py-4 overflow-y-auto min-h-[300px] flex flex-col">
                {isGeneratingSummary ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Processing Workspace Intelligence...</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm">
                        Analyzing open projects, pending timelines, team priorities, and potential bottlenecks.
                      </p>
                    </div>
                  </div>
                ) : aiSummary ? (
                  <div className="whitespace-pre-wrap font-sans text-xs tracking-wide leading-relaxed text-zinc-700 dark:text-zinc-300 p-5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-y-auto max-h-[55vh] shadow-inner selection:bg-amber-200 selection:text-amber-900">
                    {aiSummary}
                  </div>
                ) : (
                  <div className="text-center text-zinc-500 py-12">
                    No summary loaded.
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/20 -mx-6 -mb-6 p-6 rounded-b-2xl">
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                  {aiSummary && "Generated using Gemini 3.5 AI Engine"}
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsSummaryDialogOpen(false)}
                    className="border-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl px-4 h-10 font-bold text-[10px] uppercase tracking-widest cursor-pointer"
                  >
                    Close
                  </Button>
                  {aiSummary && (
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(aiSummary);
                        toast.success("Summary report copied to clipboard! 📋");
                      }}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 border border-transparent rounded-xl px-4 h-10 font-bold text-[10px] uppercase tracking-widest cursor-pointer inline-flex items-center"
                    >
                      Copy Report
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Manual Log Time Dialog */}
          <Dialog open={isManualLogOpen} onOpenChange={setIsManualLogOpen}>
            <DialogContent className="sm:max-w-[400px] rounded-2xl p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Log Manual Time
                </DialogTitle>
                <div className="text-xs text-zinc-400 font-medium mt-1">
                  {manualLogTask ? `Logging time for: ${manualLogTask.name}` : 'Log time for task'}
                </div>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="log-duration" className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    Hours worked (hrs:mins)
                  </Label>
                  <Input
                    id="log-duration"
                    type="text"
                    value={manualLogDurationInput}
                    onChange={(e) => setManualLogDurationInput(e.target.value)}
                    placeholder="e.g., 01:26 mins or 01:26"
                    className="rounded-xl border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                  />
                  <span className="text-[10px] text-zinc-400">
                    Use format like 01:26 mins, 1.5h, or standard minutes.
                  </span>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="log-notes" className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    Activity description / Notes
                  </Label>
                  <Input
                    id="log-notes"
                    type="text"
                    value={manualLogNote}
                    onChange={(e) => setManualLogNote(e.target.value)}
                    placeholder="Brief description of what you completed"
                    className="rounded-xl border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
              <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsManualLogOpen(false)}
                  className="rounded-xl h-10 px-4 font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveManualLog}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-xl h-10 px-4 font-bold text-[10px] uppercase tracking-widest cursor-pointer"
                >
                  Log Time
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setSelectedParentTaskId('none');
              setIsParentManual(false);
            }
          }}>
            <DialogTrigger 
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-xl px-4 h-10 font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center"
              )}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Task
            </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto scrollbar-thin rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight">Create New Task</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Odoo-style Team Template Preset */}
              <div className="grid gap-3 bg-orange-500/[0.03] border border-orange-500/10 rounded-2xl p-4 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">⚡</span>
                  <Label className="text-xs font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">Team Template Preset (Odoo Style)</Label>
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                  Choose a team to automatically load standard tasks and allocated times.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Department Team</Label>
                    <Select value={selectedTeamTemplate} onValueChange={handleTeamTemplateChange}>
                      <SelectTrigger className="h-9 text-xs rounded-xl border-zinc-200">
                        <SelectValue placeholder="Select Team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Custom Task (No Preset)</SelectItem>
                        <SelectItem value="web_dev">💻 Web Dev Team</SelectItem>
                        <SelectItem value="design">🎨 Design Team</SelectItem>
                        <SelectItem value="content">✍️ Content Team</SelectItem>
                        <SelectItem value="seo">🔍 SEO Team</SelectItem>
                        <SelectItem value="ads_campaigns">📣 Ads Campaigns Team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTeamTemplate !== 'none' && (
                    <div className="space-y-1.5 animate-fade-in">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-orange-500 font-black">Preset Template Task</Label>
                      <Select value={selectedTemplateTask} onValueChange={handleTemplateTaskChange}>
                        <SelectTrigger className="h-9 text-xs rounded-xl border-orange-200/60 bg-orange-50/10 text-orange-700 dark:text-orange-400">
                          <SelectValue placeholder="Select Task Preset" />
                        </SelectTrigger>
                        <SelectContent>
                          {getTeamTasks(selectedTeamTemplate).map(tk => (
                            <SelectItem key={tk.name} value={tk.name}>
                              {tk.name} ({formatHoursMinutes(tk.timeEstimate)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {selectedTeamTemplate !== 'none' && (
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                    <span className="text-[9px] text-zinc-500 font-medium">
                      Want all tasks for this team?
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      className="h-7 text-[9px] font-extrabold uppercase tracking-widest border-orange-200 text-orange-600 hover:bg-orange-50/50 hover:text-orange-700 px-2.5 rounded-lg flex items-center gap-1 cursor-pointer"
                      onClick={handleGenerateAllTeamTasks}
                    >
                      <Plus className="w-3 h-3" />
                      Generate all {getTeamTasks(selectedTeamTemplate).length} Tasks
                    </Button>
                  </div>
                )}
              </div>

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

              <div className="grid gap-2 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50 rounded-2xl p-4.5 space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Task Placement (Add as Subtask under Main Task)
                </Label>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                  Automatically maps your task under a related team template main task, or you can select one manually.
                </p>
                <Select 
                  value={selectedParentTaskId} 
                  onValueChange={(v) => {
                    setSelectedParentTaskId(v);
                    setIsParentManual(true);
                  }}
                >
                  <SelectTrigger className="rounded-xl border-zinc-200 dark:border-zinc-800 h-10 bg-white dark:bg-zinc-950 text-xs">
                    <SelectValue placeholder="Standalone Main Task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Standalone Main Task (Top Level)</SelectItem>
                    {tasks
                      .filter(t => t.projectId === newTask.projectId && !t.parentTaskId)
                      .map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          📂 {t.name} ({t.type})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedParentTaskId !== 'none' && (
                  <p className="text-[10px] text-orange-600 dark:text-orange-400 font-extrabold mt-1 flex items-center gap-1.5 animate-fade-in bg-orange-500/[0.05] border border-orange-500/10 px-3 py-1.5 rounded-xl">
                    <span>✨</span> Auto-routed directly as a subtask of: "{tasks.find(t => t.id === selectedParentTaskId)?.name}"
                  </p>
                )}
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
                      <div className="flex items-center space-x-2 truncate">
                        {newTask.assigneeId ? (
                          <>
                            <Avatar className="w-5 h-5 border shadow-sm shrink-0">
                              <AvatarFallback className="text-[9px] font-bold bg-zinc-100 text-zinc-600">
                                {users.find(u => u.id === newTask.assigneeId)?.name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-semibold truncate">
                              {users.find(u => u.id === newTask.assigneeId)?.name || newTask.assigneeId}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-400">Select Expert</span>
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-[220px]">
                      <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        <Input
                          placeholder="Search specialist..."
                          className="h-8 text-xs px-2.5 rounded-lg border-zinc-200 dark:border-zinc-800"
                          value={taskAssigneeSearch}
                          onChange={(e) => setTaskAssigneeSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      {users
                        .filter(u => u.role !== UserRole.CLIENT)
                        .filter(u => u.name.toLowerCase().includes(taskAssigneeSearch.toLowerCase()))
                        .map(u => (
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
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Allocated Time (Hours:Minutes)</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      type="button"
                      className="h-5 text-[9px] font-extrabold uppercase tracking-widest text-brand-secondary hover:text-orange-600 hover:bg-orange-50/50 px-1.5"
                      onClick={async () => {
                        if (!newTask.name) {
                          toast.error("Please enter a task name first");
                          return;
                        }
                        setIsEstimatingTime(true);
                        try {
                          const project = projects.find(p => p.id === newTask.projectId);
                          const res = await suggestTimeEstimate(
                            newTask.name, 
                            newTask.description, 
                            newTask.type, 
                            project?.name
                          );
                          if (res) {
                            setNewTask(prev => ({ ...prev, timeEstimate: res.timeEstimate }));
                            toast.success(`AI Recommended Estimate: ${res.timeEstimate} hrs`, {
                              description: res.justification,
                              duration: 6000
                            });
                          }
                        } catch (e) {
                          toast.error("Could not generate AI estimate recommendation");
                        } finally {
                          setIsEstimatingTime(false);
                        }
                      }}
                      disabled={isEstimatingTime}
                    >
                      <Sparkles className={cn("w-3 h-3 mr-1", isEstimatingTime && "animate-spin")} />
                      {isEstimatingTime ? "Estimating..." : "🔮 AI Suggest"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative flex items-center">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <Input 
                        type="number" 
                        min="0"
                        placeholder="Hours" 
                        className="rounded-xl border-zinc-200 pl-9 pr-2 text-xs h-9"
                        value={newTask.timeEstimate !== undefined && newTask.timeEstimate !== 0 ? Math.floor(newTask.timeEstimate) : ''}
                        onChange={(e) => {
                          const hrs = parseInt(e.target.value, 10) || 0;
                          const currentVal = newTask.timeEstimate || 0;
                          const mins = Math.round((currentVal - Math.floor(currentVal)) * 60);
                          const newVal = hrs + (mins / 60);
                          setNewTask({...newTask, timeEstimate: parseFloat(newVal.toFixed(4))});
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 select-none">HRS</span>
                    </div>
                    <div className="relative flex items-center">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <Input 
                        type="number" 
                        min="0"
                        max="59"
                        placeholder="Mins" 
                        className="rounded-xl border-zinc-200 pl-9 pr-2 text-xs h-9"
                        value={newTask.timeEstimate !== undefined && newTask.timeEstimate !== 0 ? Math.round((newTask.timeEstimate - Math.floor(newTask.timeEstimate)) * 60) : ''}
                        onChange={(e) => {
                          const mins = parseInt(e.target.value, 10) || 0;
                          const hrs = Math.floor(newTask.timeEstimate || 0);
                          const newVal = hrs + (Math.min(59, Math.max(0, mins)) / 60);
                          setNewTask({...newTask, timeEstimate: parseFloat(newVal.toFixed(4))});
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 select-none">MIN</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recurring Task Period Setup Panel */}
              <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-100 space-y-3.5">
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
                    onCheckedChange={(checked) => setNewTask({
                      ...newTask, 
                      isRecurring: !!checked, 
                      recurrenceTimes: checked ? 3 : 1,
                      recurrenceMode: 'dynamic',
                      recurrenceSpacingMode: 'spaced',
                      recurrenceDensity: 2,
                      recurrenceDays: []
                    })}
                    className="brand-checkbox border-zinc-300"
                  />
                </div>

                {newTask.isRecurring && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-3 border-t border-zinc-200/50"
                  >
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="grid gap-1.5">
                        <Label className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-400">Frequency Period</Label>
                        <Select 
                          value={newTask.recurrencePeriod || 'week'} 
                          onValueChange={(v) => setNewTask({
                            ...newTask, 
                            recurrencePeriod: v as 'daily' | 'week' | 'month',
                            recurrenceDays: []
                          })}
                        >
                          <SelectTrigger className="rounded-xl border-zinc-200 h-9 text-xs bg-white dark:bg-zinc-950">
                            <SelectValue placeholder="Period" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily Recurring</SelectItem>
                            <SelectItem value="week">Weekly Recurring</SelectItem>
                            <SelectItem value="month">Monthly Recurring</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-400">Spawn Mode</Label>
                        <Select 
                          value={newTask.recurrenceMode || 'dynamic'} 
                          onValueChange={(v) => setNewTask({...newTask, recurrenceMode: v as 'instant' | 'dynamic'})}
                        >
                          <SelectTrigger className="rounded-xl border-zinc-200 h-9 text-xs bg-white dark:bg-zinc-950">
                            <SelectValue placeholder="Spawn Mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dynamic">⚙️ Applied Date (Dynamic)</SelectItem>
                            <SelectItem value="instant">⚡ All Immediately (Instant)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="grid gap-1.5">
                        <Label className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-400">Total Occurrences</Label>
                        <Input 
                          type="number"
                          min="2"
                          max="30"
                          className="rounded-xl border-zinc-200 h-9 text-xs bg-white dark:bg-zinc-950"
                          value={newTask.recurrenceTimes || 3}
                          onChange={(e) => setNewTask({...newTask, recurrenceTimes: parseInt(e.target.value) || 2})}
                        />
                      </div>

                      {newTask.recurrencePeriod !== 'daily' && (
                        <div className="grid gap-1.5">
                          <Label className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-400">Spacing Strategy</Label>
                          <Select 
                            value={newTask.recurrenceSpacingMode || 'spaced'} 
                            onValueChange={(v) => setNewTask({
                              ...newTask, 
                              recurrenceSpacingMode: v as 'spaced' | 'custom',
                              recurrenceDays: []
                            })}
                          >
                            <SelectTrigger className="rounded-xl border-zinc-200 h-9 text-xs bg-white dark:bg-zinc-950">
                              <SelectValue placeholder="Strategy" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="spaced">↔️ Spaced Evenly</SelectItem>
                              <SelectItem value="custom">📅 Specific Custom Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {newTask.recurrencePeriod !== 'daily' && newTask.recurrenceSpacingMode === 'spaced' && (
                      <div className="grid gap-1.5 pt-1">
                        <Label className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-400">
                          Density (Tasks per {newTask.recurrencePeriod === 'week' ? 'Week' : 'Month'})
                        </Label>
                        <Select
                          value={String(newTask.recurrenceDensity || 2)}
                          onValueChange={(v) => setNewTask({...newTask, recurrenceDensity: parseInt(v, 10)})}
                        >
                          <SelectTrigger className="rounded-xl border-zinc-200 h-9 text-xs bg-white dark:bg-zinc-950">
                            <SelectValue placeholder="Density" />
                          </SelectTrigger>
                          <SelectContent>
                            {newTask.recurrencePeriod === 'week' ? (
                              <>
                                <SelectItem value="1">1 time a week</SelectItem>
                                <SelectItem value="2">2 times a week (Evenly spaced)</SelectItem>
                                <SelectItem value="3">3 times a week (Evenly spaced)</SelectItem>
                                <SelectItem value="4">4 times a week (Evenly spaced)</SelectItem>
                                <SelectItem value="5">5 times a week (Weekdays)</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="1">1 time a month</SelectItem>
                                <SelectItem value="2">2 times a month (Bi-weekly spaced)</SelectItem>
                                <SelectItem value="3">3 times a month (10-day spacing)</SelectItem>
                                <SelectItem value="4">4 times a month (Weekly spacing)</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {newTask.recurrencePeriod === 'week' && newTask.recurrenceSpacingMode === 'custom' && (
                      <div className="space-y-1.5 pt-1">
                        <Label className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-400">Select Active Weekdays</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                            const isChecked = newTask.recurrenceDays?.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  const current = newTask.recurrenceDays || [];
                                  const next = current.includes(day) 
                                    ? current.filter(d => d !== day) 
                                    : [...current, day];
                                  setNewTask({...newTask, recurrenceDays: next});
                                }}
                                className={cn(
                                  "px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer",
                                  isChecked 
                                    ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100" 
                                    : "bg-white text-zinc-600 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800 hover:bg-zinc-50"
                                )}
                              >
                                {day.substring(0, 3)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {newTask.recurrencePeriod === 'month' && newTask.recurrenceSpacingMode === 'custom' && (
                      <div className="grid gap-1.5 pt-1">
                        <Label className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-400">Days of Month (comma-separated, e.g. 1, 15, 30)</Label>
                        <Input
                          placeholder="e.g. 1, 15"
                          className="rounded-xl border-zinc-200 h-9 text-xs bg-white dark:bg-zinc-950"
                          value={newTask.recurrenceDays?.join(', ') || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const days = val.split(',').map(s => s.trim()).filter(Boolean);
                            setNewTask({...newTask, recurrenceDays: days});
                          }}
                        />
                      </div>
                    )}

                    {/* Pre-calculated applied dates Preview */}
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 bg-zinc-100/50 dark:bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-200/40 dark:border-zinc-800/50 space-y-1">
                      <div className="font-bold uppercase tracking-wider text-[8px] text-zinc-500 flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                        Automation Preview (Calculated Schedule)
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1 font-mono text-[9px]">
                        {calculateRecurringDates(
                          newTask.dueDate || new Date().toISOString().split('T')[0],
                          newTask.recurrencePeriod || 'week',
                          newTask.recurrenceTimes || 3,
                          newTask.recurrenceSpacingMode || 'spaced',
                          newTask.recurrenceDensity || 2,
                          newTask.recurrenceDays || []
                        ).map((date, idx) => (
                          <span 
                            key={idx} 
                            className={cn(
                              "px-1.5 py-0.5 rounded border font-medium",
                              idx === 0 
                                ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/20 dark:border-orange-900/30 dark:text-orange-400" 
                                : "bg-zinc-200/50 border-zinc-300/40 text-zinc-700 dark:bg-zinc-800/40 dark:border-zinc-700/50 dark:text-zinc-300"
                            )}
                          >
                            {date} {idx === 0 ? '(Master)' : `(#${idx+1})`}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Advanced multi-stage visual sequencing panel */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Enable Multi-Person Workflow Pipeline</Label>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium leading-tight mt-1">Automatically hands off task sequentially across multiple assignees upon phase completion</span>
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
                          <div key={idx} className="flex items-center gap-2 bg-zinc-55/40 dark:bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800 relative group">
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
                                  <div className="flex items-center space-x-1.5 truncate">
                                    {step.assigneeId ? (
                                      <>
                                        <Avatar className="w-4 h-4 border shadow-sm shrink-0">
                                          <AvatarFallback className="text-[8px] font-black bg-zinc-100">
                                            {users.find(u => u.id === step.assigneeId)?.name?.charAt(0) || '?'}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[11px] font-semibold truncate">
                                          {users.find(u => u.id === step.assigneeId)?.name || step.assigneeId}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-[11px] text-zinc-400">Assign To</span>
                                    )}
                                  </div>
                                </SelectTrigger>
                                <SelectContent className="max-h-[220px]">
                                  <div className="p-1.5 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                                    <Input
                                      placeholder="Search specialist..."
                                      className="h-7 text-[10px] px-2 rounded-md"
                                      value={pipelineAssigneeSearch}
                                      onChange={(e) => setPipelineAssigneeSearch(e.target.value)}
                                      onKeyDown={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                  {users
                                    .filter(u => u.role !== UserRole.CLIENT)
                                    .filter(u => u.name.toLowerCase().includes(pipelineAssigneeSearch.toLowerCase()))
                                    .map(u => (
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

      {/* RECURRING AUTOMATION & TIME-TRAVEL CONTROL CENTER */}
      <div className="bg-gradient-to-r from-orange-50/70 via-zinc-50/50 to-zinc-50/70 dark:from-zinc-900/40 dark:via-zinc-950/20 dark:to-zinc-900/40 border border-orange-100 dark:border-zinc-800 rounded-2xl p-5 mb-5 shadow-sm space-y-4 relative overflow-hidden">
        {/* Subtle decorative background icon */}
        <div className="absolute right-3 top-3 opacity-5 dark:opacity-10 pointer-events-none">
          <RefreshCw className="w-24 h-24 text-orange-500 animate-spin-slow" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-orange-550 text-white p-1.5 rounded-lg">
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
              </span>
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center">
                Recurring Task Automation Sandbox
                <span className="ml-2 bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest animate-pulse">
                  Active
                </span>
              </h3>
            </div>
            <p className="text-xs text-zinc-500 max-w-2xl font-medium">
              We space your tasks evenly over weeks or months and dynamically duplicate them on their scheduled applied dates. Use the travel controls below to simulate advancing through calendar days!
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold text-zinc-400 bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            <span className="text-zinc-700 dark:text-zinc-300">AUTOMATION: RUNNING</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60">
          {/* Simulation Time Traveler controls */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-950/60 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 flex items-center">
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Time-Travel Simulator
              </Label>
              <span className="text-[10px] font-mono text-zinc-400">yyyy-mm-dd</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <Input 
                  type="date"
                  className="pl-9 text-xs h-10 rounded-xl border-zinc-200 bg-zinc-50/50 dark:bg-zinc-900 font-bold"
                  value={simulatedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSimulatedDate(e.target.value);
                      toast.info(`Simulated date set manually to ${e.target.value}`);
                    }
                  }}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-10 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setSimulatedDate(today);
                  toast.success("Simulated date reset to actual local date!");
                }}
              >
                Today
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-[10px] font-extrabold uppercase tracking-wider text-orange-700 border-orange-200 bg-orange-50/10 hover:bg-orange-50 dark:border-zinc-800 hover:text-orange-600 cursor-pointer flex items-center justify-center space-x-1"
                onClick={() => {
                  const d = new Date(simulatedDate);
                  d.setDate(d.getDate() + 1);
                  const nextVal = d.toISOString().split('T')[0];
                  setSimulatedDate(nextVal);
                }}
              >
                <span>☀️ Advance +1 Day</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 text-[10px] font-extrabold uppercase tracking-wider text-orange-700 border-orange-200 bg-orange-50/10 hover:bg-orange-50 dark:border-zinc-800 hover:text-orange-600 cursor-pointer flex items-center justify-center space-x-1"
                onClick={() => {
                  const d = new Date(simulatedDate);
                  d.setDate(d.getDate() + 7);
                  const nextVal = d.toISOString().split('T')[0];
                  setSimulatedDate(nextVal);
                }}
              >
                <span>📅 Advance +1 Week</span>
              </Button>
            </div>
          </div>

          {/* Active Dynamic Schedules list */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-950/60 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/80 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  Active Recurring Schedules
                </Label>
                <Badge variant="secondary" className="text-[9px] py-0 px-2 font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {tasks.filter(t => t.isRecurring && t.recurrenceMode === 'dynamic' && !t.parentTaskId).length} ACTIVE
                </Badge>
              </div>

              <div className="space-y-2 max-h-[125px] overflow-y-auto scrollbar-thin">
                {tasks.filter(t => t.isRecurring && t.recurrenceMode === 'dynamic' && !t.parentTaskId).length === 0 ? (
                  <div className="text-center py-4 text-xs text-zinc-400 font-medium">
                    No active schedules. Create a task with <strong className="text-orange-600">Dynamic Applied Date</strong> to test the automatic creation!
                  </div>
                ) : (
                  tasks
                    .filter(t => t.isRecurring && t.recurrenceMode === 'dynamic' && !t.parentTaskId)
                    .map(master => {
                      const spawnedCount = tasks.filter(t => t.parentTaskId === master.id).length + 1; // including master
                      const totalCount = master.recurrenceTimes || 3;
                      const nextDates = (master.recurringDates || []).slice(1); // future scheduled dates
                      const pendingDates = nextDates.filter(d => d > simulatedDate);
                      const nextUpcoming = pendingDates.length > 0 ? pendingDates[0] : 'Fully Spawned';

                      return (
                        <div key={master.id} className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                          <div className="space-y-0.5 max-w-[70%]">
                            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 truncate" title={master.name}>
                              {master.name}
                            </h4>
                            <div className="flex items-center space-x-2 text-[9px] text-zinc-400 font-medium">
                              <span className="capitalize font-bold text-orange-600">{master.recurrencePeriod}ly</span>
                              <span>•</span>
                              <span>Strategy: <span className="capitalize font-bold">{master.recurrenceSpacingMode || 'spaced'}</span></span>
                              <span>•</span>
                              <span>Next Spawn: <strong className="font-mono text-zinc-600 dark:text-zinc-300">{nextUpcoming}</strong></span>
                            </div>
                          </div>

                          <div className="text-right space-y-0.5">
                            <div className="text-[10px] font-extrabold text-zinc-700 dark:text-zinc-300">
                              {spawnedCount} / {totalCount} Tasks
                            </div>
                            <div className="w-20 bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-orange-550 h-full transition-all duration-300" 
                                style={{ width: `${Math.min(100, (spawnedCount / totalCount) * 100)}%` }} 
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADVANCED TASK FILTERS COMPONENT */}
      <div className="bg-card border border-zinc-200/60 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="bg-zinc-100 dark:bg-zinc-900 p-2 rounded-xl text-zinc-700 dark:text-zinc-300">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Advanced Task Filters
              </h4>
              <p className="text-[11px] text-zinc-400 font-medium">
                Showing <span className="font-bold text-zinc-800 dark:text-zinc-200">{filteredTasks.length}</span> of <span className="font-bold text-zinc-800 dark:text-zinc-200">{tasks.length}</span> total tasks
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearLocalFilters}
                className="h-8 text-[10px] font-bold uppercase tracking-widest bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20"
              >
                Clear Filters ({activeFiltersCount})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="h-8 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {isFiltersExpanded ? 'Hide Options' : 'Show Options'}
            </Button>
          </div>
        </div>

        {/* Filters Quick-Access Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mr-1">Quick Dates:</span>
          {[
            { label: 'All', value: 'all' },
            { label: 'Due Today', value: 'today' },
            { label: 'Due Tomorrow', value: 'tomorrow' },
            { label: 'This Week', value: 'this-week' },
            { label: 'This Month', value: 'this-month' },
            { label: 'Overdue', value: 'overdue' },
            { label: 'No Due Date', value: 'no-due-date' },
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => {
                setDateFilter(pill.value);
                if (pill.value !== 'custom') {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }
              }}
              className={cn(
                "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer",
                dateFilter === pill.value 
                  ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100" 
                  : "bg-zinc-50 text-zinc-500 border-zinc-200/50 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <AnimatePresence initial={false}>
          {isFiltersExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden pt-3 border-t border-zinc-100 dark:border-zinc-900"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {/* Search query input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Search Title & Desc</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                    <Input
                      type="text"
                      value={localSearchQuery}
                      onChange={(e) => setLocalSearchQuery(e.target.value)}
                      placeholder="Search tasks..."
                      className="pl-8 pr-7 h-9 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
                    />
                    {localSearchQuery && (
                      <button 
                        onClick={() => setLocalSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 text-xs font-bold"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Project Filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Project</label>
                  <Select value={localProjectFilter} onValueChange={setLocalProjectFilter}>
                    <SelectTrigger className="w-full h-9 rounded-xl bg-muted/20 border-zinc-200 dark:border-zinc-800 text-xs">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-card border-border">
                      <SelectItem value="all" className="text-xs">📂 All Projects</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">📁 {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignee Filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Assignee</label>
                  <Select value={localAssigneeFilter} onValueChange={setLocalAssigneeFilter}>
                    <SelectTrigger className="w-full h-9 rounded-xl bg-muted/20 border-zinc-200 dark:border-zinc-800 text-xs">
                      <SelectValue placeholder="All Assignees" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-card border-border">
                      <SelectItem value="all" className="text-xs">👨‍💻 All Assignees</SelectItem>
                      {users.filter(u => u.role !== UserRole.CLIENT).map(u => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">👤 {u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Selection Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Date Range Mode</label>
                  <Select 
                    value={dateFilter} 
                    onValueChange={(val) => {
                      setDateFilter(val);
                      if (val !== 'custom') {
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-9 rounded-xl bg-muted/20 border-zinc-200 dark:border-zinc-800 text-xs">
                      <SelectValue placeholder="Select Dates" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-card border-border">
                      <SelectItem value="all" className="text-xs">🗓️ All Dates</SelectItem>
                      <SelectItem value="today" className="text-xs">☀️ Due Today</SelectItem>
                      <SelectItem value="tomorrow" className="text-xs">🌅 Due Tomorrow</SelectItem>
                      <SelectItem value="this-week" className="text-xs">📅 Due This Week</SelectItem>
                      <SelectItem value="this-month" className="text-xs">📆 Due This Month</SelectItem>
                      <SelectItem value="overdue" className="text-xs">⚠️ Overdue Tasks</SelectItem>
                      <SelectItem value="no-due-date" className="text-xs">🛑 No Due Date</SelectItem>
                      <SelectItem value="custom" className="text-xs">✨ Custom Range...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Priority</label>
                  <Select value={localPriorityFilter} onValueChange={setLocalPriorityFilter}>
                    <SelectTrigger className="w-full h-9 rounded-xl bg-muted/20 border-zinc-200 dark:border-zinc-800 text-xs">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-card border-border">
                      <SelectItem value="all" className="text-xs">⚡ All Priorities</SelectItem>
                      {Object.values(Priority).map(prio => (
                        <SelectItem key={prio} value={prio.toLowerCase()} className="text-xs">🛑 {prio}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</label>
                  <Select value={localStatusFilter} onValueChange={setLocalStatusFilter}>
                    <SelectTrigger className="w-full h-9 rounded-xl bg-muted/20 border-zinc-200 dark:border-zinc-800 text-xs">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-card border-border">
                      <SelectItem value="all" className="text-xs">📊 All Statuses</SelectItem>
                      {Object.values(TaskStatus).map(st => (
                        <SelectItem key={st} value={st} className="text-xs">⚙️ {st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category/Department Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Category/Department</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full h-9 rounded-xl bg-muted/20 border-zinc-200 dark:border-zinc-800 text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-card border-border">
                      <SelectItem value="all" className="text-xs">🏷️ All Categories</SelectItem>
                      {taskTypes.map(type => (
                        <SelectItem key={type} value={type} className="text-xs">🔹 {type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Collapsible custom date range controls */}
              {dateFilter === 'custom' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col sm:flex-row gap-3 pt-3 mt-3 border-t border-dashed border-zinc-100 dark:border-zinc-900"
                >
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Custom Start Date</label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-9 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Custom End Date</label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-9 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
                    />
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {viewMode === 'list' ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/30">
              <TableRow>
                <TableHead className="w-[85px] py-4 pl-4 align-middle">
                  <div className="flex items-center space-x-2.5">
                    <Checkbox 
                      checked={filteredTasks.length > 0 && filteredTasks.every(t => selectedTaskIds.includes(t.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTaskIds(prev => {
                            const newlySelected = filteredTasks.map(t => t.id);
                            return Array.from(new Set([...prev, ...newlySelected]));
                          });
                        } else {
                          setSelectedTaskIds(prev => prev.filter(id => !filteredTasks.some(t => t.id === id)));
                        }
                      }}
                      className="brand-checkbox"
                    />
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Sel</span>
                  </div>
                </TableHead>
                <TableHead className="w-[450px] text-[10px] uppercase font-bold tracking-widest py-4">Task Name</TableHead>
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
                  <TableCell colSpan={9} className="h-32 text-center text-zinc-500 font-medium italic text-sm">
                    No tasks found in this category.
                  </TableCell>
                </TableRow>
              ) : filteredTasks.map((task) => {
                const assignee = users.find(u => u.id === task.assigneeId);
                const project = projects.find(p => p.id === task.projectId);
                const isExpanded = expandedTasks.includes(task.id);
                const subtaskCount = task.subTasks?.length || 0;
                const completedCount = task.subTasks?.filter(st => st.isCompleted).length || 0;
                const isUpcoming = isUpcomingDeadline(task.dueDate) && ![TaskStatus.DONE, TaskStatus.APPROVED, TaskStatus.CANCELLED].includes(task.status as TaskStatus);
                
                return (
                  <React.Fragment key={task.id}>
                  <TableRow 
                    id={`task-row-${task.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragOver={(e) => handleDragOver(e, task.id)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDropOnTask(e, task.id)}
                    className={cn(
                      "group transition-all cursor-pointer border-zinc-50 dark:border-zinc-900",
                      isExpanded ? "bg-zinc-50/50 dark:bg-zinc-900/40" : "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/20",
                      draggedTaskId === task.id && "opacity-40 bg-zinc-100 dark:bg-zinc-800",
                      draggedOverTaskId === task.id && "border-t border-t-brand-secondary bg-brand-secondary/5",
                      task.id === highlightedTaskId && "ring-2 ring-orange-500 bg-orange-500/5 dark:bg-orange-550/5 transition-all scale-[1.01]",
                      isUpcoming && "animate-pulse-amber ring-1 ring-amber-500/35 bg-amber-50/5 dark:bg-amber-950/5"
                    )}
                    onClick={() => toggleExpand(task.id)}
                  >
                    <TableCell className="py-4 pl-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center space-x-3.5">
                        <Checkbox 
                          checked={selectedTaskIds.includes(task.id)}
                          onCheckedChange={(checked) => {
                            setSelectedTaskIds(prev => 
                              checked ? [...prev, task.id] : prev.filter(id => id !== task.id)
                            );
                          }}
                          className="brand-checkbox"
                        />
                        <button 
                          onClick={() => toggleExpand(task.id)}
                          className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm tracking-tight">{task.name}</span>
                          {task.isRecurring && (
                            <Badge variant="outline" className="text-[9px] font-black uppercase text-orange-500 border-orange-500/30 bg-orange-500/5 px-1.5 py-0 select-none shrink-0 flex items-center space-x-1">
                              <RefreshCw className="w-2.5 h-2.5 text-orange-500 animate-[spin_10s_linear_infinite]" />
                              <span>Recurring</span>
                            </Badge>
                          )}
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
                          const targetAssignee = users.find(u => u.id === newAssigneeId);
                          if (targetAssignee && user) {
                            emailService.sendTaskAssignmentEmail(targetAssignee, task, user);
                          }
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
                          task.status === TaskStatus.CLIENT_REVIEW && "bg-teal-50 text-teal-600 border-teal-100",
                          task.status === TaskStatus.REVISION_REQUESTED && "bg-purple-50 text-purple-600 border-purple-100",
                          task.status === TaskStatus.APPROVED && "bg-indigo-50 text-indigo-600 border-indigo-100",
                          task.status === TaskStatus.DONE && "bg-emerald-50 text-emerald-600 border-emerald-100",
                          task.status === TaskStatus.BLOCKED && "bg-rose-50 text-rose-600 border-rose-100",
                          task.status === TaskStatus.CANCELLED && "bg-red-50 text-red-600 border-red-105"
                        )}>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-zinc-200">
                          <SelectItem value={TaskStatus.OPEN} className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 focus:bg-zinc-50">Open</SelectItem>
                          <SelectItem value={TaskStatus.IN_PROGRESS} className="text-[10px] font-bold uppercase tracking-widest text-blue-600 focus:bg-blue-50">In Progress</SelectItem>
                          <SelectItem value={TaskStatus.REVIEW} className="text-[10px] font-bold uppercase tracking-widest text-amber-600 focus:bg-amber-50">Review</SelectItem>
                          <SelectItem value={TaskStatus.CLIENT_REVIEW} className="text-[10px] font-bold uppercase tracking-widest text-teal-600 focus:bg-teal-50">Client Review</SelectItem>
                          <SelectItem value={TaskStatus.REVISION_REQUESTED} className="text-[10px] font-bold uppercase tracking-widest text-purple-600 focus:bg-purple-50">Revision Requested</SelectItem>
                          <SelectItem value={TaskStatus.APPROVED} className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 focus:bg-indigo-50">Approved</SelectItem>
                          <SelectItem value={TaskStatus.DONE} className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 focus:bg-emerald-50">Done</SelectItem>
                          <SelectItem value={TaskStatus.BLOCKED} className="text-[10px] font-bold uppercase tracking-widest text-rose-600 focus:bg-rose-50">Blocked</SelectItem>
                          <SelectItem value={TaskStatus.CANCELLED} className="text-[10px] font-bold uppercase tracking-widest text-red-600 focus:bg-red-50">Cancelled</SelectItem>
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
                      {(() => {
                        const loggedHours = (elapsedTimes[task.id] !== undefined ? elapsedTimes[task.id] : (task.timeLoggedSeconds || ((task.timeLogged || 0) * 3600))) / 3600;
                        const isExceeded = task.timeEstimate > 0 && loggedHours > task.timeEstimate;
                        return (
                          <div className="flex flex-col gap-1 select-none">
                            <div className={cn(
                              "flex items-center text-xs font-semibold px-2 py-1 rounded-md w-fit border",
                              isExceeded 
                                ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50" 
                                : "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-transparent"
                            )}>
                              {formatHoursMinutes(task.timeEstimate)}
                            </div>
                            {isExceeded && (
                              <span className="text-[9px] font-extrabold uppercase text-rose-500 flex items-center gap-1 whitespace-nowrap">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>+{formatHoursMinutes(loggedHours - task.timeEstimate)} over</span>
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-xs font-semibold text-zinc-600 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 rounded-lg px-2 py-0.5 shadow-sm">
                          <Calendar className="w-3.5 h-3.5 mr-1.5 text-zinc-400 shrink-0" />
                          <input 
                            type="date" 
                            value={task.dueDate || ''}
                            onChange={(e) => {
                              const newVal = e.target.value;
                              if (newVal) {
                                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, dueDate: newVal, updatedAt: new Date().toISOString() } : t));
                                toast.success(`Task "${task.name}" deadline changed to ${newVal}.`);
                              }
                            }}
                            className="bg-transparent border-none text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-0 p-0 w-[115px] cursor-pointer"
                          />
                        </div>
                        {isUpcoming && (
                          <Badge variant="outline" className="text-[9px] font-black uppercase text-amber-500 border-amber-500/40 bg-amber-500/5 px-1.5 py-0 select-none animate-pulse shrink-0">
                            Due Soon
                          </Badge>
                        )}
                        <Button
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6 text-zinc-400 hover:text-amber-500 hover:bg-amber-100/10 focus:text-amber-500 rounded-md shrink-0 cursor-pointer"
                          title="Snooze 24 hours"
                          onClick={(e) => handleSnoozeTask(task.id, e)}
                        >
                          <AlarmClock className="w-3 h-3" />
                        </Button>
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
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon" }),
                            "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl border-zinc-200">
                          <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 px-3 py-1.5">Quick Actions</div>
                          {task.status !== TaskStatus.DONE && (
                            <DropdownMenuItem 
                              onClick={() => handleUpdateTaskStatus(task.id, TaskStatus.DONE)}
                              className="text-xs font-semibold cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                              Complete Task
                            </DropdownMenuItem>
                          )}
                          {task.status !== TaskStatus.REVIEW && (
                            <DropdownMenuItem 
                              onClick={() => handleUpdateTaskStatus(task.id, TaskStatus.REVIEW)}
                              className="text-xs font-semibold cursor-pointer text-amber-600 focus:text-amber-700 focus:bg-amber-50"
                            >
                              <Eye className="w-3.5 h-3.5 mr-2 text-amber-500" />
                              Send to Internal Review
                            </DropdownMenuItem>
                          )}
                          {task.status !== TaskStatus.CLIENT_REVIEW && (
                            <DropdownMenuItem 
                              onClick={() => handleUpdateTaskStatus(task.id, TaskStatus.CLIENT_REVIEW)}
                              className="text-xs font-semibold cursor-pointer text-teal-600 focus:text-teal-700 focus:bg-teal-50"
                            >
                              <Users className="w-3.5 h-3.5 mr-2 text-teal-500" />
                              Send to Client Review
                            </DropdownMenuItem>
                          )}
                          {task.status !== TaskStatus.IN_PROGRESS && (
                            <DropdownMenuItem 
                              onClick={() => handleUpdateTaskStatus(task.id, TaskStatus.IN_PROGRESS)}
                              className="text-xs font-semibold cursor-pointer text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                            >
                              <Play className="w-3.5 h-3.5 mr-2 text-blue-500" />
                              Set In Progress
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            variant="destructive"
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-xs font-bold uppercase tracking-widest cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2 text-red-500" />
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
                        <TableCell colSpan={9} className="p-0 border-none">
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
                                    className="flex items-center justify-between bg-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 group/st shadow-sm"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <Checkbox 
                                        checked={subtask.isCompleted} 
                                        onCheckedChange={() => toggleSubtask(task.id, subtask.id)}
                                        className="brand-checkbox"
                                      />
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className={cn(
                                          "text-sm font-medium transition-all",
                                          subtask.isCompleted ? "text-zinc-400 dark:text-zinc-500 line-through" : "text-zinc-700 dark:text-zinc-300"
                                        )}>
                                          {subtask.name}
                                        </span>
                                        {(() => {
                                          const subtaskAssignee = subtask.assigneeId ? users.find(u => u.id === subtask.assigneeId) : null;
                                          if (!subtaskAssignee) return null;
                                          return (
                                            <span className="inline-flex items-center gap-1 text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold px-1.5 py-0.5 rounded-md border border-purple-500/20" title={`Assigned to ${subtaskAssignee.name}`}>
                                              <span className="w-3.5 h-3.5 rounded-full bg-purple-500/20 flex items-center justify-center text-[7px] font-black uppercase text-purple-700 dark:text-purple-300">
                                                {subtaskAssignee.name.charAt(0)}
                                              </span>
                                              <span>{subtaskAssignee.name.split(' ')[0]}</span>
                                            </span>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {/* Subtask Timer Controls & Timing Inputs */}
                                      <div className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-100/60 dark:border-zinc-800">
                                        {/* Timer/Elapsed */}
                                        <div className="flex items-center space-x-1.5 border-r border-zinc-200 dark:border-zinc-800 pr-2">
                                          <span className="font-mono text-[10px] text-zinc-500 font-semibold" title="Live timer duration">
                                            {formatTime(subTaskElapsedTimes[subtask.id] || 0)}
                                          </span>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-5 w-5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 shrink-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleSubTaskTimer?.(subtask.id, task.id);
                                            }}
                                          >
                                            {activeTimerSubTaskId === subtask.id ? (
                                              <Pause className="w-2.5 h-2.5 text-orange-500 fill-current animate-pulse" />
                                            ) : (
                                              <Play className="w-2.5 h-2.5 text-zinc-400 hover:text-emerald-500 fill-current" />
                                            )}
                                          </Button>
                                        </div>

                                        {/* Spent (Logged) Time */}
                                        <div className="flex items-center space-x-1 pl-2">
                                          <span className="text-[8px] font-bold text-zinc-400 uppercase">Spent:</span>
                                          <input
                                            type="text"
                                            placeholder="00:00"
                                            value={
                                              inputDrafts[`spent-${subtask.id}`] !== undefined
                                                ? inputDrafts[`spent-${subtask.id}`]
                                                : (subtask.timeLogged !== undefined && subtask.timeLogged !== 0
                                                    ? formatHoursMinutes(subtask.timeLogged)
                                                    : (subTaskElapsedTimes[subtask.id]
                                                        ? formatHoursMinutes(subTaskElapsedTimes[subtask.id] / 3600)
                                                        : '')
                                                  )
                                            }
                                            onChange={(e) => handleDurationInputChange(task.id, subtask.id, 'timeLogged', e.target.value)}
                                            onBlur={() => handleDurationInputBlur(task.id, subtask.id, 'timeLogged')}
                                            className={cn(
                                              "w-14 h-5 text-[10px] font-mono text-center bg-white dark:bg-zinc-950 border rounded focus:outline-none focus:ring-1 transition-colors",
                                              inputErrors[`spent-${subtask.id}`] 
                                                ? "border-red-500 text-red-600 focus:ring-red-500/30 dark:border-red-500 dark:text-red-400" 
                                                : "border-zinc-200 dark:border-zinc-800 focus:ring-brand-secondary/30"
                                            )}
                                            title={
                                              inputErrors[`spent-${subtask.id}`]
                                                ? "Invalid format! Use plain numbers (e.g. 45), colons (e.g. 01:30), or text (e.g. 1h 30m, 45m)"
                                                : "Manually adjust logged time format (e.g. 01:30, 45, 1h 30m)"
                                            }
                                          />
                                        </div>
                                      </div>

                                      <Select 
                                        value={subtask.status || (subtask.isCompleted ? TaskStatus.DONE : TaskStatus.OPEN)} 
                                        onValueChange={(newStatus) => {
                                          updateSubtaskStatus(task.id, subtask.id, newStatus as TaskStatus);
                                        }}
                                      >
                                        <SelectTrigger className={cn(
                                          "h-6 px-1.5 text-[8px] font-bold uppercase tracking-wider rounded-lg border transition-all w-[90px] cursor-pointer",
                                          (subtask.status === TaskStatus.OPEN || (!subtask.status && !subtask.isCompleted)) && "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
                                          subtask.status === TaskStatus.IN_PROGRESS && "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
                                          subtask.status === TaskStatus.REVIEW && "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
                                          subtask.status === TaskStatus.CLIENT_REVIEW && "bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30",
                                          subtask.status === TaskStatus.REVISION_REQUESTED && "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30",
                                          subtask.status === TaskStatus.APPROVED && "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30",
                                          (subtask.status === TaskStatus.DONE || (!subtask.status && subtask.isCompleted)) && "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
                                          subtask.status === TaskStatus.BLOCKED && "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
                                          subtask.status === TaskStatus.CANCELLED && "bg-red-50 text-red-600 border-red-105 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                                        )}>
                                          <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-zinc-200">
                                          <SelectItem value={TaskStatus.OPEN} className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 focus:bg-zinc-50 dark:text-zinc-400">Open</SelectItem>
                                          <SelectItem value={TaskStatus.IN_PROGRESS} className="text-[9px] font-bold uppercase tracking-widest text-blue-600 focus:bg-blue-50 dark:text-blue-400">In Progress</SelectItem>
                                          <SelectItem value={TaskStatus.REVIEW} className="text-[9px] font-bold uppercase tracking-widest text-amber-600 focus:bg-amber-50 dark:text-amber-400">Review</SelectItem>
                                          <SelectItem value={TaskStatus.CLIENT_REVIEW} className="text-[9px] font-bold uppercase tracking-widest text-teal-600 focus:bg-teal-50 dark:text-teal-400">Client Review</SelectItem>
                                          <SelectItem value={TaskStatus.REVISION_REQUESTED} className="text-[9px] font-bold uppercase tracking-widest text-purple-600 focus:bg-purple-50 dark:text-purple-400">Revision Requested</SelectItem>
                                          <SelectItem value={TaskStatus.APPROVED} className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 focus:bg-indigo-50 dark:text-indigo-400">Approved</SelectItem>
                                          <SelectItem value={TaskStatus.DONE} className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 focus:bg-emerald-50 dark:text-emerald-400">Done</SelectItem>
                                          <SelectItem value={TaskStatus.BLOCKED} className="text-[9px] font-bold uppercase tracking-widest text-rose-600 focus:bg-rose-50 dark:text-rose-400">Blocked</SelectItem>
                                          <SelectItem value={TaskStatus.CANCELLED} className="text-[9px] font-bold uppercase tracking-widest text-red-600 focus:bg-red-50 dark:text-red-400">Cancelled</SelectItem>
                                        </SelectContent>
                                      </Select>

                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 opacity-0 group-hover/st:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteSubtask(task.id, subtask.id);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3 text-red-400" />
                                      </Button>
                                    </div>
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
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-extrabold uppercase tracking-widest flex items-center gap-1">
                                      {task.workflowSteps[task.currentStepIndex ?? 0].isCompleted ? (
                                        <>
                                          <CheckCircle2 className="w-3 h-3 text-emerald-500 inline-block" />
                                          <span>Finished</span>
                                        </>
                                      ) : (
                                        <span>➔ Sequential Route</span>
                                      )}
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
                                                  isCompleted && "line-through text-zinc-400 dark:text-zinc-600"
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
                                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeLoggedSeconds: newTotal, timeLogged: parseFloat((newTotal / 3600).toFixed(4)), updatedAt: new Date().toISOString() } : t));
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
                                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeLoggedSeconds: newTotal, timeLogged: parseFloat((newTotal / 3600).toFixed(4)), updatedAt: new Date().toISOString() } : t));
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
                                      className="h-8 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center"
                                      value={((elapsedTimes[task.id] || 0) % 60) || ''}
                                      onChange={(e) => {
                                        const secs = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                        const currentSecs = elapsedTimes[task.id] || 0;
                                        const hours = Math.floor(currentSecs / 3600);
                                        const mins = Math.floor((currentSecs % 3600) / 60);
                                        const newTotal = (hours * 3600) + (mins * 60) + secs;

                                        setElapsedTimes(prev => ({ ...prev, [task.id]: newTotal }));
                                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeLoggedSeconds: newTotal, timeLogged: parseFloat((newTotal / 3600).toFixed(4)), updatedAt: new Date().toISOString() } : t));
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
      ) : viewMode === 'pipeline' ? (
        <div className="flex flex-row space-x-4 overflow-x-auto pb-6 select-none scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
          {PIPELINE_COLUMNS.map((column) => {
            const columnTasks = baseFilteredTasks.filter(t => getTaskPipelineColumnId(t) === column.id);
            const isOverColumn = draggedOverColumnId === column.id;

            return (
              <div 
                key={column.id}
                onDragOver={(e) => handleDragOverColumn(e, column.id)}
                onDragLeave={handleDragLeaveColumn}
                onDrop={(e) => handleDropOnPipelineColumn(e, column.id)}
                className={cn(
                  "flex flex-col min-w-[290px] sm:min-w-[340px] max-w-[380px] flex-1 rounded-2xl border p-4 transition-all duration-200 shrink-0",
                  isOverColumn 
                    ? "bg-zinc-100/90 dark:bg-zinc-900/45 border-dashed border-2 border-brand-secondary ring-2 ring-brand-secondary/10" 
                    : "bg-white dark:bg-zinc-950/25 border-zinc-200/80 dark:border-zinc-800 shadow-sm"
                )}
              >
                {/* Column Title Header */}
                <div className="flex flex-col gap-1 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-bold uppercase tracking-wider", column.colorClass.split(' ')[0])}>
                      {column.title}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-extrabold font-mono rounded-full px-2 h-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {columnTasks.length}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium leading-relaxed">
                    {column.description}
                  </p>
                </div>

                {/* Column Cards Container */}
                <div className="flex flex-col gap-3 min-h-[450px]">
                  {columnTasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/5 text-center text-zinc-400 dark:text-zinc-600 text-xs italic">
                      <span>Drop pipeline tasks here</span>
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const assignee = users.find(u => u.id === task.assigneeId);
                      const project = projects.find(p => p.id === task.projectId);
                      const isExpanded = expandedTasks.includes(task.id);
                      const subtaskCount = task.subTasks?.length || 0;
                      const completedCount = task.subTasks?.filter(st => st.isCompleted).length || 0;
                      const isUpcoming = isUpcomingDeadline(task.dueDate) && ![TaskStatus.DONE, TaskStatus.APPROVED, TaskStatus.CANCELLED].includes(task.status as TaskStatus);

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
                            "bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-4 rounded-xl shadow-sm transition-all duration-150 cursor-pointer hover:shadow-md hover:scale-[1.01] hover:border-zinc-300 dark:hover:border-zinc-700 relative group/card",
                            draggedTaskId === task.id && "opacity-45 scale-[0.98] border-dashed border-zinc-300 dark:border-zinc-700",
                            draggedOverTaskId === task.id && "border-t-2 border-brand-secondary pt-2 bg-brand-secondary/5 dark:bg-brand-secondary/10",
                            isUpcoming && "animate-pulse-amber border-amber-500 dark:border-amber-500 ring-1 ring-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                          )}
                        >
                          {/* Card Header Tag & Priority */}
                          <div className="flex items-center justify-between gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id={`pipeline-checkbox-${task.id}`}
                                checked={selectedTaskIds.includes(task.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedTaskIds(prev => 
                                    checked ? [...prev, task.id] : prev.filter(id => id !== task.id)
                                  );
                                }}
                                className="brand-checkbox scale-90"
                              />
                              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest truncate max-w-32">
                                {project?.name || 'Global'}
                              </span>
                            </div>
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
                            <h4 className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-brand-secondary transition-colors flex items-center flex-wrap gap-1.5">
                              <span className="line-clamp-2">{task.name}</span>
                              {task.isRecurring && (
                                <Badge variant="outline" className="text-[9px] font-black uppercase text-orange-500 border-orange-500/30 bg-orange-500/5 px-1.5 py-0 select-none shrink-0 flex items-center space-x-1">
                                  <RefreshCw className="w-2.5 h-2.5 text-orange-500 animate-[spin_10s_linear_infinite]" />
                                  <span>Recurring</span>
                                </Badge>
                              )}
                            </h4>
                          </div>

                          {/* Render Active Stage Controls */}
                          <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                            {task.workflowSteps && task.workflowSteps.length > 0 ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Current Task Step</span>
                                  <Badge variant="outline" className="text-[8px] font-black tracking-wider border-zinc-200 dark:border-zinc-800 rounded px-1.5 h-4.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
                                    {(task.currentStepIndex ?? 0) + 1} / {task.workflowSteps.length}
                                  </Badge>
                                </div>
                                <div className="p-2 rounded-xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-1.5 shadow-xs">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[11px] font-extrabold text-zinc-800 dark:text-zinc-200 truncate">
                                      {task.workflowSteps[task.currentStepIndex ?? 0].name}
                                    </div>
                                    <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                                      Assigned to: {users.find(u => u.id === task.workflowSteps![task.currentStepIndex ?? 0].assigneeId)?.name || 'Unassigned'}
                                    </div>
                                  </div>
                                  {(task.currentStepIndex ?? 0) < task.workflowSteps.length && (
                                    <Button
                                      size="sm"
                                      className="h-7 px-2 bg-brand-secondary hover:bg-brand-secondary/95 text-white text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm shrink-0 cursor-pointer flex items-center space-x-1"
                                      onClick={() => {
                                        completeWorkflowStep(task.id, task.workflowSteps![task.currentStepIndex ?? 0].id);
                                      }}
                                    >
                                      <span>Advance</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Ad-hoc Status</span>
                                  <Badge variant="outline" className="text-[8px] font-black tracking-wider border-zinc-200 dark:border-zinc-800 rounded px-1.5 h-4.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
                                    {task.status}
                                  </Badge>
                                </div>
                                <div className="p-2 rounded-xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-1.5 shadow-xs">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[11px] font-extrabold text-zinc-800 dark:text-zinc-200 truncate">
                                      No sequential pipeline template
                                    </div>
                                    <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                                      Assigned to: {users.find(u => u.id === task.assigneeId)?.name || 'Unassigned'}
                                    </div>
                                  </div>
                                  {task.status !== TaskStatus.APPROVED && task.status !== TaskStatus.DONE && (
                                    <Button
                                      size="sm"
                                      className="h-7 px-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm shrink-0 cursor-pointer flex items-center space-x-1"
                                      onClick={() => {
                                        let nextStatus = TaskStatus.IN_PROGRESS;
                                        if (task.status === TaskStatus.OPEN) nextStatus = TaskStatus.IN_PROGRESS;
                                        else if (task.status === TaskStatus.IN_PROGRESS) nextStatus = TaskStatus.REVIEW;
                                        else if (task.status === TaskStatus.REVIEW) nextStatus = TaskStatus.APPROVED;
                                        handleUpdateTaskStatus(task.id, nextStatus);
                                        toast.success(`Task "${task.name}" advanced to status: ${nextStatus}`);
                                      }}
                                    >
                                      <span>Advance</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Progress bar if subtasks exist */}
                          {subtaskCount > 0 && (
                            <div className="mt-3.5 space-y-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}>
                              <div className="flex items-center justify-between text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 tracking-wider">
                                <span>SUBTASKS ({completedCount}/{subtaskCount})</span>
                                <span>{Math.round((completedCount/subtaskCount)*100)}%</span>
                              </div>
                              <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-brand-secondary rounded-full transition-all duration-300" 
                                  style={{ width: `${(completedCount / subtaskCount) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Expandable description drawer */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800/50 mt-3.5 pt-3"
                              >
                                {task.description && (
                                   <div className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 mb-2 font-medium">
                                     {task.description}
                                   </div>
                                )}
                                <div className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">SUBTASK CHECKLIST</div>
                                <div className="space-y-2">
                                  {task.subTasks?.map((subtask) => (
                                    <div 
                                      key={subtask.id} 
                                      className="flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 shadow-sm"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <Checkbox 
                                          checked={subtask.isCompleted} 
                                          onCheckedChange={() => toggleSubtask(task.id, subtask.id)}
                                          className="brand-checkbox"
                                        />
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className={cn(
                                            "text-xs font-semibold text-zinc-700 dark:text-zinc-300",
                                            subtask.isCompleted ? "text-zinc-400 dark:text-zinc-600 line-through" : ""
                                          )}>
                                            {subtask.name}
                                          </span>
                                          {(() => {
                                            const subtaskAssignee = subtask.assigneeId ? users.find(u => u.id === subtask.assigneeId) : null;
                                            if (!subtaskAssignee) return null;
                                            return (
                                              <span className="inline-flex items-center gap-1 text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold px-1.5 py-0.5 rounded-md border border-purple-500/20" title={`Assigned to ${subtaskAssignee.name}`}>
                                                <span className="w-3.5 h-3.5 rounded-full bg-purple-500/20 flex items-center justify-center text-[7px] font-black uppercase text-purple-700 dark:text-purple-300">
                                                  {subtaskAssignee.name.charAt(0)}
                                                </span>
                                                <span>{subtaskAssignee.name.split(' ')[0]}</span>
                                              </span>
                                            );
                                          })()}
                                        </div>
                                      </div>

                                      <Select 
                                        value={subtask.status || (subtask.isCompleted ? TaskStatus.DONE : TaskStatus.OPEN)} 
                                        onValueChange={(newStatus) => {
                                          updateSubtaskStatus(task.id, subtask.id, newStatus as TaskStatus);
                                        }}
                                      >
                                        <SelectTrigger className={cn(
                                          "h-6 px-1.5 text-[8px] font-bold uppercase tracking-wider rounded-lg border transition-all w-[90px] cursor-pointer shrink-0 ml-2",
                                          (subtask.status === TaskStatus.OPEN || (!subtask.status && !subtask.isCompleted)) && "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
                                          subtask.status === TaskStatus.IN_PROGRESS && "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
                                          subtask.status === TaskStatus.REVIEW && "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
                                          subtask.status === TaskStatus.CLIENT_REVIEW && "bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30",
                                          subtask.status === TaskStatus.REVISION_REQUESTED && "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30",
                                          subtask.status === TaskStatus.APPROVED && "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30",
                                          (subtask.status === TaskStatus.DONE || (!subtask.status && subtask.isCompleted)) && "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
                                          subtask.status === TaskStatus.BLOCKED && "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
                                          subtask.status === TaskStatus.CANCELLED && "bg-red-50 text-red-600 border-red-105 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                                        )}>
                                          <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-zinc-200">
                                          <SelectItem value={TaskStatus.OPEN} className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 focus:bg-zinc-50 dark:text-zinc-400">Open</SelectItem>
                                          <SelectItem value={TaskStatus.IN_PROGRESS} className="text-[9px] font-bold uppercase tracking-widest text-blue-600 focus:bg-blue-50 dark:text-blue-400">In Progress</SelectItem>
                                          <SelectItem value={TaskStatus.REVIEW} className="text-[9px] font-bold uppercase tracking-widest text-amber-600 focus:bg-amber-50 dark:text-amber-400">Review</SelectItem>
                                          <SelectItem value={TaskStatus.CLIENT_REVIEW} className="text-[9px] font-bold uppercase tracking-widest text-teal-600 focus:bg-teal-50 dark:text-teal-400">Client Review</SelectItem>
                                          <SelectItem value={TaskStatus.REVISION_REQUESTED} className="text-[9px] font-bold uppercase tracking-widest text-purple-600 focus:bg-purple-50 dark:text-purple-400">Revision Requested</SelectItem>
                                          <SelectItem value={TaskStatus.APPROVED} className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 focus:bg-indigo-50 dark:text-indigo-400">Approved</SelectItem>
                                          <SelectItem value={TaskStatus.DONE} className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 focus:bg-emerald-50 dark:text-emerald-400">Done</SelectItem>
                                          <SelectItem value={TaskStatus.BLOCKED} className="text-[9px] font-bold uppercase tracking-widest text-rose-600 focus:bg-rose-50 dark:text-rose-400">Blocked</SelectItem>
                                          <SelectItem value={TaskStatus.CANCELLED} className="text-[9px] font-bold uppercase tracking-widest text-red-600 focus:bg-red-50 dark:text-red-400">Cancelled</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ))}
                                  <div className="flex items-center space-x-1 pt-1">
                                    <div className="relative flex-1">
                                      <Input 
                                        placeholder="Add sub-task..." 
                                        className="h-8 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs pl-7 focus-visible:ring-brand-secondary/20"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            addSubtask(task.id, (e.target as HTMLInputElement).value);
                                            (e.target as HTMLInputElement).value = '';
                                          }
                                        }}
                                      />
                                      <Plus className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Card Controls Footer */}
                          <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 mt-4 pt-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center space-x-1.5">
                              <Avatar className="w-4.5 h-4.5 border shadow-sm shrink-0">
                                <AvatarFallback className="text-[8px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                  {assignee?.name ? assignee.name.charAt(0) : '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                                {assignee?.name ? assignee.name.split(' ')[0] : 'Unassigned'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-zinc-400 font-mono font-bold">
                              {task.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-zinc-400" />
                                  <span>{task.dueDate}</span>
                                </span>
                              )}
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
      ) : (
        <div className="flex flex-row space-x-4 overflow-x-auto pb-6 select-none scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
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
                    : "bg-white dark:bg-zinc-950/25 border-zinc-200/80 dark:border-zinc-800 shadow-sm"
                )}
              >
                {/* Column Title Header */}
                <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className={cn("text-xs font-bold uppercase tracking-wider", column.colorClass.split(' ')[0])}>
                      {column.title}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-extrabold font-mono rounded-full px-2 h-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {columnTasks.length}
                    </Badge>
                  </div>
                </div>

                {/* Column Cards Container */}
                <div className="flex flex-col gap-3 min-h-[450px]">
                  {columnTasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/5 text-center text-zinc-400 dark:text-zinc-600 text-xs italic">
                      <span>Drop tasks here</span>
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const assignee = users.find(u => u.id === task.assigneeId);
                      const project = projects.find(p => p.id === task.projectId);
                      const isExpanded = expandedTasks.includes(task.id);
                      const subtaskCount = task.subTasks?.length || 0;
                      const completedCount = task.subTasks?.filter(st => st.isCompleted).length || 0;
                      const isUpcoming = isUpcomingDeadline(task.dueDate) && ![TaskStatus.DONE, TaskStatus.APPROVED, TaskStatus.CANCELLED].includes(task.status as TaskStatus);

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
                            "bg-white dark:bg-zinc-900 w-full border border-zinc-200/60 dark:border-zinc-800 p-4 rounded-xl shadow-sm transition-all duration-150 cursor-pointer hover:shadow-md hover:scale-[1.01] hover:border-zinc-300 dark:hover:border-zinc-700",
                            draggedTaskId === task.id && "opacity-45 scale-[0.98] border-dashed border-zinc-300 dark:border-zinc-700",
                            draggedOverTaskId === task.id && "border-t-2 border-brand-secondary pt-2 bg-brand-secondary/5 dark:bg-brand-secondary/10",
                            isUpcoming && "animate-pulse-amber border-amber-500 dark:border-amber-500 ring-1 ring-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                          )}
                        >
                          {/* Card Header Tag & Priority */}
                          <div className="flex items-center justify-between gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id={`board-checkbox-${task.id}`}
                                checked={selectedTaskIds.includes(task.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedTaskIds(prev => 
                                    checked ? [...prev, task.id] : prev.filter(id => id !== task.id)
                                  );
                                }}
                                className="brand-checkbox scale-90"
                              />
                              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest truncate max-w-32">
                                {project?.name || 'Global'}
                              </span>
                            </div>
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

                          {/* Alert Bar for Upcoming Due Dates */}
                          {isUpcoming && (
                            <div className="flex items-center justify-between p-2 mb-3 bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 rounded-md animate-[pulse_2s_infinite] select-none shadow-sm" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center space-x-1.5 text-[9px] font-black uppercase tracking-wider">
                                <BellRing className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                                <span>Due soon (&lt; 48h)</span>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-5 px-1.5 text-[8px] font-extrabold uppercase tracking-widest bg-white dark:bg-zinc-900 border-amber-500/60 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white hover:border-amber-500 shrink-0 cursor-pointer rounded-md"
                                onClick={(e) => handleSnoozeTask(task.id, e)}
                                title="Delay by 24 hours"
                              >
                                <AlarmClock className="w-2.5 h-2.5 mr-1" />
                                Snooze
                              </Button>
                            </div>
                          )}

                          {/* Card Main Title */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(task.id);
                            }}
                            className="cursor-pointer group"
                          >
                            <h4 className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-brand-secondary transition-colors flex items-center flex-wrap gap-1.5">
                              <span className="line-clamp-2">{task.name}</span>
                              {task.isRecurring && (
                                <Badge variant="outline" className="text-[9px] font-black uppercase text-orange-500 border-orange-500/30 bg-orange-500/5 px-1.5 py-0 select-none shrink-0 flex items-center space-x-1">
                                  <RefreshCw className="w-2.5 h-2.5 text-orange-500 animate-[spin_10s_linear_infinite]" />
                                  <span>Recurring</span>
                                </Badge>
                              )}
                            </h4>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-widest mt-1">
                              {task.type}
                            </div>
                            {(() => {
                              const loggedHours = (elapsedTimes[task.id] !== undefined ? elapsedTimes[task.id] : (task.timeLoggedSeconds || ((task.timeLogged || 0) * 3600))) / 3600;
                              const isExceeded = task.timeEstimate > 0 && loggedHours > task.timeEstimate;
                              if (isExceeded) {
                                return (
                                  <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5 w-full select-none" onClick={(e) => e.stopPropagation()}>
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span>Limit Exceeded: {formatHoursMinutes(loggedHours)} / {formatHoursMinutes(task.timeEstimate)} (+{formatHoursMinutes(loggedHours - task.timeEstimate)} over)</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          {/* Pipeline Badge on card when not expanded */}
                          {task.workflowSteps && task.workflowSteps.length > 0 && (
                            <div className="mt-3 p-1.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}>
                              <span className="truncate max-w-[170px] flex items-center gap-1.5">
                                <span className="text-[8px] uppercase font-black text-brand-secondary shrink-0 tracking-wider flex items-center gap-1">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  <span>Active:</span>
                                </span>
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
                                     <div className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 mb-2 font-medium">
                                       {task.description}
                                     </div>
                                  )}

                                  {task.subTasks?.map((subtask) => (
                                    <div 
                                      key={subtask.id} 
                                      className="flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 shadow-sm group/st"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <Checkbox 
                                          checked={subtask.isCompleted} 
                                          onCheckedChange={() => toggleSubtask(task.id, subtask.id)}
                                          className="brand-checkbox"
                                        />
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className={cn(
                                            "text-xs font-semibold text-zinc-700 dark:text-zinc-300",
                                            subtask.isCompleted ? "text-zinc-400 dark:text-zinc-600 line-through" : ""
                                          )}>
                                            {subtask.name}
                                          </span>
                                          {(() => {
                                            const subtaskAssignee = subtask.assigneeId ? users.find(u => u.id === subtask.assigneeId) : null;
                                            if (!subtaskAssignee) return null;
                                            return (
                                              <span className="inline-flex items-center gap-1 text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold px-1.5 py-0.5 rounded-md border border-purple-500/20" title={`Assigned to ${subtaskAssignee.name}`}>
                                                <span className="w-3.5 h-3.5 rounded-full bg-purple-500/20 flex items-center justify-center text-[7px] font-black uppercase text-purple-700 dark:text-purple-300">
                                                  {subtaskAssignee.name.charAt(0)}
                                                </span>
                                                <span>{subtaskAssignee.name.split(' ')[0]}</span>
                                              </span>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {/* Subtask Timer Controls & Timing Inputs */}
                                        <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded-md border border-zinc-200/50 dark:border-zinc-800">
                                          {/* Timer/Elapsed */}
                                          <div className="flex items-center space-x-1 pr-1.5 border-r border-zinc-200 dark:border-zinc-800">
                                            <span className="font-mono text-[9px] text-zinc-500 font-semibold" title="Live timer duration">
                                              {formatTime(subTaskElapsedTimes[subtask.id] || 0)}
                                            </span>
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-4.5 w-4.5 rounded-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 shrink-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSubTaskTimer?.(subtask.id, task.id);
                                              }}
                                            >
                                              {activeTimerSubTaskId === subtask.id ? (
                                                <Pause className="w-2 h-2 text-orange-500 fill-current animate-pulse" />
                                              ) : (
                                                <Play className="w-2 h-2 text-zinc-400 hover:text-emerald-500 fill-current" />
                                              )}
                                            </Button>
                                          </div>

                                          {/* Spent (Logged) Time */}
                                          <div className="flex items-center space-x-1 pl-1.5">
                                            <span className="text-[8px] font-bold text-zinc-400 uppercase">Spent:</span>
                                            <input
                                              type="text"
                                              placeholder="00:00"
                                              value={
                                                inputDrafts[`spent-${subtask.id}`] !== undefined
                                                  ? inputDrafts[`spent-${subtask.id}`]
                                                  : (subtask.timeLogged !== undefined && subtask.timeLogged !== 0
                                                      ? formatHoursMinutes(subtask.timeLogged)
                                                      : (subTaskElapsedTimes[subtask.id]
                                                          ? formatHoursMinutes(subTaskElapsedTimes[subtask.id] / 3600)
                                                          : '')
                                                    )
                                              }
                                              onChange={(e) => handleDurationInputChange(task.id, subtask.id, 'timeLogged', e.target.value)}
                                              onBlur={() => handleDurationInputBlur(task.id, subtask.id, 'timeLogged')}
                                              className={cn(
                                                "w-14 h-4.5 text-[9px] font-mono text-center bg-white dark:bg-zinc-950 border rounded focus:outline-none focus:ring-1 transition-colors",
                                                inputErrors[`spent-${subtask.id}`] 
                                                  ? "border-red-500 text-red-600 focus:ring-red-500/30 dark:border-red-500 dark:text-red-400" 
                                                  : "border-zinc-200 dark:border-zinc-800 focus:ring-brand-secondary/30"
                                              )}
                                              title={
                                                inputErrors[`spent-${subtask.id}`]
                                                  ? "Invalid format! Use plain numbers (e.g. 45), colons (e.g. 01:30), or text (e.g. 1h 30m, 45m)"
                                                  : "Manually adjust logged time format (e.g. 01:30, 45, 1h 30m)"
                                              }
                                            />
                                          </div>
                                        </div>

                                        <Select 
                                          value={subtask.status || (subtask.isCompleted ? TaskStatus.DONE : TaskStatus.OPEN)} 
                                          onValueChange={(newStatus) => {
                                            updateSubtaskStatus(task.id, subtask.id, newStatus as TaskStatus);
                                          }}
                                        >
                                          <SelectTrigger className={cn(
                                            "h-6 px-1.5 text-[8px] font-bold uppercase tracking-wider rounded-lg border transition-all w-[90px] cursor-pointer shrink-0",
                                            (subtask.status === TaskStatus.OPEN || (!subtask.status && !subtask.isCompleted)) && "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
                                            subtask.status === TaskStatus.IN_PROGRESS && "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
                                            subtask.status === TaskStatus.REVIEW && "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
                                            subtask.status === TaskStatus.CLIENT_REVIEW && "bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30",
                                            subtask.status === TaskStatus.REVISION_REQUESTED && "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30",
                                            subtask.status === TaskStatus.APPROVED && "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30",
                                            (subtask.status === TaskStatus.DONE || (!subtask.status && subtask.isCompleted)) && "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
                                            subtask.status === TaskStatus.BLOCKED && "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
                                            subtask.status === TaskStatus.CANCELLED && "bg-red-50 text-red-600 border-red-105 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                                          )}>
                                            <SelectValue placeholder="Status" />
                                          </SelectTrigger>
                                          <SelectContent className="rounded-xl border-zinc-200">
                                            <SelectItem value={TaskStatus.OPEN} className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 focus:bg-zinc-50 dark:text-zinc-400">Open</SelectItem>
                                            <SelectItem value={TaskStatus.IN_PROGRESS} className="text-[9px] font-bold uppercase tracking-widest text-blue-600 focus:bg-blue-50 dark:text-blue-400">In Progress</SelectItem>
                                            <SelectItem value={TaskStatus.REVIEW} className="text-[9px] font-bold uppercase tracking-widest text-amber-600 focus:bg-amber-50 dark:text-amber-400">Review</SelectItem>
                                            <SelectItem value={TaskStatus.CLIENT_REVIEW} className="text-[9px] font-bold uppercase tracking-widest text-teal-600 focus:bg-teal-50 dark:text-teal-400">Client Review</SelectItem>
                                            <SelectItem value={TaskStatus.REVISION_REQUESTED} className="text-[9px] font-bold uppercase tracking-widest text-purple-600 focus:bg-purple-50 dark:text-purple-400">Revision Requested</SelectItem>
                                            <SelectItem value={TaskStatus.APPROVED} className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 focus:bg-indigo-50 dark:text-indigo-400">Approved</SelectItem>
                                            <SelectItem value={TaskStatus.DONE} className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 focus:bg-emerald-50 dark:text-emerald-400">Done</SelectItem>
                                            <SelectItem value={TaskStatus.BLOCKED} className="text-[9px] font-bold uppercase tracking-widest text-rose-600 focus:bg-rose-50 dark:text-rose-400">Blocked</SelectItem>
                                            <SelectItem value={TaskStatus.CANCELLED} className="text-[9px] font-bold uppercase tracking-widest text-red-600 focus:bg-red-50 dark:text-red-400">Cancelled</SelectItem>
                                          </SelectContent>
                                        </Select>

                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 opacity-0 group-hover/st:opacity-100 transition-opacity"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteSubtask(task.id, subtask.id);
                                          }}
                                        >
                                          <Trash2 className="w-2.5 h-2.5 text-red-400" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}

                                  <div className="flex items-center space-x-1 pt-1">
                                    <div className="relative flex-1">
                                      <Input 
                                        placeholder="Add sub-task..." 
                                        className="h-8 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs pl-7 focus-visible:ring-brand-secondary/20"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            addSubtask(task.id, (e.target as HTMLInputElement).value);
                                            (e.target as HTMLInputElement).value = '';
                                          }
                                        }}
                                      />
                                      <Plus className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                                    </div>
                                  </div>

                                  {/* Compact Pipeline Progression Stepper for Card Drawer Layout */}
                                  {task.workflowSteps && task.workflowSteps.length > 0 && (
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800 rounded-xl space-y-3.5 mt-3 shadow-sm">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Pipeline Route</span>
                                        <Badge variant="outline" className="text-[8px] font-extrabold bg-brand-secondary/5 text-brand-secondary border-brand-secondary/20 dark:border-brand-secondary/30 rounded-md py-0 px-1.5 h-4">
                                          STEP { (task.currentStepIndex ?? 0) + 1 } / { task.workflowSteps.length }
                                        </Badge>
                                      </div>
                                      <div className="relative pl-1 space-y-3">
                                        {/* Left connecting timeline vertical bar */}
                                        <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-zinc-200 dark:bg-zinc-800" />
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
                                                    isCompleted && "line-through text-zinc-400 dark:text-zinc-600"
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
                                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Time Settings</span>
                                      <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                                        Total: {formatTime(elapsedTimes[task.id] || 0)}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Hrs</label>
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
                                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeLoggedSeconds: newTotal, timeLogged: parseFloat((newTotal / 3600).toFixed(4)), updatedAt: new Date().toISOString() } : t));
                                          }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Mins</label>
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
                                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeLoggedSeconds: newTotal, timeLogged: parseFloat((newTotal / 3600).toFixed(4)), updatedAt: new Date().toISOString() } : t));
                                          }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Secs</label>
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
                                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeLoggedSeconds: newTotal, timeLogged: parseFloat((newTotal / 3600).toFixed(4)), updatedAt: new Date().toISOString() } : t));
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
                            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 mt-4 pt-3 gap-1" onClick={(e) => e.stopPropagation()}>
                              {/* User Selector Dropdown */}
                            <Select 
                              value={task.assigneeId} 
                              onValueChange={(newAssigneeId) => {
                                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, assigneeId: newAssigneeId } : t));
                                const targetAssignee = users.find(u => u.id === newAssigneeId);
                                if (targetAssignee && user) {
                                  emailService.sendTaskAssignmentEmail(targetAssignee, task, user);
                                }
                              }}
                            >
                              <SelectTrigger className="h-7 border-none shadow-none focus:ring-0 p-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg pr-1 shrink min-w-[64px] max-w-[110px] overflow-hidden text-zinc-700 dark:text-zinc-300">
                                <div className="flex items-center space-x-1 truncate">
                                  <Avatar className="w-4.5 h-4.5 border shadow-sm shrink-0">
                                    <AvatarFallback className="text-[8px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                      {assignee?.name ? assignee.name.charAt(0) : '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-[10px] font-semibold truncate">
                                    {assignee?.name ? assignee.name.split(' ')[0] : 'Assign'}
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
                            <div className="flex items-center space-x-1 shrink-0">
                              {!(elapsedTimes[task.id] > 0) && (
                                <div className="flex items-center text-[10px] text-zinc-400 dark:text-zinc-500 font-medium whitespace-nowrap font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800 rounded px-1 py-0.5 shrink" onClick={(e) => e.stopPropagation()}>
                                  <Calendar className="w-2.5 h-2.5 mr-0.5 shrink-0 text-zinc-400" />
                                  <input 
                                    type="date" 
                                    value={task.dueDate || ''}
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      if (newVal) {
                                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, dueDate: newVal, updatedAt: new Date().toISOString() } : t));
                                        toast.success(`Task "${task.name}" deadline changed to ${newVal}.`);
                                      }
                                    }}
                                    className="bg-transparent border-none text-[9px] font-semibold text-zinc-600 dark:text-zinc-400 focus:outline-none focus:ring-0 p-0 w-[64px] cursor-pointer"
                                  />
                                </div>
                              )}

                              {/* Play Timer Button */}
                              {elapsedTimes[task.id] > 0 && (
                                <span className={cn(
                                  "font-mono text-[9px] px-1 py-0.5 rounded font-semibold tracking-tight shrink-0",
                                  activeTimerTaskId === task.id ? "text-red-500 bg-red-500/10 dark:bg-red-500/20 animate-pulse" : "text-zinc-500 bg-zinc-100 dark:bg-zinc-800"
                                )}>
                                  {formatTime(elapsedTimes[task.id])}
                                </span>
                              )}
                              <Button 
                                variant={activeTimerTaskId === task.id ? "destructive" : "ghost"} 
                                size="icon"
                                className={cn(
                                  "h-6.5 w-6.5 rounded-md transition-all cursor-pointer shrink-0",
                                  activeTimerTaskId === task.id ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" : "bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTimer(task.id, e);
                                }}
                              >
                                {activeTimerTaskId === task.id ? (
                                  <Square className="w-2 h-2 fill-current" />
                                ) : (
                                  <Play className="w-2 h-2 fill-current" />
                                )}
                              </Button>

                              {/* Quick-action Snooze Button */}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-6.5 w-6.5 rounded-md transition-all cursor-pointer shrink-0 bg-zinc-50 dark:bg-zinc-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400 border border-transparent hover:border-amber-200 dark:hover:border-amber-900"
                                title="Snooze for 24 hours"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSnoozeTask(task.id, e);
                                }}
                              >
                                <AlarmClock className="w-3 h-3" />
                              </Button>

                              {/* More Dropdown Trigger */}
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  className={cn(
                                    buttonVariants({ variant: "ghost", size: "icon" }),
                                    "h-6.5 w-6.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md shrink-0 cursor-pointer flex items-center justify-center"
                                  )}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="w-3 h-3" />
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
                                  <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-1" />
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSnoozeTask(task.id, e);
                                    }}
                                    className="text-xs font-bold uppercase tracking-widest cursor-pointer text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950"
                                  >
                                    <AlarmClock className="w-3.5 h-3.5 mr-2 text-amber-500" />
                                    Snooze 24h
                                  </DropdownMenuItem>
                                  <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-1" />
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
                <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
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
                    {task.isRecurring && (
                      <Badge variant="outline" className="text-[10px] font-bold border-orange-200 bg-orange-50 dark:bg-orange-950/25 text-orange-600 dark:text-orange-400 flex items-center space-x-1">
                        <RefreshCw className="w-2.5 h-2.5 text-orange-500 animate-[spin_10s_linear_infinite]" />
                        <span>Recurring {task.recurrencePeriod ? `(${task.recurrencePeriod}ly)` : ''}</span>
                      </Badge>
                    )}
                    <div className="flex items-center space-x-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 rounded-lg px-2 py-0.5 ml-auto">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold whitespace-nowrap">
                        Due:
                      </span>
                      <input 
                        type="date" 
                        value={task.dueDate || ''}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          if (newVal) {
                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, dueDate: newVal, updatedAt: new Date().toISOString() } : t));
                            toast.success(`Task "${task.name}" deadline changed to ${newVal}.`);
                          }
                        }}
                        className="bg-transparent border-none text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-0 p-0 w-[115px] cursor-pointer"
                      />
                      <Button
                        variant="ghost" 
                        size="icon"
                        className="h-5 w-5 text-zinc-400 hover:text-amber-500 hover:bg-amber-100/10 rounded-md shrink-0 cursor-pointer"
                        title="Snooze 24 hours"
                        onClick={(e) => handleSnoozeTask(task.id, e)}
                      >
                        <AlarmClock className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-zinc-50/50 dark:bg-zinc-900/10 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-400 block tracking-wider">Status</span>
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
                    <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-400 block tracking-wider">Priority</span>
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

                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-400 block tracking-wider">Allocated (Hours:Minutes)</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        type="button"
                        className="h-4 text-[8px] font-extrabold uppercase tracking-widest text-brand-secondary hover:text-orange-600 hover:bg-orange-50/50 px-1 -mr-1"
                        onClick={() => handleAiSuggestEstimateForTask(task)}
                        disabled={isEstimatingTime}
                      >
                        <Sparkles className={cn("w-2.5 h-2.5 mr-0.5", isEstimatingTime && "animate-spin")} />
                        {isEstimatingTime ? "..." : "AI"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative flex items-center">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <Input
                          type="number"
                          min="0"
                          placeholder="H"
                          className="h-9 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 font-semibold text-xs pl-8 pr-1.5"
                          value={task.timeEstimate !== undefined && task.timeEstimate !== 0 ? Math.floor(task.timeEstimate) : ''}
                          onChange={(e) => {
                            const hrs = parseInt(e.target.value, 10) || 0;
                            const currentVal = task.timeEstimate || 0;
                            const mins = Math.round((currentVal - Math.floor(currentVal)) * 60);
                            const newVal = hrs + (mins / 60);
                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeEstimate: parseFloat(newVal.toFixed(4)) } : t));
                          }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-400 select-none">H</span>
                      </div>
                      <div className="relative flex items-center">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="M"
                          className="h-9 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 font-semibold text-xs pl-8 pr-1.5"
                          value={task.timeEstimate !== undefined && task.timeEstimate !== 0 ? Math.round((task.timeEstimate - Math.floor(task.timeEstimate)) * 60) : ''}
                          onChange={(e) => {
                            const mins = parseInt(e.target.value, 10) || 0;
                            const hrs = Math.floor(task.timeEstimate || 0);
                            const newVal = hrs + (Math.min(59, Math.max(0, mins)) / 60);
                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeEstimate: parseFloat(newVal.toFixed(4)) } : t));
                          }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-400 select-none">M</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-1 pb-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-400 tracking-wider block">Assignee</span>
                    <div className="flex items-center space-x-3 bg-white dark:bg-zinc-950 border border-zinc-100 rounded-xl p-2.5 shadow-sm">
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
                          const targetAssignee = users.find(u => u.id === newAssigneeId);
                          if (targetAssignee && user) {
                            emailService.sendTaskAssignmentEmail(targetAssignee, task, user);
                          }
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
                    <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-400 tracking-wider block">Description</span>
                    <div className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl font-medium">
                      {task.description}
                    </div>
                  </div>
                )}

                {/* Workflow Stepper Progress */}
                {task.workflowSteps && task.workflowSteps.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider block">Workflow Pipeline Route</span>
                    <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-4 shadow-sm">
                      <div className="relative pl-1 space-y-3.5">
                        <div className="absolute left-3.5 top-2.5 bottom-2.5 w-0.5 bg-zinc-200 dark:bg-zinc-800" />
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
                                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 truncate">
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
                    <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-400 tracking-wider">Subtasks ({completedCount}/{subtaskCount})</span>
                    {subtaskCount > 0 && <span className="text-[10px] font-mono text-zinc-400 font-bold">{Math.round((completedCount/subtaskCount)*100)}% Completed</span>}
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {task.subTasks?.map((subtask) => (
                      <div 
                        key={subtask.id} 
                        className="flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm group/st"
                      >
                        <div className="flex items-center space-x-2.5">
                          <Checkbox 
                            checked={subtask.isCompleted} 
                            onCheckedChange={() => toggleSubtask(task.id, subtask.id)}
                            className="brand-checkbox"
                          />
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={cn(
                              "text-xs font-semibold text-zinc-700 dark:text-zinc-300",
                              subtask.isCompleted ? "text-zinc-400 dark:text-zinc-600 line-through" : "" // DETAILS_PANEL_SUBTASK_CLASS
                            )}>
                              {subtask.name}
                            </span>
                            <Select 
                              value={subtask.assigneeId || 'unassigned'} 
                              onValueChange={(val) => {
                                const targetVal = val === 'unassigned' ? '' : val;
                                setTasks(prev => prev.map(t => {
                                  if (t.id === task.id && t.subTasks) {
                                    return {
                                      ...t,
                                      subTasks: t.subTasks.map(st => 
                                        st.id === subtask.id ? { ...st, assigneeId: targetVal } : st
                                      )
                                    };
                                  }
                                  return t;
                                }));
                                if (targetVal) {
                                  const assignee = users.find(u => u.id === targetVal);
                                  if (assignee && user) {
                                    toast.success(`Assigned subtask "${subtask.name}" to ${assignee.name}`);
                                    const dummyTask: Task = {
                                      id: task.id,
                                      projectId: task.projectId,
                                      deliverableId: task.deliverableId,
                                      name: `${task.name} - Subtask: ${subtask.name}`,
                                      type: task.type,
                                      assigneeId: targetVal,
                                      status: task.status,
                                      priority: task.priority,
                                      dueDate: task.dueDate,
                                      createdAt: new Date().toISOString(),
                                      updatedAt: new Date().toISOString()
                                    };
                                    try {
                                      emailService.sendTaskAssignmentEmail(assignee, dummyTask, user);
                                    } catch (e) {
                                      console.error("Subtask email assignment notify failed", e);
                                    }
                                  }
                                } else {
                                  toast.success(`Removed assignment from subtask "${subtask.name}"`);
                                }
                              }}
                            >
                              <SelectTrigger className="h-6 border-none bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md p-1 shadow-none w-auto focus:ring-0 shrink-0">
                                {subtask.assigneeId ? (
                                  (() => {
                                    const assignee = users.find(u => u.id === subtask.assigneeId);
                                    return (
                                      <div className="flex items-center space-x-1.5 cursor-pointer max-w-[120px] truncate select-none">
                                        <div className="w-4 h-4 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 flex items-center justify-center text-[8px] font-black uppercase shrink-0 border border-purple-500/20">
                                          {assignee?.name?.charAt(0) || '?'}
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 truncate">
                                          {assignee?.name?.split(' ')[0] || subtask.assigneeId}
                                        </span>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <div className="flex items-center space-x-1 text-[10px] font-bold text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer select-none">
                                    <span className="w-4 h-4 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[10px] font-semibold">
                                      +
                                    </span>
                                    <span>Assign</span>
                                  </div>
                                )}
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-zinc-200">
                                <SelectItem value="unassigned" className="text-[10px] font-bold uppercase text-zinc-400">Unassigned</SelectItem>
                                {users.filter(u => u.role !== UserRole.CLIENT).map(u => (
                                  <SelectItem key={u.id} value={u.id} className="text-xs font-semibold">
                                    {u.name} ({u.role})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Subtask Timer Controls & Timing Inputs */}
                          <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded-md border border-zinc-200/50 dark:border-zinc-800">
                            {/* Timer/Elapsed */}
                            <div className="flex items-center space-x-1 pr-1.5 border-r border-zinc-200 dark:border-zinc-800">
                              <span className="font-mono text-[9px] text-zinc-500 font-semibold" title="Live timer duration">
                                {formatTime(subTaskElapsedTimes[subtask.id] || 0)}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4.5 w-4.5 rounded-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSubTaskTimer?.(subtask.id, task.id);
                                }}
                              >
                                {activeTimerSubTaskId === subtask.id ? (
                                  <Pause className="w-2 h-2 text-orange-500 fill-current animate-pulse" />
                                ) : (
                                  <Play className="w-2 h-2 text-zinc-400 hover:text-emerald-500 fill-current" />
                                )}
                              </Button>
                            </div>

                            {/* Spent (Logged) Time */}
                            <div className="flex items-center space-x-1 pl-1.5">
                              <span className="text-[8px] font-bold text-zinc-400 uppercase">Spent:</span>
                              <input
                                type="text"
                                placeholder="00:00"
                                value={
                                  inputDrafts[`spent-${subtask.id}`] !== undefined
                                    ? inputDrafts[`spent-${subtask.id}`]
                                    : (subtask.timeLogged !== undefined && subtask.timeLogged !== 0
                                        ? formatHoursMinutes(subtask.timeLogged)
                                        : (subTaskElapsedTimes[subtask.id]
                                            ? formatHoursMinutes(subTaskElapsedTimes[subtask.id] / 3600)
                                            : '')
                                      )
                                }
                                onChange={(e) => handleDurationInputChange(task.id, subtask.id, 'timeLogged', e.target.value)}
                                onBlur={() => handleDurationInputBlur(task.id, subtask.id, 'timeLogged')}
                                className={cn(
                                  "w-14 h-4.5 text-[9px] font-mono text-center bg-white dark:bg-zinc-950 border rounded focus:outline-none focus:ring-1 transition-colors",
                                  inputErrors[`spent-${subtask.id}`] 
                                    ? "border-red-500 text-red-600 focus:ring-red-500/30 dark:border-red-500 dark:text-red-400" 
                                    : "border-zinc-200 dark:border-zinc-800 focus:ring-brand-secondary/30"
                                )}
                                title={
                                  inputErrors[`spent-${subtask.id}`]
                                    ? "Invalid format! Use plain numbers (e.g. 45), colons (e.g. 01:30), or text (e.g. 1h 30m, 45m)"
                                    : "Manually adjust logged time format (e.g. 01:30, 45, 1h 30m)"
                                }
                              />
                            </div>
                          </div>

                          <Select 
                            value={subtask.status || (subtask.isCompleted ? TaskStatus.DONE : TaskStatus.OPEN)} 
                            onValueChange={(newStatus) => {
                              updateSubtaskStatus(task.id, subtask.id, newStatus as TaskStatus);
                            }}
                          >
                            <SelectTrigger className={cn(
                              "h-6 px-1.5 text-[8px] font-bold uppercase tracking-wider rounded-lg border transition-all w-[90px] cursor-pointer shrink-0",
                              (subtask.status === TaskStatus.OPEN || (!subtask.status && !subtask.isCompleted)) && "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
                              subtask.status === TaskStatus.IN_PROGRESS && "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
                              subtask.status === TaskStatus.REVIEW && "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
                              subtask.status === TaskStatus.CLIENT_REVIEW && "bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30",
                              subtask.status === TaskStatus.REVISION_REQUESTED && "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30",
                              subtask.status === TaskStatus.APPROVED && "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30",
                              (subtask.status === TaskStatus.DONE || (!subtask.status && subtask.isCompleted)) && "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
                              subtask.status === TaskStatus.BLOCKED && "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
                              subtask.status === TaskStatus.CANCELLED && "bg-red-50 text-red-600 border-red-105 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                            )}>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-zinc-200">
                              <SelectItem value={TaskStatus.OPEN} className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 focus:bg-zinc-50 dark:text-zinc-400">Open</SelectItem>
                              <SelectItem value={TaskStatus.IN_PROGRESS} className="text-[9px] font-bold uppercase tracking-widest text-blue-600 focus:bg-blue-50 dark:text-blue-400">In Progress</SelectItem>
                              <SelectItem value={TaskStatus.REVIEW} className="text-[9px] font-bold uppercase tracking-widest text-amber-600 focus:bg-amber-50 dark:text-amber-400">Review</SelectItem>
                              <SelectItem value={TaskStatus.CLIENT_REVIEW} className="text-[9px] font-bold uppercase tracking-widest text-teal-600 focus:bg-teal-50 dark:text-teal-400">Client Review</SelectItem>
                              <SelectItem value={TaskStatus.REVISION_REQUESTED} className="text-[9px] font-bold uppercase tracking-widest text-purple-600 focus:bg-purple-50 dark:text-purple-400">Revision Requested</SelectItem>
                              <SelectItem value={TaskStatus.APPROVED} className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 focus:bg-indigo-50 dark:text-indigo-400">Approved</SelectItem>
                              <SelectItem value={TaskStatus.DONE} className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 focus:bg-emerald-50 dark:text-emerald-400">Done</SelectItem>
                              <SelectItem value={TaskStatus.BLOCKED} className="text-[9px] font-bold uppercase tracking-widest text-rose-600 focus:bg-rose-50 dark:text-rose-400">Blocked</SelectItem>
                              <SelectItem value={TaskStatus.CANCELLED} className="text-[9px] font-bold uppercase tracking-widest text-red-600 focus:bg-red-50 dark:text-red-400">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover/st:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSubtask(task.id, subtask.id);
                            }}
                          >
                            <Trash2 className="w-2.5 h-2.5 text-red-400" />
                          </Button>
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
                      <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    </div>
                  </div>
                </div>

                {/* Timesheet Duration and Log Toggle inside Modal */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5 space-y-4">
                  {(() => {
                    const loggedHours = (elapsedTimes[task.id] !== undefined ? elapsedTimes[task.id] : (task.timeLoggedSeconds || ((task.timeLogged || 0) * 3600))) / 3600;
                    const isExceeded = task.timeEstimate > 0 && loggedHours > task.timeEstimate;
                    return (
                      <>
                        {isExceeded && (
                          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex gap-2.5 text-rose-800 dark:text-rose-300 select-none animate-[pulse_2s_infinite]">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 dark:text-rose-400">Allotted Time Limit Exceeded</p>
                              <p className="text-[10px] font-medium text-rose-550 dark:text-rose-450 mt-0.5 leading-relaxed">
                                This task has exceeded its allocation of {formatHoursMinutes(task.timeEstimate)} by {formatHoursMinutes(loggedHours - task.timeEstimate)}.
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase font-extrabold text-zinc-400 dark:text-zinc-400 block">Time Spent Tracker</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-lg font-black text-zinc-900 dark:text-white block">
                                {formatTime(elapsedTimes[task.id] || 0)}
                              </span>
                              {task.timeEstimate > 0 && (
                                <span className={cn(
                                  "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full font-mono border",
                                  isExceeded 
                                    ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50" 
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-transparent"
                                )}>
                                  Limit: {formatHoursMinutes(task.timeEstimate)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold uppercase text-[10px] tracking-widest cursor-pointer flex items-center gap-1"
                              onClick={() => {
                                setManualLogTask(task);
                                setManualLogDurationInput("01:00 mins");
                                setIsManualLogOpen(true);
                              }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Log Time
                            </Button>

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
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

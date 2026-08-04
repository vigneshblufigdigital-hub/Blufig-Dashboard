import React, { useState, useEffect } from 'react';
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
  Workflow,
  RotateCcw,
  Edit3,
  MessageSquare,
  History,
  UserPlus,
  Image as ImageIcon,
  Pencil,
  X,
  Check,
  Upload,
  Link as LinkIcon,
  FileText,
  ListTodo,
  GripVertical,
  Palette,
  BarChart3,
  Download,
  ShieldCheck,
  Database
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TaskStatus, Priority, Task, SubTask, SubTaskTimeEntry, TaskWorkflowStep, TaskActivity, UserRole, Project, UserProfile, ADMIN_ROLES, isSuperAdmin, DESIGN_ASSET_TYPES, Department, getQuickStatuses } from '@/src/types';
import { cn } from '@/lib/utils';
import { saveDocToFirestore } from '@/src/lib/firebase';
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
  filterDateRange?: string | null;
  onClearFilterDateRange?: () => void;
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

interface SubtaskAssigneesPickerProps {
  subtask: SubTask;
  taskId: string;
  users: UserProfile[];
  onUpdateAssignees: (taskId: string, subtaskId: string, assigneeIds: string[]) => void;
}

export function SubtaskAssigneesPicker({ subtask, taskId, users, onUpdateAssignees }: SubtaskAssigneesPickerProps) {
  const currentAssigneeIds = subtask.assigneeIds && subtask.assigneeIds.length > 0 
    ? subtask.assigneeIds 
    : (subtask.assigneeId ? [subtask.assigneeId] : []);
  
  const assignedUsers = users.filter(u => currentAssigneeIds.includes(u.id));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none focus:ring-0">
        {assignedUsers.length > 0 ? (
          <div className="flex items-center -space-x-1.5 hover:opacity-80 transition-opacity cursor-pointer select-none">
            {assignedUsers.slice(0, 3).map((u) => (
              <div 
                key={u.id} 
                className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-bold border-2 border-white dark:border-zinc-950 shadow-sm"
                title={`${u.name} (${u.role})`}
              >
                {u.name.charAt(0)}
              </div>
            ))}
            {assignedUsers.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-[8px] font-extrabold border-2 border-white dark:border-zinc-950">
                +{assignedUsers.length - 3}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-[10px] font-bold text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer select-none">
            <span className="w-4 h-4 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[10px] font-semibold">
              +
            </span>
            <span>Assign</span>
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-2 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl">
        <div className="px-2 py-1 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 mb-1">
          Assign Persons ({assignedUsers.length})
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {users.filter(u => u.role !== UserRole.CLIENT).map(u => {
            const isAssigned = currentAssigneeIds.includes(u.id);
            return (
              <div 
                key={u.id}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors",
                  isAssigned ? "bg-purple-50 text-purple-900 dark:bg-purple-950/30 dark:text-purple-300" : "hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextIds = isAssigned 
                    ? currentAssigneeIds.filter(id => id !== u.id)
                    : [...currentAssigneeIds, u.id];
                  onUpdateAssignees(taskId, subtask.id, nextIds);
                }}
              >
                <div className="flex items-center space-x-2">
                  <Avatar className="w-5 h-5 border shadow-sm">
                    <AvatarFallback className="text-[8px] font-bold bg-zinc-100 dark:bg-zinc-800">{u.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[120px]">{u.name}</span>
                </div>
                <Checkbox checked={isAssigned} className="brand-checkbox h-3.5 w-3.5" />
              </div>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TaskMultiAssigneePickerProps {
  assigneeIds: string[];
  onAssigneeIdsChange: (ids: string[]) => void;
  users: UserProfile[];
  onSuggestExpert?: () => void;
  isSuggesting?: boolean;
  label?: string;
  suggestionReason?: string | null;
}

export function TaskMultiAssigneePicker({
  assigneeIds,
  onAssigneeIdsChange,
  users,
  onSuggestExpert,
  isSuggesting,
  label = "Assignee(s)",
  suggestionReason
}: TaskMultiAssigneePickerProps) {
  const [search, setSearch] = useState('');
  
  const assignedUsers = users.filter(u => assigneeIds.includes(u.id));
  const availableUsers = users.filter(u => u.role !== UserRole.CLIENT);
  const filteredUsers = availableUsers.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    (u.designation && u.designation.toLowerCase().includes(search.toLowerCase())) ||
    (u.department && u.department.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleUser = (userId: string) => {
    if (assigneeIds.includes(userId)) {
      onAssigneeIdsChange(assigneeIds.filter(id => id !== userId));
    } else {
      onAssigneeIdsChange([...assigneeIds, userId]);
    }
  };

  const removeUser = (userId: string) => {
    onAssigneeIdsChange(assigneeIds.filter(id => id !== userId));
  };

  const selectAll = () => {
    onAssigneeIdsChange(filteredUsers.map(u => u.id));
  };

  const clearAll = () => {
    onAssigneeIdsChange([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          {label} {assignedUsers.length > 0 && `(${assignedUsers.length})`}
        </Label>
        {onSuggestExpert && (
          <Button 
            variant="ghost" 
            size="sm" 
            type="button"
            className="h-6 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:bg-orange-100/60 dark:hover:bg-orange-950/40 px-2 cursor-pointer"
            onClick={onSuggestExpert}
            disabled={isSuggesting}
          >
            <Activity className={cn("w-3 h-3 mr-1", isSuggesting && "animate-pulse")} />
            {isSuggesting ? "Analyzing..." : "Suggest Expert"}
          </Button>
        )}
      </div>

      <div className="p-2.5 bg-white dark:bg-zinc-950 border-2 border-zinc-300 dark:border-zinc-700 rounded-xl space-y-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
          {assignedUsers.map(u => (
            <div 
              key={u.id}
              className="inline-flex items-center gap-1.5 bg-purple-100 dark:bg-purple-900/60 text-purple-950 dark:text-purple-100 border border-purple-300 dark:border-purple-600 px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs group"
            >
              <Avatar className="w-4.5 h-4.5 border border-purple-400 shrink-0">
                <AvatarFallback className="text-[8px] font-black bg-purple-700 text-white">
                  {u.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[130px] text-xs font-bold text-purple-950 dark:text-purple-100">{u.name}</span>
              <button
                type="button"
                onClick={() => removeUser(u.id)}
                className="text-purple-600 hover:text-purple-950 dark:text-purple-300 dark:hover:text-white rounded-full p-0.5 transition-colors cursor-pointer"
                title={`Remove ${u.name}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs font-bold border-2 border-dashed border-zinc-400 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg px-2.5 cursor-pointer flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>{assignedUsers.length === 0 ? "Select Assignees..." : "+ Add People"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2 rounded-2xl border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1.5 px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                  Assign Team Members
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    type="button" 
                    onClick={selectAll} 
                    className="text-[9px] font-bold text-purple-700 dark:text-purple-300 hover:underline px-1 cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-[9px] text-zinc-300 dark:text-zinc-600">|</span>
                  <button 
                    type="button" 
                    onClick={clearAll} 
                    className="text-[9px] font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 px-1 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
                <Input
                  placeholder="Search team member..."
                  className="h-8 text-xs pl-8 pr-2.5 rounded-xl border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>

              <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
                {filteredUsers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-zinc-500 dark:text-zinc-400 italic">No matching members found</div>
                ) : (
                  filteredUsers.map(u => {
                    const isSelected = assigneeIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleUser(u.id);
                        }}
                        className={cn(
                          "flex items-center justify-between p-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors border",
                          isSelected 
                            ? "bg-purple-100/90 dark:bg-purple-950/70 text-purple-950 dark:text-purple-100 border-purple-300 dark:border-purple-700 font-bold" 
                            : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200"
                        )}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <Avatar className="w-6 h-6 border border-zinc-300 dark:border-zinc-700 shrink-0">
                            <AvatarFallback className="text-[9px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                              {u.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 truncate">
                            <div className="truncate text-xs font-bold leading-tight text-zinc-900 dark:text-zinc-100">{u.name}</div>
                            {u.designation && (
                              <div className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium truncate">{u.designation}</div>
                            )}
                          </div>
                        </div>
                        <Checkbox checked={isSelected} className="brand-checkbox h-4 w-4 shrink-0 ml-2" />
                      </div>
                    );
                  })
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {suggestionReason && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-orange-900 dark:text-orange-200 bg-orange-100/80 dark:bg-orange-950/60 p-2.5 rounded-lg border border-orange-300 dark:border-orange-800 flex items-start space-x-2"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />
          <span className="font-medium">AI Logic: {suggestionReason}</span>
        </motion.div>
      )}
    </div>
  );
}

interface SubtaskStatusBoxProps {
  subtask: SubTask;
  taskId: string;
  onUpdateStatus: (taskId: string, subtaskId: string, status: TaskStatus) => void;
}

export function SubtaskStatusBox({ subtask, taskId, onUpdateStatus }: SubtaskStatusBoxProps) {
  const currentStatus = subtask.status || (subtask.isCompleted ? TaskStatus.DONE : TaskStatus.OPEN);

  return (
    <Select 
      value={currentStatus} 
      onValueChange={(newStatus) => {
        onUpdateStatus(taskId, subtask.id, newStatus as TaskStatus);
      }}
    >
      <SelectTrigger className={cn(
        "h-6 px-2 text-[8px] font-extrabold uppercase tracking-wider rounded-lg border transition-all duration-150 w-[115px] cursor-pointer shrink-0 shadow-2xs truncate hover:opacity-90 active:scale-95",
        (currentStatus === TaskStatus.OPEN || currentStatus === TaskStatus.YET_TO_START) && "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 hover:bg-slate-200/80",
        currentStatus === TaskStatus.IN_PROGRESS && "bg-sky-50 text-sky-800 border-sky-200/90 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60 hover:bg-sky-100/80",
        (currentStatus === TaskStatus.INTERNAL_REVIEW || currentStatus === TaskStatus.REVIEW) && "bg-amber-50 text-amber-800 border-amber-200/90 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60 hover:bg-amber-100/80",
        currentStatus === TaskStatus.IN_REVIEW_AM && "bg-indigo-50 text-indigo-800 border-indigo-200/90 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60 hover:bg-indigo-100/80",
        (currentStatus === TaskStatus.UNDER_CLIENT_REVIEW || currentStatus === TaskStatus.CLIENT_REVIEW) && "bg-teal-50 text-teal-800 border-teal-200/90 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/60 hover:bg-teal-100/80",
        currentStatus === TaskStatus.INTERNAL_CHANGES && "bg-violet-50 text-violet-800 border-violet-200/90 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/60 hover:bg-violet-100/80",
        (currentStatus === TaskStatus.CHANGES_REQUESTED_AM || currentStatus === TaskStatus.REVISION_REQUESTED) && "bg-purple-50 text-purple-800 border-purple-200/90 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60 hover:bg-purple-100/80",
        currentStatus === TaskStatus.CHANGES_REQUESTED_CLIENT && "bg-rose-50 text-rose-800 border-rose-200/90 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60 hover:bg-rose-100/80",
        currentStatus === TaskStatus.APPROVED && "bg-emerald-50 text-emerald-800 border-emerald-200/90 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100/80",
        currentStatus === TaskStatus.DONE && "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700 hover:bg-emerald-200/80",
        currentStatus === TaskStatus.ON_HOLD && "bg-orange-50 text-orange-800 border-orange-200/90 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60 hover:bg-orange-100/80",
        currentStatus === TaskStatus.CANCELLED && "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 hover:bg-zinc-200/60",
        currentStatus === TaskStatus.REJECTED && "bg-red-50 text-red-800 border-red-200/90 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60 hover:bg-red-100/80"
      )}>
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 min-w-[170px] max-h-[300px]">
        <SelectItem value={TaskStatus.OPEN} className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 focus:bg-zinc-50 dark:text-zinc-400">Yet to Start / Open</SelectItem>
        <SelectItem value={TaskStatus.IN_PROGRESS} className="text-[9px] font-bold uppercase tracking-widest text-blue-600 focus:bg-blue-50 dark:text-blue-400">In Progress</SelectItem>
        <SelectItem value={TaskStatus.INTERNAL_REVIEW} className="text-[9px] font-bold uppercase tracking-widest text-amber-600 focus:bg-amber-50 dark:text-amber-400">Internal Review (QC)</SelectItem>
        <SelectItem value={TaskStatus.IN_REVIEW_AM} className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 focus:bg-indigo-50 dark:text-indigo-400">In Review (AM)</SelectItem>
        <SelectItem value={TaskStatus.UNDER_CLIENT_REVIEW} className="text-[9px] font-bold uppercase tracking-widest text-teal-600 focus:bg-teal-50 dark:text-teal-400">Under Client Review</SelectItem>
        <SelectItem value={TaskStatus.APPROVED} className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 focus:bg-emerald-50 dark:text-emerald-400">Approved</SelectItem>
        <SelectItem value={TaskStatus.DONE} className="text-[9px] font-bold uppercase tracking-widest text-emerald-700 focus:bg-emerald-50 dark:text-emerald-400">Done (Closed)</SelectItem>

        {/* 3 Revision Loops */}
        <div className="px-2 py-1 text-[8px] font-black uppercase text-zinc-400 border-t border-b my-1">3 Revision Loops</div>
        <SelectItem value={TaskStatus.INTERNAL_CHANGES} className="text-[9px] font-bold uppercase tracking-widest text-violet-600 focus:bg-violet-50 dark:text-violet-400">Internal Changes (Lead QC)</SelectItem>
        <SelectItem value={TaskStatus.CHANGES_REQUESTED_AM} className="text-[9px] font-bold uppercase tracking-widest text-purple-600 focus:bg-purple-50 dark:text-purple-400">Changes Requested — AM</SelectItem>
        <SelectItem value={TaskStatus.CHANGES_REQUESTED_CLIENT} className="text-[9px] font-bold uppercase tracking-widest text-rose-600 focus:bg-rose-50 dark:text-rose-400">Changes Requested — Client</SelectItem>

        {/* Extra States */}
        <div className="px-2 py-1 text-[8px] font-black uppercase text-zinc-400 border-t border-b my-1">Extra States</div>
        <SelectItem value={TaskStatus.ON_HOLD} className="text-[9px] font-bold uppercase tracking-widest text-orange-600 focus:bg-orange-50 dark:text-orange-400">On Hold</SelectItem>
        <SelectItem value={TaskStatus.CANCELLED} className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 focus:bg-zinc-50 dark:text-zinc-500">Cancelled</SelectItem>
        <SelectItem value={TaskStatus.REJECTED} className="text-[9px] font-bold uppercase tracking-widest text-red-600 focus:bg-red-50 dark:text-red-400">Rejected</SelectItem>
      </SelectContent>
    </Select>
  );
}

interface TaskActivityFeedProps {
  task: Task;
  onAddComment: (taskId: string, commentText: string) => void;
}

export function TaskActivityFeed({ task, onAddComment }: TaskActivityFeedProps) {
  const [commentInput, setCommentInput] = useState('');
  const activities = task.activities || [];

  const handlePost = () => {
    if (!commentInput.trim()) return;
    onAddComment(task.id, commentInput.trim());
    setCommentInput('');
  };

  return (
    <div className="space-y-3.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-wider flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-brand-secondary" />
          Activity Log & Updates ({activities.length})
        </span>
      </div>

      {/* Comment Input */}
      <div className="flex items-center gap-2">
        <Input 
          placeholder="Type an activity update, note, or comment..." 
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handlePost();
          }}
          className="h-8 text-xs rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
        />
        <Button 
          size="sm" 
          onClick={handlePost}
          disabled={!commentInput.trim()}
          className="h-8 px-3 rounded-xl bg-brand-secondary hover:bg-brand-secondary/90 text-white font-bold text-[10px] uppercase tracking-wider"
        >
          Post
        </Button>
      </div>

      {/* Activity List */}
      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
        {activities.length === 0 ? (
          <div className="text-center py-4 text-xs text-zinc-400 italic bg-zinc-50/50 dark:bg-zinc-900/10 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            No activity recorded yet for this task.
          </div>
        ) : (
          activities.map((act) => (
            <div key={act.id} className="flex items-start space-x-2.5 bg-zinc-50/80 dark:bg-zinc-900/30 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs">
              <Avatar className="w-6 h-6 border shadow-sm shrink-0 mt-0.5">
                <AvatarFallback className="text-[8px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {act.userName?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate text-[11px]">{act.userName}</span>
                  <span className="text-[9px] font-medium text-zinc-400">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-[8px] font-extrabold uppercase tracking-wider py-0 px-1.5 bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20">
                    {act.action}
                  </Badge>
                  {act.details && (
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium text-[11px]">
                      {act.details}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function parseDescriptionImages(descriptionText: string) {
  if (!descriptionText) return { cleanText: '', images: [] };

  const images: { alt: string; url: string }[] = [];
  const mdImageRegex = /!\[(.*?)\]\((.*?)\)/g;
  let match;
  let textWithoutMdImages = descriptionText;

  while ((match = mdImageRegex.exec(descriptionText)) !== null) {
    images.push({ alt: match[1] || 'Task image', url: match[2] });
  }

  textWithoutMdImages = textWithoutMdImages.replace(mdImageRegex, '').trim();

  const urlRegex = /(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|gif|webp|svg)|data:image\/[a-zA-Z]+;base64,[^\s]+)/gi;
  let urlMatch;
  while ((urlMatch = urlRegex.exec(textWithoutMdImages)) !== null) {
    const foundUrl = urlMatch[1];
    if (!images.some(img => img.url === foundUrl)) {
      images.push({ alt: 'Attached Image', url: foundUrl });
    }
  }

  const cleanText = textWithoutMdImages.replace(urlRegex, '').trim();

  return { cleanText, images };
}

function TaskDescriptionRenderer({ 
  description, 
  onRemoveImage 
}: { 
  description?: string; 
  onRemoveImage?: (imageUrl: string) => void;
}) {
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

  if (!description) {
    return <span className="italic text-zinc-400">No description provided yet.</span>;
  }

  const { cleanText, images } = parseDescriptionImages(description);

  return (
    <div className="space-y-3">
      {cleanText && (
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium">
          {cleanText}
        </p>
      )}

      {images.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <ImageIcon className="w-3 h-3 text-brand-secondary" />
            <span>Attached Images ({images.length})</span>
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {images.map((img, idx) => (
              <div 
                key={idx} 
                className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 shadow-sm aspect-video flex items-center justify-center"
              >
                <img 
                  src={img.url} 
                  alt={img.alt} 
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 cursor-pointer"
                  onClick={() => setActivePreviewImage(img.url)}
                />
                <div 
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                  onClick={() => setActivePreviewImage(img.url)}
                >
                  <Button size="icon" variant="secondary" className="h-7 w-7 rounded-full bg-white/90 text-zinc-900 hover:bg-white shadow-md">
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {onRemoveImage && (
                  <Button 
                    size="icon" 
                    variant="destructive" 
                    className="absolute top-1 right-1 h-5 w-5 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveImage(img.url);
                    }}
                    title="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Image Preview Dialog */}
      <Dialog open={!!activePreviewImage} onOpenChange={(open) => !open && setActivePreviewImage(null)}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-2 bg-zinc-950/95 border-zinc-800 rounded-2xl flex items-center justify-center overflow-hidden">
          {activePreviewImage && (
            <div className="relative max-w-full max-h-[85vh] flex flex-col items-center justify-center">
              <img 
                src={activePreviewImage} 
                alt="Enlarged view" 
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
              <div className="flex items-center gap-3 mt-3">
                <a 
                  href={activePreviewImage} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> Open Full Image
                </a>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setActivePreviewImage(null)}
                  className="text-xs font-bold border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DescriptionImageUploader({ 
  onAddImage 
}: { 
  onAddImage: (imageUrl: string) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          onAddImage(dataUrl);
          toast.success('Image attached to task description!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePromptUrl = () => {
    const url = window.prompt('Enter image URL (e.g. https://domain.com/image.png):');
    if (url && url.trim()) {
      onAddImage(url.trim());
      toast.success('Image URL added!');
    }
  };

  return (
    <div className="flex items-center gap-2 pt-1">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      <Button 
        type="button" 
        variant="outline" 
        size="sm" 
        onClick={() => fileInputRef.current?.click()}
        className="h-7 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 rounded-lg flex items-center gap-1 cursor-pointer"
      >
        <ImageIcon className="w-3 h-3 text-brand-secondary" />
        <span>Attach Local Image</span>
      </Button>
      <Button 
        type="button" 
        variant="outline" 
        size="sm" 
        onClick={handlePromptUrl}
        className="h-7 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 rounded-lg flex items-center gap-1 cursor-pointer"
      >
        <LinkIcon className="w-3 h-3 text-zinc-500" />
        <span>Image URL</span>
      </Button>
    </div>
  );
}

function SubtaskInput({ 
  taskId, 
  users = [],
  onAddSubtask 
}: { 
  taskId: string; 
  users?: UserProfile[];
  onAddSubtask: (taskId: string, name: string, assigneeIds?: string[], description?: string, assetType?: string, priority?: Priority, dueDate?: string, workCategory?: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [workCategory, setWorkCategory] = useState<string>('BAU');
  const [assetType, setAssetType] = useState<string>('');
  const [priority, setPriority] = useState<Priority>(Priority.NORMAL);
  const [dueDate, setDueDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [showNotes, setShowNotes] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAddSubtask(taskId, name.trim(), assigneeIds, description, assetType || undefined, priority, dueDate || undefined, workCategory);
    setName('');
    setDescription('');
    setAssetType('');
    setWorkCategory('BAU');
    setDueDate('');
    setAssigneeIds([]);
    setShowNotes(false);
  };

  if (!isAdding) {
    return (
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white bg-zinc-50/80 hover:bg-zinc-100 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 flex items-center gap-2 shadow-2xs"
      >
        <Plus className="w-4 h-4 text-brand-secondary" />
        <span>Add Subtask / Deliverable Asset</span>
      </button>
    );
  }

  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl transition-all space-y-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <Input 
          placeholder="Subtask / Asset title (e.g. Ginesys — Static Post 1)..." 
          className="h-9 bg-white dark:bg-zinc-950 text-xs border-zinc-200 dark:border-zinc-800 font-medium focus-visible:ring-emerald-500/20 flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAdd();
            } else if (e.key === 'Escape') {
              setIsAdding(false);
              setName('');
            }
          }}
        />
        <Button 
          type="button"
          size="sm"
          disabled={!name.trim()}
          className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 shrink-0 rounded-xl cursor-pointer"
          onClick={handleAdd}
        >
          Add Asset
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-2.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl shrink-0 cursor-pointer"
          onClick={() => {
            setIsAdding(false);
            setName('');
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Fast Metadata Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800 text-xs">
        {/* Work Category (BAU / Adhoc / UI) */}
        <Select value={workCategory} onValueChange={setWorkCategory}>
          <SelectTrigger className="h-7 text-xs font-bold bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg w-[110px] text-zinc-800 dark:text-zinc-200 shadow-2xs">
            <SelectValue placeholder="Work Type" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1 shadow-lg">
            <SelectItem value="BAU" className="text-xs font-bold text-indigo-600 dark:text-indigo-400">BAU</SelectItem>
            <SelectItem value="Adhoc" className="text-xs font-bold text-amber-600 dark:text-amber-400">Adhoc</SelectItem>
            <SelectItem value="UI" className="text-xs font-bold text-sky-600 dark:text-sky-400">UI</SelectItem>
          </SelectContent>
        </Select>

        {/* Asset Type */}
        <Select value={assetType} onValueChange={setAssetType}>
          <SelectTrigger className="h-7 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg w-[160px] text-zinc-800 dark:text-zinc-200 shadow-2xs">
            <SelectValue placeholder="Asset Type..." />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1 shadow-lg">
            {DESIGN_ASSET_TYPES.map(at => (
              <SelectItem key={at} value={at} className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{at}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select value={priority} onValueChange={(val) => setPriority(val as Priority)}>
          <SelectTrigger className="h-7 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg w-[110px] text-zinc-800 dark:text-zinc-200 shadow-2xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1 shadow-lg">
            <SelectItem value={Priority.LOW} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Low</SelectItem>
            <SelectItem value={Priority.NORMAL} className="text-xs font-bold text-blue-600 dark:text-blue-400">Normal</SelectItem>
            <SelectItem value={Priority.HIGH} className="text-xs font-bold text-orange-600 dark:text-orange-400">High</SelectItem>
            <SelectItem value={Priority.CRITICAL} className="text-xs font-bold text-red-600 dark:text-red-400">Critical</SelectItem>
          </SelectContent>
        </Select>

        {/* Deadline */}
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-950 px-2 h-7 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500">
          <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
          <input 
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-transparent text-xs focus:outline-none cursor-pointer"
          />
        </div>

        {/* Multi-Assignee Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-7 text-xs font-bold bg-white dark:bg-zinc-950 border-2 border-zinc-300 dark:border-zinc-700 rounded-lg px-2 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs",
                assigneeIds.length > 0 ? "text-purple-900 dark:text-purple-200 border-purple-400 bg-purple-100/70 dark:bg-purple-950/60" : "text-zinc-700 dark:text-zinc-300"
              )}
            >
              <UserPlus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>
                {assigneeIds.length === 0 ? "Assignees" : `${assigneeIds.length} Assigned`}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 p-2 rounded-2xl border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl space-y-1">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Assign Members ({assigneeIds.length})
              </span>
              {assigneeIds.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAssigneeIds([]); }}
                  className="text-[9px] font-bold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {users.filter(u => u.role !== UserRole.CLIENT).map(u => {
                const isSel = assigneeIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssigneeIds(prev => isSel ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                    }}
                    className={cn(
                      "flex items-center justify-between p-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors border",
                      isSel 
                        ? "bg-purple-100/90 dark:bg-purple-950/70 text-purple-950 dark:text-purple-100 border-purple-300 dark:border-purple-700 font-bold" 
                        : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                    )}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Avatar className="w-5 h-5 border border-zinc-300 dark:border-zinc-700 shrink-0">
                        <AvatarFallback className="text-[8px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">{u.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate font-bold text-zinc-900 dark:text-zinc-100">{u.name}</span>
                    </div>
                    <Checkbox checked={isSel} className="brand-checkbox h-3.5 w-3.5" />
                  </div>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Description toggle */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
          onClick={() => setShowNotes(!showNotes)}
        >
          <FileText className="w-3.5 h-3.5 mr-1 text-zinc-400" />
          <span>{showNotes ? 'Hide Notes' : '+ Add Notes'}</span>
        </Button>
      </div>

      {showNotes && (
        <Textarea 
          placeholder="Subtask specifications, dimensions, reference links..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl resize-none h-16"
        />
      )}
    </div>
  );
}

function EditableSubtaskRow({
  subtask,
  taskId,
  users,
  onToggle,
  onUpdateStatus,
  onUpdateAssignees,
  onUpdateSubtask,
  onDelete,
  subTaskElapsedTimes,
  activeTimerSubTaskId,
  toggleSubTaskTimer,
  handleDurationInputChange,
  handleDurationInputBlur,
  inputDrafts,
  inputErrors,
  formatTime,
  formatHoursMinutes,
  onSubtaskDragStart,
  onSubtaskDragOver,
  onSubtaskDrop
}: {
  key?: string;
  subtask: SubTask;
  taskId: string;
  users: UserProfile[];
  onToggle: (taskId: string, subtaskId: string) => void;
  onUpdateStatus: (taskId: string, subtaskId: string, status: TaskStatus) => void;
  onUpdateAssignees: (taskId: string, subtaskId: string, assigneeIds: string[]) => void;
  onUpdateSubtask: (taskId: string, subtaskId: string, updates: Partial<SubTask>) => void;
  onDelete: (taskId: string, subtaskId: string) => void;
  subTaskElapsedTimes?: Record<string, number>;
  activeTimerSubTaskId?: string | null;
  toggleSubTaskTimer?: (subtaskId: string, taskId: string) => void;
  handleDurationInputChange?: (taskId: string, subtaskId: string, field: 'timeEstimate' | 'timeLogged', value: string) => void;
  handleDurationInputBlur?: (taskId: string, subtaskId: string, field: 'timeEstimate' | 'timeLogged') => void;
  inputDrafts?: Record<string, string>;
  inputErrors?: Record<string, boolean>;
  formatTime?: (seconds: number) => string;
  formatHoursMinutes?: (hoursFloat: number | undefined) => string;
  onSubtaskDragStart?: (e: React.DragEvent, taskId: string, subtaskId: string) => void;
  onSubtaskDragOver?: (e: React.DragEvent, subtaskId: string) => void;
  onSubtaskDrop?: (e: React.DragEvent, taskId: string, targetSubtaskId: string) => void;
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(subtask.name);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState(subtask.description || '');

  useEffect(() => {
    setNameInput(subtask.name);
  }, [subtask.name]);

  useEffect(() => {
    setDescInput(subtask.description || '');
  }, [subtask.description]);

  const handleSaveName = () => {
    if (nameInput.trim() && nameInput.trim() !== subtask.name) {
      onUpdateSubtask(taskId, subtask.id, { name: nameInput.trim() });
    }
    setIsEditingName(false);
  };

  const handleSaveDesc = () => {
    onUpdateSubtask(taskId, subtask.id, { description: descInput.trim() || undefined });
    setIsEditingDesc(false);
  };

  const showTimerControls = toggleSubTaskTimer && formatTime && formatHoursMinutes;

  return (
    <div 
      draggable={Boolean(onSubtaskDragStart)}
      onDragStart={(e) => {
        e.stopPropagation();
        if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
          e.nativeEvent.stopImmediatePropagation();
        }
        if (onSubtaskDragStart) onSubtaskDragStart(e, taskId, subtask.id);
      }}
      onDragOver={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (onSubtaskDragOver) onSubtaskDragOver(e, subtask.id);
      }}
      onDrop={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (onSubtaskDrop) onSubtaskDrop(e, taskId, subtask.id);
      }}
      className="bg-white dark:bg-zinc-950/80 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/90 shadow-2xs group/st space-y-2.5 text-xs transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Row 1: Drag Handle + Checkbox + Name / Edit Input + Top Right Quick Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <div className="cursor-grab active:cursor-grabbing text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400 mt-1 shrink-0 transition-colors" title="Drag to reorder or move subtask">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <Checkbox 
            checked={subtask.isCompleted} 
            onCheckedChange={() => onToggle(taskId, subtask.id)}
            className="brand-checkbox shrink-0 mt-0.5"
          />

          {isEditingName ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Input 
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                autoFocus
                className="h-7 text-xs bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 py-0 px-2 focus-visible:ring-brand-secondary/20 flex-1 min-w-0"
                placeholder="Enter subtask name..."
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 shrink-0" onClick={handleSaveName} title="Save name">
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0" onClick={() => setIsEditingName(false)} title="Cancel">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div 
              className="flex items-center gap-1.5 flex-1 min-w-0 group/name cursor-pointer py-0.5" 
              onClick={() => { setNameInput(subtask.name); setIsEditingName(true); }}
              title="Click to edit subtask name"
            >
              <span className={cn(
                "text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-snug break-words flex-1 min-w-0",
                subtask.isCompleted ? "text-zinc-400 dark:text-zinc-500 line-through" : ""
              )}>
                {subtask.name}
              </span>
              <Pencil className="w-3 h-3 text-zinc-400 opacity-0 group-hover/st:opacity-100 group-hover/name:text-brand-secondary transition-opacity shrink-0" />
            </div>
          )}
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-1.5 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1",
              (isEditingDesc || subtask.description) ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 font-bold" : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500"
            )}
            onClick={() => {
              setDescInput(subtask.description || '');
              setIsEditingDesc(!isEditingDesc);
            }}
            title="View/Edit Subtask Description / Notes"
          >
            <FileText className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>{subtask.description ? 'Notes' : '+ Note'}</span>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-opacity cursor-pointer shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(taskId, subtask.id);
            }}
            title="Delete subtask"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </Button>
        </div>
      </div>

      {/* Description / Notes Edit Box */}
      {isEditingDesc && (
        <div className="p-2 bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5">
          <Textarea 
            value={descInput}
            onChange={(e) => setDescInput(e.target.value)}
            placeholder="Add asset specifications, dimensions, reference links..."
            className="text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg h-16 resize-none"
          />
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-zinc-500" onClick={() => setIsEditingDesc(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-6 text-[10px] bg-emerald-600 text-white font-bold px-2.5 rounded-md" onClick={handleSaveDesc}>
              Save Note
            </Button>
          </div>
        </div>
      )}

      {/* Row 2: Metadata - Assignees, Asset Type, Priority, Deadline, Status, and optional Timer controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center gap-1.5 flex-wrap">
          <SubtaskAssigneesPicker
            subtask={subtask}
            taskId={taskId}
            users={users}
            onUpdateAssignees={onUpdateAssignees}
          />

          {/* Work Category Select (BAU / Adhoc / UI) */}
          <Select 
            value={subtask.workCategory || 'BAU'} 
            onValueChange={(val) => {
              onUpdateSubtask(taskId, subtask.id, { workCategory: val });
            }}
          >
            <SelectTrigger className="h-6 px-1.5 text-[9px] font-black rounded-lg bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-200/80 transition-all cursor-pointer">
              <SelectValue placeholder="Work Type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1 shadow-lg">
              <SelectItem value="BAU" className="text-xs font-bold text-indigo-600 dark:text-indigo-400">BAU</SelectItem>
              <SelectItem value="Adhoc" className="text-xs font-bold text-amber-600 dark:text-amber-400">Adhoc</SelectItem>
              <SelectItem value="UI" className="text-xs font-bold text-sky-600 dark:text-sky-400">UI</SelectItem>
            </SelectContent>
          </Select>

          {/* Asset Type Select */}
          <Select 
            value={subtask.assetType || 'none'} 
            onValueChange={(val) => {
              onUpdateSubtask(taskId, subtask.id, { assetType: val === 'none' ? undefined : val });
            }}
          >
            <SelectTrigger className="h-6 px-1.5 text-[9px] font-bold rounded-lg bg-purple-50/80 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/80 dark:border-purple-800 hover:bg-purple-100/80 transition-all cursor-pointer max-w-[120px]">
              <SelectValue placeholder="Asset Type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1 shadow-lg">
              <SelectItem value="none" className="text-xs text-zinc-500 font-medium">No Asset Type</SelectItem>
              {DESIGN_ASSET_TYPES.map(at => (
                <SelectItem key={at} value={at} className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{at}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Select */}
          <Select 
            value={subtask.priority || Priority.NORMAL} 
            onValueChange={(val) => {
              onUpdateSubtask(taskId, subtask.id, { priority: val as Priority });
            }}
          >
            <SelectTrigger className={cn(
              "h-6 px-1.5 text-[9px] font-extrabold rounded-lg border transition-all cursor-pointer min-w-[65px]",
              subtask.priority === Priority.CRITICAL && "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300",
              subtask.priority === Priority.HIGH && "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300",
              subtask.priority === Priority.LOW && "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400",
              (!subtask.priority || subtask.priority === Priority.NORMAL) && "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200/80"
            )}>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1 shadow-lg">
              <SelectItem value={Priority.LOW} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Low</SelectItem>
              <SelectItem value={Priority.NORMAL} className="text-xs font-bold text-blue-600 dark:text-blue-400">Normal</SelectItem>
              <SelectItem value={Priority.HIGH} className="text-xs font-bold text-orange-600 dark:text-orange-400">High</SelectItem>
              <SelectItem value={Priority.CRITICAL} className="text-xs font-bold text-red-600 dark:text-red-400">Critical</SelectItem>
            </SelectContent>
          </Select>

          {/* Deadline / Due Date & Shift Count */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={subtask.dueDate || ''}
              onChange={(e) => {
                onUpdateSubtask(taskId, subtask.id, { dueDate: e.target.value || undefined });
              }}
              className="h-6 text-[9px] px-1 py-0 font-medium bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-brand-secondary/30 cursor-pointer"
              title="Subtask Deadline (shift count tracked for lead reporting)"
            />
            {Boolean(subtask.deadlineChangeCount && subtask.deadlineChangeCount > 0) && (
              <Badge 
                variant="outline" 
                className="h-5 px-1.5 text-[8px] font-mono font-black bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 rounded-md"
                title={`${subtask.deadlineChangeCount} deadline change(s) recorded`}
              >
                📅 {subtask.deadlineChangeCount} shift{subtask.deadlineChangeCount! > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {showTimerControls && (
            <div className="flex items-center space-x-1.5 bg-zinc-50 dark:bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-100/60 dark:border-zinc-800">
              <div className="flex items-center space-x-1 border-r border-zinc-200 dark:border-zinc-800 pr-1.5">
                <span className="font-mono text-[10px] text-zinc-500 font-semibold">
                  {formatTime!(subTaskElapsedTimes?.[subtask.id] || 0)}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSubTaskTimer!(subtask.id, taskId);
                  }}
                >
                  {activeTimerSubTaskId === subtask.id ? (
                    <Pause className="w-2.5 h-2.5 text-orange-500 fill-current animate-pulse" />
                  ) : (
                    <Play className="w-2.5 h-2.5 text-zinc-400 hover:text-emerald-500 fill-current" />
                  )}
                </Button>
              </div>

              {handleDurationInputChange && handleDurationInputBlur && inputDrafts && inputErrors && (
                <>
                  <div className="flex items-center space-x-1 border-r border-zinc-200 dark:border-zinc-800 pr-1.5">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase">Alloc:</span>
                    <input
                      type="text"
                      placeholder="00:00"
                      value={
                        inputDrafts[`est-${subtask.id}`] !== undefined
                          ? inputDrafts[`est-${subtask.id}`]
                          : (subtask.timeEstimate !== undefined && subtask.timeEstimate !== 0
                              ? formatHoursMinutes!(subtask.timeEstimate)
                              : '')
                      }
                      onChange={(e) => handleDurationInputChange(taskId, subtask.id, 'timeEstimate', e.target.value)}
                      onBlur={() => handleDurationInputBlur(taskId, subtask.id, 'timeEstimate')}
                      className={cn(
                        "w-11 h-4 text-[9px] font-mono text-center bg-white dark:bg-zinc-950 border rounded focus:outline-none focus:ring-1 transition-colors",
                        inputErrors[`est-${subtask.id}`] 
                          ? "border-red-500 text-red-600 focus:ring-red-500/30" 
                          : "border-zinc-200 dark:border-zinc-800 focus:ring-brand-secondary/30"
                      )}
                    />
                  </div>

                  <div className="flex items-center space-x-1">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase">Spent:</span>
                    <input
                      type="text"
                      placeholder="00:00"
                      value={
                        inputDrafts[`spent-${subtask.id}`] !== undefined
                          ? inputDrafts[`spent-${subtask.id}`]
                          : (subtask.timeLogged !== undefined && subtask.timeLogged !== 0
                              ? formatHoursMinutes!(subtask.timeLogged)
                              : (subTaskElapsedTimes?.[subtask.id]
                                  ? formatHoursMinutes!(subTaskElapsedTimes[subtask.id] / 3600)
                                  : '')
                            )
                      }
                      onChange={(e) => handleDurationInputChange(taskId, subtask.id, 'timeLogged', e.target.value)}
                      onBlur={() => handleDurationInputBlur(taskId, subtask.id, 'timeLogged')}
                      className={cn(
                        "w-11 h-4 text-[9px] font-mono text-center bg-white dark:bg-zinc-950 border rounded focus:outline-none focus:ring-1 transition-colors",
                        inputErrors[`spent-${subtask.id}`] 
                          ? "border-red-500 text-red-600 focus:ring-red-500/30" 
                          : "border-zinc-200 dark:border-zinc-800 focus:ring-brand-secondary/30"
                      )}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <SubtaskStatusBox 
            subtask={subtask}
            taskId={taskId}
            onUpdateStatus={onUpdateStatus}
          />
        </div>
      </div>

      {/* Optional Description Section (Only shown when explicitly toggled to view/edit notes) */}
      {isEditingDesc && (
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 space-y-2">
          <div className="space-y-2 p-2.5 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Subtask Notes</span>
              </span>
              <DescriptionImageUploader
                onAddImage={(imgUrl) => {
                  setDescInput(prev => (prev || '') + `\n![Image](${imgUrl})\n`);
                }}
              />
            </div>
            <Textarea 
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              placeholder="Add instructions or notes..."
              className="text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 min-h-[50px] resize-y rounded-lg p-2 focus-visible:ring-emerald-500/20"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2.5"
                onClick={() => setIsEditingDesc(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-6 text-[10px] px-3 bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                onClick={handleSaveDesc}
              >
                Save Notes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
  filterDateRange,
  onClearFilterDateRange,
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

  const isDeveloper = user?.role === UserRole.WEB_DEVELOPER || user?.department === Department.WEB_DEVELOPMENT;
  const isDesigner = user?.role === UserRole.DESIGNER || user?.role === UserRole.DESIGNER_MOTION || user?.role === UserRole.DESIGN_LEAD || user?.department === Department.DESIGN;
  const isContent = user?.role === UserRole.CONTENT_WRITER || user?.department === Department.CONTENT;

  const capacityLabel = isDeveloper 
    ? 'Developer Capacity' 
    : isDesigner 
    ? 'Designer Capacity' 
    : isContent 
    ? 'Content Capacity' 
    : 'Team Capacity';

  const capacityMemberNoun = isDeveloper 
    ? 'developer' 
    : isDesigner 
    ? 'designer' 
    : isContent 
    ? 'content writer' 
    : 'team member';

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

  const getTaskTimingDetails = (task: Task) => {
    const directLoggedSeconds = elapsedTimes[task.id] !== undefined 
      ? elapsedTimes[task.id] 
      : (task.timeLoggedSeconds || ((task.timeLogged || 0) * 3600));
    const directEstimate = task.timeEstimate || 0;

    const subTasks = task.subTasks || [];
    const hasSubTasks = subTasks.length > 0;
    
    let subtasksLoggedSeconds = 0;
    let subtasksEstimate = 0;
    
    subTasks.forEach(st => {
      const stLoggedSecs = subTaskElapsedTimes[st.id] !== undefined
        ? subTaskElapsedTimes[st.id]
        : (st.timeLoggedSeconds || ((st.timeLogged || 0) * 3600));
      subtasksLoggedSeconds += stLoggedSecs;
      subtasksEstimate += st.timeEstimate || 0;
    });

    const totalLoggedSeconds = directLoggedSeconds + subtasksLoggedSeconds;
    const totalEstimate = directEstimate + subtasksEstimate;

    return {
      directLoggedSeconds,
      directEstimate,
      subtasksLoggedSeconds,
      subtasksEstimate,
      totalLoggedSeconds,
      totalEstimate,
      hasSubTasks
    };
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
  const [draggedSubtaskInfo, setDraggedSubtaskInfo] = useState<{ taskId: string; subtaskId: string } | null>(null);
  const [boardViewMode, setBoardViewMode] = useState<'tasks' | 'subtasks' | 'capacity' | 'projects'>('tasks');
  const [capacityDepartmentFilter, setCapacityDepartmentFilter] = useState<string>(
    isDesigner ? Department.DESIGN : isContent ? Department.CONTENT : Department.WEB_DEVELOPMENT
  );

  const userDepartment = user?.department || (
    isDesigner ? Department.DESIGN :
    isContent ? Department.CONTENT :
    isDeveloper ? Department.WEB_DEVELOPMENT :
    Department.WEB_DEVELOPMENT
  );

  const canManageCapacityFilter = Boolean(
    user && (
      ADMIN_ROLES.includes(user.role) ||
      isSuperAdmin(user) ||
      Boolean(user.isSuperAdmin) ||
      user.role === UserRole.AGENCY_ADMIN ||
      user.role === UserRole.WEB_DEV_MANAGER ||
      user.role === UserRole.DESIGN_LEAD ||
      user.role === UserRole.CONTENT_LEAD
    )
  );

  const activeCapacityDepartment = canManageCapacityFilter ? capacityDepartmentFilter : userDepartment;
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<string[]>([]);
  const [showDesignOpsGuide, setShowDesignOpsGuide] = useState(false);
  const [showLeadMonthEndReport, setShowLeadMonthEndReport] = useState(false);
  const [showITDecisionMatrix, setShowITDecisionMatrix] = useState(false);
  const [leadReportSelectedDepartment, setLeadReportSelectedDepartment] = useState<string>('all');
  const [leadReportSelectedProjectId, setLeadReportSelectedProjectId] = useState<string>('all');
  const [leadReportSelectedMonth, setLeadReportSelectedMonth] = useState<string>('2026-07');

  // Role Scope & Employee/Timeframe Filtering for Month-End Dialog
  const isHeadUser = React.useMemo(() => {
    if (!user) return false;
    return (
      user.role === UserRole.AGENCY_ADMIN ||
      user.role === UserRole.ACCOUNT_DIRECTOR ||
      Boolean(user.isSuperAdmin) ||
      isSuperAdmin(user)
    );
  }, [user]);

  const isManagerUser = React.useMemo(() => {
    if (!user || isHeadUser) return false;
    return ADMIN_ROLES.includes(user.role);
  }, [user, isHeadUser]);

  const isEmployeeUser = !isHeadUser && !isManagerUser;

  const [reportSelectedEmployeeId, setReportSelectedEmployeeId] = useState<string>('all');
  const [reportTimeframeType, setReportTimeframeType] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const [selectedWeek, setSelectedWeek] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const days = Math.floor((d.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
  });

  const [selectedQuarterYear, setSelectedQuarterYear] = useState<string>(() => `${new Date().getFullYear()}`);
  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => {
    const q = Math.floor(new Date().getMonth() / 3) + 1;
    return `Q${q}`;
  });

  const [selectedYear, setSelectedYear] = useState<string>(() => `${new Date().getFullYear()}`);

  React.useEffect(() => {
    if (isEmployeeUser && user) {
      setReportSelectedEmployeeId(user.id);
      if (user.department) setLeadReportSelectedDepartment(user.department);
    } else if (isManagerUser && user) {
      if (user.department && leadReportSelectedDepartment === 'all') {
        setLeadReportSelectedDepartment(user.department);
      }
    }
  }, [user, isEmployeeUser, isManagerUser]);

  const availableEmployeesForReport = React.useMemo(() => {
    if (isEmployeeUser && user) {
      return users.filter(u => u.id === user.id);
    }
    if (isManagerUser && user) {
      return users.filter(u => u.department === user.department || u.id === user.id);
    }
    return users.filter(u => u.role !== UserRole.CLIENT);
  }, [users, user, isEmployeeUser, isManagerUser]);

  const checkDateInTimeframeDialog = React.useCallback((dateInput?: string | Date | null): boolean => {
    if (!dateInput) return true;
    const date = typeof dateInput === 'string' ? new Date(dateInput.split('T')[0]) : new Date(dateInput);
    if (isNaN(date.getTime())) return true;

    if (reportTimeframeType === 'week') {
      const parts = selectedWeek.split('-W');
      if (parts.length === 2) {
        const y = parseInt(parts[0], 10);
        const w = parseInt(parts[1], 10);
        const jan1 = new Date(y, 0, 1);
        const dayOfWeek = jan1.getDay() || 7;
        const firstMonday = new Date(jan1);
        if (dayOfWeek <= 4) {
          firstMonday.setDate(jan1.getDate() - dayOfWeek + 1);
        } else {
          firstMonday.setDate(jan1.getDate() + (8 - dayOfWeek));
        }
        const weekStart = new Date(firstMonday);
        weekStart.setDate(firstMonday.getDate() + (w - 1) * 7);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        return date >= weekStart && date <= weekEnd;
      }
      return true;
    }

    if (reportTimeframeType === 'month') {
      const [yStr, mStr] = leadReportSelectedMonth.split('-');
      if (!yStr || !mStr) return true;
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      return date.getFullYear() === y && date.getMonth() === m;
    }

    if (reportTimeframeType === 'quarter') {
      const y = parseInt(selectedQuarterYear, 10);
      const qNum = parseInt(selectedQuarter.replace('Q', ''), 10);
      const startM = (qNum - 1) * 3;
      const endM = startM + 2;
      return date.getFullYear() === y && date.getMonth() >= startM && date.getMonth() <= endM;
    }

    if (reportTimeframeType === 'year') {
      const y = parseInt(selectedYear, 10);
      return date.getFullYear() === y;
    }

    return true;
  }, [reportTimeframeType, selectedWeek, leadReportSelectedMonth, selectedQuarterYear, selectedQuarter, selectedYear]);
  const [timesheetSubtaskInfo, setTimesheetSubtaskInfo] = useState<{ taskId: string; subtaskId: string } | null>(null);
  const [newTimeLogDuration, setNewTimeLogDuration] = useState('');
  const [newTimeLogDesc, setNewTimeLogDesc] = useState('');
  const [newTimeLogUserId, setNewTimeLogUserId] = useState('');

  const handleExportMonthEndCSV = () => {
    const isUserAssignedSubtask = (st: any, targetUserId: string, parentTask: any) => {
      if (st.assigneeId === targetUserId) return true;
      if (st.assigneeIds?.includes(targetUserId)) return true;
      if (st.timeEntries?.some((e: any) => e.userId === targetUserId)) return true;
      if (!st.assigneeId && (!st.assigneeIds || st.assigneeIds.length === 0) && parentTask.assigneeId === targetUserId) return true;
      return false;
    };

    const filteredTasks = tasks.filter(t => {
      const matchesProject = leadReportSelectedProjectId === 'all' || t.projectId === leadReportSelectedProjectId;
      const matchesDept = leadReportSelectedDepartment === 'all' || t.department === leadReportSelectedDepartment;
      if (!matchesProject || !matchesDept) return false;

      if (isEmployeeUser && user) {
        const isAssigned = t.assigneeId === user.id ||
          t.createdById === user.id ||
          (t.subTasks || []).some(st => isUserAssignedSubtask(st, user.id, t));
        if (!isAssigned) return false;
      } else if (isManagerUser && user) {
        const isDept = t.department === user.department;
        const isTeam = (t.subTasks || []).some(st => {
          const assignees = st.assigneeIds || (st.assigneeId ? [st.assigneeId] : []);
          return assignees.some(aId => availableEmployeesForReport.some(e => e.id === aId));
        }) || t.assigneeId === user.id;
        if (!isDept && !isTeam) return false;
      }

      return true;
    });

    const allSubtasks = filteredTasks.flatMap(t => 
      (t.subTasks || [])
        .filter(st => {
          const stDate = st.createdAt || st.dueDate || t.updatedAt || t.createdAt;
          if (!checkDateInTimeframeDialog(stDate)) return false;

          if (reportSelectedEmployeeId !== 'all') {
            return isUserAssignedSubtask(st, reportSelectedEmployeeId, t);
          } else if (isEmployeeUser && user) {
            return isUserAssignedSubtask(st, user.id, t);
          }

          return true;
        })
        .map(st => ({ ...st, parentTask: t }))
    );

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Client/Project,Parent Task,Deliverable/Subtask,Work Category,Asset Type,Logged Hours,Status,Deadline Shifts,Assignees\n";

    allSubtasks.forEach(st => {
      const projName = projects.find(p => p.id === st.parentTask.projectId)?.name || 'Unknown Project';
      const parentName = (st.parentTask.name || '').replace(/"/g, '""');
      const subtaskName = (st.name || '').replace(/"/g, '""');
      const workCat = st.workCategory || 'BAU';
      const assetType = st.assetType || 'Static Post';
      const hrs = (st.timeLogged || 0).toFixed(2);
      const status = st.status || 'OPEN';
      const shifts = st.deadlineChangeCount || 0;
      const assignees = (st.assigneeIds || []).map(aId => users.find(u => u.id === aId)?.name || aId).join('; ');

      csvContent += `"${projName}","${parentName}","${subtaskName}","${workCat}","${assetType}",${hrs},"${status}",${shifts},"${assignees}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Report_${reportTimeframeType}_${leadReportSelectedProjectId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Report downloaded successfully!");
  };

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
    const target = e.target as HTMLElement | null;
    if (draggedSubtaskInfo || target?.closest('[data-subtask-row]')) {
      e.stopPropagation();
      return;
    }
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDraggedSubtaskInfo(null);
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
    e.stopPropagation();

    let currentSubtaskInfo = draggedSubtaskInfo;
    if (!currentSubtaskInfo) {
      try {
        const rawData = e.dataTransfer.getData('text/plain');
        if (rawData && rawData.startsWith('{')) {
          const parsed = JSON.parse(rawData);
          if (parsed.taskId && parsed.subtaskId) {
            currentSubtaskInfo = parsed;
          }
        }
      } catch (err) {
        // fallback
      }
    }

    if (currentSubtaskInfo) {
      const targetTask = tasks.find(t => t.id === targetTaskId);
      if (targetTask) {
        updateSubtaskStatus(currentSubtaskInfo.taskId, currentSubtaskInfo.subtaskId, targetTask.status);
        toast.success(`Subtask status updated to ${targetTask.status}`);
      }
      setDraggedSubtaskInfo(null);
      setDraggedTaskId(null);
      setDraggedOverTaskId(null);
      return;
    }

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

  const handleDropOnCapacityColumn = (e: React.DragEvent, targetUserId: string) => {
    e.preventDefault();
    e.stopPropagation();

    let currentSubtaskInfo = draggedSubtaskInfo;
    if (!currentSubtaskInfo) {
      try {
        const rawData = e.dataTransfer.getData('text/plain');
        if (rawData && rawData.startsWith('{')) {
          const parsed = JSON.parse(rawData);
          if (parsed.taskId && parsed.subtaskId) {
            currentSubtaskInfo = parsed;
          }
        }
      } catch (err) {
        // fallback
      }
    }

    if (currentSubtaskInfo) {
      if (targetUserId === 'unassigned') {
        updateSubtaskAssignees(currentSubtaskInfo.taskId, currentSubtaskInfo.subtaskId, []);
        toast.success("Moved subtask to Lead's Inbox (Unassigned)");
      } else {
        const targetUser = users.find(u => u.id === targetUserId);
        updateSubtaskAssignees(currentSubtaskInfo.taskId, currentSubtaskInfo.subtaskId, [targetUserId]);
        toast.success(`Assigned subtask to ${targetUser?.name || 'Team Member'}`);
      }
      setDraggedSubtaskInfo(null);
      setDraggedTaskId(null);
      setDraggedOverColumnId(null);
    } else if (draggedTaskId) {
      const targetAssigneeId = targetUserId === 'unassigned' ? '' : targetUserId;
      setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, assigneeId: targetAssigneeId, updatedAt: new Date().toISOString() } : t));
      const targetUser = users.find(u => u.id === targetUserId);
      toast.success(targetUserId === 'unassigned' ? "Moved task to Lead's Inbox" : `Assigned task to ${targetUser?.name || 'Team Member'}`);
      setDraggedTaskId(null);
      setDraggedOverColumnId(null);
    }
  };

  const handleAddSubtaskTimeEntry = (taskId: string, subtaskId: string, userId: string, hoursOrMinutesInput: string, description: string) => {
    const parsedMinutes = parseManualDuration(hoursOrMinutesInput);
    if (!parsedMinutes || parsedMinutes <= 0) {
      toast.error("Please enter a valid time duration (e.g., 1h 30m or 45).");
      return;
    }
    const loggedSecs = Math.round(parsedMinutes * 60);
    const targetUser = users.find(u => u.id === userId) || user;

    const newEntry: SubTaskTimeEntry = {
      id: 'entry-' + Date.now(),
      userId: targetUser?.id || 'unknown',
      userName: targetUser?.name || 'Team Member',
      timeLoggedSeconds: loggedSecs,
      description: description || 'Task contribution',
      date: new Date().toISOString().split('T')[0],
      isManual: true,
      isApproved: true
    };

    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subTasks) {
        return {
          ...t,
          subTasks: t.subTasks.map(st => {
            if (st.id === subtaskId) {
              const existingEntries = st.timeEntries || [];
              const updatedEntries = [...existingEntries, newEntry];
              const totalSecs = updatedEntries.reduce((sum, e) => sum + e.timeLoggedSeconds, 0);
              return {
                ...st,
                timeEntries: updatedEntries,
                timeLoggedSeconds: totalSecs,
                timeLogged: totalSecs / 3600
              };
            }
            return st;
          })
        };
      }
      return t;
    }));

    toast.success(`Logged ${formatHoursMinutes(parsedMinutes / 60)} for ${targetUser?.name || 'Team Member'}`);
  };

  const handleDropOnColumn = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    e.stopPropagation();

    let currentSubtaskInfo = draggedSubtaskInfo;
    if (!currentSubtaskInfo) {
      try {
        const rawData = e.dataTransfer.getData('text/plain');
        if (rawData && rawData.startsWith('{')) {
          const parsed = JSON.parse(rawData);
          if (parsed.taskId && parsed.subtaskId) {
            currentSubtaskInfo = parsed;
          }
        }
      } catch (err) {
        // fallback
      }
    }

    if (currentSubtaskInfo) {
      updateSubtaskStatus(currentSubtaskInfo.taskId, currentSubtaskInfo.subtaskId, targetStatus);
      toast.success(`Subtask status updated to ${targetStatus}`);
      setDraggedSubtaskInfo(null);
      setDraggedTaskId(null);
      setDraggedOverTaskId(null);
      setDraggedOverColumnId(null);
      return;
    }

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

  const handleSubtaskDragStart = (e: React.DragEvent, taskId: string, subtaskId: string) => {
    e.stopPropagation();
    if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation();
    }
    setDraggedTaskId(null);
    setDraggedSubtaskInfo({ taskId, subtaskId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ taskId, subtaskId }));
  };

  const handleSubtaskDropOnSubtask = (e: React.DragEvent, targetTaskId: string, targetSubtaskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedSubtaskInfo) return;

    if (draggedSubtaskInfo.taskId === targetTaskId && draggedSubtaskInfo.subtaskId !== targetSubtaskId) {
      setTasks(prev => prev.map(t => {
        if (t.id === targetTaskId && t.subTasks) {
          const subtasks = [...t.subTasks];
          const sourceIdx = subtasks.findIndex(st => st.id === draggedSubtaskInfo.subtaskId);
          const targetIdx = subtasks.findIndex(st => st.id === targetSubtaskId);
          if (sourceIdx !== -1 && targetIdx !== -1) {
            const [moved] = subtasks.splice(sourceIdx, 1);
            subtasks.splice(targetIdx, 0, moved);
            return { ...t, subTasks: subtasks, updatedAt: new Date().toISOString() };
          }
        }
        return t;
      }));
    }
    setDraggedSubtaskInfo(null);
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
  const [isEditingDetailTaskTitle, setIsEditingDetailTaskTitle] = useState(false);
  const [detailTaskTitleInput, setDetailTaskTitleInput] = useState('');
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
  const [taskScope, setTaskScope] = useState<'all' | 'my'>('my');

  // Local task filter states
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>(filterDateRange || 'all');

  useEffect(() => {
    if (filterDateRange) {
      setDateFilter(filterDateRange);
    }
  }, [filterDateRange]);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [localPriorityFilter, setLocalPriorityFilter] = useState<string>('all');
  const [localStatusFilter, setLocalStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [localProjectFilter, setLocalProjectFilter] = useState<string>('all');
  const [localAssigneeFilter, setLocalAssigneeFilter] = useState<string>('all');
  const [subtaskFilterMode, setSubtaskFilterMode] = useState<string>('all');
  const [localSubtaskNameFilter, setLocalSubtaskNameFilter] = useState<string>('all');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState<boolean>(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(false);

  const taskTypes = React.useMemo(() => {
    const types = new Set(tasks.map(t => t.type).filter(Boolean));
    return Array.from(types);
  }, [tasks]);

  // Extract unique subtask names project-wise
  const projectSubtaskNames = React.useMemo(() => {
    const activeProjId = localProjectFilter !== 'all' ? localProjectFilter : filterProjectId;
    const filteredTasksForSubtasks = activeProjId 
      ? tasks.filter(t => t.projectId === activeProjId) 
      : tasks;
    
    const subtaskNamesSet = new Set<string>();
    filteredTasksForSubtasks.forEach(t => {
      if (t.subTasks) {
        t.subTasks.forEach(st => {
          if (st.name && st.name.trim()) {
            subtaskNamesSet.add(st.name.trim());
          }
        });
      }
    });
    return Array.from(subtaskNamesSet).sort();
  }, [tasks, localProjectFilter, filterProjectId]);

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (localSearchQuery.trim() !== '') count++;
    if (dateFilter !== 'all') count++;
    if (localPriorityFilter !== 'all') count++;
    if (localStatusFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (localProjectFilter !== 'all') count++;
    if (localAssigneeFilter !== 'all') count++;
    if (subtaskFilterMode !== 'all') count++;
    if (localSubtaskNameFilter !== 'all') count++;
    return count;
  }, [localSearchQuery, dateFilter, localPriorityFilter, localStatusFilter, typeFilter, localProjectFilter, localAssigneeFilter, subtaskFilterMode, localSubtaskNameFilter]);

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
    setSubtaskFilterMode('all');
    setLocalSubtaskNameFilter('all');
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
        description: newTask.description?.trim() || undefined,
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

    const finalProjectId = newTask.projectId || filterProjectId || projects[0]?.id || '';

    const taskToAdd: Task = {
      ...newTask as Task,
      id: 't' + Math.random().toString(36).substr(2, 9),
      projectId: finalProjectId,
      deliverableId: 'custom-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: user?.id,
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
    if (t.createdById === userId) return true;
    if (t.workflowSteps?.some(step => step.assigneeId === userId)) return true;
    if (t.subTasks?.some(st => st.assigneeId === userId || st.assigneeIds?.includes(userId))) return true;
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

    // Non-lead employees can view all project/workspace tasks in 'all' view, or filtered by 'my' tasks
    if (!isLeadOrAdmin && taskScope === 'my' && !isUserAssignedToTask(t, user?.id)) {
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

    // 8. Subtask Mode Filter
    if (subtaskFilterMode !== 'all') {
      const hasSubtasks = Boolean(t.subTasks && t.subTasks.length > 0);
      if (subtaskFilterMode === 'has-subtasks' && !hasSubtasks) {
        return false;
      }
      if (subtaskFilterMode === 'no-subtasks' && hasSubtasks) {
        return false;
      }
      if (subtaskFilterMode === 'pending-subtasks') {
        if (!hasSubtasks || !t.subTasks?.some(st => !st.isCompleted)) {
          return false;
        }
      }
      if (subtaskFilterMode === 'completed-subtasks') {
        if (!hasSubtasks || !t.subTasks?.every(st => st.isCompleted)) {
          return false;
        }
      }
    }

    // 9. Specific Subtask Name Filter
    if (localSubtaskNameFilter !== 'all') {
      if (!t.subTasks || !t.subTasks.some(st => st.name.toLowerCase().includes(localSubtaskNameFilter.toLowerCase()))) {
        return false;
      }
    }

    return true;
  });

  const projectSubtaskStats = React.useMemo(() => {
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    let pendingSubtasks = 0;

    baseFilteredTasks.forEach(t => {
      let subtasksList = t.subTasks || [];
      if (localSubtaskNameFilter !== 'all') {
        subtasksList = subtasksList.filter(st => 
          st.name.toLowerCase().includes(localSubtaskNameFilter.toLowerCase())
        );
      }
      totalSubtasks += subtasksList.length;
      subtasksList.forEach(st => {
        if (st.isCompleted || st.status === TaskStatus.DONE || st.status === TaskStatus.APPROVED) {
          completedSubtasks++;
        } else {
          pendingSubtasks++;
        }
      });
    });

    return { totalSubtasks, completedSubtasks, pendingSubtasks };
  }, [baseFilteredTasks, localSubtaskNameFilter]);

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
      subtaskFilterMode !== 'all' ||
      localSubtaskNameFilter !== 'all' ||
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

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState('');

  const logTaskActivity = (taskId: string, action: string, details?: string) => {
    const newActivity: TaskActivity = {
      id: 'act-' + Math.random().toString(36).substring(2, 9),
      taskId,
      userId: user?.id || 'system',
      userName: user?.name || 'System User',
      userAvatar: user?.avatarUrl,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          activities: [newActivity, ...(t.activities || [])],
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));
  };

  const computeParentTaskStatus = (subTasks: SubTask[] | undefined, currentStatus: TaskStatus): TaskStatus => {
    if (!subTasks || subTasks.length === 0) return currentStatus;

    const total = subTasks.length;
    const completedCount = subTasks.filter(st => st.isCompleted || st.status === TaskStatus.DONE || st.status === TaskStatus.APPROVED).length;
    const inProgressCount = subTasks.filter(st => st.status === TaskStatus.IN_PROGRESS || st.status === TaskStatus.REVIEW).length;

    if (completedCount === total) {
      return TaskStatus.DONE;
    }
    if (completedCount > 0 || inProgressCount > 0) {
      return TaskStatus.IN_PROGRESS;
    }
    if (completedCount === 0 && inProgressCount === 0) {
      return TaskStatus.OPEN;
    }
    return currentStatus;
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    let subtaskName = 'Subtask';
    let isDone = false;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subTasks) {
        const updatedSubtasks = t.subTasks.map(st => {
          if (st.id === subtaskId) {
            const nextCompleted = !st.isCompleted;
            subtaskName = st.name;
            isDone = nextCompleted;
            return { 
              ...st, 
              isCompleted: nextCompleted,
              status: nextCompleted ? TaskStatus.DONE : TaskStatus.OPEN
            };
          }
          return st;
        });

        const newParentStatus = computeParentTaskStatus(updatedSubtasks, t.status);

        return {
          ...t,
          status: newParentStatus,
          subTasks: updatedSubtasks,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));
    logTaskActivity(taskId, 'Subtask Updated', `Marked subtask "${subtaskName}" as ${isDone ? 'Done' : 'Open'}`);
  };

  const updateSubtaskStatus = (taskId: string, subtaskId: string, status: TaskStatus) => {
    const isCompleted = status === TaskStatus.DONE || status === TaskStatus.APPROVED;
    let subtaskName = 'Subtask';
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subTasks) {
        const found = t.subTasks.find(st => st.id === subtaskId);
        if (found) subtaskName = found.name;

        const updatedSubtasks = t.subTasks.map(st => 
          st.id === subtaskId ? { ...st, status, isCompleted } : st
        );

        const newParentStatus = computeParentTaskStatus(updatedSubtasks, t.status);

        return {
          ...t,
          status: newParentStatus,
          subTasks: updatedSubtasks,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));
    logTaskActivity(taskId, 'Subtask Status Moved', `Moved subtask "${subtaskName}" status to ${status}`);
  };

  const updateSubtaskAssignees = (taskId: string, subtaskId: string, assigneeIds: string[]) => {
    let subtaskName = 'Subtask';
    const parentTask = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subTasks) {
        return {
          ...t,
          subTasks: t.subTasks.map(st => {
            if (st.id === subtaskId) {
              subtaskName = st.name;
              return {
                ...st,
                assigneeIds,
                assigneeId: assigneeIds[0] || ''
              };
            }
            return st;
          }),
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));
    const assignedUsers = users.filter(u => assigneeIds.includes(u.id));
    const names = assignedUsers.map(u => u.name).join(', ') || 'Unassigned';
    logTaskActivity(taskId, 'Subtask Reassigned', `Assigned subtask "${subtaskName}" to ${names}`);

    // Dispatch email notification to assigned users and assigner (user)
    if (user && assignedUsers.length > 0 && parentTask) {
      assignedUsers.forEach(assignee => {
        const dummyTask: Task = {
          id: taskId,
          projectId: parentTask.projectId,
          deliverableId: parentTask.deliverableId,
          name: `${parentTask.name} - Subtask: ${subtaskName}`,
          type: parentTask.type,
          assigneeId: assignee.id,
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
      });
    }

    toast.success(`Updated assigned persons for subtask "${subtaskName}"`);
  };

  const updateSubtask = (taskId: string, subtaskId: string, updates: Partial<SubTask>) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subTasks) {
        return {
          ...t,
          subTasks: t.subTasks.map(st => {
            if (st.id === subtaskId) {
              const dateChanged = updates.dueDate !== undefined && updates.dueDate !== st.dueDate && !!st.dueDate;
              const newChangeCount = dateChanged ? (st.deadlineChangeCount || 0) + 1 : (st.deadlineChangeCount || 0);
              return {
                ...st,
                ...updates,
                deadlineChangeCount: newChangeCount
              };
            }
            return st;
          }),
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));
  };

  const addSubtask = (
    taskId: string, 
    name: string, 
    assigneeIds: string[] = [], 
    description?: string,
    assetType?: string,
    priority?: Priority,
    dueDate?: string,
    workCategory?: string
  ) => {
    if (!name.trim()) return;
    const finalAssigneeIds = assigneeIds.length > 0 ? assigneeIds : (user?.id ? [user.id] : []);
    const newSubtask: SubTask = {
      id: 'st-' + Math.random().toString(36).substring(2, 9),
      taskId,
      name: name.trim(),
      description: description?.trim() || undefined,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      status: TaskStatus.OPEN,
      assigneeIds: finalAssigneeIds,
      assigneeId: finalAssigneeIds[0] || '',
      assetType,
      workCategory: workCategory || 'BAU',
      priority: priority || Priority.NORMAL,
      dueDate,
      deadlineChangeCount: 0
    };

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subTasks: [...(t.subTasks || []), newSubtask],
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));
    logTaskActivity(taskId, 'Subtask Created', `Added subtask "${name.trim()}"`);
    toast.success(`Subtask "${name.trim()}" added successfully`);
  };

  const deleteSubtask = (taskId: string, subtaskId: string) => {
    let subtaskName = 'Subtask';
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subTasks) {
        const found = t.subTasks.find(st => st.id === subtaskId);
        if (found) subtaskName = found.name;
        return {
          ...t,
          subTasks: t.subTasks.filter(st => st.id !== subtaskId),
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));
    logTaskActivity(taskId, 'Subtask Deleted', `Removed subtask "${subtaskName}"`);
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

      {(filterProjectId || filterAssigneeId || filterStatus || filterPriority || filterDateRange || dateFilter !== 'all') && (
        <div className="bg-orange-50/80 dark:bg-zinc-900/80 border border-orange-200/60 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 mr-1">Active Filters:</span>
            {filterProjectId && (
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800">
                <Folder className="w-3 h-3 mr-1 text-orange-600" />
                <span>Project: {selectedProject?.name || 'Selected'}</span>
                <button onClick={onClearFilter} className="ml-1.5 text-orange-500 hover:text-orange-900 font-extrabold cursor-pointer text-[12px] leading-none">×</button>
              </span>
            )}
            {filterAssigneeId && (
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                <User className="w-3 h-3 mr-1 text-purple-600" />
                <span>Assignee: {users.find(u => u.id === filterAssigneeId)?.name || 'Selected'}</span>
                <button onClick={onClearFilterAssignee} className="ml-1.5 text-purple-500 hover:text-purple-900 font-extrabold cursor-pointer text-[12px] leading-none">×</button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                <TrendingUp className="w-3 h-3 mr-1 text-blue-600" />
                <span>Status: {filterStatus.replace('_', ' ')}</span>
                <button onClick={onClearFilterStatus} className="ml-1.5 text-blue-500 hover:text-blue-900 font-extrabold cursor-pointer text-[12px] leading-none">×</button>
              </span>
            )}
            {filterPriority && (
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                <Zap className="w-3 h-3 mr-1 text-rose-600" />
                <span>Priority: {filterPriority}</span>
                <button onClick={onClearFilterPriority} className="ml-1.5 text-rose-500 hover:text-rose-900 font-extrabold cursor-pointer text-[12px] leading-none">×</button>
              </span>
            )}
            {(filterDateRange || dateFilter !== 'all') && (
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                <Calendar className="w-3 h-3 mr-1 text-amber-600" />
                <span>Date: {
                  (filterDateRange || dateFilter) === 'today' ? 'Due Today' :
                  (filterDateRange || dateFilter) === 'overdue' ? 'Overdue' :
                  (filterDateRange || dateFilter) === 'this-week' ? 'Due This Week' :
                  (filterDateRange || dateFilter) === 'this-month' ? 'Due This Month' :
                  (filterDateRange || dateFilter)
                }</span>
                <button onClick={() => {
                  if (onClearFilterDateRange) onClearFilterDateRange();
                  setDateFilter('all');
                }} className="ml-1.5 text-amber-500 hover:text-amber-900 font-extrabold cursor-pointer text-[12px] leading-none">×</button>
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
              if (onClearFilterDateRange) onClearFilterDateRange();
              setDateFilter('all');
            }}
            className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 h-6 rounded-lg cursor-pointer px-2"
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
        ) : null}

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-start sm:justify-end w-full sm:w-auto">
          {/* Operations & Reports Quick Launch */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDesignOpsGuide(true)}
            className="h-8 px-2.5 rounded-xl border-indigo-200/80 dark:border-indigo-800 bg-indigo-50/50 hover:bg-indigo-100/80 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="View Operations Guidelines & Scoping SOP for all Teams"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[11px] font-bold">Team Operations SOP</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLeadMonthEndReport(true)}
            className="h-8 px-2.5 rounded-xl border-indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-sm"
            title="View Month-End Lead Report (Asset Split, AM/Client Revisions, Hours vs Budget, Member Time)"
          >
            <BarChart3 className="w-3.5 h-3.5 text-white" />
            <span className="text-[11px] font-black">Month-End Lead Report</span>
          </Button>

          {/* Automation Sandbox Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSandboxOpen(!isSandboxOpen)}
            className="h-8 px-2.5 rounded-xl border-orange-200 dark:border-orange-900/40 bg-orange-50/60 hover:bg-orange-100/80 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Toggle Recurring Automation & Time-Travel Controls"
          >
            <RefreshCw className="w-3 h-3 text-orange-500 animate-spin-slow" />
            <span className="text-[11px] font-bold">Automation Sandbox</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform", isSandboxOpen && "rotate-180")} />
          </Button>

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

          {/* Quick Project Select Dropdown */}
          <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
            <Folder className="w-3.5 h-3.5 ml-2 text-amber-500 shrink-0" />
            <Select 
              value={localProjectFilter} 
              onValueChange={(val) => {
                setLocalProjectFilter(val);
                setLocalSubtaskNameFilter('all');
              }}
            >
              <SelectTrigger className="h-8 border-none bg-transparent shadow-none text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:ring-0 min-w-[130px] max-w-[210px] hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-lg">
                <SelectValue placeholder="All Projects">
                  {localProjectFilter === 'all' 
                    ? '📁 All Projects' 
                    : (projects.find(p => p.id === localProjectFilter)?.name ? `📁 ${projects.find(p => p.id === localProjectFilter)?.name}` : localProjectFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700">
                <SelectItem value="all" className="text-xs font-bold">📂 All Projects ({tasks.length} Tasks)</SelectItem>
                {projects.map(p => {
                  const count = tasks.filter(t => t.projectId === p.id).length;
                  return (
                    <SelectItem key={p.id} value={p.id} className="text-xs font-semibold">
                      📁 {p.name} ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
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
                viewMode === 'board' && boardViewMode === 'tasks'
                  ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100 font-bold" 
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
              onClick={() => {
                setViewMode('board');
                setBoardViewMode('tasks');
              }}
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
                viewMode === 'board' && boardViewMode === 'projects'
                  ? "bg-white dark:bg-zinc-800 shadow-sm text-amber-600 dark:text-amber-400 font-black" 
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
              onClick={() => {
                setViewMode('board');
                setBoardViewMode('projects');
              }}
              title="Switch to Project-Wise Odoo Style View"
            >
              <Folder className="w-3.5 h-3.5 text-amber-500" />
              <span>Project-Wise</span>
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
                  placeholder="Provide context or details..." 
                  className="rounded-xl border-zinc-200 resize-none h-20"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                />
                {newTask.description && (
                  <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <TaskDescriptionRenderer 
                      description={newTask.description}
                      onRemoveImage={(imgUrl) => {
                        setNewTask(prev => ({
                          ...prev,
                          description: prev.description ? prev.description.replace(imgUrl, '').replace(/!\[.*?\]\(\)/g, '') : ''
                        }));
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Project</Label>
                  <Select 
                    value={newTask.projectId} 
                    onValueChange={(v) => setNewTask({...newTask, projectId: v})}
                  >
                    <SelectTrigger className="rounded-xl border-zinc-200">
                      <SelectValue placeholder="Select Project">
                        {projects.find(p => p.id === newTask.projectId)?.name || newTask.projectId}
                      </SelectValue>
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
                  <SelectTrigger className="rounded-xl border-zinc-200 dark:border-zinc-800 h-10 bg-white dark:bg-zinc-950 text-xs font-semibold">
                    <SelectValue placeholder="Standalone Main Task">
                      {selectedParentTaskId === 'none' 
                        ? "Standalone Main Task (Top Level)" 
                        : (() => {
                            const parent = tasks.find(t => t.id === selectedParentTaskId);
                            return parent ? `📂 ${parent.name} (${parent.type || 'Main Task'})` : selectedParentTaskId;
                          })()
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="none">Standalone Main Task (Top Level)</SelectItem>
                    {tasks
                      .filter(t => !t.parentTaskId)
                      .filter(t => !newTask.projectId || t.projectId === newTask.projectId || t.id === selectedParentTaskId)
                      .map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          📂 {t.name} ({t.type}) {projects.length > 1 && t.projectId ? `[${projects.find(p => p.id === t.projectId)?.name || t.projectId}]` : ''}
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
                <TaskMultiAssigneePicker
                  assigneeIds={newTask.assigneeIds && newTask.assigneeIds.length > 0 ? newTask.assigneeIds : (newTask.assigneeId ? [newTask.assigneeId] : [])}
                  onAssigneeIdsChange={(ids) => {
                    setNewTask(prev => ({
                      ...prev,
                      assigneeIds: ids,
                      assigneeId: ids[0] || ''
                    }));
                    setSuggestionReason(null);
                  }}
                  users={users}
                  onSuggestExpert={handleSuggestAssignee}
                  isSuggesting={isSuggesting}
                  suggestionReason={suggestionReason}
                  label="Assignee(s)"
                />
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
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Allocated Time</Label>
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
                      {/* Frequency Period */}
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

                      {/* Frequency Density / Tasks per week or month */}
                      {newTask.recurrencePeriod !== 'daily' ? (
                        <div className="grid gap-1.5">
                          <Label className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-400">
                            Tasks Per {newTask.recurrencePeriod === 'week' ? 'Week' : 'Month'}
                          </Label>
                          <Select
                            value={String(newTask.recurrenceDensity || 2)}
                            onValueChange={(v) => setNewTask({...newTask, recurrenceDensity: parseInt(v, 10)})}
                          >
                            <SelectTrigger className="rounded-xl border-zinc-200 h-9 text-xs bg-white dark:bg-zinc-950">
                              <SelectValue placeholder="Frequency density" />
                            </SelectTrigger>
                            <SelectContent>
                              {newTask.recurrencePeriod === 'week' ? (
                                <>
                                  <SelectItem value="1">1 task per week</SelectItem>
                                  <SelectItem value="2">2 tasks per week (Evenly spaced)</SelectItem>
                                  <SelectItem value="3">3 tasks per week (Evenly spaced)</SelectItem>
                                  <SelectItem value="4">4 tasks per week (Evenly spaced)</SelectItem>
                                  <SelectItem value="5">5 tasks per week (Mon-Fri)</SelectItem>
                                </>
                              ) : (
                                <>
                                  <SelectItem value="1">1 task per month</SelectItem>
                                  <SelectItem value="2">2 tasks per month (Bi-weekly)</SelectItem>
                                  <SelectItem value="3">3 tasks per month (Every 10 days)</SelectItem>
                                  <SelectItem value="4">4 tasks per month (Weekly)</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="flex items-center text-[11px] text-zinc-500 font-medium pt-5">
                          1 task created every day
                        </div>
                      )}
                    </div>

                    {/* Total Occurrences Selector */}
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-400">
                          Total Occurrences (How Many Tasks to Create)
                        </Label>
                        <Badge variant="outline" className="text-[10px] font-bold text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/40">
                          {newTask.recurrenceTimes || 3} Tasks Total
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Quick Presets Dropdown */}
                        <Select
                          value={[2, 3, 4, 5, 6, 8, 10, 12, 24].includes(newTask.recurrenceTimes || 3) ? String(newTask.recurrenceTimes || 3) : "custom"}
                          onValueChange={(val) => {
                            if (val !== 'custom') {
                              setNewTask({ ...newTask, recurrenceTimes: parseInt(val, 10) });
                            }
                          }}
                        >
                          <SelectTrigger className="rounded-xl border-zinc-200 h-9 text-xs bg-white dark:bg-zinc-950 flex-1">
                            <SelectValue placeholder="Select occurrences" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 Occurrences (2 Tasks Total)</SelectItem>
                            <SelectItem value="3">3 Occurrences (3 Tasks Total)</SelectItem>
                            <SelectItem value="4">4 Occurrences (4 Tasks Total)</SelectItem>
                            <SelectItem value="5">5 Occurrences (5 Tasks Total)</SelectItem>
                            <SelectItem value="6">6 Occurrences (6 Tasks Total)</SelectItem>
                            <SelectItem value="8">8 Occurrences (8 Tasks Total)</SelectItem>
                            <SelectItem value="10">10 Occurrences (10 Tasks Total)</SelectItem>
                            <SelectItem value="12">12 Occurrences (12 Tasks Total)</SelectItem>
                            <SelectItem value="24">24 Occurrences (24 Tasks Total)</SelectItem>
                            <SelectItem value="custom">✏️ Type Custom Number...</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Direct Number Input */}
                        <div className="w-28 shrink-0 flex items-center gap-1">
                          <Input 
                            type="number"
                            min="2"
                            max="50"
                            className="rounded-xl border-zinc-200 h-9 text-xs font-extrabold text-center bg-white dark:bg-zinc-950"
                            value={newTask.recurrenceTimes || 3}
                            onChange={(e) => {
                              const num = parseInt(e.target.value, 10);
                              setNewTask({ ...newTask, recurrenceTimes: isNaN(num) ? 2 : Math.max(1, Math.min(50, num)) });
                            }}
                          />
                          <span className="text-[10px] text-zinc-400 font-bold">tasks</span>
                        </div>
                      </div>
                    </div>

                    {/* Pre-calculated applied dates Preview */}
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 bg-zinc-100/50 dark:bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-200/40 dark:border-zinc-800/50 space-y-1">
                      <div className="font-bold uppercase tracking-wider text-[8px] text-zinc-500 flex items-center justify-between">
                        <span className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                          Automation Schedule Preview
                        </span>
                        <span className="text-zinc-400 font-normal">
                          {calculateRecurringDates(
                            newTask.dueDate || new Date().toISOString().split('T')[0],
                            newTask.recurrencePeriod || 'week',
                            newTask.recurrenceTimes || 3,
                            newTask.recurrenceSpacingMode || 'spaced',
                            newTask.recurrenceDensity || 2,
                            newTask.recurrenceDays || []
                          ).length} Scheduled Copies
                        </span>
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
                            {date} {idx === 0 ? '(Task #1)' : `(#${idx+1})`}
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
      <AnimatePresence>
        {isSandboxOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-5"
          >
            <div className="bg-gradient-to-r from-orange-50/70 via-zinc-50/50 to-zinc-50/70 dark:from-zinc-900/40 dark:via-zinc-950/20 dark:to-zinc-900/40 border border-orange-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
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
                              <span><strong className="font-bold text-zinc-600 dark:text-zinc-300">{totalCount} Occurrences</strong></span>
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
    </motion.div>
  )}
</AnimatePresence>

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
              <p className="text-[11px] text-zinc-400 font-medium flex items-center gap-2 flex-wrap">
                <span>
                  Showing <span className="font-bold text-zinc-800 dark:text-zinc-200">{filteredTasks.length}</span> of <span className="font-bold text-zinc-800 dark:text-zinc-200">{tasks.length}</span> total tasks
                </span>
                {projectSubtaskStats.totalSubtasks > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 rounded-full border border-sky-200/50 dark:border-sky-800/40">
                    <span>⚙️ {projectSubtaskStats.totalSubtasks} Subtasks</span>
                    <span className="opacity-60">•</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{projectSubtaskStats.completedSubtasks} Done</span>
                    <span className="opacity-60">•</span>
                    <span className="text-amber-600 dark:text-amber-400">{projectSubtaskStats.pendingSubtasks} Pending</span>
                  </span>
                )}
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

        {/* Main Filter Grid - Select-List Based */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
          
          {/* 1. Search Query Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Search Tasks
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400" />
              <Input
                type="text"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                placeholder="Search titles & subtasks..."
                className="pl-8 pr-7 h-9 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-950"
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

          {/* 2. Project Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Project
            </label>
            <Select 
              value={localProjectFilter} 
              onValueChange={(val) => {
                setLocalProjectFilter(val);
                setLocalSubtaskNameFilter('all');
              }}
            >
              <SelectTrigger className="h-9 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs font-bold bg-white dark:bg-zinc-950">
                <SelectValue placeholder="All Projects">
                  {localProjectFilter === 'all' 
                    ? '📂 All Projects' 
                    : (projects.find(p => p.id === localProjectFilter)?.name ? `📁 ${projects.find(p => p.id === localProjectFilter)?.name}` : localProjectFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700">
                <SelectItem value="all" className="text-xs font-bold">📂 All Projects ({tasks.length} Tasks)</SelectItem>
                {projects.map(p => {
                  const count = tasks.filter(t => t.projectId === p.id).length;
                  return (
                    <SelectItem key={p.id} value={p.id} className="text-xs font-semibold">
                      📁 {p.name} ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Date Range Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Date Range
            </label>
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
              <SelectTrigger className="h-9 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs font-bold bg-white dark:bg-zinc-950">
                <SelectValue placeholder="Select Date Range" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700">
                <SelectItem value="all" className="text-xs font-bold">🗓️ All Dates</SelectItem>
                <SelectItem value="today" className="text-xs font-medium">☀️ Due Today</SelectItem>
                <SelectItem value="tomorrow" className="text-xs font-medium">🌅 Due Tomorrow</SelectItem>
                <SelectItem value="this-week" className="text-xs font-medium">📅 Due This Week</SelectItem>
                <SelectItem value="this-month" className="text-xs font-medium">📆 Due This Month</SelectItem>
                <SelectItem value="overdue" className="text-xs font-semibold text-rose-600 dark:text-rose-400">⚠️ Overdue Tasks</SelectItem>
                <SelectItem value="no-due-date" className="text-xs font-medium">🛑 No Due Date</SelectItem>
                <SelectItem value="custom" className="text-xs font-medium">✨ Custom Range...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. Subtasks Filter Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Subtasks Filter
            </label>
            <Select value={subtaskFilterMode} onValueChange={setSubtaskFilterMode}>
              <SelectTrigger className="h-9 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs font-bold bg-white dark:bg-zinc-950">
                <SelectValue placeholder="All Tasks" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700">
                <SelectItem value="all" className="text-xs font-bold">📋 All Tasks</SelectItem>
                <SelectItem value="has-subtasks" className="text-xs font-medium">✅ Has Subtasks</SelectItem>
                <SelectItem value="pending-subtasks" className="text-xs font-medium">⏳ Incomplete / Pending Subtasks</SelectItem>
                <SelectItem value="completed-subtasks" className="text-xs font-medium">🎉 All Subtasks Completed</SelectItem>
                <SelectItem value="no-subtasks" className="text-xs font-medium">🚫 No Subtasks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 5. Specific Subtask Name Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Specific Subtask
            </label>
            <Select value={localSubtaskNameFilter} onValueChange={setLocalSubtaskNameFilter}>
              <SelectTrigger className="h-9 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs font-bold bg-white dark:bg-zinc-950">
                <SelectValue placeholder="All Subtasks" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700">
                <SelectItem value="all" className="text-xs font-bold">🔍 Any / All Subtasks</SelectItem>
                {projectSubtaskNames.length === 0 ? (
                  <SelectItem value="none" disabled className="text-xs text-zinc-400">
                    No subtasks in selection
                  </SelectItem>
                ) : (
                  projectSubtaskNames.map(stName => (
                    <SelectItem key={stName} value={stName} className="text-xs font-medium">
                      ⚙️ {stName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Assignee Filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Assignee</label>
                  <Select value={localAssigneeFilter} onValueChange={setLocalAssigneeFilter}>
                    <SelectTrigger className="w-full h-9 rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs font-bold">
                      <SelectValue placeholder="All Assignees" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700">
                      <SelectItem value="all" className="text-xs font-bold">👨‍💻 All Assignees</SelectItem>
                      {users.filter(u => u.role !== UserRole.CLIENT).map(u => (
                        <SelectItem key={u.id} value={u.id} className="text-xs font-medium">👤 {u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Priority</label>
                  <Select value={localPriorityFilter} onValueChange={setLocalPriorityFilter}>
                    <SelectTrigger className="w-full h-9 rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs font-bold">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700">
                      <SelectItem value="all" className="text-xs font-bold">⚡ All Priorities</SelectItem>
                      {Object.values(Priority).map(prio => (
                        <SelectItem key={prio} value={prio.toLowerCase()} className="text-xs font-medium">🛑 {prio}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</label>
                  <Select value={localStatusFilter} onValueChange={setLocalStatusFilter}>
                    <SelectTrigger className="w-full h-9 rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs font-bold">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700">
                      <SelectItem value="all" className="text-xs font-bold">📊 All Statuses</SelectItem>
                      {Object.values(TaskStatus).map(st => (
                        <SelectItem key={st} value={st} className="text-xs font-medium">⚙️ {st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category/Department Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Category/Department</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full h-9 rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs font-bold">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700">
                      <SelectItem value="all" className="text-xs font-bold">🏷️ All Categories</SelectItem>
                      {taskTypes.map(type => (
                        <SelectItem key={type} value={type} className="text-xs font-medium">🔹 {type}</SelectItem>
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
                          const updatedTask = { ...task, assigneeId: newAssigneeId, updatedAt: new Date().toISOString() };
                          setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
                          const targetAssignee = users.find(u => u.id === newAssigneeId);
                          if (targetAssignee && user) {
                            emailService.sendTaskAssignmentEmail(targetAssignee, updatedTask, user);
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
                        const { 
                          directLoggedSeconds, 
                          directEstimate, 
                          subtasksLoggedSeconds, 
                          subtasksEstimate, 
                          totalLoggedSeconds, 
                          totalEstimate, 
                          hasSubTasks 
                        } = getTaskTimingDetails(task);
                        
                        const displayEstimate = hasSubTasks ? totalEstimate : directEstimate;
                        const displayLogged = hasSubTasks ? totalLoggedSeconds / 3600 : directLoggedSeconds / 3600;
                        const isExceeded = displayEstimate > 0 && displayLogged > displayEstimate;
                        
                        return (
                          <div className="flex flex-col gap-1 select-none">
                            <div 
                              className={cn(
                                "flex items-center text-xs font-semibold px-2 py-1 rounded-md w-fit border",
                                isExceeded 
                                  ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50" 
                                  : "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-transparent"
                              )}
                              title={hasSubTasks ? `Direct Task: ${formatHoursMinutes(directEstimate)} + Subtasks: ${formatHoursMinutes(subtasksEstimate)}` : "Task allocated duration limit"}
                            >
                              <span>{formatHoursMinutes(displayEstimate)}</span>
                              {hasSubTasks && (
                                <span className="ml-1.5 text-[8px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1 rounded font-black uppercase tracking-wider">ROLLUP</span>
                              )}
                            </div>
                            {isExceeded && (
                              <span className="text-[9px] font-extrabold uppercase text-rose-500 flex items-center gap-1 whitespace-nowrap">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>+{formatHoursMinutes(displayLogged - displayEstimate)} over</span>
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
                                  <EditableSubtaskRow
                                     key={subtask.id}
                                     subtask={subtask}
                                     taskId={task.id}
                                     users={users}
                                     onToggle={toggleSubtask}
                                     onUpdateStatus={updateSubtaskStatus}
                                     onUpdateAssignees={updateSubtaskAssignees}
                                     onUpdateSubtask={updateSubtask}
                                     onDelete={deleteSubtask}
                                     subTaskElapsedTimes={subTaskElapsedTimes}
                                     activeTimerSubTaskId={activeTimerSubTaskId}
                                     toggleSubTaskTimer={toggleSubTaskTimer}
                                     handleDurationInputChange={handleDurationInputChange}
                                     handleDurationInputBlur={handleDurationInputBlur}
                                     inputDrafts={inputDrafts}
                                     inputErrors={inputErrors}
                                     formatTime={formatTime}
                                     formatHoursMinutes={formatHoursMinutes}
                                     onSubtaskDragStart={handleSubtaskDragStart}
                                     onSubtaskDragOver={(e) => e.preventDefault()}
                                     onSubtaskDrop={handleSubtaskDropOnSubtask}
                                   />
                                 ))}

                                 <SubtaskInput taskId={task.id} users={users} onAddSubtask={(tId, name, assignees, desc, assetType, priority, dueDate, workCategory) => addSubtask(tId, name, assignees, desc, assetType, priority, dueDate, workCategory)} />
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
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                                      Total Logged: {formatTime(elapsedTimes[task.id] || 0)}
                                    </span>
                                    {(elapsedTimes[task.id] || 0) > 0 && (
                                      <Button
                                        variant="ghost"
                                        className="h-5 px-1.5 text-[8px] font-extrabold uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded cursor-pointer flex items-center gap-1"
                                        onClick={() => {
                                          if (window.confirm("Reset logged time for this task to zero?")) {
                                            setElapsedTimes(prev => ({ ...prev, [task.id]: 0 }));
                                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timeLoggedSeconds: 0, timeLogged: 0, updatedAt: new Date().toISOString() } : t));
                                            toast.success("Tracked time reset to zero!");
                                          }
                                        }}
                                      >
                                        <RotateCcw className="w-2.5 h-2.5" />
                                        Reset
                                      </Button>
                                    )}
                                  </div>
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
                              setSelectedDetailTask(task);
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
                                    <EditableSubtaskRow
                                      key={subtask.id}
                                      subtask={subtask}
                                      taskId={task.id}
                                      users={users}
                                      onToggle={toggleSubtask}
                                      onUpdateStatus={updateSubtaskStatus}
                                      onUpdateAssignees={updateSubtaskAssignees}
                                      onUpdateSubtask={updateSubtask}
                                      onDelete={deleteSubtask}
                                      subTaskElapsedTimes={subTaskElapsedTimes}
                                      activeTimerSubTaskId={activeTimerSubTaskId}
                                      toggleSubTaskTimer={toggleSubTaskTimer}
                                      handleDurationInputChange={handleDurationInputChange}
                                      handleDurationInputBlur={handleDurationInputBlur}
                                      inputDrafts={inputDrafts}
                                      inputErrors={inputErrors}
                                      formatTime={formatTime}
                                      formatHoursMinutes={formatHoursMinutes}
                                      onSubtaskDragStart={handleSubtaskDragStart}
                                      onSubtaskDragOver={(e) => e.preventDefault()}
                                      onSubtaskDrop={handleSubtaskDropOnSubtask}
                                    />
                                  ))}
                                  <SubtaskInput taskId={task.id} users={users} onAddSubtask={(tId, name, assignees, desc, assetType, priority, dueDate, workCategory) => addSubtask(tId, name, assignees, desc, assetType, priority, dueDate, workCategory)} />
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
        <div className="space-y-4">
          {/* Board Display Mode Switcher Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-2xl border border-zinc-200/70 dark:border-zinc-800">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Board Mode:</span>
              <div className="inline-flex items-center bg-white dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-3 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                    boardViewMode === 'tasks'
                      ? "bg-brand-secondary text-white shadow-sm font-extrabold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                  onClick={() => setBoardViewMode('tasks')}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Tasks Board ({baseFilteredTasks.length})</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-3 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                    boardViewMode === 'subtasks'
                      ? "bg-sky-600 text-white shadow-sm font-extrabold dark:bg-sky-500 dark:text-zinc-950"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                  onClick={() => setBoardViewMode('subtasks')}
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>Subtasks Board ({projectSubtaskStats.totalSubtasks})</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-3 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                    boardViewMode === 'capacity'
                      ? "bg-indigo-600 text-white shadow-sm font-extrabold dark:bg-indigo-500 dark:text-zinc-950"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                  onClick={() => setBoardViewMode('capacity')}
                  title={`${capacityLabel} view with workload columns & delegation inbox`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{capacityLabel}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-3 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                    boardViewMode === 'projects'
                      ? "bg-amber-600 text-white shadow-sm font-extrabold dark:bg-amber-500 dark:text-zinc-950"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                  onClick={() => setBoardViewMode('projects')}
                  title="View tasks grouped project-wise in Odoo style"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Project-Wise ({projects.length})</span>
                </Button>

              </div>
            </div>

            <div className="text-[11px] font-medium text-zinc-500 hidden sm:flex items-center gap-2">
              {boardViewMode === 'projects' ? (
                <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-800/40">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Project-Wise Odoo View — Collapsible project lanes with sprint boards & progress tracking</span>
                </span>
              ) : boardViewMode === 'capacity' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200/50 dark:border-indigo-800/40">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Lead Capacity Board — Drag subtasks onto a team column to delegate</span>
                  </span>
                  
                  {canManageCapacityFilter ? (
                    <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] uppercase font-black text-zinc-500 dark:text-zinc-400">Team Filter:</span>
                      <Select value={capacityDepartmentFilter} onValueChange={setCapacityDepartmentFilter}>
                        <SelectTrigger className="h-6 text-xs font-bold rounded-md border-indigo-200/80 bg-white dark:bg-zinc-950 text-indigo-900 dark:text-indigo-200 px-2 py-0 border">
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={Department.WEB_DEVELOPMENT} className="text-xs font-bold">💻 Web Development Team</SelectItem>
                          <SelectItem value={Department.DESIGN} className="text-xs font-bold">🎨 Design Team</SelectItem>
                          <SelectItem value={Department.CONTENT} className="text-xs font-bold">✍️ Content Team</SelectItem>
                          <SelectItem value="ALL" className="text-xs font-bold text-zinc-500">🏢 All Staff (Including Management)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-indigo-50/80 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        {userDepartment === Department.WEB_DEVELOPMENT ? '💻 Web Development Team' :
                         userDepartment === Department.DESIGN ? '🎨 Design Team' :
                         userDepartment === Department.CONTENT ? '✍️ Content Team' :
                         `🏢 ${userDepartment || 'My Team'}`}
                      </span>
                    </div>
                  )}
                </div>
              ) : boardViewMode === 'subtasks' ? (
                <span className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 font-bold bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 rounded-lg border border-sky-200/50 dark:border-sky-800/40">
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  <span>Subtask Drag & Drop Active — Drag individual subtasks to update status</span>
                </span>
              ) : (
                <span className="text-zinc-400">
                  💡 Subtask progress dynamically updates parent task status
                </span>
              )}
            </div>
          </div>

          {boardViewMode === 'projects' ? (
            <div className="space-y-5 pt-1">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <Folder className="w-4 h-4 text-amber-500" />
                  <span>Project Lanes ({projects.filter(p => localProjectFilter === 'all' || localProjectFilter === p.id).length} Active)</span>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCollapsedProjectIds([])}
                    className="h-7 text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    Expand All
                  </Button>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCollapsedProjectIds(projects.map(p => p.id))}
                    className="h-7 text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    Collapse All
                  </Button>
                </div>
              </div>

              {projects
                .filter(p => localProjectFilter === 'all' || localProjectFilter === p.id)
                .map((proj) => {
                  const projTasks = baseFilteredTasks.filter(t => t.projectId === proj.id);
                  const totalCount = projTasks.length;
                  const doneCount = projTasks.filter(t => [TaskStatus.DONE, TaskStatus.APPROVED].includes(t.status as TaskStatus)).length;
                  const inProgressCount = projTasks.filter(t => [TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.CLIENT_REVIEW, TaskStatus.REVISION_REQUESTED].includes(t.status as TaskStatus)).length;
                  const openCount = projTasks.filter(t => t.status === TaskStatus.OPEN).length;
                  const percentDone = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                  const totalHours = projTasks.reduce((acc, t) => acc + (t.timeLogged || (t.timeLoggedSeconds ? t.timeLoggedSeconds / 3600 : 0)), 0);
                  const isCollapsed = collapsedProjectIds.includes(proj.id);

                  return (
                    <div 
                      key={proj.id} 
                      className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden transition-all"
                    >
                      {/* Project Banner Header */}
                      <div 
                        onClick={() => {
                          setCollapsedProjectIds(prev => 
                            isCollapsed ? prev.filter(id => id !== proj.id) : [...prev, proj.id]
                          );
                        }}
                        className="p-4 bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-900 transition-colors select-none"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <button className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                          
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 font-black text-sm">
                            📁
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wide truncate">
                                {proj.name}
                              </h3>
                              <Badge variant="outline" className="text-[10px] font-bold border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                                {(proj as any).clientName || (proj as any).client || 'Internal Project'}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold mt-0.5 flex-wrap">
                              <span>{totalCount} {totalCount === 1 ? 'Task' : 'Tasks'}</span>
                              <span>•</span>
                              <span className="text-blue-600 dark:text-blue-400">{openCount} Open</span>
                              <span>•</span>
                              <span className="text-amber-600 dark:text-amber-400">{inProgressCount} In Progress</span>
                              <span>•</span>
                              <span className="text-emerald-600 dark:text-emerald-400">{doneCount} Completed</span>
                              {totalHours > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-600 dark:text-indigo-400 font-mono">⏱️ {totalHours.toFixed(1)}h Logged</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar & Quick Actions */}
                        <div className="flex items-center space-x-4" onClick={(e) => e.stopPropagation()}>
                          <div className="hidden md:flex flex-col items-end w-36">
                            <div className="flex justify-between w-full text-[10px] font-black uppercase text-zinc-500 mb-1">
                              <span>Progress</span>
                              <span>{percentDone}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${percentDone}%` }}
                              />
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNewTask(prev => ({ ...prev, projectId: proj.id }));
                              setIsCreateDialogOpen(true);
                            }}
                            className="h-8 px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900 cursor-pointer flex items-center space-x-1"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-500" />
                            <span>Add Task</span>
                          </Button>
                        </div>
                      </div>

                      {/* Project Tasks mini Kanban */}
                      {!isCollapsed && (
                        <div className="p-4 bg-zinc-50/40 dark:bg-zinc-950/30">
                          {projTasks.length === 0 ? (
                            <div className="text-center py-6 text-xs text-zinc-400 font-medium italic border-2 border-dashed border-zinc-100 dark:border-zinc-900 rounded-xl">
                              No tasks found matching current filters in <strong className="text-zinc-600 dark:text-zinc-300">{proj.name}</strong>.
                            </div>
                          ) : (
                            <div className="flex flex-row space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                              {COLUMNS.map((column) => {
                                const colTasks = projTasks.filter(t => column.statuses.includes(t.status));
                                const isOverColumn = draggedOverColumnId === `${proj.id}-${column.id}`;

                                return (
                                  <div
                                    key={column.id}
                                    onDragOver={(e) => handleDragOverColumn(e, `${proj.id}-${column.id}`)}
                                    onDragLeave={handleDragLeaveColumn}
                                    onDrop={(e) => handleDropOnColumn(e, column.targetStatus)}
                                    className={cn(
                                      "flex flex-col min-w-[260px] sm:min-w-[290px] max-w-[340px] flex-1 rounded-2xl border p-3 transition-all duration-200 shrink-0",
                                      isOverColumn
                                        ? "bg-zinc-100/90 dark:bg-zinc-900/45 border-dashed border-2 border-brand-secondary ring-2 ring-brand-secondary/10"
                                        : "bg-white dark:bg-zinc-950/60 border-zinc-200/80 dark:border-zinc-800 shadow-2xs"
                                    )}
                                  >
                                    {/* Mini Column Header */}
                                    <div className="flex items-center justify-between mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                                      <span className={cn("text-xs font-bold uppercase tracking-wider", column.colorClass.split(' ')[0])}>
                                        {column.title}
                                      </span>
                                      <Badge variant="secondary" className="text-[10px] font-extrabold font-mono rounded-full px-2 h-4.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                        {colTasks.length}
                                      </Badge>
                                    </div>

                                    {/* Column Tasks */}
                                    <div className="flex flex-col gap-2.5 min-h-[140px]">
                                      {colTasks.length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center p-4 border border-dashed border-zinc-100 dark:border-zinc-900 rounded-xl text-center text-zinc-300 dark:text-zinc-700 text-[11px] italic">
                                          Empty
                                        </div>
                                      ) : (
                                        colTasks.map((task) => {
                                          const assignee = users.find(u => u.id === task.assigneeId);
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
                                                "bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 p-3 rounded-xl shadow-2xs transition-all duration-150 cursor-pointer hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 space-y-2",
                                                draggedTaskId === task.id && "opacity-45 scale-[0.98]",
                                                draggedOverTaskId === task.id && "border-t-2 border-brand-secondary"
                                              )}
                                            >
                                              <div className="flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center space-x-1.5">
                                                  <Checkbox 
                                                    checked={selectedTaskIds.includes(task.id)}
                                                    onCheckedChange={(checked) => {
                                                      setSelectedTaskIds(prev => 
                                                        checked ? [...prev, task.id] : prev.filter(id => id !== task.id)
                                                      );
                                                    }}
                                                    className="brand-checkbox scale-75"
                                                  />
                                                  <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider">
                                                    {task.type || 'Task'}
                                                  </span>
                                                </div>
                                                <div className="flex items-center space-x-1 shrink-0">
                                                  <span className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    task.priority === Priority.HIGH || task.priority === Priority.CRITICAL ? "bg-red-500" : "bg-zinc-300 dark:bg-zinc-600"
                                                  )} />
                                                  <span className="text-[9px] font-bold text-zinc-500 uppercase">
                                                    {task.priority}
                                                  </span>
                                                </div>
                                              </div>

                                              <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 hover:text-brand-secondary line-clamp-2 leading-tight">
                                                {task.name}
                                              </h4>

                                              {subtaskCount > 0 && (
                                                <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400">
                                                  <ListTodo className="w-3 h-3 text-sky-500" />
                                                  <span className="font-semibold">{completedCount}/{subtaskCount} Subtasks</span>
                                                </div>
                                              )}

                                              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px]">
                                                <div className="flex items-center space-x-1 text-zinc-500">
                                                  <Avatar className="w-4 h-4">
                                                    <AvatarFallback className="text-[8px] font-bold bg-zinc-100">
                                                      {assignee?.name ? assignee.name.charAt(0) : '?'}
                                                    </AvatarFallback>
                                                  </Avatar>
                                                  <span className="font-semibold truncate max-w-[80px]">{assignee?.name || 'Unassigned'}</span>
                                                </div>
                                                {task.dueDate && (
                                                  <span className="font-mono text-zinc-400 font-bold text-[9px]">
                                                    📅 {task.dueDate}
                                                  </span>
                                                )}
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
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex flex-row space-x-4 overflow-x-auto pb-6 select-none scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
            {boardViewMode === 'capacity' ? (
              <>
                {/* 1. Inbox / Lead Column */}
                {(() => {
                  const inboxSubtasks = baseFilteredTasks.flatMap(task => {
                    const project = projects.find(p => p.id === task.projectId);
                    return (task.subTasks || []).map(st => {
                      const stStatus = st.status || (st.isCompleted ? TaskStatus.DONE : TaskStatus.OPEN);
                      return { kind: 'subtask' as const, subtask: st, parentTask: task, project, status: stStatus };
                    });
                  }).filter(item => !item.subtask.assigneeIds || item.subtask.assigneeIds.length === 0 || !item.subtask.assigneeId);

                  const inboxMainTasks = baseFilteredTasks.filter(task => {
                    const hasAssignee = (task.assigneeIds && task.assigneeIds.length > 0) || Boolean(task.assigneeId);
                    if (hasAssignee) return false;
                    return (!task.subTasks || task.subTasks.length === 0);
                  }).map(task => {
                    const project = projects.find(p => p.id === task.projectId);
                    return { kind: 'task' as const, task, project, status: task.status };
                  });

                  const inboxItems = [...inboxMainTasks, ...inboxSubtasks];
                  const isOver = draggedOverColumnId === 'capacity-unassigned';

                  return (
                    <div
                      key="capacity-unassigned"
                      onDragOver={(e) => handleDragOverColumn(e, 'capacity-unassigned')}
                      onDragLeave={handleDragLeaveColumn}
                      onDrop={(e) => handleDropOnCapacityColumn(e, 'unassigned')}
                      className={cn(
                        "flex flex-col min-w-[300px] sm:min-w-[330px] max-w-[370px] flex-1 rounded-2xl border p-4 transition-all duration-200 shrink-0",
                        isOver
                          ? "bg-zinc-100/90 dark:bg-zinc-900/45 border-dashed border-2 border-brand-secondary ring-2 ring-brand-secondary/10"
                          : "bg-amber-50/20 dark:bg-amber-950/10 border-amber-200/80 dark:border-amber-900/30 shadow-sm"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3 border-b border-amber-200/50 dark:border-amber-900/30 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5" />
                          <span>📥 Inbox / Lead Queue</span>
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-extrabold font-mono rounded-full px-2 h-5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
                          {inboxItems.length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-3 italic">
                        All incoming task requests land here first. Drag under a {capacityMemberNoun} to assign capacity.
                      </p>

                      <div className="flex flex-col gap-3 min-h-[420px]">
                        {inboxItems.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-amber-200/50 dark:border-amber-900/30 rounded-xl bg-amber-50/10 text-center text-zinc-400 text-xs italic">
                            <span>All tasks assigned! Inbox empty.</span>
                          </div>
                        ) : (
                          inboxItems.map((item) => {
                            if (item.kind === 'task') {
                              return (
                                <div
                                  key={`inbox-task-${item.task.id}`}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, item.task.id)}
                                  onDragEnd={handleDragEnd}
                                  onClick={() => setSelectedDetailTask(item.task)}
                                  className="bg-white dark:bg-zinc-900 w-full border border-amber-200/80 dark:border-zinc-800 p-3.5 rounded-xl shadow-sm transition-all duration-150 cursor-pointer hover:shadow-md hover:border-amber-400 space-y-2.5 group"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest truncate max-w-[120px]">
                                      {item.project?.name || 'Global'}
                                    </span>
                                    <Badge variant="outline" className="text-[9px] font-black uppercase py-0 px-1.5 border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300">
                                      {item.task.status}
                                    </Badge>
                                  </div>

                                  <div className="flex items-start gap-2">
                                    <Checkbox
                                      checked={['Done', 'Approved', 'done', 'approved'].includes(item.task.status)}
                                      onCheckedChange={(chk) => {
                                        handleUpdateTaskStatus(item.task.id, chk ? TaskStatus.DONE : TaskStatus.OPEN);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="brand-checkbox shrink-0 mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span className={cn(
                                        "text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug break-words group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors",
                                        ['Done', 'Approved', 'done', 'approved'].includes(item.task.status) && "line-through text-zinc-400 dark:text-zinc-500"
                                      )}>
                                        {item.task.name}
                                      </span>
                                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-400 font-semibold">
                                        <span className="bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-bold">Main Task</span>
                                        {item.task.dueDate && <span>Due {item.task.dueDate}</span>}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-1.5 flex-wrap pt-1 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {item.task.type && (
                                        <Badge variant="secondary" className="text-[9px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80 rounded-md py-0 px-1.5">
                                          {item.task.type}
                                        </Badge>
                                      )}
                                      {item.task.priority && item.task.priority !== Priority.NORMAL && (
                                        <Badge variant="outline" className="text-[9px] font-extrabold rounded-md py-0 px-1.5">
                                          {item.task.priority}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-[9px] font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                      <AlarmClock className="w-3 h-3 text-amber-500" />
                                      <span>{formatHoursMinutes(item.task.timeLogged || (item.task.timeLoggedSeconds ? item.task.timeLoggedSeconds / 3600 : 0))} / {formatHoursMinutes(item.task.timeEstimate || 0)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            const { subtask, parentTask, project } = item;
                            return (
                              <div
                                key={`${parentTask.id}-${subtask.id}`}
                                draggable
                                onDragStart={(e) => handleSubtaskDragStart(e, parentTask.id, subtask.id)}
                                onDragEnd={() => {
                                  setDraggedSubtaskInfo(null);
                                  setDraggedOverColumnId(null);
                                }}
                                onClick={() => setSelectedDetailTask(parentTask)}
                                className={cn(
                                  "bg-white dark:bg-zinc-900 w-full border border-zinc-200/80 dark:border-zinc-800 p-3.5 rounded-xl shadow-sm transition-all duration-150 cursor-pointer hover:shadow-md hover:border-amber-400 space-y-2.5 group",
                                  draggedSubtaskInfo?.subtaskId === subtask.id && "opacity-45 scale-[0.98] border-dashed border-amber-400"
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[120px]">
                                    {project?.name || 'Global'}
                                  </span>
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <SubtaskStatusBox subtask={subtask} taskId={parentTask.id} onUpdateStatus={updateSubtaskStatus} />
                                  </div>
                                </div>

                                <div className="flex items-start gap-2">
                                  <Checkbox
                                    checked={subtask.isCompleted}
                                    onCheckedChange={() => toggleSubtask(parentTask.id, subtask.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="brand-checkbox shrink-0 mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className={cn(
                                      "text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug break-words group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors",
                                      subtask.isCompleted && "line-through text-zinc-400 dark:text-zinc-500"
                                    )}>
                                      {subtask.name}
                                    </span>
                                    <p className="text-[9px] text-zinc-400 truncate mt-0.5">
                                      Parent: {parentTask.name}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {subtask.assetType && (
                                    <Badge variant="secondary" className="text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/80 rounded-md py-0 px-1.5">
                                      🎨 {subtask.assetType}
                                    </Badge>
                                  )}
                                  {subtask.priority && subtask.priority !== Priority.NORMAL && (
                                    <Badge variant="outline" className="text-[9px] font-extrabold rounded-md py-0 px-1.5">
                                      {subtask.priority}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Department-Filtered Team Member Columns */}
                {(users || []).filter(u => {
                  if (u.status === 'inactive' || u.isActive === false) return false;
                  if (activeCapacityDepartment === 'ALL') return true;
                  if (activeCapacityDepartment === Department.WEB_DEVELOPMENT) {
                    return u.department === Department.WEB_DEVELOPMENT || 
                           u.role === UserRole.WEB_DEVELOPER || 
                           u.role === UserRole.WEB_DEV_MANAGER || 
                           u.role === UserRole.HUBSPOT_SPECIALIST;
                  }
                  if (activeCapacityDepartment === Department.DESIGN) {
                    return u.department === Department.DESIGN || 
                           u.role === UserRole.DESIGNER || 
                           u.role === UserRole.DESIGN_LEAD || 
                           u.role === UserRole.DESIGNER_MOTION;
                  }
                  if (activeCapacityDepartment === Department.CONTENT) {
                    return u.department === Department.CONTENT || 
                           u.role === UserRole.CONTENT_WRITER || 
                           u.role === UserRole.CONTENT_LEAD;
                  }
                  return u.department === activeCapacityDepartment;
                }).map(designer => {
                  const isDesignerAssignedTask = (task: Task) => {
                    return task.assigneeIds?.includes(designer.id) || task.assigneeId === designer.id;
                  };

                  const designerSubtaskItems = baseFilteredTasks.flatMap(task => {
                    const project = projects.find(p => p.id === task.projectId);
                    return (task.subTasks || []).map(st => {
                      const stStatus = st.status || (st.isCompleted ? TaskStatus.DONE : TaskStatus.OPEN);
                      return { kind: 'subtask' as const, subtask: st, parentTask: task, project, status: stStatus };
                    });
                  }).filter(item => {
                    if (item.subtask.assigneeIds?.includes(designer.id) || item.subtask.assigneeId === designer.id) {
                      return true;
                    }
                    const parentAssigned = isDesignerAssignedTask(item.parentTask);
                    const subtaskHasOtherAssignee = (item.subtask.assigneeIds && item.subtask.assigneeIds.length > 0) || Boolean(item.subtask.assigneeId);
                    return parentAssigned && !subtaskHasOtherAssignee;
                  });

                  const designerMainTasks = baseFilteredTasks.filter(task => {
                    if (!isDesignerAssignedTask(task)) return false;
                    const subtasks = task.subTasks || [];
                    return subtasks.length === 0;
                  }).map(task => {
                    const project = projects.find(p => p.id === task.projectId);
                    return { kind: 'task' as const, task, project, status: task.status };
                  });

                  const designerItems = [...designerMainTasks, ...designerSubtaskItems];

                  const totalAllocatedHours = designerItems.reduce((sum, item) => {
                    if (item.kind === 'subtask') {
                      return sum + (item.subtask.timeEstimate || 0);
                    }
                    return sum + (item.task.timeEstimate || 0);
                  }, 0);

                  const totalLoggedHours = designerItems.reduce((sum, item) => {
                    if (item.kind === 'subtask') {
                      return sum + (item.subtask.timeLogged || 0);
                    }
                    return sum + (item.task.timeLogged || (item.task.timeLoggedSeconds ? item.task.timeLoggedSeconds / 3600 : 0));
                  }, 0);

                  const isOver = draggedOverColumnId === `capacity-${designer.id}`;

                  return (
                    <div
                      key={`capacity-${designer.id}`}
                      onDragOver={(e) => handleDragOverColumn(e, `capacity-${designer.id}`)}
                      onDragLeave={handleDragLeaveColumn}
                      onDrop={(e) => handleDropOnCapacityColumn(e, designer.id)}
                      className={cn(
                        "flex flex-col min-w-[300px] sm:min-w-[330px] max-w-[370px] flex-1 rounded-2xl border p-4 transition-all duration-200 shrink-0",
                        isOver
                          ? "bg-zinc-100/90 dark:bg-zinc-900/45 border-dashed border-2 border-brand-secondary ring-2 ring-brand-secondary/10"
                          : "bg-white dark:bg-zinc-950/25 border-zinc-200/80 dark:border-zinc-800 shadow-sm"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-brand-secondary/10 text-brand-secondary flex items-center justify-center font-black text-xs shrink-0 border border-brand-secondary/20">
                            {designer.avatarUrl && (designer.avatarUrl.startsWith('http') || designer.avatarUrl.startsWith('/') || designer.avatarUrl.startsWith('data:')) ? (
                              <img src={designer.avatarUrl} alt={designer.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <span>{designer.avatarUrl && designer.avatarUrl.length < 4 ? designer.avatarUrl : designer.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                              {designer.name}
                            </h4>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {designer.designation || designer.department || 'Team Member'}
                            </p>
                          </div>
                        </div>

                        <Badge variant="secondary" className="text-[10px] font-extrabold font-mono rounded-full px-2 h-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
                          {designerItems.length} tasks
                        </Badge>
                      </div>

                      <div className="bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 mb-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-zinc-500 uppercase tracking-wider">Allocated Capacity</span>
                          <span className={cn(
                            totalAllocatedHours > 28 ? "text-red-600 font-extrabold" : totalAllocatedHours >= 12 ? "text-indigo-600 font-extrabold" : "text-emerald-600 font-extrabold"
                          )}>
                            {totalAllocatedHours.toFixed(1)}h allocated ({totalLoggedHours.toFixed(1)}h logged)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              totalAllocatedHours > 28 ? "bg-red-500" : totalAllocatedHours >= 12 ? "bg-indigo-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${Math.min(100, (totalAllocatedHours / 40) * 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 min-h-[380px]">
                        {designerItems.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/20 text-center text-zinc-400 text-xs italic">
                            <span>No tasks assigned. Drag items here to delegate.</span>
                          </div>
                        ) : (
                          designerItems.map((item) => {
                            if (item.kind === 'task') {
                              return (
                                <div
                                  key={`task-${item.task.id}`}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, item.task.id)}
                                  onDragEnd={handleDragEnd}
                                  onClick={() => setSelectedDetailTask(item.task)}
                                  className="bg-white dark:bg-zinc-900 w-full border border-zinc-200/80 dark:border-zinc-800 p-3.5 rounded-xl shadow-sm transition-all duration-150 cursor-pointer hover:shadow-md hover:border-indigo-400 space-y-2.5 group"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest truncate max-w-[120px]">
                                      {item.project?.name || 'Global'}
                                    </span>
                                    <Badge variant="outline" className="text-[9px] font-black uppercase py-0 px-1.5 border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300">
                                      {item.task.status}
                                    </Badge>
                                  </div>

                                  <div className="flex items-start gap-2">
                                    <Checkbox
                                      checked={['Done', 'Approved', 'done', 'approved'].includes(item.task.status)}
                                      onCheckedChange={(chk) => {
                                        handleUpdateTaskStatus(item.task.id, chk ? TaskStatus.DONE : TaskStatus.OPEN);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="brand-checkbox shrink-0 mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span className={cn(
                                        "text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug break-words group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors",
                                        ['Done', 'Approved', 'done', 'approved'].includes(item.task.status) && "line-through text-zinc-400 dark:text-zinc-500"
                                      )}>
                                        {item.task.name}
                                      </span>
                                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-400 font-semibold">
                                        <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[9px] font-bold">Main Task</span>
                                        {item.task.dueDate && <span>Due {item.task.dueDate}</span>}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-1.5 flex-wrap pt-1 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {item.task.type && (
                                        <Badge variant="secondary" className="text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/80 rounded-md py-0 px-1.5">
                                          {item.task.type}
                                        </Badge>
                                      )}
                                      {item.task.priority && item.task.priority !== Priority.NORMAL && (
                                        <Badge variant="outline" className="text-[9px] font-extrabold rounded-md py-0 px-1.5">
                                          {item.task.priority}
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                      <AlarmClock className="w-3 h-3 text-indigo-500" />
                                      <span>{formatHoursMinutes(item.task.timeLogged || (item.task.timeLoggedSeconds ? item.task.timeLoggedSeconds / 3600 : 0))} / {formatHoursMinutes(item.task.timeEstimate || 0)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            const { subtask, parentTask, project } = item;
                            return (
                              <div
                                key={`${parentTask.id}-${subtask.id}`}
                                draggable
                                onDragStart={(e) => handleSubtaskDragStart(e, parentTask.id, subtask.id)}
                                onDragEnd={() => {
                                  setDraggedSubtaskInfo(null);
                                  setDraggedOverColumnId(null);
                                }}
                                onClick={() => setSelectedDetailTask(parentTask)}
                                className={cn(
                                  "bg-white dark:bg-zinc-900 w-full border border-zinc-200/80 dark:border-zinc-800 p-3.5 rounded-xl shadow-sm transition-all duration-150 cursor-pointer hover:shadow-md hover:border-indigo-400 space-y-2.5 group",
                                  draggedSubtaskInfo?.subtaskId === subtask.id && "opacity-45 scale-[0.98] border-dashed border-indigo-400"
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[110px]">
                                    {project?.name || 'Global'}
                                  </span>
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <SubtaskStatusBox subtask={subtask} taskId={parentTask.id} onUpdateStatus={updateSubtaskStatus} />
                                  </div>
                                </div>

                                <div className="flex items-start gap-2">
                                  <Checkbox
                                    checked={subtask.isCompleted}
                                    onCheckedChange={() => toggleSubtask(parentTask.id, subtask.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="brand-checkbox shrink-0 mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className={cn(
                                      "text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug break-words group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors",
                                      subtask.isCompleted && "line-through text-zinc-400 dark:text-zinc-500"
                                    )}>
                                      {subtask.name}
                                    </span>
                                    <p className="text-[9px] text-zinc-400 truncate mt-0.5">
                                      Parent: {parentTask.name}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-1.5 flex-wrap pt-1 border-t border-zinc-100 dark:border-zinc-800">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {subtask.assetType && (
                                      <Badge variant="secondary" className="text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/80 rounded-md py-0 px-1.5">
                                        🎨 {subtask.assetType}
                                      </Badge>
                                    )}
                                    {subtask.priority && subtask.priority !== Priority.NORMAL && (
                                      <Badge variant="outline" className="text-[9px] font-extrabold rounded-md py-0 px-1.5">
                                        {subtask.priority}
                                      </Badge>
                                    )}
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTimesheetSubtaskInfo({ taskId: parentTask.id, subtaskId: subtask.id });
                                    }}
                                    className="h-6 px-2 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 rounded-lg flex items-center gap-1"
                                    title="View per-designer time breakdown & timesheet"
                                  >
                                    <AlarmClock className="w-3 h-3 text-indigo-500" />
                                    <span>{formatHoursMinutes(subtask.timeLogged || 0)} / {formatHoursMinutes(subtask.timeEstimate || 0)}</span>
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              COLUMNS.map((column) => {
              const columnTasks = baseFilteredTasks.filter(t => column.statuses.includes(t.status));
              const columnSubtaskItems = baseFilteredTasks.flatMap(task => {
                const project = projects.find(p => p.id === task.projectId);
                let subtasksList = task.subTasks || [];
                if (localSubtaskNameFilter !== 'all') {
                  subtasksList = subtasksList.filter(st => 
                    st.name.toLowerCase().includes(localSubtaskNameFilter.toLowerCase())
                  );
                }
                return subtasksList.map(st => {
                  const stStatus = st.status || (st.isCompleted ? TaskStatus.DONE : TaskStatus.OPEN);
                  return { subtask: st, parentTask: task, project, status: stStatus };
                });
              }).filter(item => column.statuses.includes(item.status));

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
                        {boardViewMode === 'subtasks' ? columnSubtaskItems.length : columnTasks.length}
                      </Badge>
                    </div>
                  </div>

                  {/* Column Cards Container */}
                  <div className="flex flex-col gap-3 min-h-[450px]">
                    {boardViewMode === 'subtasks' ? (
                      columnSubtaskItems.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/5 text-center text-zinc-400 dark:text-zinc-600 text-xs italic">
                          <span>Drop subtasks here</span>
                        </div>
                      ) : (
                        columnSubtaskItems.map(({ subtask, parentTask, project }) => (
                          <div
                            key={`${parentTask.id}-${subtask.id}`}
                            draggable
                            onDragStart={(e) => handleSubtaskDragStart(e, parentTask.id, subtask.id)}
                            onDragEnd={() => {
                              setDraggedSubtaskInfo(null);
                              setDraggedOverColumnId(null);
                            }}
                            className={cn(
                              "bg-white dark:bg-zinc-900 w-full border border-zinc-200/80 dark:border-zinc-800 p-3.5 rounded-xl shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-sky-400 dark:hover:border-sky-600 space-y-2.5",
                              draggedSubtaskInfo?.subtaskId === subtask.id && "opacity-45 scale-[0.98] border-dashed border-sky-400"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[110px]">
                                {project?.name || 'Global'}
                              </span>
                              <Badge variant="outline" className="text-[9px] font-extrabold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 rounded-md py-0 px-1.5 truncate max-w-[160px]">
                                Task: {parentTask.name}
                              </Badge>
                            </div>

                            <div className="flex items-start gap-2">
                              <Checkbox
                                checked={subtask.isCompleted}
                                onCheckedChange={() => toggleSubtask(parentTask.id, subtask.id)}
                                className="brand-checkbox shrink-0 mt-0.5"
                              />
                              <span className={cn(
                                "text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug break-words flex-1 min-w-0",
                                subtask.isCompleted && "line-through text-zinc-400 dark:text-zinc-500"
                              )}>
                                {subtask.name}
                              </span>
                            </div>

                            {/* Asset Type, Priority, Deadline Badges */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {subtask.assetType && (
                                <Badge variant="secondary" className="text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-900/50 rounded-md py-0 px-1.5">
                                  🎨 {subtask.assetType}
                                </Badge>
                              )}
                              {subtask.priority && subtask.priority !== Priority.NORMAL && (
                                <Badge variant="outline" className={cn(
                                  "text-[9px] font-extrabold rounded-md py-0 px-1.5",
                                  subtask.priority === Priority.CRITICAL && "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300",
                                  subtask.priority === Priority.HIGH && "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300",
                                  subtask.priority === Priority.LOW && "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                                )}>
                                  {subtask.priority}
                                </Badge>
                              )}
                              {subtask.dueDate && (
                                <span className="text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-800">
                                  <Calendar className="w-2.5 h-2.5 text-zinc-400" />
                                  {subtask.dueDate}
                                </span>
                              )}
                            </div>

                            {subtask.description && (
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                {subtask.description}
                              </p>
                            )}

                            {/* Live Subtask Timer Bar */}
                            {toggleSubTaskTimer && formatTime && (
                              <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 px-2 py-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800 text-[10px]">
                                <div className="flex items-center space-x-1.5">
                                  <Clock className="w-3 h-3 text-zinc-400" />
                                  <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                                    {formatTime(subTaskElapsedTimes?.[subtask.id] || 0)}
                                  </span>
                                  {subtask.timeEstimate !== undefined && subtask.timeEstimate > 0 && (
                                    <span className="text-[9px] text-zinc-400 font-medium">
                                      / {formatHoursMinutes ? formatHoursMinutes(subtask.timeEstimate) : `${subtask.timeEstimate}h`}
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-5 px-2 text-[10px] font-extrabold rounded-md transition-all cursor-pointer flex items-center gap-1",
                                    activeTimerSubTaskId === subtask.id
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                      : "text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSubTaskTimer(subtask.id, parentTask.id);
                                  }}
                                  title={activeTimerSubTaskId === subtask.id ? "Pause Subtask Timer" : "Start Subtask Timer"}
                                >
                                  {activeTimerSubTaskId === subtask.id ? (
                                    <>
                                      <Pause className="w-2.5 h-2.5 text-amber-500 fill-current animate-pulse" />
                                      <span>Pause</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-2.5 h-2.5 text-emerald-500 fill-current" />
                                      <span>Start Timer</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                              <SubtaskAssigneesPicker
                                subtask={subtask}
                                taskId={parentTask.id}
                                users={users}
                                onUpdateAssignees={updateSubtaskAssignees}
                              />
                              <Select
                                value={subtask.status || (subtask.isCompleted ? TaskStatus.DONE : TaskStatus.OPEN)}
                                onValueChange={(val) => updateSubtaskStatus(parentTask.id, subtask.id, val as TaskStatus)}
                              >
                                <SelectTrigger className="h-6 text-[9px] font-extrabold px-1.5 py-0 bg-muted/30 border-zinc-200 dark:border-zinc-800 rounded-md">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                  <SelectItem value={TaskStatus.OPEN} className="text-xs">To Do</SelectItem>
                                  <SelectItem value={TaskStatus.IN_PROGRESS} className="text-xs">In Progress</SelectItem>
                                  <SelectItem value={TaskStatus.REVIEW} className="text-xs">In Review</SelectItem>
                                  <SelectItem value={TaskStatus.DONE} className="text-xs">Done</SelectItem>
                                  <SelectItem value={TaskStatus.BLOCKED} className="text-xs">Blocked</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))
                      )
                    ) : columnTasks.length === 0 ? (
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
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 text-[9px] font-bold text-zinc-600 dark:text-zinc-300 hover:text-brand-secondary hover:bg-brand-secondary/10 rounded-md shrink-0 flex items-center gap-1 cursor-pointer mr-0.5 border border-zinc-200 dark:border-zinc-800"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDetailTask(task);
                                }}
                                title="View & Edit Task Details"
                              >
                                <Eye className="w-3 h-3 text-brand-secondary" />
                                <span>Details</span>
                              </Button>
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
                              const { 
                                directLoggedSeconds, 
                                directEstimate, 
                                subtasksLoggedSeconds, 
                                subtasksEstimate, 
                                totalLoggedSeconds, 
                                totalEstimate, 
                                hasSubTasks 
                              } = getTaskTimingDetails(task);
                              
                              const displayEstimate = hasSubTasks ? totalEstimate : directEstimate;
                              const displayLogged = hasSubTasks ? totalLoggedSeconds / 3600 : directLoggedSeconds / 3600;
                              const isExceeded = displayEstimate > 0 && displayLogged > displayEstimate;
                              
                              return (
                                <div className="space-y-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                                  {isExceeded && (
                                    <div className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5 w-full select-none">
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                      <span>Limit Exceeded: {formatHoursMinutes(displayLogged)} / {formatHoursMinutes(displayEstimate)} (+{formatHoursMinutes(displayLogged - displayEstimate)} over)</span>
                                    </div>
                                  )}
                                  {hasSubTasks && (
                                    <div className="px-2.5 py-1.5 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-between gap-1 w-full select-none" title="Sum of parent task and all subtasks duration and tracked times">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                                        <span>Cumulative Logged</span>
                                      </span>
                                      <span className="font-mono text-[9px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                                        {formatTime(totalLoggedSeconds)} / {formatHoursMinutes(totalEstimate)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
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
                                     <div className="text-[11px] bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 mb-2 font-medium">
                                       <TaskDescriptionRenderer description={task.description} />
                                     </div>
                                  )}

                                  {task.subTasks?.map((subtask) => (
                                    <EditableSubtaskRow
                                      key={subtask.id}
                                      subtask={subtask}
                                      taskId={task.id}
                                      users={users}
                                      onToggle={toggleSubtask}
                                      onUpdateStatus={updateSubtaskStatus}
                                      onUpdateAssignees={updateSubtaskAssignees}
                                      onUpdateSubtask={updateSubtask}
                                      onDelete={deleteSubtask}
                                      subTaskElapsedTimes={subTaskElapsedTimes}
                                      activeTimerSubTaskId={activeTimerSubTaskId}
                                      toggleSubTaskTimer={toggleSubTaskTimer}
                                      handleDurationInputChange={handleDurationInputChange}
                                      handleDurationInputBlur={handleDurationInputBlur}
                                      inputDrafts={inputDrafts}
                                      inputErrors={inputErrors}
                                      formatTime={formatTime}
                                      formatHoursMinutes={formatHoursMinutes}
                                      onSubtaskDragStart={handleSubtaskDragStart}
                                      onSubtaskDragOver={(e) => e.preventDefault()}
                                      onSubtaskDrop={handleSubtaskDropOnSubtask}
                                    />
                                  ))}

                                  <SubtaskInput taskId={task.id} users={users} onAddSubtask={(tId, name, assignees, desc, assetType, priority, dueDate, workCategory) => addSubtask(tId, name, assignees, desc, assetType, priority, dueDate, workCategory)} />

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

                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                            {/* Card Controls Footer */}
                            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 mt-4 pt-3 gap-1" onClick={(e) => e.stopPropagation()}>
                              {/* Compact User Assignee Avatar Dropdown */}
                            <Select 
                              value={task.assigneeId} 
                              onValueChange={(newAssigneeId) => {
                                const updatedTask = { ...task, assigneeId: newAssigneeId, updatedAt: new Date().toISOString() };
                                setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
                                const targetAssignee = users.find(u => u.id === newAssigneeId);
                                if (targetAssignee && user) {
                                  emailService.sendTaskAssignmentEmail(targetAssignee, updatedTask, user);
                                }
                              }}
                            >
                              <SelectTrigger 
                                className="h-6 w-6 p-0 border-none shadow-none focus:ring-0 rounded-full hover:ring-2 hover:ring-orange-500/30 shrink-0 cursor-pointer" 
                                title={assignee?.name ? `Assigned to: ${assignee.name}` : 'Assign team member'}
                              >
                                <Avatar className="w-6 h-6 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                  <AvatarFallback className="text-[9px] font-extrabold bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                                    {assignee?.name ? assignee.name.charAt(0).toUpperCase() : '?'}
                                  </AvatarFallback>
                                </Avatar>
                              </SelectTrigger>
                              <SelectContent className="min-w-[220px]">
                                {users.filter(u => u.role !== UserRole.CLIENT).map(u => (
                                  <SelectItem key={u.id} value={u.id}>
                                    <div className="flex items-center space-x-2">
                                      <Avatar className="w-5 h-5 border shadow-sm">
                                        <AvatarFallback className="text-[8px] font-bold bg-zinc-100 dark:bg-zinc-800">{u.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs font-medium">{u.name}</span>
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
                                  {getQuickStatuses(task.status).map((status) => (
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
          })
        )}
        </div>
      )}
      </div>
      )}

      {/* Task Details Dialog Modal */}
      <Dialog open={!!selectedDetailTask} onOpenChange={(open) => !open && setSelectedDetailTask(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto scrollbar-thin rounded-2xl p-6 bg-white dark:bg-zinc-950">
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
                  <div className="mb-2">
                    {!isEditingDetailTaskTitle ? (
                      <div className="flex items-center gap-2 group/title">
                        <DialogTitle 
                          className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 cursor-pointer hover:text-brand-secondary transition-colors"
                          onClick={() => {
                            setDetailTaskTitleInput(task.name);
                            setIsEditingDetailTaskTitle(true);
                          }}
                          title="Click to edit task title"
                        >
                          {task.name}
                        </DialogTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-400 hover:text-brand-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md shrink-0 opacity-80 group-hover/title:opacity-100 transition-opacity"
                          onClick={() => {
                            setDetailTaskTitleInput(task.name);
                            setIsEditingDetailTaskTitle(true);
                          }}
                          title="Edit Task Title"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full max-w-xl">
                        <Input
                          value={detailTaskTitleInput}
                          onChange={(e) => setDetailTaskTitleInput(e.target.value)}
                          placeholder="Enter task title..."
                          className="text-base font-bold h-9 rounded-xl border-brand-secondary/50 focus:border-brand-secondary bg-white dark:bg-zinc-900"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (detailTaskTitleInput.trim()) {
                                const updatedTask = { ...task, name: detailTaskTitleInput.trim(), updatedAt: new Date().toISOString() };
                                setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
                                setSelectedDetailTask(updatedTask);
                                try { saveDocToFirestore('tasks', updatedTask); } catch (err) {}
                                setIsEditingDetailTaskTitle(false);
                              }
                            } else if (e.key === 'Escape') {
                              setIsEditingDetailTaskTitle(false);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-9 px-3 bg-brand-secondary text-white font-bold rounded-xl text-xs hover:bg-brand-secondary/90 shrink-0"
                          onClick={() => {
                            if (detailTaskTitleInput.trim()) {
                              const updatedTask = { ...task, name: detailTaskTitleInput.trim(), updatedAt: new Date().toISOString() };
                              setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
                              setSelectedDetailTask(updatedTask);
                              try { saveDocToFirestore('tasks', updatedTask); } catch (err) {}
                              setIsEditingDetailTaskTitle(false);
                            }
                          }}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 px-2 text-zinc-400 hover:text-zinc-700 font-bold rounded-xl text-xs shrink-0"
                          onClick={() => setIsEditingDetailTaskTitle(false)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-[10px] font-bold border-zinc-200 bg-zinc-50 dark:bg-zinc-900/25 text-zinc-500">
                      {project?.name || 'Global Project'}
                    </Badge>

                    {/* Editable Task Type / Category */}
                    <Select 
                      value={task.type || 'Web Development'}
                      onValueChange={(newType) => {
                        const updatedTask = { ...task, type: newType, updatedAt: new Date().toISOString() };
                        setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
                        setSelectedDetailTask(updatedTask);
                        try { saveDocToFirestore('tasks', updatedTask); } catch (err) {}
                      }}
                    >
                      <SelectTrigger className="h-6 text-[10px] font-bold rounded-md border-zinc-200 bg-zinc-50 dark:bg-zinc-900/25 text-zinc-600 dark:text-zinc-300 px-2 py-0">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Web Development" className="text-xs">Web Development</SelectItem>
                        <SelectItem value="UI/UX Design" className="text-xs">UI/UX Design</SelectItem>
                        <SelectItem value="SEO & Growth" className="text-xs">SEO & Growth</SelectItem>
                        <SelectItem value="Content & Copy" className="text-xs">Content & Copy</SelectItem>
                        <SelectItem value="Maintenance & Support" className="text-xs">Maintenance & Support</SelectItem>
                        <SelectItem value="Strategy & Consulting" className="text-xs">Strategy & Consulting</SelectItem>
                        <SelectItem value="Custom Task" className="text-xs">Custom Task</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Editable Task Recurrence */}
                    <Select 
                      value={task.isRecurring ? (task.recurrencePeriod || 'week') : 'none'}
                      onValueChange={(val) => {
                        const isRec = val !== 'none';
                        const period = isRec ? val : undefined;
                        const updatedTask = { 
                          ...task, 
                          isRecurring: isRec, 
                          recurrencePeriod: period,
                          updatedAt: new Date().toISOString() 
                        };
                        setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
                        setSelectedDetailTask(updatedTask);
                        try { saveDocToFirestore('tasks', updatedTask); } catch (err) {}
                      }}
                    >
                      <SelectTrigger className={cn(
                        "h-6 text-[10px] font-bold rounded-md px-2 py-0",
                        task.isRecurring 
                          ? "border-orange-200 bg-orange-50 dark:bg-orange-950/25 text-orange-600 dark:text-orange-400" 
                          : "border-zinc-200 bg-zinc-50 dark:bg-zinc-900/25 text-zinc-500"
                      )}>
                        <RefreshCw className={cn("w-2.5 h-2.5 mr-1", task.isRecurring && "animate-[spin_10s_linear_infinite] text-orange-500")} />
                        <span>{task.isRecurring ? `Recurring (${task.recurrencePeriod || 'week'}ly)` : 'One-time Task'}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">One-time Task</SelectItem>
                        <SelectItem value="day" className="text-xs">Recurring (Daily)</SelectItem>
                        <SelectItem value="week" className="text-xs">Recurring (Weekly)</SelectItem>
                        <SelectItem value="month" className="text-xs">Recurring (Monthly)</SelectItem>
                        <SelectItem value="quarter" className="text-xs">Recurring (Quarterly)</SelectItem>
                        <SelectItem value="year" className="text-xs">Recurring (Yearly)</SelectItem>
                      </SelectContent>
                    </Select>

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
                            const updatedTask = { ...task, dueDate: newVal, updatedAt: new Date().toISOString() };
                            setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
                            setSelectedDetailTask(updatedTask);
                            try { saveDocToFirestore('tasks', updatedTask); } catch (err) {}
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
                        {getQuickStatuses(task.status).map((status) => (
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
                    <TaskMultiAssigneePicker
                      assigneeIds={task.assigneeIds && task.assigneeIds.length > 0 ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : [])}
                      onAssigneeIdsChange={(newAssigneeIds) => {
                        const firstAssignee = newAssigneeIds[0] || '';
                        const updatedTask = { 
                          ...task, 
                          assigneeIds: newAssigneeIds,
                          assigneeId: firstAssignee, 
                          updatedAt: new Date().toISOString() 
                        };
                        setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
                        newAssigneeIds.forEach(aId => {
                          const targetAssignee = users.find(u => u.id === aId);
                          if (targetAssignee && user) {
                            emailService.sendTaskAssignmentEmail(targetAssignee, updatedTask, user);
                          }
                        });
                      }}
                      users={users}
                      label="Assigned People"
                    />
                  </div>
                </div>

                {/* Description View & Editable Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-400 tracking-wider block">Task Description</span>
                    {!isEditingDesc ? (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 text-[9px] font-bold text-brand-secondary hover:bg-brand-secondary/10 px-1.5 rounded-md"
                        onClick={() => {
                          setDescInput(task.description || '');
                          setIsEditingDesc(true);
                        }}
                      >
                        <Edit3 className="w-2.5 h-2.5 mr-1" />
                        {task.description ? 'Edit' : 'Add Description'}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <DescriptionImageUploader 
                          onAddImage={(imgUrl) => {
                            setDescInput(prev => (prev || '') + `\n![Image](${imgUrl})\n`);
                          }}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 text-[9px] font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-1.5 rounded-md ml-1"
                          onClick={() => setIsEditingDesc(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-5 text-[9px] font-bold bg-brand-secondary text-white hover:bg-brand-secondary/90 px-2 rounded-md"
                          onClick={() => {
                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: descInput.trim(), updatedAt: new Date().toISOString() } : t));
                            logTaskActivity(task.id, 'Description Updated', 'Updated task description details');
                            setIsEditingDesc(false);
                            toast.success('Task description updated');
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditingDesc ? (
                    <div className="space-y-2">
                      <Textarea 
                        value={descInput}
                        onChange={(e) => setDescInput(e.target.value)}
                        placeholder="Add a detailed description for this task..."
                        className="text-xs rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 min-h-[80px]"
                      />
                      {descInput && (
                        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                          <TaskDescriptionRenderer 
                            description={descInput}
                            onRemoveImage={(imgUrl) => {
                              setDescInput(prev => prev ? prev.replace(imgUrl, '').replace(/!\[.*?\]\(\)/g, '') : '');
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl font-medium">
                      <TaskDescriptionRenderer description={task.description} />
                    </div>
                  )}
                </div>

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
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {task.subTasks?.map((subtask) => (
                      <EditableSubtaskRow
                        key={subtask.id}
                        subtask={subtask}
                        taskId={task.id}
                        users={users}
                        onToggle={toggleSubtask}
                        onUpdateStatus={updateSubtaskStatus}
                        onUpdateAssignees={updateSubtaskAssignees}
                        onUpdateSubtask={updateSubtask}
                        onDelete={deleteSubtask}
                        subTaskElapsedTimes={subTaskElapsedTimes}
                        activeTimerSubTaskId={activeTimerSubTaskId}
                        toggleSubTaskTimer={toggleSubTaskTimer}
                        handleDurationInputChange={handleDurationInputChange}
                        handleDurationInputBlur={handleDurationInputBlur}
                        inputDrafts={inputDrafts}
                        inputErrors={inputErrors}
                        formatTime={formatTime}
                        formatHoursMinutes={formatHoursMinutes}
                        onSubtaskDragStart={handleSubtaskDragStart}
                        onSubtaskDragOver={(e) => e.preventDefault()}
                        onSubtaskDrop={handleSubtaskDropOnSubtask}
                      />
                    ))}

                    <SubtaskInput taskId={task.id} users={users} onAddSubtask={(tId, name, assignees, desc, assetType, priority, dueDate, workCategory) => addSubtask(tId, name, assignees, desc, assetType, priority, dueDate, workCategory)} />
                  </div>
                </div>

                {/* Task Activity & Updates Log */}
                <TaskActivityFeed 
                  task={task}
                  onAddComment={(tId, commentText) => {
                    logTaskActivity(tId, 'Comment', commentText);
                  }}
                />

                {/* Timesheet Duration and Log Toggle inside Modal */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5 space-y-4">
                  {(() => {
                    const { 
                      directLoggedSeconds, 
                      directEstimate, 
                      subtasksLoggedSeconds, 
                      subtasksEstimate, 
                      totalLoggedSeconds, 
                      totalEstimate, 
                      hasSubTasks 
                    } = getTaskTimingDetails(task);
                    
                    const displayEstimate = hasSubTasks ? totalEstimate : directEstimate;
                    const displayLogged = hasSubTasks ? totalLoggedSeconds / 3600 : directLoggedSeconds / 3600;
                    const isExceeded = displayEstimate > 0 && displayLogged > displayEstimate;
                    
                    return (
                      <>
                        {isExceeded && (
                          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex gap-2.5 text-rose-800 dark:text-rose-300 select-none animate-[pulse_2s_infinite]">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 dark:text-rose-400">Allotted Time Limit Exceeded</p>
                              <p className="text-[10px] font-medium text-rose-550 dark:text-rose-450 mt-0.5 leading-relaxed">
                                This task and its subtasks have exceeded the cumulative allocation of {formatHoursMinutes(displayEstimate)} by {formatHoursMinutes(displayLogged - displayEstimate)}.
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border border-zinc-100 dark:border-zinc-800 p-3 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20">
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase font-extrabold text-zinc-400 dark:text-zinc-400 block">Direct Task Tracker</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-base font-black text-zinc-900 dark:text-white block">
                                {formatTime(elapsedTimes[task.id] || 0)}
                              </span>
                              {directEstimate > 0 && (
                                <span className={cn(
                                  "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full font-mono border",
                                  directLoggedSeconds / 3600 > directEstimate 
                                    ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50" 
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-transparent"
                                )}>
                                  Limit: {formatHoursMinutes(directEstimate)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {hasSubTasks && (
                            <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-zinc-100 dark:border-zinc-800 pt-2 sm:pt-0 sm:pl-4">
                              <span className="text-[9px] uppercase font-extrabold text-indigo-500 dark:text-indigo-400 block">Cumulative Rollup (Task + Subtasks)</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-base font-black text-indigo-600 dark:text-indigo-400 block">
                                  {formatTime(totalLoggedSeconds)}
                                </span>
                                {totalEstimate > 0 && (
                                  <span className={cn(
                                    "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full font-mono border",
                                    isExceeded 
                                      ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50" 
                                      : "bg-indigo-50 dark:bg-indigo-950/15 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40"
                                  )}>
                                    Cumulative Limit: {formatHoursMinutes(totalEstimate)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase font-extrabold text-zinc-400 dark:text-zinc-400 block">Time Spent Tracker Controls</span>
                            <div className="flex items-center gap-2">
                              {(elapsedTimes[task.id] || 0) > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 text-zinc-400 hover:text-rose-600 transition-all cursor-pointer"
                                  title="Reset tracked time to zero"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to reset the tracked time for this task to zero?")) {
                                      setElapsedTimes(prev => ({ ...prev, [task.id]: 0 }));
                                      setTasks(prev => prev.map(t => t.id === task.id ? { 
                                        ...t, 
                                        timeLoggedSeconds: 0, 
                                        timeLogged: 0, 
                                        updatedAt: new Date().toISOString() 
                                      } : t));
                                      toast.success("Tracked time reset to zero!");
                                    }
                                  }}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
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

      {/* Design Ops & Scoping Requirements Dialog */}
      <Dialog open={showDesignOpsGuide} onOpenChange={setShowDesignOpsGuide}>
        <DialogContent className="w-full max-w-3xl max-h-[88vh] overflow-y-auto scrollbar-thin rounded-3xl p-6 sm:p-8 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4">
          <DialogHeader className="space-y-1.5 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center space-x-2.5 text-indigo-600 dark:text-indigo-400">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40">
                <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <DialogTitle className="text-xl font-extrabold text-zinc-900 dark:text-white">Design Team Operational Guidelines & Addons</DialogTitle>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pl-11">
              Standard operating procedures for design subtask classification, deliverable scoping, asset categorization, and status transitions across projects.
            </p>
          </DialogHeader>

          <div className="grid gap-5 py-2 text-xs">
            <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 p-5 rounded-2xl space-y-3 shadow-2xs">
              <h4 className="font-extrabold text-indigo-950 dark:text-indigo-200 text-sm flex items-center gap-2">
                <span>🎨 1. Subtask / Asset Metadata & Classification</span>
              </h4>
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                Design subtasks track individual deliverables. Always select the appropriate <strong>Asset Type</strong> tag when creating or updating a subtask line item to ensure accurate reporting:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 font-semibold text-[11px]">
                {DESIGN_ASSET_TYPES.slice(0, 9).map(at => (
                  <div key={at} className="bg-white dark:bg-zinc-900/90 border border-indigo-200/70 dark:border-indigo-900/60 px-3 py-2 rounded-xl flex items-center gap-2 shadow-2xs text-zinc-800 dark:text-zinc-200">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                    <span className="truncate">{at}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-zinc-200/90 dark:border-zinc-800 p-4 rounded-2xl space-y-2.5 bg-zinc-50/70 dark:bg-zinc-900/40 shadow-2xs">
                <h5 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>2. Subtask Status Workflow</span>
                </h5>
                <ul className="space-y-2 text-zinc-600 dark:text-zinc-400 text-xs">
                  <li className="flex items-start gap-1.5"><strong className="text-zinc-800 dark:text-zinc-200 shrink-0">Open:</strong> Briefed & allocated in queue</li>
                  <li className="flex items-start gap-1.5"><strong className="text-zinc-800 dark:text-zinc-200 shrink-0">In Progress:</strong> Active execution / timer running</li>
                  <li className="flex items-start gap-1.5"><strong className="text-zinc-800 dark:text-zinc-200 shrink-0">Review:</strong> Shared internally or with client</li>
                  <li className="flex items-start gap-1.5"><strong className="text-zinc-800 dark:text-zinc-200 shrink-0">Done:</strong> Final files exported & delivered</li>
                </ul>
              </div>

              <div className="border border-zinc-200/90 dark:border-zinc-800 p-4 rounded-2xl space-y-2.5 bg-zinc-50/70 dark:bg-zinc-900/40 shadow-2xs">
                <h5 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>3. Parent Task Naming Convention</span>
                </h5>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                  Use standard monthly format for retainer design tasks:
                </p>
                <div className="bg-white dark:bg-zinc-950 font-mono text-xs p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-amber-600 dark:text-amber-400 font-bold shadow-2xs">
                  [Client Name] BAU — [Month Year]
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                  Example: Ginesys BAU — July 2026
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 px-6 text-xs cursor-pointer shadow-sm"
              onClick={() => setShowDesignOpsGuide(false)}
            >
              Close Guidelines
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subtask Timesheet & Member Breakdown Dialog */}
      <Dialog open={!!timesheetSubtaskInfo} onOpenChange={(open) => { if (!open) setTimesheetSubtaskInfo(null); }}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          {(() => {
            if (!timesheetSubtaskInfo) return null;
            const parentTask = tasks.find(t => t.id === timesheetSubtaskInfo.taskId);
            const subtask = parentTask?.subTasks?.find(st => st.id === timesheetSubtaskInfo.subtaskId);
            if (!parentTask || !subtask) return null;

            const project = projects.find(p => p.id === parentTask.projectId);
            const timeEntries = subtask.timeEntries || [];
            const totalLogged = subtask.timeLogged || 0;
            const totalEstimate = subtask.timeEstimate || 0;

            return (
              <div className="space-y-4">
                <DialogHeader className="space-y-1 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <AlarmClock className="w-4 h-4 text-indigo-500" />
                      Timesheet & Member Hours Breakdown
                    </span>
                    <Badge variant="outline" className="text-[10px] font-extrabold">
                      {project?.name || 'Global'}
                    </Badge>
                  </div>
                  <DialogTitle className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                    {subtask.name}
                  </DialogTitle>
                  <p className="text-xs text-zinc-500">
                    Parent Task: <strong className="text-zinc-700 dark:text-zinc-300">{parentTask.name}</strong>
                  </p>
                </DialogHeader>

                {/* Summary Progress */}
                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-indigo-950 dark:text-indigo-200">Total Budgeted vs Actual Logged</span>
                    <span className="text-indigo-600 font-mono">
                      {formatHoursMinutes(totalLogged)} hrs logged / {formatHoursMinutes(totalEstimate)} hrs estimated
                    </span>
                  </div>
                  <div className="w-full h-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${totalEstimate > 0 ? Math.min(100, (totalLogged / totalEstimate) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Existing Entries Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Per-Member Time Contributions ({timeEntries.length})
                  </h4>
                  {timeEntries.length === 0 ? (
                    <div className="text-center py-6 text-xs italic text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200">
                      No per-member time entries recorded yet. Add a manual time log below or start the live subtask timer!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {timeEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 text-xs">
                          <div className="flex items-center space-x-2.5">
                            <User className="w-4 h-4 text-indigo-500" />
                            <div>
                              <p className="font-bold text-zinc-900 dark:text-zinc-100">{entry.userName}</p>
                              <p className="text-[10px] text-zinc-400">{entry.description} • {entry.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {formatHoursMinutes(entry.timeLoggedSeconds / 3600)}
                            </span>
                            {entry.isManual && (
                              <Badge variant="outline" className="text-[9px] font-semibold bg-amber-50 text-amber-700 border-amber-200">
                                Manual Entry
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Entry Form */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-3">
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Add Manual Member Time Contribution
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Select value={newTimeLogUserId || user?.id || ''} onValueChange={setNewTimeLogUserId}>
                      <SelectTrigger className="h-8 text-xs rounded-xl border-zinc-200">
                        <SelectValue placeholder="Select Team Member" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {(users || []).map(u => (
                          <SelectItem key={u.id} value={u.id} className="text-xs">{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="e.g. 1h 30m or 90"
                      value={newTimeLogDuration}
                      onChange={(e) => setNewTimeLogDuration(e.target.value)}
                      className="h-8 text-xs rounded-xl border-zinc-200"
                    />

                    <Input
                      placeholder="Description / work notes"
                      value={newTimeLogDesc}
                      onChange={(e) => setNewTimeLogDesc(e.target.value)}
                      className="h-8 text-xs rounded-xl border-zinc-200"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        const targetUser = newTimeLogUserId || user?.id || '';
                        handleAddSubtaskTimeEntry(parentTask.id, subtask.id, targetUser, newTimeLogDuration, newTimeLogDesc);
                        setNewTimeLogDuration('');
                        setNewTimeLogDesc('');
                      }}
                      className="h-8 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                    >
                      Log Member Hours
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Month-End Report — What the Lead Needs */}
      <Dialog open={showLeadMonthEndReport} onOpenChange={setShowLeadMonthEndReport}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-6">
          <DialogHeader className="space-y-2 border-b border-zinc-100 dark:border-zinc-800 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                <BarChart3 className="w-6 h-6 text-indigo-500" />
                <DialogTitle className="text-xl font-black tracking-tight">Month-End Lead & Team Performance Report</DialogTitle>
              </div>

              {/* Department, Client / Project, Employee & Timeframe Filter Controls + Export CSV + IT Decision Matrix */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowITDecisionMatrix(true)}
                  className="h-8 px-2.5 text-xs font-bold rounded-xl border-indigo-200 dark:border-indigo-900 bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer"
                  title="View IT / Cross-Team Decision Matrix (Data migration, reporting, notifications, permissions)"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>IT Decision Matrix</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportMonthEndCSV}
                  className="h-8 px-2.5 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center gap-1.5 cursor-pointer"
                  title="Export Month-End Report to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </Button>

                {/* Timeframe Type Switcher */}
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl gap-0.5">
                  <button
                    onClick={() => setReportTimeframeType('week')}
                    className={cn(
                      "px-2 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer",
                      reportTimeframeType === 'week'
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setReportTimeframeType('month')}
                    className={cn(
                      "px-2 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer",
                      reportTimeframeType === 'month'
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setReportTimeframeType('quarter')}
                    className={cn(
                      "px-2 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer",
                      reportTimeframeType === 'quarter'
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    Quarter
                  </button>
                  <button
                    onClick={() => setReportTimeframeType('year')}
                    className={cn(
                      "px-2 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer",
                      reportTimeframeType === 'year'
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    Year
                  </button>
                </div>

                {/* Timeframe Inputs */}
                {reportTimeframeType === 'week' && (
                  <Input
                    type="week"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="h-8 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[140px]"
                  />
                )}

                {reportTimeframeType === 'month' && (
                  <Input
                    type="month"
                    value={leadReportSelectedMonth}
                    onChange={(e) => setLeadReportSelectedMonth(e.target.value)}
                    className="h-8 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[125px]"
                  />
                )}

                {reportTimeframeType === 'quarter' && (
                  <div className="flex items-center gap-1">
                    <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                      <SelectTrigger className="h-8 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[85px]">
                        <SelectValue placeholder="Quarter" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Q1" className="text-xs">Q1</SelectItem>
                        <SelectItem value="Q2" className="text-xs">Q2</SelectItem>
                        <SelectItem value="Q3" className="text-xs">Q3</SelectItem>
                        <SelectItem value="Q4" className="text-xs">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedQuarterYear} onValueChange={setSelectedQuarterYear}>
                      <SelectTrigger className="h-8 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[80px]">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="2024" className="text-xs">2024</SelectItem>
                        <SelectItem value="2025" className="text-xs">2025</SelectItem>
                        <SelectItem value="2026" className="text-xs">2026</SelectItem>
                        <SelectItem value="2027" className="text-xs">2027</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {reportTimeframeType === 'year' && (
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="h-8 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[95px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="2024" className="text-xs">2024</SelectItem>
                      <SelectItem value="2025" className="text-xs">2025</SelectItem>
                      <SelectItem value="2026" className="text-xs">2026</SelectItem>
                      <SelectItem value="2027" className="text-xs">2027</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Employee Select */}
                <Select 
                  value={reportSelectedEmployeeId} 
                  onValueChange={setReportSelectedEmployeeId}
                  disabled={isEmployeeUser}
                >
                  <SelectTrigger className="h-8 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[160px]">
                    <SelectValue placeholder="Employee" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-60">
                    {isEmployeeUser ? (
                      <SelectItem value={user?.id || 'me'} className="text-xs font-bold">
                        {user?.name || 'My Own Report'}
                      </SelectItem>
                    ) : (
                      <>
                        <SelectItem value="all" className="text-xs font-bold">
                          {isManagerUser ? "👥 All Team Members" : "🌐 All Employees"}
                        </SelectItem>
                        {availableEmployeesForReport.map(u => (
                          <SelectItem key={u.id} value={u.id} className="text-xs">
                            {u.name} ({u.designation || u.department})
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>

                {/* Department Select */}
                <Select value={leadReportSelectedDepartment} onValueChange={setLeadReportSelectedDepartment}>
                  <SelectTrigger className="h-8 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[150px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all" className="text-xs font-bold">All Departments</SelectItem>
                    <SelectItem value={Department.DESIGN} className="text-xs font-medium">Design</SelectItem>
                    <SelectItem value={Department.CONTENT} className="text-xs font-medium">Content</SelectItem>
                    <SelectItem value={Department.WEB_DEVELOPMENT} className="text-xs font-medium">Web Development</SelectItem>
                    <SelectItem value={Department.DIGITAL_MARKETING} className="text-xs font-medium">Digital Marketing</SelectItem>
                    <SelectItem value={Department.CLIENT_SERVICING} className="text-xs font-medium">Client Servicing</SelectItem>
                  </SelectContent>
                </Select>

                {/* Project Select */}
                <Select value={leadReportSelectedProjectId} onValueChange={setLeadReportSelectedProjectId}>
                  <SelectTrigger className="h-8 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[160px]">
                    <SelectValue placeholder="Select Client/Project" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all" className="text-xs font-bold">All Clients & Projects</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              {isEmployeeUser
                ? "Employee View: Showing your personal hours, deliverables, and revision cycles."
                : isManagerUser
                ? `Manager View: Showing team performance for ${user?.department || 'Department'}.`
                : "Executive View: Company-wide deliverable volume, hours logged, revision cycles, and deadline shift statistics."}
            </p>
          </DialogHeader>

          {(() => {
            const activeProject = projects.find(p => p.id === leadReportSelectedProjectId);
            
            const isUserAssignedSubtask = (st: any, targetUserId: string, parentTask: any) => {
              if (st.assigneeId === targetUserId) return true;
              if (st.assigneeIds?.includes(targetUserId)) return true;
              if (st.timeEntries?.some((e: any) => e.userId === targetUserId)) return true;
              if (!st.assigneeId && (!st.assigneeIds || st.assigneeIds.length === 0) && parentTask.assigneeId === targetUserId) return true;
              return false;
            };

            // Gather all tasks belonging to filtered projects & department
            const filteredTasks = tasks.filter(t => {
              const matchesProject = leadReportSelectedProjectId === 'all' || t.projectId === leadReportSelectedProjectId;
              const matchesDept = leadReportSelectedDepartment === 'all' || t.department === leadReportSelectedDepartment;
              if (!matchesProject || !matchesDept) return false;

              if (isEmployeeUser && user) {
                const isAssigned = t.assigneeId === user.id ||
                  t.createdById === user.id ||
                  (t.subTasks || []).some(st => isUserAssignedSubtask(st, user.id, t));
                if (!isAssigned) return false;
              } else if (isManagerUser && user) {
                const isDept = t.department === user.department;
                const isTeam = (t.subTasks || []).some(st => {
                  const assignees = st.assigneeIds || (st.assigneeId ? [st.assigneeId] : []);
                  return assignees.some(aId => availableEmployeesForReport.some(e => e.id === aId));
                }) || t.assigneeId === user.id;
                if (!isDept && !isTeam) return false;
              }

              return true;
            });

            // Gather all subtasks with timeframe & employee filtering
            const allSubtasks = filteredTasks.flatMap(t => 
              (t.subTasks || [])
                .filter(st => {
                  const stDate = st.createdAt || st.dueDate || t.updatedAt || t.createdAt;
                  if (!checkDateInTimeframeDialog(stDate)) return false;

                  if (reportSelectedEmployeeId !== 'all') {
                    return isUserAssignedSubtask(st, reportSelectedEmployeeId, t);
                  } else if (isEmployeeUser && user) {
                    return isUserAssignedSubtask(st, user.id, t);
                  }

                  return true;
                })
                .map(st => ({ ...st, parentTask: t }))
            );

            // Total Logged Hours across filtered subtasks
            const totalLoggedHours = allSubtasks.reduce((sum, st) => sum + (st.timeLogged || 0), 0);
            
            // Budget Hours for client
            const monthlyBudget = activeProject?.monthlyBudgetHours || activeProject?.timingHours || 40;
            const isOverBudget = totalLoggedHours > monthlyBudget;
            const excessHours = Math.max(0, totalLoggedHours - monthlyBudget);

            // 1. Time Logged Split by Asset/Work Category (BAU / Adhoc / UI)
            const timeByWorkCategory: Record<string, number> = { BAU: 0, Adhoc: 0, UI: 0, Other: 0 };
            allSubtasks.forEach(st => {
              const cat = (st.workCategory || 'BAU');
              if (timeByWorkCategory[cat] !== undefined) {
                timeByWorkCategory[cat] += (st.timeLogged || 0);
              } else {
                timeByWorkCategory.Other = (timeByWorkCategory.Other || 0) + (st.timeLogged || 0);
              }
            });

            // 2. Revision Cycles — AM vs Client counted SEPARATELY
            let amRevisionsCount = 0;
            let clientRevisionsCount = 0;

            filteredTasks.forEach(t => {
              if (t.status === TaskStatus.CHANGES_REQUESTED_AM || t.status === TaskStatus.IN_REVIEW_AM) {
                amRevisionsCount += 1;
              } else if (t.status === TaskStatus.CHANGES_REQUESTED_CLIENT || t.status === TaskStatus.UNDER_CLIENT_REVIEW) {
                clientRevisionsCount += 1;
              }

              // Also check subtasks for revision statuses
              (t.subTasks || []).forEach(st => {
                if (st.status === TaskStatus.CHANGES_REQUESTED_AM || st.status === TaskStatus.IN_REVIEW_AM) {
                  amRevisionsCount += 1;
                } else if (st.status === TaskStatus.CHANGES_REQUESTED_CLIENT || st.status === TaskStatus.UNDER_CLIENT_REVIEW) {
                  clientRevisionsCount += 1;
                }
              });
            });

            // 3. Time Each Team Member Spent on the Client
            const timePerMember: Record<string, { userName: string; hours: number }> = {};
            users.forEach(u => {
              timePerMember[u.id] = { userName: u.name, hours: 0 };
            });

            allSubtasks.forEach(st => {
              if (st.timeEntries && st.timeEntries.length > 0) {
                st.timeEntries.forEach(te => {
                  if (timePerMember[te.userId]) {
                    timePerMember[te.userId].hours += (te.timeLoggedSeconds / 3600);
                  } else {
                    timePerMember[te.userId] = { userName: te.userName || 'Team Member', hours: te.timeLoggedSeconds / 3600 };
                  }
                });
              } else if (st.assigneeIds && st.assigneeIds.length > 0) {
                const share = (st.timeLogged || 0) / st.assigneeIds.length;
                st.assigneeIds.forEach(aId => {
                  if (timePerMember[aId]) {
                    timePerMember[aId].hours += share;
                  }
                });
              }
            });

            const memberList = Object.values(timePerMember).filter(d => d.hours > 0).sort((a, b) => b.hours - a.hours);

            // 4. Total Deadline Shift Count
            const totalDeadlineShifts = allSubtasks.reduce((sum, st) => sum + (st.deadlineChangeCount || 0), 0);

            return (
              <div className="space-y-6 pt-2">
                {/* Billing & Budget Alert Header */}
                <div className={cn(
                  "p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all",
                  isOverBudget 
                    ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200" 
                    : "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200"
                )}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>Budgeted Hours & Billing ({activeProject ? activeProject.name : 'All Clients'})</span>
                      {isOverBudget && (
                        <Badge variant="destructive" className="text-[10px] font-black px-2 py-0.5 uppercase tracking-wider">
                          Over Budget Warning
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs opacity-90">
                      {isOverBudget 
                        ? `Logged ${totalLoggedHours.toFixed(1)} hrs against ${monthlyBudget} hrs budget. Flagged to bill client separately for extra ${excessHours.toFixed(1)} hours.`
                        : `Logged ${totalLoggedHours.toFixed(1)} hrs of ${monthlyBudget} hrs budgeted. Within healthy billing margin.`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black font-mono tracking-tight">
                      {totalLoggedHours.toFixed(1)} <span className="text-xs font-normal opacity-75">/ {monthlyBudget} hrs</span>
                    </p>
                    <div className="w-36 h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-1">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-300", isOverBudget ? "bg-rose-600" : "bg-emerald-600")}
                        style={{ width: `${Math.min(100, (totalLoggedHours / monthlyBudget) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Deliverables</span>
                    <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">{allSubtasks.length} <span className="text-xs font-medium text-zinc-500">items</span></p>
                  </div>

                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">AM Revisions</span>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{amRevisionsCount} <span className="text-xs font-medium text-zinc-500">cycles</span></p>
                  </div>

                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Client Revisions</span>
                    <p className="text-xl font-black text-rose-600 dark:text-rose-400">{clientRevisionsCount} <span className="text-xs font-medium text-zinc-500">cycles</span></p>
                  </div>

                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Deadline Shifts</span>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400">{totalDeadlineShifts} <span className="text-xs font-medium text-zinc-500">shifts</span></p>
                  </div>
                </div>

                {/* Visual Charts & Breakdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Time Logged by Work Type (BAU / Adhoc / UI) */}
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center justify-between">
                      <span>Time by Asset Type</span>
                      <span className="text-[10px] text-zinc-400 font-normal">BAU vs Adhoc vs UI</span>
                    </h4>
                    <div className="space-y-2 text-xs">
                      {[
                        { label: 'BAU (Business as Usual)', hrs: timeByWorkCategory.BAU || 0, color: 'bg-indigo-600', text: 'text-indigo-600' },
                        { label: 'Adhoc Requests', hrs: timeByWorkCategory.Adhoc || 0, color: 'bg-amber-500', text: 'text-amber-600' },
                        { label: 'UI / Digital Assets', hrs: timeByWorkCategory.UI || 0, color: 'bg-sky-500', text: 'text-sky-600' },
                      ].map(item => {
                        const pct = totalLoggedHours > 0 ? ((item.hrs / totalLoggedHours) * 100).toFixed(0) : 0;
                        return (
                          <div key={item.label} className="space-y-1">
                            <div className="flex justify-between font-bold text-[11px]">
                              <span className="text-zinc-700 dark:text-zinc-300">{item.label}</span>
                              <span className={item.text}>{item.hrs.toFixed(1)} hrs ({pct}%)</span>
                            </div>
                            <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-300", item.color)} style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Spent per Team Member on Client */}
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center justify-between">
                      <span>Time per {isDeveloper ? 'Developer' : isDesigner ? 'Designer' : 'Member'} on Client</span>
                      <span className="text-[10px] text-zinc-400 font-normal">{memberList.length} active members</span>
                    </h4>
                    {memberList.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic py-4 text-center">No member hours logged for this client yet.</p>
                    ) : (
                      <div className="space-y-2 text-xs max-h-[160px] overflow-y-auto pr-1">
                        {memberList.map(d => {
                          const maxMemberHours = memberList[0]?.hours || 1;
                          const pct = Math.min(100, (d.hours / maxMemberHours) * 100);
                          return (
                            <div key={d.userName} className="space-y-1">
                              <div className="flex justify-between font-bold text-[11px]">
                                <span className="text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-indigo-500" />
                                  {d.userName}
                                </span>
                                <span className="font-mono text-indigo-600 dark:text-indigo-400">{d.hours.toFixed(1)} hrs</span>
                              </div>
                              <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Deliverables Output & Deadline Shift Audit Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center justify-between">
                    <span>Deliverables & Deadline Shift Audit</span>
                    <Badge variant="outline" className="text-[10px] font-semibold">{allSubtasks.length} subtasks tracked</Badge>
                  </h4>

                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden text-xs bg-white dark:bg-zinc-950">
                    <div className="grid grid-cols-12 bg-zinc-50 dark:bg-zinc-900 p-2.5 font-bold text-[11px] text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                      <div className="col-span-4">Deliverable / Asset</div>
                      <div className="col-span-2">Work Category</div>
                      <div className="col-span-2">Asset Type</div>
                      <div className="col-span-2">Time Logged</div>
                      <div className="col-span-2 text-right">Deadline Shifts</div>
                    </div>

                    <div className="max-h-[220px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-900">
                      {allSubtasks.length === 0 ? (
                        <div className="p-6 text-center text-zinc-400 italic text-xs">No deliverable subtasks found for the selected client and month.</div>
                      ) : (
                        allSubtasks.map(st => (
                          <div key={st.id} className="grid grid-cols-12 p-2.5 items-center hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                            <div className="col-span-4 font-bold text-zinc-800 dark:text-zinc-200 truncate pr-2">
                              {st.name}
                            </div>
                            <div className="col-span-2">
                              <Badge variant="outline" className="text-[9px] font-black bg-indigo-50 text-indigo-700 border-indigo-200 py-0">
                                {st.workCategory || 'BAU'}
                              </Badge>
                            </div>
                            <div className="col-span-2 text-zinc-500 font-medium truncate">
                              {st.assetType || 'Static Post'}
                            </div>
                            <div className="col-span-2 font-mono font-bold text-indigo-600">
                              {(st.timeLogged || 0).toFixed(1)} hrs
                            </div>
                            <div className="col-span-2 text-right font-mono font-bold">
                              {st.deadlineChangeCount && st.deadlineChangeCount > 0 ? (
                                <span className="text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60">
                                  📅 {st.deadlineChangeCount} shift{st.deadlineChangeCount > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="text-zinc-400 font-normal">On track</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Weekly Per-Designer Workload View & Revision-Time vs Draft-Time Split (Slide 1 N Feature) */}
                <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Weekly Workload & Revision-Time vs Draft-Time Split</span>
                    </h4>
                    <Badge variant="outline" className="text-[9px] font-black bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200">
                      Nice-to-have (N) Analytics
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {users.slice(0, 4).map(u => {
                      // Estimate draft vs revision time split
                      const userSubtasks = allSubtasks.filter(st => (st.assigneeIds || []).includes(u.id));
                      const totalUserHours = userSubtasks.reduce((sum, st) => sum + (st.timeLogged || 0), 0);
                      const revisionTasks = userSubtasks.filter(st => 
                        st.status === TaskStatus.CHANGES_REQUESTED_AM || 
                        st.status === TaskStatus.IN_REVIEW_AM || 
                        st.status === TaskStatus.CHANGES_REQUESTED_CLIENT || 
                        st.status === TaskStatus.UNDER_CLIENT_REVIEW
                      );
                      const revisionHours = revisionTasks.reduce((sum, st) => sum + (st.timeLogged || 0), 0) + (totalUserHours * 0.25);
                      const draftHours = Math.max(0, totalUserHours - revisionHours);
                      const draftPct = totalUserHours > 0 ? ((draftHours / totalUserHours) * 100).toFixed(0) : 70;
                      const revPct = totalUserHours > 0 ? (100 - Number(draftPct)) : 30;

                      return (
                        <div key={u.id} className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-indigo-500" />
                              {u.name}
                            </span>
                            <span className="font-mono text-indigo-600 dark:text-indigo-400">{totalUserHours.toFixed(1)} hrs total</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-medium text-zinc-500">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Draft: {draftHours.toFixed(1)}h ({draftPct}%)</span>
                              <span className="text-amber-600 dark:text-amber-400 font-bold">Revision: {revisionHours.toFixed(1)}h ({revPct}%)</span>
                            </div>
                            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                              <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${draftPct}%` }}></div>
                              <div className="h-full bg-amber-500 rounded-r-full transition-all" style={{ width: `${revPct}%` }}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* For the IT / Cross-Team Decision Dialog (Slide 2) */}
      <Dialog open={showITDecisionMatrix} onOpenChange={setShowITDecisionMatrix}>
        <DialogContent className="max-w-3xl rounded-3xl p-6 bg-slate-900 text-white border-slate-800">
          <DialogHeader className="space-y-1 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
              <DialogTitle className="text-xl font-black tracking-tight text-white">For the IT / Cross-Team Decision</DialogTitle>
            </div>
            <p className="text-xs text-slate-400">
              These aren't one department's call — they affect every team on the platform.
            </p>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3">
            {/* 1. Data Migration */}
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
              <h4 className="font-bold text-indigo-300 text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <span>Data Migration</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Carry over existing project history, or start clean?
              </p>
              <div className="pt-2 flex items-center gap-2 text-[11px]">
                <Badge className="bg-indigo-600/30 text-indigo-200 border-indigo-500/40">Legacy Data Import Supported</Badge>
                <Badge className="bg-emerald-600/30 text-emerald-200 border-emerald-500/40">Clean Slate Ready</Badge>
              </div>
            </div>

            {/* 2. Reporting Shape */}
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
              <h4 className="font-bold text-indigo-300 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Reporting Shape</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Per-client reports vs one master view with filters — and export to Excel/PDF vs in-tool dashboard.
              </p>
              <div className="pt-2 flex items-center gap-2 text-[11px]">
                <Badge className="bg-indigo-600/30 text-indigo-200 border-indigo-500/40">CSV Export Built</Badge>
                <Badge className="bg-emerald-600/30 text-emerald-200 border-emerald-500/40">Master & Per-Client Views</Badge>
              </div>
            </div>

            {/* 3. Notifications */}
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
              <h4 className="font-bold text-indigo-300 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Notifications</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Design needs assignment alerts; scope of status / deadline / overdue alerts and channel (in-app / email / Slack) is a wider call.
              </p>
              <div className="pt-2 flex items-center gap-2 text-[11px]">
                <Badge className="bg-indigo-600/30 text-indigo-200 border-indigo-500/40">In-App Assignment Alerts</Badge>
                <Badge className="bg-amber-600/30 text-amber-200 border-amber-500/40">Slack / Email Ready</Badge>
              </div>
            </div>

            {/* 4. Permissions Model */}
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
              <h4 className="font-bold text-indigo-300 text-sm flex items-center gap-2">
                <Check className="w-4 h-4 text-indigo-400" />
                <span>Permissions Model</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                We're fine with open status-setting and AMs seeing all clients; confirm this fits other teams.
              </p>
              <div className="pt-2 flex items-center gap-2 text-[11px]">
                <Badge className="bg-indigo-600/30 text-indigo-200 border-indigo-500/40">Open Status-Setting</Badge>
                <Badge className="bg-emerald-600/30 text-emerald-200 border-emerald-500/40">AM Global Visibility</Badge>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <Button 
              onClick={() => setShowITDecisionMatrix(false)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl h-9 px-5 text-xs cursor-pointer"
            >
              Close Decision Matrix
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

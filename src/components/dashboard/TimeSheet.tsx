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
import { Clock, Calendar, ArrowUpRight, BarChart3, MoreHorizontal, Play, Pause, Square, FileSpreadsheet, Trash2, Edit, Plus, ChevronLeft, ChevronRight, Search, Filter, RotateCcw, X } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Task, Project, UserRole, UserProfile, TaskStatus, Priority } from '@/src/types';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface TimeSheetProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  projects: Project[];
  activeTimerTaskId: string | null;
  elapsedTimes: Record<string, number>;
  setElapsedTimes?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  toggleTimer: (taskId: string, e?: React.MouseEvent) => void;
  formatTime: (seconds: number) => string;
  users: UserProfile[];
}

export function TimeSheet({
  tasks,
  setTasks,
  projects,
  activeTimerTaskId,
  elapsedTimes,
  setElapsedTimes,
  toggleTimer,
  formatTime,
  users,
}: TimeSheetProps) {
  const { user: currentUser } = useAuth();

  const formatLogTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} mins`;
  };

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

  // Find current running task
  const activeTask = tasks.find(t => t.id === activeTimerTaskId);
  const activeProject = activeTask ? projects.find(p => p.id === activeTask.projectId) : null;

  // Track deleted log IDs (e.g., both static and real logs)
  const [deletedLogIds, setDeletedLogIds] = React.useState<string[]>([]);
  // Track project selection for analysis
  const [selectedAnalyzeProjectId, setSelectedAnalyzeProjectId] = React.useState<string>('all');

  // Timeframe View Filter State (Day, Week, Month, All)
  type TimeframeMode = 'day' | 'week' | 'month' | 'all';
  const [timeframeMode, setTimeframeMode] = React.useState<TimeframeMode>('week');
  const [selectedAnchorDate, setSelectedAnchorDate] = React.useState<Date>(new Date());

  // View Tab selector: 'odoo_matrix' | 'activity_log' | 'project_analyzer'
  const [activeViewTab, setActiveViewTab] = React.useState<'odoo_matrix' | 'activity_log' | 'project_analyzer'>('odoo_matrix');

  // Odoo Matrix search query
  const [odooSearchQuery, setOdooSearchQuery] = React.useState<string>('');

  // Helper: Format seconds to Odoo H:MM format (e.g. 2:25, 0:30, 40:35)
  const formatMatrixTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  // Helper: Parse user duration string (e.g. 2:25, 2.5, 30m, 120) to seconds
  const parseMatrixInputToSeconds = (input: string): number => {
    if (!input) return 0;
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || trimmed === '0' || trimmed === '0:00') return 0;

    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      return (h * 3600) + (m * 60);
    }

    const num = parseFloat(trimmed);
    if (isNaN(num)) return 0;
    if (trimmed.includes('.')) {
      return Math.round(num * 3600);
    }
    if (num <= 24) {
      return Math.round(num * 3600);
    } else {
      return Math.round(num * 60);
    }
  };

  // Helper: Get 7 days of the Sunday-to-Saturday week for Odoo matrix
  const getOdooWeekDays = (anchorDate: Date) => {
    const current = new Date(anchorDate);
    const day = current.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
    const diffToSun = current.getDate() - day;
    const sunday = new Date(current.setDate(diffToSun));
    sunday.setHours(0, 0, 0, 0);

    const days = [];
    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      days.push({
        dateObj: d,
        dateKey,
        dayName,
        dateStr,
        isToday: dateKey === todayStr,
        dayIndex: i
      });
    }
    return days;
  };

  // Odoo Matrix Row interface
  interface OdooMatrixRow {
    id: string;
    projectId: string;
    projectName: string;
    taskName: string;
    shortcutKey: string;
    variance?: string;
    dailySeconds: Record<string, number>; // dateKey -> seconds
    taskId: string;
  }

  // Filter mode for Matrix: 'my_tasks' (default) vs 'all_tasks'
  const [matrixUserFilter, setMatrixUserFilter] = React.useState<'my_tasks' | 'all_tasks'>('my_tasks');

  // Custom manual daily cell overrides: taskId -> dateKey -> seconds
  const [customDailySeconds, setCustomDailySeconds] = React.useState<Record<string, Record<string, number>>>({});

  // Manually added task IDs for current session via "+ Add a line"
  const [manuallyAddedTaskIds, setManuallyAddedTaskIds] = React.useState<string[]>([]);

  // Calculate active matrix days for selected timeframe mode (day / week / month / all)
  const getOdooMatrixDays = (anchorDate: Date, mode: TimeframeMode) => {
    if (mode === 'day') {
      const d = new Date(anchorDate);
      const dateKey = formatDateKey(d);
      const todayStr = formatDateKey(new Date());
      return [{
        dateObj: d,
        dateKey,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateStr: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        isToday: dateKey === todayStr,
        dayIndex: 0
      }];
    }

    if (mode === 'month') {
      const year = anchorDate.getFullYear();
      const month = anchorDate.getMonth();
      const numDays = new Date(year, month + 1, 0).getDate();
      const todayStr = formatDateKey(new Date());
      const days = [];
      for (let i = 1; i <= numDays; i++) {
        const d = new Date(year, month, i);
        const dateKey = formatDateKey(d);
        days.push({
          dateObj: d,
          dateKey,
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
          dateStr: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          isToday: dateKey === todayStr,
          dayIndex: i - 1
        });
      }
      return days;
    }

    // Default 'week' mode (Sunday to Saturday)
    return getOdooWeekDays(anchorDate);
  };

  const matrixDays = React.useMemo(() => {
    return getOdooMatrixDays(selectedAnchorDate, timeframeMode);
  }, [selectedAnchorDate, timeframeMode]);

  // Dynamically compute Odoo Matrix Rows from actual tasks worked on / tracked in the selected timeframe
  const odooRows: OdooMatrixRow[] = React.useMemo(() => {
    // 1. Filter tasks according to user scope
    const filteredTasks = tasks.filter(t => {
      if (matrixUserFilter === 'all_tasks') return true;
      if (!currentUser) return true;

      // Check direct assignment or creation
      if (t.assigneeId === currentUser.id || t.createdById === currentUser.id) return true;
      if (t.assigneeIds && t.assigneeIds.includes(currentUser.id)) return true;

      // Check name / email matching if ID differs
      if (currentUser.name && (t.assigneeId === currentUser.name || t.createdById === currentUser.name)) return true;
      if (currentUser.email && t.assigneeId === currentUser.email) return true;

      // Check subtasks assigned to current user
      if (t.subTasks && t.subTasks.some(st => st.assigneeId === currentUser.id || st.assigneeIds?.includes(currentUser.id))) return true;

      return false;
    });

    const displayTasks = filteredTasks.length > 0 ? filteredTasks : tasks;
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const todayKey = formatDateKey(new Date());
    const matrixDateKeys = new Set(matrixDays.map(d => d.dateKey));

    const rows: OdooMatrixRow[] = [];

    displayTasks.forEach((task, idx) => {
      const proj = projects.find(p => p.id === task.projectId);
      const shortcutKey = alphabet[idx % alphabet.length] || `r${idx + 1}`;

      const dailySeconds: Record<string, number> = {};

      // A. Incorporate time logged from subtasks & subTask timeEntries
      if (task.subTasks) {
        task.subTasks.forEach(st => {
          if (st.timeEntries) {
            st.timeEntries.forEach(te => {
              if (te.date && te.timeLoggedSeconds > 0) {
                dailySeconds[te.date] = (dailySeconds[te.date] || 0) + te.timeLoggedSeconds;
              }
            });
          }
        });
      }

      // B. Incorporate active timer / elapsedTimes for live tracking
      const liveSeconds = (elapsedTimes && elapsedTimes[task.id]) || 0;
      if (liveSeconds > 0) {
        dailySeconds[todayKey] = (dailySeconds[todayKey] || 0) + liveSeconds;
      }

      // C. Incorporate task.timeLoggedSeconds if not already placed via subtask timeEntries
      if (task.timeLoggedSeconds && task.timeLoggedSeconds > 0 && Object.keys(dailySeconds).length === 0) {
        const taskDateKey = task.updatedAt ? task.updatedAt.split('T')[0] : (task.dueDate || todayKey);
        dailySeconds[taskDateKey] = task.timeLoggedSeconds;
      }

      // D. Merge manual cell edit overrides
      if (customDailySeconds[task.id]) {
        Object.entries(customDailySeconds[task.id]).forEach(([dKey, secs]) => {
          const s = Number(secs);
          if (s > 0) {
            dailySeconds[dKey] = s;
          } else {
            delete dailySeconds[dKey];
          }
        });
      }

      // Compute total seconds recorded in the currently visible timeframe (matrixDays)
      let timeframeTotalSecs = 0;
      matrixDays.forEach(day => {
        if (dailySeconds[day.dateKey]) {
          timeframeTotalSecs += dailySeconds[day.dateKey];
        }
      });

      const hasActiveTimer = activeTimerTaskId === task.id;
      const isManuallyAdded = manuallyAddedTaskIds.includes(task.id);
      const hasCustomEditInTimeframe = customDailySeconds[task.id] && Object.keys(customDailySeconds[task.id]).some(k => matrixDateKeys.has(k));

      // Show row ONLY if time is tracked in this timeframe OR active timer OR newly added line
      if (timeframeTotalSecs > 0 || hasActiveTimer || isManuallyAdded || hasCustomEditInTimeframe) {
        rows.push({
          id: `odoo_row_${task.id}`,
          taskId: task.id,
          projectId: task.projectId,
          projectName: proj?.name || 'General Project',
          taskName: task.name,
          shortcutKey,
          dailySeconds
        });
      }
    });

    return rows;
  }, [tasks, projects, currentUser, matrixUserFilter, elapsedTimes, customDailySeconds, matrixDays, activeTimerTaskId, manuallyAddedTaskIds]);

  // Inline "Add a line" state
  const [isAddingLine, setIsAddingLine] = React.useState(false);
  const [newLineProjectId, setNewLineProjectId] = React.useState('');
  const [newLineTaskName, setNewLineTaskName] = React.useState('');

  // Active cell editing state: { rowId, dateKey, value }
  const [editingCell, setEditingCell] = React.useState<{ rowId: string; dateKey: string; value: string } | null>(null);

  // Handle cell edit save
  const handleSaveCellEdit = (rowId: string, dateKey: string, inputVal: string) => {
    const newSecs = parseMatrixInputToSeconds(inputVal);
    const targetRow = odooRows.find(r => r.id === rowId);
    const targetTaskId = targetRow?.taskId || rowId.replace('odoo_row_', '');

    if (targetTaskId) {
      setCustomDailySeconds(prev => ({
        ...prev,
        [targetTaskId]: {
          ...(prev[targetTaskId] || {}),
          [dateKey]: newSecs
        }
      }));

      // Update tasks state and elapsedTimes
      setTasks(prev => prev.map(t => {
        if (t.id === targetTaskId) {
          const updatedSecs = Math.max(0, newSecs);
          return {
            ...t,
            timeLoggedSeconds: updatedSecs,
            timeLogged: parseFloat((updatedSecs / 3600).toFixed(2)),
            updatedAt: `${dateKey}T12:00:00.000Z`
          };
        }
        return t;
      }));

      if (setElapsedTimes) {
        setElapsedTimes(prev => ({ ...prev, [targetTaskId]: newSecs }));
      }
    }

    setEditingCell(null);
  };

  // Handle Add a line confirm - creates a real task for the current user
  const handleConfirmAddLine = () => {
    if (!newLineTaskName.trim()) {
      toast.error("Please enter a task name for the new line.");
      return;
    }
    const proj = projects.find(p => p.id === newLineProjectId) || projects[0];
    const todayStr = getTodayDate();

    const newTask: Task = {
      id: 'task_' + Date.now(),
      projectId: proj ? proj.id : (projects[0]?.id || 'proj_1'),
      deliverableId: '',
      name: newLineTaskName.trim(),
      type: 'Production',
      assigneeId: currentUser?.id || '001',
      assigneeIds: [currentUser?.id || '001'],
      createdById: currentUser?.id || '001',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.NORMAL,
      dueDate: todayStr,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: 'Added via Timesheet Matrix',
      timeEstimate: 4,
      timeLogged: 0,
      timeLoggedSeconds: 0,
      isBillable: true
    };

    setManuallyAddedTaskIds(prev => [...prev, newTask.id]);
    setTasks(prev => [...prev, newTask]);
    toast.success(`Task created: ${proj?.name || 'General'} | ${newLineTaskName.trim()}`);
    setNewLineTaskName('');
    setIsAddingLine(false);
  };

  const formatDateKey = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getWeekRange = (d: Date) => {
    const current = new Date(d);
    const day = current.getDay();
    const diffToMonday = current.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(current.setDate(diffToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      monday,
      sunday,
      mondayStr: formatDateKey(monday),
      sundayStr: formatDateKey(sunday)
    };
  };

  const getMonthKey = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const getTimeframeLabel = (mode: TimeframeMode, anchorDate: Date) => {
    if (mode === 'day') {
      const todayStr = formatDateKey(new Date());
      const anchorStr = formatDateKey(anchorDate);
      if (todayStr === anchorStr) return `Today (${anchorDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
      return anchorDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (mode === 'week') {
      const { monday, sunday } = getWeekRange(anchorDate);
      const monLabel = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const sunLabel = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${monLabel} – ${sunLabel}`;
    }
    if (mode === 'month') {
      return anchorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return 'All Time History';
  };

  const handlePrevTimeframe = () => {
    const next = new Date(selectedAnchorDate);
    if (timeframeMode === 'day') next.setDate(next.getDate() - 1);
    else if (timeframeMode === 'week') next.setDate(next.getDate() - 7);
    else if (timeframeMode === 'month') next.setMonth(next.getMonth() - 1);
    setSelectedAnchorDate(next);
  };

  const handleNextTimeframe = () => {
    const next = new Date(selectedAnchorDate);
    if (timeframeMode === 'day') next.setDate(next.getDate() + 1);
    else if (timeframeMode === 'week') next.setDate(next.getDate() + 7);
    else if (timeframeMode === 'month') next.setMonth(next.getMonth() + 1);
    setSelectedAnchorDate(next);
  };

  const handleResetToCurrent = () => {
    setSelectedAnchorDate(new Date());
  };

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

  // Manual Entry Dialog State
  const [isManualEntryOpen, setIsManualEntryOpen] = React.useState(false);
  const [manualActivityName, setManualActivityName] = React.useState('');
  const [manualProjectId, setManualProjectId] = React.useState('');
  const [manualAssigneeId, setManualAssigneeId] = React.useState(currentUser?.id || '');
  const [manualDate, setManualDate] = React.useState(getTodayDate());
  const [manualDurationInput, setManualDurationInput] = React.useState('01:26 mins');
  const [manualBilling, setManualBilling] = React.useState<'Billable' | 'Non-Billable'>('Billable');
  const [manualCategory, setManualCategory] = React.useState('Production');
  const [manualDescription, setManualDescription] = React.useState('');

  // Auto-sync current user ID as assignee
  React.useEffect(() => {
    if (currentUser?.id) {
      setManualAssigneeId(currentUser.id);
    }
  }, [currentUser]);

  // Handle adding manual entry
  const handleAddManualEntry = () => {
    if (!manualActivityName.trim()) {
      toast.error('Please enter an activity name.');
      return;
    }
    if (!manualProjectId) {
      toast.error('Please select a project.');
      return;
    }

    const totalSeconds = parseManualDurationString(manualDurationInput);

    if (totalSeconds <= 0) {
      toast.error('Please enter a valid duration (e.g. 01:26 or 01:26 mins).');
      return;
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const hStr = hours.toString().padStart(2, '0');
    const mStr = minutes.toString().padStart(2, '0');

    const newTask: Task = {
      id: 'task_manual_' + Date.now(),
      projectId: manualProjectId,
      deliverableId: '',
      name: manualActivityName,
      type: manualCategory,
      assigneeId: manualAssigneeId,
      status: 'Done' as any,
      priority: 'Normal' as any,
      dueDate: manualDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: manualDescription,
      timeEstimate: parseFloat((totalSeconds / 3600).toFixed(2)),
      timeLogged: parseFloat((totalSeconds / 3600).toFixed(4)),
      timeLoggedSeconds: totalSeconds,
      isBillable: manualBilling === 'Billable'
    };

    setTasks(prev => [...prev, newTask]);
    toast.success(`Logged ${hStr}:${mStr} mins for "${manualActivityName}" successfully!`);

    // Reset Form State
    setManualActivityName('');
    setManualProjectId('');
    setManualDescription('');
    setManualDurationInput('01:26 mins');
    setManualBilling('Billable');
    setManualCategory('Production');
    setIsManualEntryOpen(false);
  };

  // Edit Log State
  const [editingLog, setEditingLog] = React.useState<any | null>(null);
  const [editTaskName, setEditTaskName] = React.useState<string>('');
  const [editProjectId, setEditProjectId] = React.useState<string>('');
  const [editAssigneeId, setEditAssigneeId] = React.useState<string>('');
  const [editCategory, setEditCategory] = React.useState<string>('Production');
  const [editDate, setEditDate] = React.useState<string>('');
  const [editDurationInput, setEditDurationInput] = React.useState<string>('01:26 mins');
  const [editBilling, setEditBilling] = React.useState<'Billable' | 'Non-Billable'>('Billable');
  const [staticDurationOverrides, setStaticDurationOverrides] = React.useState<Record<string, number>>({});

  // Activity Log Table Filters State
  const [logSearchQuery, setLogSearchQuery] = React.useState<string>('');
  const [logFilterProjectId, setLogFilterProjectId] = React.useState<string>('all');
  const [logFilterAssigneeId, setLogFilterAssigneeId] = React.useState<string>('all');
  const [logFilterBilling, setLogFilterBilling] = React.useState<string>('all');
  const [logFilterCategory, setLogFilterCategory] = React.useState<string>('all');

  const hasActiveLogFilters = logSearchQuery.trim() !== '' || logFilterProjectId !== 'all' || logFilterAssigneeId !== 'all' || logFilterBilling !== 'all' || logFilterCategory !== 'all';

  const handleResetLogFilters = () => {
    setLogSearchQuery('');
    setLogFilterProjectId('all');
    setLogFilterAssigneeId('all');
    setLogFilterBilling('all');
    setLogFilterCategory('all');
  };

  const handleStartEditLog = (log: any) => {
    setEditingLog(log);
    setEditTaskName(log.task || '');
    setEditProjectId(log.projectId || '');

    const matchingTask = tasks.find(t => t.id === log.id);
    const assigneeId = matchingTask?.assigneeId || (users && users.find(u => u.name === log.user)?.id) || '';
    setEditAssigneeId(assigneeId);
    setEditCategory(matchingTask?.type || 'Production');
    setEditDate(log.date || formatDateKey(new Date()));
    setEditBilling(log.billing || 'Billable');

    const totalSecs = log.durationSecs || 0;
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const hStr = h.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');
    setEditDurationInput(`${hStr}:${mStr} mins`);
  };

  const handleSaveEditLog = () => {
    if (!editingLog) return;
    const totalSecs = parseManualDurationString(editDurationInput);

    if (totalSecs < 0) {
      toast.error('Please enter a valid duration (e.g. 01:26 or 01:26 mins).');
      return;
    }

    if (editingLog.isReal) {
      setTasks(prev => prev.map(t => {
        if (t.id === editingLog.id) {
          return {
            ...t,
            name: editTaskName || t.name,
            projectId: editProjectId || t.projectId,
            assigneeId: editAssigneeId || t.assigneeId,
            type: editCategory || t.type,
            timeLoggedSeconds: totalSecs,
            timeLogged: parseFloat((totalSecs / 3600).toFixed(4)),
            dueDate: editDate || t.dueDate,
            updatedAt: editDate ? `${editDate}T12:00:00.000Z` : new Date().toISOString(),
            isBillable: editBilling === 'Billable'
          };
        }
        return t;
      }));

      if (setElapsedTimes) {
        setElapsedTimes(prev => ({
          ...prev,
          [editingLog.id]: totalSecs
        }));
      }
    } else {
      setStaticDurationOverrides(prev => ({ ...prev, [editingLog.id]: totalSecs }));
      setStaticBillingOverrides(prev => ({ ...prev, [editingLog.id]: editBilling }));
    }

    toast.success(`Updated time entry "${editTaskName || editingLog.task}" successfully!`);
    setEditingLog(null);
  };

  // Auth privilege check for deciding billing status (Super Admins, Account Managers, Account Directors)
  const canModifyBilling = currentUser && (
    currentUser.role === UserRole.AGENCY_ADMIN ||
    currentUser.role === UserRole.ACCOUNT_MANAGER ||
    currentUser.role === UserRole.ACCOUNT_DIRECTOR
  );

  const isAdmin = currentUser && (
    currentUser.role === UserRole.AGENCY_ADMIN ||
    currentUser.role === UserRole.ACCOUNT_MANAGER ||
    currentUser.role === UserRole.ACCOUNT_DIRECTOR
  );

  // Hierarchy permissions engine for Time Tracking view
  const { isFullAdmin, isReportingManager, isDepartmentLead, allowedUserIds, allowedUsers } = React.useMemo(() => {
    if (!currentUser) {
      return {
        isFullAdmin: false,
        isReportingManager: false,
        isDepartmentLead: false,
        allowedUserIds: new Set<string>(),
        allowedUsers: [] as UserProfile[]
      };
    }

    const fullAdminRoles: string[] = [
      UserRole.AGENCY_ADMIN,
      UserRole.ACCOUNT_DIRECTOR
    ];

    const isFullAdmin = fullAdminRoles.includes(currentUser.role) || currentUser.id === '001';

    if (isFullAdmin) {
      const allIds = new Set((users || []).map(u => u.id));
      allIds.add(currentUser.id);
      if (currentUser.email) allIds.add(currentUser.email);
      return {
        isFullAdmin: true,
        isReportingManager: true,
        isDepartmentLead: true,
        allowedUserIds: allIds,
        allowedUsers: users || []
      };
    }

    const allowedSet = new Set<string>();
    allowedSet.add(currentUser.id);
    if (currentUser.email) allowedSet.add(currentUser.email);
    if (currentUser.name) allowedSet.add(currentUser.name);

    // Recursive helper to add direct and indirect reportees
    const addReportees = (mgrId: string, mgrEmail?: string) => {
      (users || []).forEach(u => {
        if (u.reportsToId && (u.reportsToId === mgrId || u.reportsToId === mgrEmail)) {
          if (!allowedSet.has(u.id)) {
            allowedSet.add(u.id);
            if (u.email) allowedSet.add(u.email);
            if (u.name) allowedSet.add(u.name);
            addReportees(u.id, u.email);
          }
        }
      });
    };
    addReportees(currentUser.id, currentUser.email);

    // Department lead scope
    const isDeptLead = !!currentUser.isDepartmentLead;
    if (isDeptLead && currentUser.department) {
      (users || []).forEach(u => {
        if (u.department === currentUser.department) {
          allowedSet.add(u.id);
          if (u.email) allowedSet.add(u.email);
          if (u.name) allowedSet.add(u.name);
        }
      });
    }

    const hasReportees = (users || []).some(u =>
      u.reportsToId === currentUser.id ||
      (currentUser.email && u.reportsToId === currentUser.email)
    );
    const isReportingManager = hasReportees || isDeptLead || currentUser.role === UserRole.ACCOUNT_MANAGER;

    const filteredUsers = (users || []).filter(u =>
      allowedSet.has(u.id) || (u.email && allowedSet.has(u.email)) || allowedSet.has(u.name)
    );

    return {
      isFullAdmin: false,
      isReportingManager,
      isDepartmentLead: isDeptLead,
      allowedUserIds: allowedSet,
      allowedUsers: filteredUsers
    };
  }, [currentUser, users]);

  // Build current activity logs using real task logged values combined with historical logs
  const realLogs = tasks
    .filter(t => ((elapsedTimes && elapsedTimes[t.id]) || 0) > 0)
    .filter(t => {
      if (isFullAdmin) return true;
      if (t.assigneeId && allowedUserIds.has(t.assigneeId)) return true;

      const assignedUser = users ? users.find(u => u.id === t.assigneeId) : null;
      if (assignedUser && allowedUserIds.has(assignedUser.id)) return true;

      // If unassigned or belongs to current user
      if (!t.assigneeId || t.assigneeId === currentUser?.id) return true;

      return false;
    })
    .map(t => {
      const proj = projects.find(p => p.id === t.projectId);
      const isRunning = t.id === activeTimerTaskId;
      const isTaskBillable = t.isBillable !== undefined ? t.isBillable : (t.type === 'Strategy' || t.type === 'Production');
      return {
        id: t.id,
        task: t.name,
        project: proj?.name || 'Global Project',
        projectId: t.projectId,
        assigneeId: t.assigneeId,
        user: (users && users.find(u => u.id === t.assigneeId)?.name) || 'You',
        date: t.updatedAt ? t.updatedAt.split('T')[0] : '2026-06-16',
        durationSecs: (elapsedTimes && elapsedTimes[t.id]) || 0,
        billing: isTaskBillable ? 'Billable' : 'Non-Billable' as 'Billable' | 'Non-Billable',
        isRunning,
        isReal: true
      };
    });

  // Calculate dynamic metrics based on live updates, excluding deleted logs
  const totalRealSeconds = Object.entries(elapsedTimes || {})
    .filter(([id]) => !deletedLogIds.includes(id))
    .reduce((sum, [_, current]) => sum + current, 0);

  // No static fallback logs to ensure we only display actual live tracking data
  const staticLogs: any[] = [];

  // Combine and apply overrides
  const displayedLogs = [
    ...realLogs
  ].filter(log => !deletedLogIds.includes(log.id))
   .filter(log => {
      if (isFullAdmin) return true;
      if (log.assigneeId && allowedUserIds.has(log.assigneeId)) return true;

      const task = tasks.find(t => t.id === log.id);
      if (task && task.assigneeId && allowedUserIds.has(task.assigneeId)) return true;

      const matchingUser = users ? users.find(u => u.id === log.assigneeId || u.name === log.user || u.email === log.assigneeId) : null;
      if (matchingUser && allowedUserIds.has(matchingUser.id)) return true;

      if (!log.assigneeId || log.user === 'You' || log.user === currentUser?.name) return true;

      return false;
    })
   .map(log => {
    let updatedLog = { ...log };
    if (staticBillingOverrides[log.id]) {
      updatedLog.billing = staticBillingOverrides[log.id];
    }
    if (staticDurationOverrides[log.id] !== undefined) {
      updatedLog.durationSecs = staticDurationOverrides[log.id];
    }
    return updatedLog;
  });

  // Filter displayed logs by selected timeframe (Day / Week / Month / All)
  const timeframeFilteredLogs = React.useMemo(() => {
    return displayedLogs.filter(log => {
      if (!log.date) return true;
      if (timeframeMode === 'day') {
        return log.date === formatDateKey(selectedAnchorDate);
      }
      if (timeframeMode === 'week') {
        const { mondayStr, sundayStr } = getWeekRange(selectedAnchorDate);
        return log.date >= mondayStr && log.date <= sundayStr;
      }
      if (timeframeMode === 'month') {
        const monthPrefix = getMonthKey(selectedAnchorDate);
        return log.date.startsWith(monthPrefix);
      }
      return true; // 'all'
    });
  }, [displayedLogs, timeframeMode, selectedAnchorDate]);

  // Calculate dynamic stats on timeframe filtered logs
  const totalSecsForStats = timeframeFilteredLogs.reduce((sum, log) => sum + (log.durationSecs || 0), 0);
  const liveTotalHours = (totalSecsForStats / 3600).toFixed(1);
  const billableSecsForStats = timeframeFilteredLogs
    .filter(log => log.billing === 'Billable')
    .reduce((sum, log) => sum + (log.durationSecs || 0), 0);
  const liveBillableRatio = totalSecsForStats > 0 ? Math.round((billableSecsForStats / totalSecsForStats) * 100) : 0;

  const uniqueDates = Array.from(new Set(timeframeFilteredLogs.map(log => log.date))).filter(Boolean);
  const liveAvgDailyHours = uniqueDates.length > 0 ? ((totalSecsForStats / uniqueDates.length) / 3600).toFixed(1) : '0.0';

  const doneTasksCount = tasks.filter(t => t.status === 'Done').length;
  const liveProductivity = tasks.length > 0 ? Math.round((doneTasksCount / tasks.length) * 100) : 100;

  // Filter logs based on selected project for analysis
  const filteredLogs = selectedAnalyzeProjectId === 'all'
    ? timeframeFilteredLogs
    : timeframeFilteredLogs.filter(log => log.projectId === selectedAnalyzeProjectId);

  // Filter logs by timeframe AND activity log filters for the Recent Activity Log table
  const activityLogs = React.useMemo(() => {
    return timeframeFilteredLogs.filter(log => {
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        const matchTask = (log.task || '').toLowerCase().includes(q);
        const matchProject = (log.project || '').toLowerCase().includes(q);
        const matchUser = (log.user || '').toLowerCase().includes(q);
        if (!matchTask && !matchProject && !matchUser) return false;
      }
      if (logFilterProjectId !== 'all' && log.projectId !== logFilterProjectId) {
        return false;
      }
      if (logFilterAssigneeId !== 'all') {
        const task = tasks.find(t => t.id === log.id);
        if (task) {
          if (task.assigneeId !== logFilterAssigneeId) return false;
        } else {
          const userObj = users ? users.find(u => u.id === logFilterAssigneeId) : null;
          if (userObj && log.user !== userObj.name) return false;
        }
      }
      if (logFilterBilling !== 'all' && log.billing !== logFilterBilling) {
        return false;
      }
      if (logFilterCategory !== 'all') {
        const task = tasks.find(t => t.id === log.id);
        if (task && task.type !== logFilterCategory) return false;
      }
      return true;
    });
  }, [timeframeFilteredLogs, logSearchQuery, logFilterProjectId, logFilterAssigneeId, logFilterBilling, logFilterCategory, tasks, users]);

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

  // Handler to delete a log
  const handleDeleteLog = (logId: string, taskName: string) => {
    setDeletedLogIds(prev => [...prev, logId]);

    const realTaskExists = tasks.some(t => t.id === logId);
    if (realTaskExists) {
      setTasks(prev => prev.map(t => {
        if (t.id === logId) {
          return {
            ...t,
            timeLogged: 0,
            timeLoggedSeconds: 0,
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      }));

      if (setElapsedTimes) {
        setElapsedTimes(prev => {
          const updated = { ...prev };
          updated[logId] = 0;
          return updated;
        });
      }
    }

    toast.success(`Deleted time tracking log for "${taskName}" successfully!`);
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
      typeof log.durationSecs === 'number' ? formatLogTime(log.durationSecs) : log.durationSecs,
      log.durationSecs,
      log.billing
    ]);

    const totalDurationSecs = filteredLogs.reduce((sum, log) => sum + (typeof log.durationSecs === 'number' ? log.durationSecs : 0), 0);
    const totalRow = [
      '"Total Timing Summary (Filtered)"',
      '""',
      '""',
      '""',
      formatLogTime(totalDurationSecs),
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

  // Filter Odoo Matrix rows
  const filteredOdooRows = odooRows.filter(row => {
    if (!odooSearchQuery.trim()) return true;
    const q = odooSearchQuery.toLowerCase();
    return row.projectName.toLowerCase().includes(q) || row.taskName.toLowerCase().includes(q);
  });

  // Calculate Odoo row total across active matrix columns
  const getRowTotalSeconds = (row: OdooMatrixRow) => {
    return matrixDays.reduce((sum, day) => sum + (row.dailySeconds[day.dateKey] || 0), 0);
  };

  // Calculate Odoo day column total
  const getDayTotalSeconds = (dateKey: string) => {
    return filteredOdooRows.reduce((sum, row) => sum + (row.dailySeconds[dateKey] || 0), 0);
  };

  // Calculate Odoo grand total for current matrix view
  const odooGrandTotalSeconds = filteredOdooRows.reduce((sum, row) => sum + getRowTotalSeconds(row), 0);

  return (
    <div className="space-y-6">
      {/* Top View Mode Navigation Tabs: Odoo Weekly Matrix, Activity Log, Project Analyzer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-950 p-2.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-900/80 p-1 rounded-xl shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveViewTab('odoo_matrix')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activeViewTab === 'odoo_matrix'
                ? "bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-300 shadow-xs font-extrabold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Odoo Weekly Matrix</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-mono font-bold">
              ODOO
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('activity_log')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activeViewTab === 'activity_log'
                ? "bg-white dark:bg-zinc-800 text-brand-secondary shadow-xs font-extrabold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            <Clock className="w-4 h-4 text-orange-500 shrink-0" />
            <span>Activity Logs List</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('project_analyzer')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activeViewTab === 'project_analyzer'
                ? "bg-white dark:bg-zinc-800 text-brand-secondary shadow-xs font-extrabold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            <BarChart3 className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Project Analyzer</span>
          </button>
        </div>

        {/* Quick info / Action badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono">
            Weekly Total: {formatMatrixTime(odooGrandTotalSeconds)} hrs
          </span>
        </div>
      </div>

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
                    <Badge variant="outline" className="text-[9px] border-zinc-800 bg-zinc-900/60 text-zinc-400 capitalize">
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
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-200/20 shrink-0">
                  <Clock className="w-5 h-5 text-zinc-400 dark:text-zinc-600" />
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
                className="text-[10px] font-black uppercase tracking-widest border-zinc-200 dark:border-zinc-800"
              >
                Timer Standby
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* VIEW TAB 1: ODOO WEEKLY TIMESHEET MATRIX VIEW */}
      {activeViewTab === 'odoo_matrix' && (
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-md bg-white dark:bg-zinc-950 overflow-hidden">
          {/* Top Bar matching Odoo Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Odoo App Icon / Badge */}
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  O
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    Timesheets
                    <span className="text-xs font-normal text-zinc-500">/ My Timesheets</span>
                  </h3>
                </div>
              </div>

              {/* ▶ START Timer Button */}
              <div className="flex items-center space-x-2 ml-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (tasks.length > 0) {
                      toggleTimer(tasks[0].id);
                      toast.success(`Launched timer for "${tasks[0].name}"`);
                    } else {
                      toast.info("Please add a task line first.");
                    }
                  }}
                  className="bg-purple-800 hover:bg-purple-900 text-white font-extrabold text-xs h-8 px-3.5 gap-1.5 shadow-xs uppercase tracking-wide cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  START
                </Button>
                <span className="hidden xl:inline-block text-[10.5px] text-zinc-400 font-medium italic">
                  Press <kbd className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-[9.5px]">Enter</kbd> or <kbd className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-[9.5px]">a</kbd> to launch timer | Press <kbd className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-[9.5px]">Shift + A</kbd> to add 5 min
                </span>
              </div>
            </div>

            {/* Date & View Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Today Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToCurrent}
                className="h-8 text-xs font-bold border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
              >
                Today
              </Button>

              {/* Prev / Mode Selector / Next controls */}
              <div className="flex items-center space-x-1 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 bg-white dark:bg-zinc-950">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevTimeframe}
                  className="h-7 w-7 text-zinc-600 dark:text-zinc-300"
                  title="Previous Range"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <Select value={timeframeMode} onValueChange={(val: TimeframeMode) => setTimeframeMode(val)}>
                  <SelectTrigger className="h-7 border-none bg-transparent shadow-none px-2.5 text-xs font-extrabold text-zinc-800 dark:text-zinc-200 focus:ring-0 cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <SelectItem value="day" className="text-xs font-bold">Day</SelectItem>
                    <SelectItem value="week" className="text-xs font-bold">Week</SelectItem>
                    <SelectItem value="month" className="text-xs font-bold">Month</SelectItem>
                    <SelectItem value="all" className="text-xs font-bold">All Time</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextTimeframe}
                  className="h-7 w-7 text-zinc-600 dark:text-zinc-300"
                  title="Next Range"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Date Label indicator */}
              <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800">
                {getTimeframeLabel(timeframeMode, selectedAnchorDate)}
              </div>

              {/* Search bar */}
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                <Input
                  placeholder="Search..."
                  value={odooSearchQuery}
                  onChange={(e) => setOdooSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                />
              </div>

              {/* Layout view buttons */}
              <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 bg-zinc-100 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setActiveViewTab('odoo_matrix')}
                  className="p-1.5 rounded text-purple-700 dark:text-purple-300 bg-white dark:bg-zinc-800 shadow-xs"
                  title="Matrix View"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewTab('activity_log')}
                  className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  title="List View"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Odoo Timesheet Matrix Table */}
          <div className="overflow-x-auto">
            <Table className="border-collapse">
              <TableHeader className="bg-zinc-100/70 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800">
                <TableRow className="hover:bg-transparent">
                  {/* Shortcut key column header */}
                  <TableHead className="w-10 text-center text-[10px] uppercase font-bold text-zinc-400 p-2 border-r border-zinc-200 dark:border-zinc-800">
                    #
                  </TableHead>

                  {/* Task description column */}
                  <TableHead className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300 p-2.5 min-w-[320px] border-r border-zinc-200 dark:border-zinc-800">
                    Project / Task
                  </TableHead>

                  {/* Dynamic Day / Matrix Column Headers */}
                  {matrixDays.map((day) => (
                    <TableHead
                      key={day.dateKey}
                      className={cn(
                        "text-center p-2 text-xs font-bold min-w-[90px] border-r border-zinc-200 dark:border-zinc-800",
                        day.isToday ? "bg-purple-50/80 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300" : "text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      <div className="leading-tight">
                        <span className="block text-[11px] font-semibold">{day.dayName},</span>
                        <span className="block text-xs font-black">{day.dateStr}</span>
                      </div>
                    </TableHead>
                  ))}

                  {/* Rightmost "Time Spent" Column Header */}
                  <TableHead className="text-center p-2.5 text-xs font-black text-zinc-900 dark:text-zinc-100 min-w-[110px] bg-zinc-200/60 dark:bg-zinc-800/80 border-l border-zinc-300 dark:border-zinc-700">
                    Time Spent
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredOdooRows.map((row) => {
                  const rowTotalSecs = getRowTotalSeconds(row);

                  return (
                    <TableRow
                      key={row.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 border-b border-zinc-200/70 dark:border-zinc-800/60 group"
                    >
                      {/* Shortcut letter column */}
                      <TableCell className="p-2 text-center border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-[10px] font-mono font-bold text-zinc-500">
                          {row.shortcutKey}
                        </span>
                      </TableCell>

                      {/* Project | Task Name Cell */}
                      <TableCell className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 font-medium text-xs">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {row.projectName}
                          </span>
                          {row.variance && (
                            <span className={cn(
                              "text-[10px] font-mono px-1 rounded font-bold",
                              row.variance.startsWith('+') ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                            )}>
                              {row.variance}
                            </span>
                          )}
                          <span className="text-zinc-400 font-light">|</span>
                          <span className="text-zinc-600 dark:text-zinc-400 font-normal">
                            {row.taskName}
                          </span>
                        </div>
                      </TableCell>

                      {/* Dynamic Daily Cells */}
                      {matrixDays.map((day) => {
                        const cellSecs = row.dailySeconds[day.dateKey] || 0;
                        const formattedVal = formatMatrixTime(cellSecs);
                        const isEditingThisCell = editingCell?.rowId === row.id && editingCell?.dateKey === day.dateKey;

                        return (
                          <TableCell
                            key={day.dateKey}
                            onClick={() => {
                              if (!isEditingThisCell) {
                                setEditingCell({
                                  rowId: row.id,
                                  dateKey: day.dateKey,
                                  value: formattedVal === '0:00' ? '' : formattedVal
                                });
                              }
                            }}
                            className={cn(
                              "p-1.5 text-center border-r border-zinc-200 dark:border-zinc-800 font-mono text-xs tabular-nums cursor-pointer transition-colors relative",
                              day.isToday ? "bg-purple-50/30 dark:bg-purple-950/20" : "",
                              cellSecs > 0 ? "font-bold text-zinc-900 dark:text-zinc-100" : "text-zinc-300 dark:text-zinc-700 hover:text-zinc-500"
                            )}
                          >
                            {isEditingThisCell ? (
                              <div className="flex items-center justify-center">
                                <Input
                                  autoFocus
                                  value={editingCell.value}
                                  onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveCellEdit(row.id, day.dateKey, editingCell.value);
                                    } else if (e.key === 'Escape') {
                                      setEditingCell(null);
                                    }
                                  }}
                                  onBlur={() => handleSaveCellEdit(row.id, day.dateKey, editingCell.value)}
                                  className="h-7 w-16 text-center text-xs font-mono font-bold p-1 bg-white dark:bg-zinc-950 border-purple-500 ring-2 ring-purple-500/20"
                                />
                              </div>
                            ) : (
                              <span className="block w-full h-full py-1 rounded hover:bg-purple-50 dark:hover:bg-purple-950/30">
                                {formattedVal}
                              </span>
                            )}
                          </TableCell>
                        );
                      })}

                      {/* Time Spent Row Total Cell (Right Side Column) */}
                      <TableCell className="p-2.5 text-center font-mono text-xs font-extrabold text-zinc-900 dark:text-zinc-100 bg-zinc-100/80 dark:bg-zinc-900/80 border-l border-zinc-300 dark:border-zinc-800 tabular-nums">
                        {formatMatrixTime(rowTotalSecs)}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredOdooRows.length === 0 && !isAddingLine && (
                  <TableRow className="border-b border-zinc-200 dark:border-zinc-800">
                    <TableCell colSpan={matrixDays.length + 2} className="text-center py-8 text-xs text-zinc-400 font-medium bg-white dark:bg-zinc-950">
                      No time entries logged for this timeframe. Click <span className="font-bold text-purple-600 dark:text-purple-400 cursor-pointer underline hover:text-purple-700" onClick={() => setIsAddingLine(true)}>+ Add a line</span> or run a timer to log time.
                    </TableCell>
                  </TableRow>
                )}

                {/* Inline "Add a Line" Form Row */}
                {isAddingLine && (
                  <TableRow className="bg-purple-50/40 dark:bg-purple-950/20 border-b border-purple-200 dark:border-purple-800">
                    <TableCell className="p-2 text-center border-r border-zinc-200 dark:border-zinc-800">
                      <Plus className="w-4 h-4 text-purple-600 mx-auto" />
                    </TableCell>
                    <TableCell colSpan={matrixDays.length + 1} className="p-2.5">
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <Select value={newLineProjectId} onValueChange={setNewLineProjectId}>
                          <SelectTrigger className="w-48 h-8 text-xs bg-white dark:bg-zinc-950 border-purple-300">
                            <SelectValue placeholder="Select Project" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-zinc-950">
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs font-medium">{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          placeholder="Type task or activity description..."
                          value={newLineTaskName}
                          onChange={(e) => setNewLineTaskName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddLine()}
                          className="h-8 text-xs bg-white dark:bg-zinc-950 border-purple-300 flex-1"
                        />

                        <div className="flex items-center space-x-1 shrink-0">
                          <Button
                            size="sm"
                            onClick={handleConfirmAddLine}
                            className="h-8 px-3 text-xs bg-purple-700 hover:bg-purple-800 text-white font-bold"
                          >
                            Save Line
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsAddingLine(false)}
                            className="h-8 px-2 text-xs text-zinc-500"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="bg-zinc-100/60 dark:bg-zinc-900/50" />
                  </TableRow>
                )}
              </TableBody>

              {/* Bottom Summary & Workload Totals Section */}
              <tfoot className="bg-zinc-100/90 dark:bg-zinc-900/90 border-t-2 border-zinc-300 dark:border-zinc-700 font-mono text-xs">
                {/* Row 1: Add a line + Daily Column Numbers + Bottom Right Grand Total Box */}
                <tr>
                  {/* Add a line button on bottom left */}
                  <td colSpan={2} className="p-2.5 pl-3 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                    <button
                      type="button"
                      onClick={() => setIsAddingLine(true)}
                      className="inline-flex items-center text-xs font-bold text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add a line</span>
                    </button>
                  </td>

                  {/* Bottom Side Daily Column Sums */}
                  {matrixDays.map((day) => {
                    const daySum = getDayTotalSeconds(day.dateKey);
                    return (
                      <td
                        key={day.dateKey}
                        className={cn(
                          "p-2.5 text-center font-black text-xs border-r border-zinc-200 dark:border-zinc-800 tabular-nums bg-white dark:bg-zinc-950",
                          daySum > 0 ? "text-rose-600 dark:text-rose-400 font-extrabold" : "text-zinc-400 dark:text-zinc-600"
                        )}
                      >
                        {formatMatrixTime(daySum)}
                      </td>
                    );
                  })}

                  {/* Grand Total Bottom Right Intersection Box */}
                  <td className="p-3 text-center font-black text-sm text-white bg-[#714B67] dark:bg-purple-950 border-l border-purple-800 tabular-nums shadow-inner">
                    {formatMatrixTime(odooGrandTotalSeconds)}
                  </td>
                </tr>

                {/* Row 2: Odoo Visual Workload Capacity Progress Bar */}
                <tr className="bg-zinc-100 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800">
                  <td colSpan={2} className="p-1.5 pl-3 border-r border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    Workload Visual
                  </td>
                  {matrixDays.map((day) => {
                    const daySum = getDayTotalSeconds(day.dateKey);
                    const targetDailySecs = 8 * 3600; // 8 hours target
                    const percentage = Math.min(100, Math.round((daySum / targetDailySecs) * 100));

                    return (
                      <td key={day.dateKey} className="p-1.5 border-r border-zinc-200 dark:border-zinc-800">
                        <div className="w-full bg-purple-200/50 dark:bg-purple-950/60 h-2.5 rounded-xs overflow-hidden p-0.5">
                          <div
                            className={cn(
                              "h-full rounded-xs transition-all duration-300",
                              daySum === 0 ? "bg-transparent" :
                              percentage >= 100 ? "bg-[#714B67] dark:bg-purple-400" :
                              "bg-purple-600/80 dark:bg-purple-500"
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td className="bg-[#5c3c54] dark:bg-purple-900 p-1" />
                </tr>
              </tfoot>
            </Table>
          </div>
        </Card>
      )}

      {/* STAT CARDS - Displayed for Activity Log and Project Analyzer */}
      {activeViewTab !== 'odoo_matrix' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Logged" value={`${liveTotalHours}h`} trend={totalSecsForStats > 0 ? "+100%" : "0%"} icon={Clock} />
          <StatCard title="Billable Ratio" value={`${liveBillableRatio}%`} trend={liveBillableRatio > 0 ? "+100%" : "0%"} icon={ArrowUpRight} />
          <StatCard title="Avg Daily" value={`${liveAvgDailyHours}h`} trend={liveAvgDailyHours !== '0.0' ? "+100%" : "0%"} icon={Calendar} />
          <StatCard title="Productivity" value={`${liveProductivity}%`} trend={liveProductivity > 0 ? "+100%" : "0%"} icon={BarChart3} />
        </div>
      )}

      {/* VIEW TAB 2: PROJECT TIME ANALYZER */}
      {activeViewTab === 'project_analyzer' && (
        <Card className="border-zinc-100 dark:border-zinc-800 shadow-sm bg-card overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-900">
            <div>
              <CardTitle className="text-lg font-bold tracking-tight">Project Time Analyzer</CardTitle>
              <p className="text-xs text-zinc-400 font-medium mt-1">Select a project to analyze time spent per task and total progress</p>
            </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest shrink-0">Select Project:</span>
            <Select
              value={selectedAnalyzeProjectId}
              onValueChange={setSelectedAnalyzeProjectId}
            >
              <SelectTrigger className="w-[240px] h-9 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto bg-white dark:bg-zinc-950">
                <SelectItem value="all" className="text-xs font-medium">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {selectedAnalyzeProjectId === 'all' ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
              <BarChart3 className="w-8 h-8 text-zinc-300 dark:text-zinc-700 animate-pulse" />
              <p className="text-xs font-bold text-zinc-500">All Projects Selected</p>
              <p className="text-[11px] text-zinc-400 max-w-md">
                Select a specific project from the dropdown above to view task-by-task timing breakdowns and expert assignments.
              </p>
            </div>
          ) : (
            (() => {
              const selectedProject = projects.find(p => p.id === selectedAnalyzeProjectId);
              if (!selectedProject) return <p className="text-xs text-zinc-400">Project not found.</p>;

              const projectTasks = tasks.filter(t => t.projectId === selectedAnalyzeProjectId);
              const totalProjectSeconds = projectTasks.reduce((sum, t) => {
                const secs = elapsedTimes[t.id] !== undefined ? elapsedTimes[t.id] : ((t.timeLoggedSeconds || (t.timeLogged ? Math.round(t.timeLogged * 3600) : 0)));
                return sum + secs;
              }, 0);

              return (
                <div className="space-y-6">
                  {/* Summary Stats for the selected project */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Project Name</span>
                      <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 block truncate">{selectedProject.name}</span>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{selectedProject.status}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Total Time Spent</span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight block">
                        {formatLogTime(totalProjectSeconds)}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-semibold block mt-0.5">
                        {projectTasks.length} total tasks
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Average / Task</span>
                      <span className="text-base font-bold text-zinc-800 dark:text-zinc-100 font-mono tracking-tight block">
                        {projectTasks.length > 0 ? formatLogTime(Math.round(totalProjectSeconds / projectTasks.length)) : '00:00'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-semibold block mt-0.5">
                        across logged activities
                      </span>
                    </div>
                  </div>

                  {/* Tasks and Time Speded table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Tasks Breakdown & Spent Time</h4>
                      {isAdmin && (
                        <span className="text-[10px] font-bold text-brand-secondary bg-zinc-100 dark:bg-zinc-900 px-2.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-800">
                          Admin View Enabled
                        </span>
                      )}
                    </div>

                    {projectTasks.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <p className="text-xs font-bold text-zinc-400">No tasks mapped to this project yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-hidden border border-zinc-100 dark:border-zinc-800 rounded-xl">
                        <Table>
                          <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/30">
                            <TableRow>
                              <TableHead className="text-[9px] uppercase font-bold tracking-widest pl-4">Task Name</TableHead>
                              <TableHead className="text-[9px] uppercase font-bold tracking-widest">Type</TableHead>
                              <TableHead className="text-[9px] uppercase font-bold tracking-widest">Expert Assigned</TableHead>
                              <TableHead className="text-[9px] uppercase font-bold tracking-widest text-right pr-4">Time Spent</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {projectTasks.map((task) => {
                              const tSeconds = elapsedTimes[task.id] !== undefined ? elapsedTimes[task.id] : ((task.timeLoggedSeconds || (task.timeLogged ? Math.round(task.timeLogged * 3600) : 0)));
                              const assignedUser = users ? users.find(u => u.id === task.assigneeId) : null;

                              return (
                                <TableRow key={task.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/10">
                                  <TableCell className="pl-4 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                                    {task.name}
                                  </TableCell>
                                  <TableCell className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                                    {task.type}
                                  </TableCell>
                                  <TableCell className="text-xs text-zinc-600 dark:text-zinc-300">
                                    {assignedUser ? (
                                      <div className="flex items-center space-x-1.5">
                                        <span className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[9px] font-black uppercase text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                                          {assignedUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </span>
                                        <span>{assignedUser.name}</span>
                                      </div>
                                    ) : (
                                      <span className="text-zinc-400 italic">Unassigned</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right pr-4 font-mono text-xs font-bold text-zinc-900 dark:text-zinc-50">
                                    <Badge variant="secondary" className={cn(
                                      "font-mono text-xs border-none px-2 h-5 tabular-nums",
                                      tSeconds > 0 ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                                    )}>
                                      {formatLogTime(tSeconds)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </CardContent>
      </Card>
      )}

      {/* VIEW TAB 3: RECENT ACTIVITY LOGS LIST */}
      {activeViewTab === 'activity_log' && (
      <Card className="border-zinc-100 dark:border-zinc-900 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
           <div>
             <div className="flex items-center space-x-2">
               <CardTitle className="text-xl font-bold tracking-tight">Recent Activity Log</CardTitle>
               {isFullAdmin ? (
                 <Badge variant="outline" className="text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                   Organization View
                 </Badge>
               ) : isReportingManager ? (
                 <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                   Team View ({allowedUsers.length} members)
                 </Badge>
               ) : (
                 <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                   Personal View (My Logs)
                 </Badge>
               )}
             </div>
             <p className="text-xs text-zinc-400 font-medium mt-1">Cross-department time synchronization & filters</p>
           </div>
           <div className="flex flex-wrap items-center gap-2">
             {/* Log Time Manually Button and Dialog */}
             <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
               <DialogTrigger
                 className={cn(
                   buttonVariants({ variant: "outline", size: "sm" }),
                   "h-8 text-[10px] uppercase font-bold tracking-widest gap-1.5 flex items-center cursor-pointer border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/5 text-orange-600 dark:text-orange-400"
                 )}
               >
                 <Plus className="w-3.5 h-3.5" />
                 Log Time Manually
               </DialogTrigger>
               <DialogContent className="sm:max-w-[480px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto text-left">
                 <DialogHeader>
                   <DialogTitle className="text-lg font-bold tracking-tight">Log Time Manually</DialogTitle>
                   <p className="text-xs text-zinc-400 mt-1">
                     Add a new timesheet entry for an activity you've completed.
                   </p>
                 </DialogHeader>

                 <div className="grid gap-4 py-4">
                   {/* Activity Name */}
                   <div className="grid gap-2">
                     <Label htmlFor="manual-activity" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Activity Description / Task Name</Label>
                     <Input
                       id="manual-activity"
                       placeholder="e.g. Completed page designs, SEO review, etc."
                       className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs"
                       value={manualActivityName}
                       onChange={(e) => setManualActivityName(e.target.value)}
                     />
                   </div>

                   {/* Project Select */}
                   <div className="grid gap-2">
                     <Label htmlFor="manual-project" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Project</Label>
                     <Select
                       value={manualProjectId}
                       onValueChange={setManualProjectId}
                     >
                       <SelectTrigger id="manual-project" className="w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs">
                         <SelectValue placeholder="Select a project" />
                       </SelectTrigger>
                       <SelectContent className="bg-white dark:bg-zinc-950 max-h-48 overflow-y-auto">
                         {projects.map((p) => (
                           <SelectItem key={p.id} value={p.id} className="text-xs font-semibold">
                             {p.name}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>

                   {/* Assignee Select */}
                   <div className="grid gap-2">
                     <Label htmlFor="manual-expert" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Expert / User</Label>
                     <Select
                       value={manualAssigneeId}
                       onValueChange={setManualAssigneeId}
                     >
                       <SelectTrigger id="manual-expert" className="w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs">
                         <SelectValue placeholder="Select team member" />
                       </SelectTrigger>
                       <SelectContent className="bg-white dark:bg-zinc-950 max-h-48 overflow-y-auto">
                         {allowedUsers.map((u) => (
                           <SelectItem key={u.id} value={u.id} className="text-xs font-semibold">
                             {u.name} ({u.role.replace('_', ' ')})
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>

                   {/* Date & Category side-by-side */}
                   <div className="grid grid-cols-2 gap-3">
                     <div className="grid gap-2">
                       <Label htmlFor="manual-date" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Date</Label>
                       <Input
                         id="manual-date"
                         type="date"
                         className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                         value={manualDate}
                         onChange={(e) => setManualDate(e.target.value)}
                       />
                     </div>
                     <div className="grid gap-2">
                       <Label htmlFor="manual-category" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Category</Label>
                       <Select
                         value={manualCategory}
                         onValueChange={setManualCategory}
                       >
                         <SelectTrigger id="manual-category" className="w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs capitalize">
                           <SelectValue placeholder="Select category" />
                         </SelectTrigger>
                         <SelectContent className="bg-white dark:bg-zinc-950 max-h-48 overflow-y-auto">
                           {['Production', 'Strategy', 'Design', 'Web Development', 'Content', 'SEO', 'HubSpot', 'Revision', 'Management'].map((cat) => (
                             <SelectItem key={cat} value={cat} className="text-xs capitalize">
                               {cat}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                   </div>

                   {/* Duration & Billing side-by-side */}
                   <div className="grid grid-cols-2 gap-3">
                     <div className="grid gap-2">
                       <Label htmlFor="manual-duration" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Duration (hrs:mins)</Label>
                       <Input
                         id="manual-duration"
                         placeholder="e.g. 01:26 mins or 01:26"
                         className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                         value={manualDurationInput}
                         onChange={(e) => setManualDurationInput(e.target.value)}
                       />
                     </div>
                     <div className="grid gap-2">
                       <Label htmlFor="manual-billing" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Billing Type</Label>
                       <Select
                         value={manualBilling}
                         onValueChange={(val: any) => setManualBilling(val)}
                       >
                         <SelectTrigger id="manual-billing" className="w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs">
                           <SelectValue placeholder="Billing status" />
                         </SelectTrigger>
                         <SelectContent className="bg-white dark:bg-zinc-950">
                           <SelectItem value="Billable" className="text-xs font-semibold">
                             🟢 Billable
                           </SelectItem>
                           <SelectItem value="Non-Billable" className="text-xs font-semibold">
                             🟡 Non-Billable
                           </SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>

                   {/* Notes Description */}
                   <div className="grid gap-2">
                     <Label htmlFor="manual-desc" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Notes / Details</Label>
                     <Textarea
                       id="manual-desc"
                       placeholder="Provide any additional details about the work done..."
                       className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs"
                       value={manualDescription}
                       onChange={(e) => setManualDescription(e.target.value)}
                       rows={2}
                     />
                   </div>
                 </div>

                 <DialogFooter className="gap-2 sm:gap-0 border-t pt-4 border-zinc-100 dark:border-zinc-900">
                   <Button
                     variant="outline"
                     onClick={() => setIsManualEntryOpen(false)}
                     className="h-10 text-xs font-bold uppercase tracking-widest border-zinc-200 dark:border-zinc-800"
                   >
                     Cancel
                   </Button>
                   <Button
                     onClick={handleAddManualEntry}
                     className="bg-orange-500 hover:bg-orange-600 text-white h-10 rounded-lg font-bold uppercase tracking-widest text-xs"
                   >
                     Submit Entry
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>

             {/* Export Timesheet Button and Dialog */}
             <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
               <DialogTrigger
                 className={cn(
                   buttonVariants({ variant: "outline", size: "sm" }),
                   "h-8 text-[10px] uppercase font-bold tracking-widest gap-1.5 flex items-center cursor-pointer"
                 )}
               >
                 <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-500" />
                 Export Timesheet
               </DialogTrigger>
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
         </div>
        </CardHeader>

        {/* Activity Log Filter Controls (Timeframe Tabs, Date Nav, Search, Project, Expert, Billing, Category) */}
        <div className="px-6 py-3.5 border-y border-zinc-100 dark:border-zinc-900 bg-zinc-50/60 dark:bg-zinc-950/40 space-y-3">
          {/* Top Bar: Timeframe Mode Buttons (Day Wise, Week Wise, Month Wise, All Time) + Date Navigator */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-zinc-200/60 dark:border-zinc-800/80">
            <div className="flex items-center space-x-1 bg-zinc-200/60 dark:bg-zinc-900 p-1 rounded-xl shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setTimeframeMode('day')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                  timeframeMode === 'day'
                    ? "bg-white dark:bg-zinc-800 text-brand-secondary shadow-xs font-extrabold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                Day Wise
              </button>
              <button
                type="button"
                onClick={() => setTimeframeMode('week')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                  timeframeMode === 'week'
                    ? "bg-white dark:bg-zinc-800 text-brand-secondary shadow-xs font-extrabold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                Week Wise
              </button>
              <button
                type="button"
                onClick={() => setTimeframeMode('month')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                  timeframeMode === 'month'
                    ? "bg-white dark:bg-zinc-800 text-brand-secondary shadow-xs font-extrabold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                Month Wise
              </button>
              <button
                type="button"
                onClick={() => setTimeframeMode('all')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                  timeframeMode === 'all'
                    ? "bg-white dark:bg-zinc-800 text-brand-secondary shadow-xs font-extrabold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                All Time
              </button>
            </div>

            {/* Date Navigator Controls */}
            {timeframeMode !== 'all' && (
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevTimeframe}
                  className="h-8 w-8 rounded-lg border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                  title="Previous Timeframe"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-lg shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-brand-secondary shrink-0" />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 min-w-[130px] text-center">
                    {getTimeframeLabel(timeframeMode, selectedAnchorDate)}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextTimeframe}
                  className="h-8 w-8 rounded-lg border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                  title="Next Timeframe"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetToCurrent}
                  className="h-8 text-[11px] font-bold text-zinc-500 hover:text-brand-secondary cursor-pointer"
                >
                  Current
                </Button>
              </div>
            )}
          </div>

          {/* Bottom Grid: Search & Attribute Select Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 items-center">
            {/* Search query */}
            <div className="relative md:col-span-1">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400" />
              <Input
                placeholder="Search activity..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
              />
            </div>

            {/* Project Filter */}
            <Select value={logFilterProjectId} onValueChange={setLogFilterProjectId}>
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 font-medium">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-950 max-h-56">
                <SelectItem value="all" className="text-xs font-bold">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs font-semibold">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Expert Filter */}
            <Select value={logFilterAssigneeId} onValueChange={setLogFilterAssigneeId}>
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 font-medium">
                <SelectValue placeholder="All Experts" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-950 max-h-56">
                <SelectItem value="all" className="text-xs font-bold">All Experts</SelectItem>
                {allowedUsers.map(u => (
                  <SelectItem key={u.id} value={u.id} className="text-xs font-semibold">{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Billing Filter */}
            <Select value={logFilterBilling} onValueChange={setLogFilterBilling}>
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 font-medium">
                <SelectValue placeholder="All Billing" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-950">
                <SelectItem value="all" className="text-xs font-bold">All Billing</SelectItem>
                <SelectItem value="Billable" className="text-xs font-semibold text-emerald-600">Billable</SelectItem>
                <SelectItem value="Non-Billable" className="text-xs font-semibold text-amber-600">Non-Billable</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={logFilterCategory} onValueChange={setLogFilterCategory}>
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 font-medium">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-950 max-h-56">
                <SelectItem value="all" className="text-xs font-bold">All Categories</SelectItem>
                {['Production', 'Strategy', 'Design', 'Web Development', 'Content', 'SEO', 'HubSpot', 'Revision', 'Management'].map(cat => (
                  <SelectItem key={cat} value={cat} className="text-xs font-semibold">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveLogFilters && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
              <span className="text-[11px] text-zinc-500 font-semibold">
                Showing <strong className="text-zinc-900 dark:text-zinc-100">{activityLogs.length}</strong> matching entries
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetLogFilters}
                className="h-6 px-2 text-[11px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters
              </Button>
            </div>
          )}
        </div>

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
                {activityLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Clock className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                        <p className="text-xs font-bold text-zinc-500">No time tracking logs match the selected filters.</p>
                        {hasActiveLogFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetLogFilters}
                            className="h-7 text-xs font-bold border-zinc-200 dark:border-zinc-800 mt-1 cursor-pointer"
                          >
                            Reset Filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  activityLogs.map((log) => (
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
                          {typeof log.durationSecs === 'number' ? formatLogTime(log.durationSecs) : log.durationSecs}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {canModifyBilling ? (
                          <button
                            onClick={() => handleToggleBilling(log.id, log.billing)}
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
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

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className={cn(
                                buttonVariants({ variant: "ghost", size: "icon" }),
                                "h-7 w-7 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer flex items-center justify-center"
                              )}
                              title="Options (Edit/Delete)"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                              <DropdownMenuItem
                                onClick={() => handleStartEditLog(log)}
                                className="text-xs cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-900"
                              >
                                <Edit className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                                <span>Edit Log Entry</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteLog(log.id, log.task)}
                                className="text-xs cursor-pointer text-red-600 dark:text-red-400 hover:text-red-750 focus:bg-red-50 dark:focus:bg-red-950/20"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                <span>Delete Log</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Edit Log Entry Dialog */}
      <Dialog open={!!editingLog} onOpenChange={(open) => !open && setEditingLog(null)}>
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto text-left">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight">Edit Time Tracking Entry</DialogTitle>
            <p className="text-xs text-zinc-400 mt-1">
              Modify details and tracked duration for this activity.
            </p>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Task / Activity Name */}
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Activity / Task Name</Label>
              <Input
                value={editTaskName}
                onChange={(e) => setEditTaskName(e.target.value)}
                className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs font-medium"
              />
            </div>

            {/* Project Select */}
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Project</Label>
              <Select value={editProjectId} onValueChange={setEditProjectId}>
                <SelectTrigger className="w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs font-medium">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 max-h-48 overflow-y-auto">
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs font-semibold">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expert / Team Member Select */}
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Expert / Team Member</Label>
              <Select value={editAssigneeId} onValueChange={setEditAssigneeId}>
                <SelectTrigger className="w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs font-medium">
                  <SelectValue placeholder="Select Team Member" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 max-h-48 overflow-y-auto">
                  {allowedUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs font-semibold">
                      {u.name} ({u.role.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Date</Label>
                <Input
                  type="date"
                  className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs capitalize font-medium">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-950 max-h-48 overflow-y-auto">
                    {['Production', 'Strategy', 'Design', 'Web Development', 'Content', 'SEO', 'HubSpot', 'Revision', 'Management'].map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs capitalize">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration & Billing */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Duration (hrs:mins)</Label>
                <Input
                  placeholder="e.g. 01:26 mins or 01:26"
                  className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                  value={editDurationInput}
                  onChange={(e) => setEditDurationInput(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Billing Type</Label>
                <Select value={editBilling} onValueChange={(val: any) => setEditBilling(val)}>
                  <SelectTrigger className="w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs font-medium">
                    <SelectValue placeholder="Billing status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-950">
                    <SelectItem value="Billable" className="text-xs font-semibold">
                      🟢 Billable
                    </SelectItem>
                    <SelectItem value="Non-Billable" className="text-xs font-semibold">
                      🟡 Non-Billable
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 border-t pt-4 border-zinc-100 dark:border-zinc-900">
            <Button
              variant="outline"
              onClick={() => setEditingLog(null)}
              className="h-10 text-xs font-bold uppercase tracking-widest border-zinc-200 dark:border-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditLog}
              className="bg-orange-500 hover:bg-orange-600 text-white h-10 rounded-lg font-bold uppercase tracking-widest text-xs"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, trend, icon: Icon }: any) {
  return (
    <Card className="border-zinc-100 dark:border-zinc-900 bg-card shadow-sm overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-400 border border-zinc-100 dark:border-zinc-800">
            <Icon className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
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

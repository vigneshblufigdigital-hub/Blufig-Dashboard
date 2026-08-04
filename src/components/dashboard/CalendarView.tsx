import React, { useState, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Search, 
  Plus, 
  Trash2, 
  Clock, 
  Sparkles, 
  AlertCircle,
  HelpCircle,
  Hash,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  ExternalLink,
  Filter,
  FolderKanban,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Task, UserProfile, TaskStatus, Priority } from '../../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface CalendarViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  projects: Project[];
  users: UserProfile[];
}

export function CalendarView({ tasks, setTasks, projects, users }: CalendarViewProps) {
  // Currently displayed date reference
  const [currentDate, setCurrentDate] = useState(() => new Date());
  
  // Project Filter state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const projectTabsRef = useRef<HTMLDivElement>(null);

  const scrollProjectTabs = (direction: 'left' | 'right') => {
    if (projectTabsRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      projectTabsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Search state for unscheduled sidebar
  const [sidebarSearch, setSidebarSearch] = useState('');
  
  // Dragged-over date state for visual feedback
  const [draggedOverDateStr, setDraggedOverDateStr] = useState<string | null>(null);
  const [draggedOverSidebar, setDraggedOverSidebar] = useState(false);
  
  // Detail modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // New Task creation modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>(Priority.NORMAL);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>(TaskStatus.YET_TO_START);
  const [newTaskType, setNewTaskType] = useState('Design');
  const [newTaskTimeEstimate, setNewTaskTimeEstimate] = useState('2');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  // Map users and projects for rapid lookup
  const userMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users.forEach(u => map.set(u.id, u));
    return map;
  }, [users]);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach(p => map.set(p.id, p));
    return map;
  }, [projects]);

  // Calendar time math
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate days in current month
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  // Find start day of the month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const startDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  // Helper date-format: YYYY-MM-DD (local-safe zero paddings)
  const formatDateString = (year: number, monthVal: number, dayVal: number) => {
    const mm = String(monthVal + 1).padStart(2, '0');
    const dd = String(dayVal).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Generate complete calendar grid array with details
  const calendarCells = useMemo(() => {
    const cells: { dateStr: string; dayLabel: number; isCurrentMonth: boolean; key: string }[] = [];
    
    // 1. Padding days from previous month
    const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();
    const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDaysCount - i;
      const dStr = formatDateString(prevMonthYear, prevMonthIndex, day);
      cells.push({
        dateStr: dStr,
        dayLabel: day,
        isCurrentMonth: false,
        key: `prev-${day}`
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = formatDateString(currentYear, currentMonth, day);
      cells.push({
        dateStr: dStr,
        dayLabel: day,
        isCurrentMonth: true,
        key: `curr-${day}`
      });
    }

    // 3. Padding days from next month to fill grid row multiple of 7
    const remainingCells = (7 - (cells.length % 7)) % 7;
    const nextMonthIndex = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    
    for (let day = 1; day <= remainingCells; day++) {
      const dStr = formatDateString(nextMonthYear, nextMonthIndex, day);
      cells.push({
        dateStr: dStr,
        dayLabel: day,
        isCurrentMonth: false,
        key: `next-${day}`
      });
    }

    // Always structure full 6 rows if cells are <= 35 to maintain visual container uniform heights
    if (cells.length <= 35) {
      const startNextDay = remainingCells + 1;
      for (let day = startNextDay; day <= startNextDay + 6; day++) {
        const dStr = formatDateString(nextMonthYear, nextMonthIndex, day);
        cells.push({
          dateStr: dStr,
          dayLabel: day,
          isCurrentMonth: false,
          key: `next-extra-${day}`
        });
      }
    }

    return cells;
  }, [currentYear, currentMonth, startDayOfWeek, daysInMonth]);

  // Project-wise filtering
  const projectFilteredTasks = useMemo(() => {
    if (selectedProjectId === 'all') return tasks;
    return tasks.filter(t => t.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  // Split tasks into Scheduled vs Unscheduled
  const { scheduledTasks, unscheduledTasks } = useMemo(() => {
    const scheduled: Task[] = [];
    const unscheduled: Task[] = [];

    projectFilteredTasks.forEach(task => {
      if (task.dueDate && task.dueDate.trim() !== '') {
        scheduled.push(task);
      } else {
        unscheduled.push(task);
      }
    });

    return { scheduledTasks: scheduled, unscheduledTasks: unscheduled };
  }, [projectFilteredTasks]);

  // Unscheduled tasks filter
  const filteredUnscheduledTasks = useMemo(() => {
    if (!sidebarSearch.trim()) return unscheduledTasks;
    return unscheduledTasks.filter(t => 
      t.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      (projectMap.get(t.projectId)?.name || '').toLowerCase().includes(sidebarSearch.toLowerCase())
    );
  }, [unscheduledTasks, sidebarSearch, projectMap]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  // Open task creation modal with optional prefilled date
  const handleOpenCreateModal = (dueDateStr?: string) => {
    const today = new Date();
    const todayStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
    const defaultDate = dueDateStr !== undefined ? dueDateStr : todayStr;

    setNewTaskDueDate(defaultDate);
    setNewTaskName('');
    setNewTaskProjectId(selectedProjectId !== 'all' ? selectedProjectId : (projects[0]?.id || ''));
    setNewTaskAssigneeId(users[0]?.id || '');
    setNewTaskPriority(Priority.NORMAL);
    setNewTaskStatus(TaskStatus.YET_TO_START);
    setNewTaskType('Design');
    setNewTaskTimeEstimate('2');
    setNewTaskDescription('');
    setIsCreateOpen(true);
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) {
      toast.error('Please enter a task name.');
      return;
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      projectId: newTaskProjectId || projects[0]?.id || '',
      deliverableId: `deliv-${Date.now()}`,
      name: newTaskName.trim(),
      type: newTaskType || 'Design',
      assigneeId: newTaskAssigneeId || users[0]?.id || '',
      status: newTaskStatus,
      priority: newTaskPriority,
      dueDate: newTaskDueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: newTaskDescription.trim(),
      timeEstimate: parseFloat(newTaskTimeEstimate) || 2,
      timeLoggedSeconds: 0,
      subTasks: []
    };

    setTasks(prev => [newTask, ...prev]);
    setIsCreateOpen(false);
    toast.success(`Task "${newTask.name}" created successfully! 🚀`);
  };

  // Drag and drop event handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverCell = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (draggedOverDateStr !== dateStr) {
      setDraggedOverDateStr(dateStr);
    }
  };

  const handleDragLeaveCell = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOverDateStr(null);
  };

  const handleDropOnCell = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    setDraggedOverDateStr(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    // Check if same date
    if (taskToUpdate.dueDate === targetDateStr) return;

    // Apply mutation
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          dueDate: targetDateStr,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));

    toast.success(`Rescheduled "${taskToUpdate.name}" to ${targetDateStr}! 🗓️`);
  };

  const handleDragOverSidebar = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedOverSidebar) {
      setDraggedOverSidebar(true);
    }
  };

  const handleDragLeaveSidebar = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOverSidebar(false);
  };

  const handleDropOnSidebar = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOverSidebar(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    // If already unscheduled, do nothing
    if (!taskToUpdate.dueDate) return;

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          dueDate: '',
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));

    toast.success(`Removed due date from "${taskToUpdate.name}". Task is now unscheduled! ⏰`);
  };

  // Color mapping based on priority values
  const getPriorityColors = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL:
        return {
          border: 'border-red-500/50 dark:border-red-500/40',
          bg: 'bg-red-500/10 dark:bg-red-500/15',
          text: 'text-red-700 dark:text-red-400',
          dot: 'bg-red-500'
        };
      case Priority.HIGH:
        return {
          border: 'border-amber-500/50 dark:border-amber-500/40',
          bg: 'bg-amber-500/10 dark:bg-amber-500/15',
          text: 'text-amber-700 dark:text-amber-400',
          dot: 'bg-amber-500'
        };
      case Priority.NORMAL:
        return {
          border: 'border-blue-500/40 dark:border-blue-500/30',
          bg: 'bg-blue-500/5 dark:bg-blue-500/10',
          text: 'text-blue-700 dark:text-blue-400',
          dot: 'bg-blue-500'
        };
      case Priority.LOW:
      default:
        return {
          border: 'border-zinc-200 dark:border-zinc-800',
          bg: 'bg-zinc-50 dark:bg-zinc-900/65',
          text: 'text-zinc-600 dark:text-zinc-400',
          dot: 'bg-zinc-400'
        };
    }
  };

  // Open task details modal
  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleUpdateSelectedTaskField = (field: keyof Task, val: any) => {
    if (!selectedTask) return;
    const updated = { ...selectedTask, [field]: val, updatedAt: new Date().toISOString() };
    setSelectedTask(updated);
    setTasks(prev => prev.map(t => t.id === selectedTask.id ? updated : t));
    toast.success(`Updated task details!`);
  };

  const handleDeleteTask = () => {
    if (!selectedTask) return;
    setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
    setIsDetailOpen(false);
    toast.success(`Successfully removed task "${selectedTask.name}" 🗑️`);
  };

  // Check if dates match system today
  const todayStr = useMemo(() => {
    const today = new Date();
    return formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
  }, []);

  return (
    <div className="space-y-5">
      
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-900 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="bg-brand-secondary/15 text-brand-secondary p-1.5 rounded-lg">
              <CalendarIcon className="w-4.5 h-4.5" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Interactive Ops Calendar
            </h2>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Reschedule pipelines across deliverables dynamically. Drag-and-drop tasks onto day cells to set deadlines.
          </p>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex items-center flex-wrap gap-3">
          {/* New Task Button */}
          <Button
            onClick={() => handleOpenCreateModal()}
            className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-extrabold uppercase tracking-wider h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </Button>

          {/* Month Selector Buttons */}
          <div className="flex items-center space-x-1 pl-2 border-l border-zinc-200 dark:border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToday}
              className="text-[10px] uppercase font-bold tracking-widest h-9 px-3 rounded-lg border-zinc-200 cursor-pointer text-zinc-800 dark:text-zinc-300 hover:bg-zinc-100"
            >
              Today
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevMonth}
              className="h-9 w-9 border-zinc-200 cursor-pointer hover:bg-zinc-100"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
            </Button>
            
            <div className="bg-zinc-50 dark:bg-zinc-900 px-3 h-9 flex items-center justify-center font-bold text-xs uppercase tracking-wider rounded-lg text-zinc-800 dark:text-zinc-100 border border-zinc-200 min-w-[140px] shadow-inner">
              {monthNames[currentMonth]} {currentYear}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              className="h-9 w-9 border-zinc-200 cursor-pointer hover:bg-zinc-100"
            >
              <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Interactive Project Filter Pills with Left & Right scroll arrows */}
      {projects.length > 0 && (
        <div className="relative flex items-center bg-white dark:bg-zinc-950 p-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-900 shadow-xs">
          {/* Left Scroll Button */}
          <button
            type="button"
            onClick={() => scrollProjectTabs('left')}
            className="shrink-0 h-8 w-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-all cursor-pointer mr-1.5 z-10 border border-zinc-200/80 dark:border-zinc-800 shadow-xs active:scale-95"
            title="Scroll left to view previous projects"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scrollable Tabs List */}
          <div
            ref={projectTabsRef}
            className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none scroll-smooth flex-1 min-w-0"
          >
            <button
              onClick={() => setSelectedProjectId('all')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-2 border",
                selectedProjectId === 'all'
                  ? "bg-zinc-900 border-zinc-900 text-white shadow-sm"
                  : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400"
              )}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>All Projects</span>
              <Badge className={cn(
                "text-[9px] px-1.5 py-0 font-mono rounded-md",
                selectedProjectId === 'all' ? "bg-zinc-700 text-white" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              )}>
                {tasks.length}
              </Badge>
            </button>

            {projects.map(p => {
              const pTasksCount = tasks.filter(t => t.projectId === p.id).length;
              const isSelected = selectedProjectId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  title={p.name}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-2 border max-w-[220px]",
                    isSelected
                      ? "bg-zinc-900 border-zinc-900 text-white shadow-sm"
                      : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
                  )}
                >
                  <span className="truncate">{p.name || p.id}</span>
                  <Badge className={cn(
                    "text-[9px] px-1.5 py-0 font-mono rounded-md shrink-0",
                    isSelected ? "bg-zinc-700 text-white" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                  )}>
                    {pTasksCount}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Right Scroll Button */}
          <button
            type="button"
            onClick={() => scrollProjectTabs('right')}
            className="shrink-0 h-8 w-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-all cursor-pointer ml-1.5 z-10 border border-zinc-200/80 dark:border-zinc-800 shadow-xs active:scale-95"
            title="Scroll right to view next projects"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Main Layout (Sidebar + Grid) */}
      <div className="grid grid-cols-12 gap-5 items-start">
        
        {/* SIDEBAR: Unscheduled Tasks */}
        <div className="col-span-12 lg:col-span-3 space-y-4 h-full">
          <div 
            onDragOver={handleDragOverSidebar}
            onDragLeave={handleDragLeaveSidebar}
            onDrop={handleDropOnSidebar}
            className={cn(
              "p-4 rounded-2xl bg-white dark:bg-zinc-950 border transition-all flex flex-col h-[700px] shadow-sm",
              draggedOverSidebar 
                ? "border-red-500 bg-red-50/20 dark:bg-red-500/5 ring-1 ring-red-500" 
                : "border-zinc-200/80 dark:border-zinc-900"
            )}
          >
            {/* Header / Dropzone indicator */}
            <div className="space-y-1 mb-3.5 pb-3 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Unscheduled Tasks</span>
                </span>
                <Badge variant="outline" className="text-[9px] font-extrabold text-zinc-400 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-1.5 py-0.5">
                  {unscheduledTasks.length}
                </Badge>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {draggedOverSidebar ? (
                  <span className="text-red-500 font-extrabold animate-pulse uppercase">Drop here to clear deadline ✦</span>
                ) : (
                  "Drag items onto the calendar grid to assign deadlines."
                )}
              </p>
            </div>

            {/* Quick search input & Add Unscheduled Task button */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Search items..."
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="pl-9 h-8.5 rounded-lg text-xs border-zinc-200 bg-zinc-55/40 pb-0.5"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenCreateModal('')}
                className="w-full text-[10px] font-bold uppercase tracking-wider h-8 rounded-lg border-dashed border-zinc-300 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Unscheduled Task</span>
              </Button>
            </div>

            {/* Draggable items list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {filteredUnscheduledTasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 dark:text-zinc-600 opacity-80">
                  <Clock className="w-8 h-8 stroke-[1.5] mb-2 text-zinc-300 dark:text-zinc-800" />
                  <p className="text-[11px] font-semibold uppercase tracking-wider">No Unscheduled Items</p>
                  <p className="text-[9px] max-w-[150px] mt-0.5 leading-snug">Drag scheduled tasks back here to clear deadlines, or click Add Unscheduled Task above.</p>
                </div>
              ) : (
                filteredUnscheduledTasks.map(task => {
                  const project = projectMap.get(task.projectId);
                  const assignee = userMap.get(task.assigneeId);
                  const colors = getPriorityColors(task.priority);
                  return (
                    <motion.div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={(e) => handleTaskClick(e, task)}
                      className={cn(
                        "p-3 rounded-xl border bg-white dark:bg-zinc-900 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all group border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                        colors.border
                      )}
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.1 }}
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest truncate max-w-[80px]">
                          {project?.name || 'Global'}
                        </span>
                        
                        {/* Priority circle */}
                        <div className="flex items-center space-x-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", colors.dot)} />
                          <span className="text-[7.5px] font-black uppercase tracking-wider text-zinc-400">
                            {task.priority}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-snug tracking-tight group-hover:text-brand-secondary transition-colors break-words line-clamp-2">
                        {task.name}
                      </h4>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-50 dark:border-zinc-800/80">
                        {/* Assignee pill */}
                        {assignee ? (
                          <div className="flex items-center space-x-1.5">
                            <div className="w-4 h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[8px] font-semibold text-zinc-600 dark:text-zinc-300 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-700">
                              {assignee.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium max-w-[80px] truncate">
                              {assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[8px] text-zinc-400 italic">Unassigned</span>
                        )}

                        <span className="text-[8.5px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-950 px-1.5 py-0.5 rounded-lg">
                          {task.type}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* MAIN CALENDAR GRID: Sunday to Saturday */}
        <div className="col-span-12 lg:col-span-9 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/85 dark:border-zinc-900 p-4 shadow-sm">
          
          {/* Days of week titles */}
          <div className="grid grid-cols-7 gap-2 text-center pb-2 border-b border-zinc-100 dark:border-zinc-900">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, idx) => (
              <div 
                key={dayName} 
                className={cn(
                  "text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 py-1",
                  (idx === 0 || idx === 6) && "text-zinc-400 dark:text-zinc-600"
                )}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Day rows grid (6 rows config) */}
          <div className="grid grid-cols-7 gap-2.5 mt-2.5">
            {calendarCells.map((cell) => {
              const isToday = cell.dateStr === todayStr;
              
              // Filter active scheduled tasks for this particular date
              const cellsScheduledTasks = scheduledTasks.filter(t => t.dueDate === cell.dateStr);
              
              // Sorting tasks so that Critical/High priority ones appear at the top
              const sortedTasksOnDay = [...cellsScheduledTasks].sort((a, b) => {
                const priorityWeight = {
                  [Priority.CRITICAL]: 4,
                  [Priority.HIGH]: 3,
                  [Priority.NORMAL]: 2,
                  [Priority.LOW]: 1
                };
                return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
              });

              const isDraggedTarget = draggedOverDateStr === cell.dateStr;

              return (
                <div
                  key={cell.key}
                  onDragOver={(e) => handleDragOverCell(e, cell.dateStr)}
                  onDragLeave={handleDragLeaveCell}
                  onDrop={(e) => handleDropOnCell(e, cell.dateStr)}
                  className={cn(
                    "min-h-[105px] max-h-[130px] p-2 rounded-xl border flex flex-col transition-all cursor-default group relative overflow-hidden",
                    cell.isCurrentMonth
                      ? "bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-900"
                      : "bg-zinc-50/55 dark:bg-zinc-900/15 border-zinc-100 dark:border-zinc-950 text-zinc-400 dark:text-zinc-600",
                    isToday && "bg-amber-500/5 dark:bg-amber-500/5 border-amber-400/45 dark:border-amber-400/35 ring-1 ring-amber-500/20",
                    isDraggedTarget && "bg-brand-secondary/15 dark:bg-brand-secondary/15 border-brand-secondary border-dashed border-2 scale-[0.99] shadow-md z-10"
                  )}
                >
                  {/* Cell Header - Date Number & Interactive Add Plus Button */}
                  <div className="flex items-center justify-between mb-1">
                    <span 
                      className={cn(
                        "text-xs font-bold leading-none select-none my-1 flex items-center justify-center rounded-full h-5.5 w-5.5 text-zinc-700 dark:text-zinc-300",
                        isToday && "bg-amber-500 text-white dark:text-zinc-950 font-black shadow-sm scale-105"
                      )}
                    >
                      {cell.dayLabel}
                    </span>

                    <div className="flex items-center gap-1">
                      {sortedTasksOnDay.length > 0 && (
                        <span className="text-[8.5px] font-extrabold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-900/60 px-1.5 py-0.5 rounded-md min-w-[16px] text-center">
                          {sortedTasksOnDay.length}
                        </span>
                      )}
                      
                      {/* Plus button explicitly opens create task dialog with prefilled date */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCreateModal(cell.dateStr);
                        }}
                        className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-0.5 rounded-md transition-all cursor-pointer opacity-70 hover:opacity-100"
                        title={`Add task for ${cell.dateStr}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Day Tasks List (Scrollable on overflow) */}
                  <div className="flex-1 overflow-y-auto space-y-1 scrollbar-none pr-0.5 min-h-0">
                    {sortedTasksOnDay.map(task => {
                      const colors = getPriorityColors(task.priority);
                      const project = projectMap.get(task.projectId);
                      const assignee = userMap.get(task.assigneeId);

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={(e) => handleTaskClick(e, task)}
                          className={cn(
                            "px-1.5 py-1 rounded-md text-[10px] font-medium border shadow-[0px_1px_1px_rgba(0,0,0,0.02)] cursor-grab active:cursor-grabbing hover:brightness-95 dark:hover:brightness-110 flex items-center justify-between transition-all select-none truncate",
                            colors.bg,
                            colors.border,
                            colors.text
                          )}
                          title={`${project?.name || 'Project'}: ${task.name} (${task.priority})`}
                        >
                          <div className="flex items-center space-x-1 min-w-0 flex-1 mr-1">
                            {/* Color Dot representing priority */}
                            <span className={cn("w-1 h-1 rounded-full shrink-0", colors.dot)} />
                            <span className="truncate leading-none text-[9.5px] font-bold text-zinc-800 dark:text-zinc-100">
                              {task.name}
                            </span>
                          </div>

                          {/* Initials badge */}
                          {assignee && (
                            <div className="w-3.5 h-3.5 rounded-full bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/60 text-[7px] font-extrabold flex items-center justify-center shrink-0 tracking-tighter">
                              {assignee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. CREATE NEW TASK DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[520px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleCreateTaskSubmit}>
            <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-900">
              <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-secondary" />
                <span>Create New Calendar Task</span>
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-3.5 text-xs">
              {/* Task Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Task Name *
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Design Homepage Banner, SEO Audit..."
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="h-9 text-xs rounded-xl border-zinc-200"
                  required
                />
              </div>

              {/* Project & Assignee row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Project
                  </label>
                  <select
                    value={newTaskProjectId}
                    onChange={(e) => setNewTaskProjectId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 hover:border-zinc-400 rounded-xl px-2.5 h-9 font-medium text-xs text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Assignee
                  </label>
                  <select
                    value={newTaskAssigneeId}
                    onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 hover:border-zinc-400 rounded-xl px-2.5 h-9 font-medium text-xs text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.department})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date & Category row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Deadline Date
                  </label>
                  <Input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="h-9 text-xs rounded-xl border-zinc-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Work Category / Type
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Design, SEO, Web..."
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value)}
                    className="h-9 text-xs rounded-xl border-zinc-200"
                  />
                </div>
              </div>

              {/* Priority & Status row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 hover:border-zinc-400 rounded-xl px-2.5 h-9 font-medium text-xs text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                  >
                    {Object.values(Priority).map(pr => (
                      <option key={pr} value={pr}>{pr}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Initial Status
                  </label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value as TaskStatus)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 hover:border-zinc-400 rounded-xl px-2.5 h-9 font-medium text-xs text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                  >
                    {Object.values(TaskStatus).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time Estimate & Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Estimated Hours
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={newTaskTimeEstimate}
                  onChange={(e) => setNewTaskTimeEstimate(e.target.value)}
                  className="h-9 text-xs rounded-xl border-zinc-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or requirements..."
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-400 resize-none"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="h-9 text-xs font-bold rounded-xl border-zinc-200 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 text-xs font-bold rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
              >
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. TASK DETAILS DIALOG (Interactive preview inside calendar) */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        {selectedTask && (() => {
          const project = projectMap.get(selectedTask.projectId);
          const assignee = userMap.get(selectedTask.assigneeId);
          const colors = getPriorityColors(selectedTask.priority);
          return (
            <DialogContent className="sm:max-w-[520px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl p-6 shadow-xl">
              <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-900">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] font-bold text-brand-secondary border-brand-secondary/35 bg-brand-secondary/5 uppercase px-2 py-0.5">
                    {project?.name || 'Global Pipeline'}
                  </Badge>
                  
                  <div className="flex items-center space-x-2">
                    <span className={cn("w-2 h-2 rounded-full", colors.dot)} />
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-zinc-500">
                      {selectedTask.priority} Priority
                    </span>
                  </div>
                </div>
                
                <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                  {selectedTask.name}
                </DialogTitle>
              </DialogHeader>

              {/* Task stats and summary parameters */}
              <div className="py-4 space-y-4 text-xs">
                {selectedTask.description && (
                  <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="text-[9.5px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1 flex items-center">
                      <FileText className="w-3 h-3 mr-1" /> Description
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal whitespace-pre-wrap">
                      {selectedTask.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {/* Project Selector */}
                  <div className="space-y-1 bg-zinc-50/50 dark:bg-zinc-900/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-900">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center">
                      <FolderKanban className="w-3 h-3 mr-1" /> Project
                    </span>
                    <select
                      value={selectedTask.projectId}
                      onChange={(e) => handleUpdateSelectedTaskField('projectId', e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 rounded-lg p-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer mt-1"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assignee Selector */}
                  <div className="space-y-1 bg-zinc-50/50 dark:bg-zinc-900/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-900">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center">
                      <User className="w-3 h-3 mr-1" /> Assignee
                    </span>
                    <select
                      value={selectedTask.assigneeId}
                      onChange={(e) => handleUpdateSelectedTaskField('assigneeId', e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 rounded-lg p-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer mt-1"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Deadline Date Edit */}
                  <div className="space-y-1 bg-zinc-50/50 dark:bg-zinc-900/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-900">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center">
                      <CalendarIcon className="w-3 h-3 mr-1" /> Deadline Date
                    </span>
                    <Input
                      type="date"
                      value={selectedTask.dueDate || ''}
                      onChange={(e) => handleUpdateSelectedTaskField('dueDate', e.target.value)}
                      className="h-8 text-xs font-bold rounded-lg border-zinc-200 bg-white dark:bg-zinc-900 mt-1"
                    />
                  </div>

                  {/* Task Priority Selector */}
                  <div className="space-y-1 bg-zinc-50/50 dark:bg-zinc-900/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-900">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center">
                      <Activity className="w-3 h-3 mr-1" /> Priority
                    </span>
                    <select
                      value={selectedTask.priority}
                      onChange={(e) => handleUpdateSelectedTaskField('priority', e.target.value as Priority)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 rounded-lg p-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer mt-1"
                    >
                      {Object.values(Priority).map(priority => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Interactive dropdown status */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Current Task Status</span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleUpdateSelectedTaskField('status', e.target.value as TaskStatus)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 hover:border-zinc-400 rounded-xl px-2.5 h-9 font-medium text-xs text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                  >
                    {Object.values(TaskStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action operations footer */}
              <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center sm:space-x-2 -mx-6 -mb-6 p-6 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-b-2xl">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteTask}
                  className="text-red-650 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 h-9 font-bold text-[9px] uppercase tracking-widest cursor-pointer rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete Task
                </Button>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDetailOpen(false)}
                    className="border-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 h-9 px-4 font-bold text-[9px] uppercase tracking-widest cursor-pointer rounded-xl"
                  >
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          );
        })()}
      </Dialog>

    </div>
  );
}

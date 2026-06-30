import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Overview } from './components/dashboard/Overview';
import { Button } from '@/components/ui/button';
import { 
  User as UserIcon, 
  ChevronRight, 
  Search, 
  Bell, 
  SearchIcon,
  Filter,
  Activity,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  CheckCheck,
  Trash2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_USERS, MOCK_PROJECTS, MOCK_TASKS } from './mockData';
import { UserRole, Project, Task, ProjectType, TaskStatus, Priority, UserProfile, ClientReport, ClientInvoice, ADMIN_ROLES } from './types';
import { cn } from '@/lib/utils';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

import { ProjectBoard } from './components/dashboard/ProjectBoard';
import { TaskEngine } from './components/dashboard/TaskEngine';
import { TeamView } from './components/dashboard/TeamView';
import { UserManagement } from './components/dashboard/UserManagement';
import { ClientReports } from './components/dashboard/ClientReports';
import { ClientInvoices } from './components/dashboard/ClientInvoices';
import { ReportBuilder } from './components/dashboard/ReportBuilder';
import { TimeSheet } from './components/dashboard/TimeSheet';
import { ClientPortal } from './components/portal/ClientPortal';
import { LoginPage } from './components/auth/LoginPage';
import { UserProfileView } from './components/dashboard/UserProfileView';
import { CalendarView } from './components/dashboard/CalendarView';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { suggestAssignee } from './lib/gemini';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster, toast } from 'sonner';

function Dashboard() {
  const { user: nullableUser, setUser, logout } = useAuth();
  const user = nullableUser!;
  const { theme, toggleTheme, fontSize } = useTheme();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(user.role === UserRole.CLIENT ? 'portal' : 'overview');

  // Automatically reset active tab if user role changes
  React.useEffect(() => {
    if (user) {
      setActiveTab(user.role === UserRole.CLIENT ? 'portal' : 'overview');
    }
  }, [user.id, user.role]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectWebsite, setNewProjectWebsite] = useState('');
  const [newProjectType, setNewProjectType] = useState('Retainer');
  const [selectedAMId, setSelectedAMId] = useState<string>('072'); // Default to Amit
  const [newProjectClientId, setNewProjectClientId] = useState<string>('client-1'); // Default to Sarah Johnson
  const [isAssigning, setIsAssigning] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('blufig_projects');
      return saved ? JSON.parse(saved) : MOCK_PROJECTS;
    } catch {
      return MOCK_PROJECTS;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('blufig_projects', JSON.stringify(projects));
    } catch (e) {
      console.error(e);
    }
  }, [projects]);
  
  const [pinnedProjectIds, setPinnedProjectIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pinnedProjectIds');
      return saved ? JSON.parse(saved) : ['p1'];
    } catch {
      return ['p1'];
    }
  });

  const togglePinProject = (projectId: string) => {
    setPinnedProjectIds(prev => {
      const next = prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId];
      try {
        localStorage.setItem('pinnedProjectIds', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('blufig_tasks');
      return saved ? JSON.parse(saved) : MOCK_TASKS;
    } catch {
      return MOCK_TASKS;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('blufig_tasks', JSON.stringify(tasks));
    } catch (e) {
      console.error(e);
    }
  }, [tasks]);

  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('blufig_users');
      return saved ? JSON.parse(saved) : MOCK_USERS;
    } catch {
      return MOCK_USERS;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('blufig_users', JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  const [reports, setReports] = useState<ClientReport[]>(() => {
    const defaultReports: ClientReport[] = [
      { id: 'rep-1', projectId: 'p1', title: 'Monthly SEO Review - May 2024', date: '2024-05-10', type: 'Monthly', status: 'Published' },
      { id: 'rep-2', projectId: 'p2', title: 'Paid Social Performance Flash', date: '2024-05-12', type: 'Weekly', status: 'Published' },
    ];
    try {
      const saved = localStorage.getItem('blufig_reports');
      return saved ? JSON.parse(saved) : defaultReports;
    } catch {
      return defaultReports;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('blufig_reports', JSON.stringify(reports));
    } catch (e) {
      console.error(e);
    }
  }, [reports]);

  const [invoices, setInvoices] = useState<ClientInvoice[]>(() => {
    const defaultInvoices: ClientInvoice[] = [
      { id: 'inv-1', projectId: 'p1', invoiceNumber: 'INV-2024-001', amount: 1500, currency: 'USD', date: '2024-05-01', dueDate: '2024-05-15', status: 'Paid' },
      { id: 'inv-2', projectId: 'p2', invoiceNumber: 'INV-2024-002', amount: 2800, currency: 'USD', date: '2024-05-10', dueDate: '2024-05-24', status: 'Pending' },
    ];
    try {
      const saved = localStorage.getItem('blufig_invoices');
      return saved ? JSON.parse(saved) : defaultInvoices;
    } catch {
      return defaultInvoices;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('blufig_invoices', JSON.stringify(invoices));
    } catch (e) {
      console.error(e);
    }
  }, [invoices]);

  const isAdmin = ADMIN_ROLES.includes(user.role);

  // Global Search state and real-time highlighted filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-orange-500/20 text-orange-600 dark:text-orange-400 font-extrabold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const filteredProjectsForSearch = searchQuery.trim() === '' ? [] : projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 4);

  const filteredTasksForSearch = searchQuery.trim() === '' ? [] : tasks.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 5);

  const filteredUsersForSearch = searchQuery.trim() === '' ? [] : users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.department.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 4);

  const hasSearchResults = filteredProjectsForSearch.length > 0 || filteredTasksForSearch.length > 0 || filteredUsersForSearch.length > 0;

  // Stateful notifications loop
  interface NotificationItem {
    id: string;
    title: string;
    message: string;
    time: string;
    isRead: boolean;
    type: 'info' | 'alert' | 'success' | 'task';
    taskId?: string;
  }

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'noti-custom-t1',
      title: '📋 Task Assigned to You',
      message: 'You have been assigned to task "Monthly SEO Audit". Click here to view details and get started.',
      time: 'Just now',
      isRead: false,
      type: 'task',
      taskId: 't1'
    },
    {
      id: 'noti-1',
      title: 'Active Project Assigned',
      message: 'You have been assigned to supervise the BluFig Brand Identity & Campaign streams.',
      time: '1 hr ago',
      isRead: false,
      type: 'info'
    },
    {
      id: 'noti-2',
      title: 'High Priority Milestone',
      message: 'Workflow item "Refine campaign design system" is scheduled for tomorrow evening.',
      time: '3 hrs ago',
      isRead: false,
      type: 'alert'
    },
    {
      id: 'noti-3',
      title: 'Retainer Invoice Processed',
      message: 'The secure invoice #INV-2024-001 has been marked successfully as Paid.',
      time: 'Yesterday',
      isRead: true,
      type: 'success'
    },
    {
      id: 'noti-4',
      title: 'Logs verified',
      message: 'Strategic hour worksheets for this week were processed and verified.',
      time: '2 days ago',
      isRead: true,
      type: 'info'
    }
  ]);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success("All notifications marked as read!");
  };

  const handleClearAll = () => {
    setNotifications([]);
    toast.info("Notifications cleared successfully.");
  };

  const handleToggleRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n));
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    // Mark as read
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    
    if (notif.taskId) {
      const taskItem = tasks.find(t => t.id === notif.taskId);
      if (taskItem) {
        // Clear contradictory UI filters so that the task is visible
        setFilterAssigneeId(null);
        setFilterStatus(null);
        setFilterPriority(null);
        setSelectedProjectId(taskItem.projectId);
        setHighlightedTaskId(notif.taskId);
        setActiveTab('tasks');
        setIsNotificationsOpen(false);
        toast.success(`Opening assignment: "${taskItem.name}"`);
      } else {
        toast.error("Referenced task could not be found.");
      }
    }
  };

  // Keep track of previously loaded tasks to detect new assignments to the logged in user
  const prevTasksRef = React.useRef<Task[]>([]);

  React.useEffect(() => {
    const prevTasks = prevTasksRef.current;
    if (prevTasks && prevTasks.length > 0) {
      tasks.forEach(currentTask => {
        const matchingPrevTask = prevTasks.find(pt => pt.id === currentTask.id);
        
        // Scenario A: Newly created task, assigned to current user, was not in previous tasks, and assignee is current user
        if (!matchingPrevTask) {
          if (currentTask.assigneeId === user.id) {
            const newNotif: NotificationItem = {
              id: `noti-${Date.now()}-${currentTask.id}`,
              title: '🆕 Assigned to New Task',
              message: `You have been assigned to task "${currentTask.name}" by the project coordinator.`,
              time: 'Just now',
              isRead: false,
              type: 'task',
              taskId: currentTask.id
            };
            setNotifications(prev => [newNotif, ...prev]);
            toast.info(`New assignment: "${currentTask.name}" has been added to your notifications.`);
          }
        }
        // Scenario B: Existing task assignee changed from someone else to current user
        else if (matchingPrevTask.assigneeId !== currentTask.assigneeId && currentTask.assigneeId === user.id) {
          const newNotif: NotificationItem = {
            id: `noti-${Date.now()}-${currentTask.id}`,
            title: '🚀 Task Handed Over to You',
            message: `Task "${currentTask.name}" has been reassigned to you. Click to review.`,
            time: 'Just now',
            isRead: false,
            type: 'task',
            taskId: currentTask.id
          };
          setNotifications(prev => [newNotif, ...prev]);
          toast.info(`Task "${currentTask.name}" was transferred to your workspace.`);
        }
      });
    }
    // Update reference
    prevTasksRef.current = tasks;
  }, [tasks, user.id]);


  // Lifted Timer State running in background on tab changes
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    MOCK_TASKS.forEach(t => {
      initial[t.id] = t.timeLoggedSeconds ?? (t.timeLogged ? Math.round(t.timeLogged * 3600) : 0);
    });
    return initial;
  });

  // Keep it in sync for newly created or updated tasks
  React.useEffect(() => {
    setElapsedTimes(prev => {
      const updated = { ...prev };
      let changed = false;
      tasks.forEach(t => {
        const val = t.timeLoggedSeconds ?? (t.timeLogged ? Math.round(t.timeLogged * 3600) : 0);
        if (updated[t.id] === undefined || (activeTimerTaskId !== t.id && updated[t.id] !== val)) {
          updated[t.id] = val;
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [tasks, activeTimerTaskId]);

  // Toast-based notification alert system for Project Managers (roles like AGENCY_ADMIN, ACCOUNT_DIRECTOR, ACCOUNT_MANAGER)
  const alertedTasksRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!user) return;
    
    const isProjectManager = 
      user.role === UserRole.AGENCY_ADMIN || 
      user.role === UserRole.ACCOUNT_DIRECTOR || 
      user.role === UserRole.ACCOUNT_MANAGER;

    if (!isProjectManager) return;

    const now = new Date();
    
    tasks.forEach(task => {
      if (task.status !== TaskStatus.OPEN) return;
      if (alertedTasksRef.current.has(task.id)) return;

      const dueDate = new Date(task.dueDate);
      if (isNaN(dueDate.getTime())) return;

      const diffTime = dueDate.getTime() - now.getTime();
      const diffHours = diffTime / (1000 * 60 * 60);

      const isSameDay = 
        dueDate.getFullYear() === now.getFullYear() &&
        dueDate.getMonth() === now.getMonth() &&
        dueDate.getDate() === now.getDate();

      // Within 24 hours window: due within the next 24 hours OR has a due date of today
      const isWithin24Hours = (diffHours > 0 && diffHours <= 24) || isSameDay;

      if (isWithin24Hours) {
        alertedTasksRef.current.add(task.id);
        
        toast.warning("Urgent: Open Task Due within 24h", {
          description: `Task "${task.name}" is due soon (${task.dueDate}) and remains unresolved.`,
          duration: 10000,
          action: {
            label: "Review Task",
            onClick: () => {
              setActiveTab('tasks');
            }
          }
        });
      }
    });
  }, [tasks, user, user?.role]);

  // Track timers in real-time
  React.useEffect(() => {
    let interval: any = null;
    if (activeTimerTaskId) {
      interval = setInterval(() => {
        setElapsedTimes(prev => {
          const updatedSeconds = (prev[activeTimerTaskId] || 0) + 1;
          
          // Write back directly to tasks periodically so state stays fully synced
          setTasks(prevTasks => prevTasks.map(t => 
            t.id === activeTimerTaskId 
              ? { 
                  ...t, 
                  timeLoggedSeconds: updatedSeconds, 
                  timeLogged: parseFloat((updatedSeconds / 3600).toFixed(4)) 
                } 
              : t
          ));

          return {
            ...prev,
            [activeTimerTaskId]: updatedSeconds
          };
        });
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

  const toggleTimer = (taskId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (activeTimerTaskId === taskId) {
      setActiveTimerTaskId(null);
      const finalSecs = elapsedTimes[taskId] || 0;
      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { 
              ...t, 
              timeLoggedSeconds: finalSecs, 
              timeLogged: parseFloat((finalSecs / 3600).toFixed(4)) 
            } 
          : t
      ));
    } else {
      if (activeTimerTaskId) {
        const runningId = activeTimerTaskId;
        const currentSecs = elapsedTimes[runningId] || 0;
        setTasks(prev => prev.map(t => 
          t.id === runningId 
            ? { 
                ...t, 
                timeLoggedSeconds: currentSecs, 
                timeLogged: parseFloat((currentSecs / 3600).toFixed(4)) 
              } 
            : t
        ));
      }
      setActiveTimerTaskId(taskId);
      // Automatically set task to "In Progress" if it wasn't
      setTasks(prev => prev.map(t => 
        t.id === taskId && t.status !== TaskStatus.IN_PROGRESS && t.status !== TaskStatus.REVIEW && t.status !== TaskStatus.DONE
          ? { ...t, status: TaskStatus.IN_PROGRESS } 
          : t
      ));
    }
  };

  const handleCreateProject = async () => {
    setIsAssigning(true);
    try {
      // Simulate AI assignment for a "Briefing" task
      const suggestion = await suggestAssignee(
        `Initial briefing for ${newProjectName}`,
        'Brief Writing',
        users
      );
      
      setAiSuggestion(suggestion);
      // We do not override selectedAMId here to avoid overriding user's manual choice automatically.
      // Instead, we let them see the suggestion and optionally apply it via a button.
      setIsAssigning(false);
    } catch (error) {
      console.error(error);
      setIsAssigning(false);
    }
  };

  const handleOpenCreateProject = () => {
    setNewProjectName('');
    setNewProjectWebsite('');
    setNewProjectType('Retainer');
    setAiSuggestion(null);
    
    if (user && user.role === UserRole.CLIENT) {
      setNewProjectClientId(user.id);
    } else {
      const firstClient = users.find(u => u.role === UserRole.CLIENT);
      setNewProjectClientId(firstClient ? firstClient.id : 'client-1');
    }
    
    const firstAM = users.find(u => u.role !== UserRole.CLIENT);
    setSelectedAMId(firstAM ? firstAM.id : '072');
    
    setIsCreateDialogOpen(true);
  };

  const handleUpdateProjectAM = (projectId: string, amId: string) => {
    setProjects(prevProjects => prevProjects.map(p => 
      p.id === projectId 
        ? { ...p, accountManagerId: amId }
        : p
    ));
    
    const chosenUser = users.find(u => u.id === amId);
    if (chosenUser) {
      toast.success(`Project has been assigned to ${chosenUser.name} (${chosenUser.designation || chosenUser.role.replace('_', ' ')})!`);
    } else {
      toast.success(`Project assignee updated.`);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setTasks(prev => prev.filter(t => t.projectId !== projectId));
    toast.success("Project and all associated tasks deleted.");
  };

  const handleUpdateProjectStatus = (projectId: string, status: 'Active' | 'Completed' | 'On Hold' | 'Pending') => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status } : p));
    toast.success(`Project status updated to ${status}.`);
  };

  const handleConfirmProject = () => {
    const projectId = 'p' + (projects.length + 1);
    const resolvedWebsite = newProjectWebsite.trim() 
      ? (newProjectWebsite.startsWith('http://') || newProjectWebsite.startsWith('https://') ? newProjectWebsite.trim() : `https://${newProjectWebsite.trim()}`)
      : `https://${newProjectName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'project'}.com`;

    const resolvedClientId = user && user.role === UserRole.CLIENT ? user.id : newProjectClientId;

    const newProject: Project = {
      id: projectId,
      name: newProjectName,
      clientId: resolvedClientId,
      accountManagerId: selectedAMId,
      type: newProjectType as ProjectType,
      status: 'Active',
      startDate: new Date().toISOString().split('T')[0],
      websiteUrl: resolvedWebsite
    };

    const newTask: Task = {
      id: 't' + (tasks.length + 1),
      projectId: projectId,
      deliverableId: 'd-initial',
      name: 'Initial Project Brief & Strategy',
      type: 'Strategy',
      assigneeId: selectedAMId,
      status: TaskStatus.OPEN,
      priority: Priority.HIGH,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subTasks: []
    };

    setProjects([...projects, newProject]);
    setTasks([...tasks, newTask]);
    
    setIsCreateDialogOpen(false);
    setAiSuggestion(null);
    setNewProjectName('');
    setNewProjectWebsite('');
    
    // Redirect to the new project's board or tasks
    setSelectedProjectId(projectId);
    setActiveTab('projects');
  };

  const handleAddUser = (newUser: UserProfile) => {
    setUsers([...users, newUser]);
  };

  const handleRemoveUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
  };

  const handleAddReport = (newReport: ClientReport) => {
    setReports([newReport, ...reports]);
  };

  const handleRemoveReport = (reportId: string) => {
    setReports(reports.filter(r => r.id !== reportId));
  };

  const handleAddInvoice = (newInvoice: ClientInvoice) => {
    setInvoices([newInvoice, ...invoices]);
  };

  const handleRemoveInvoice = (invoiceId: string) => {
    setInvoices(invoices.filter(i => i.id !== invoiceId));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Overview 
            projects={projects} 
            tasks={tasks} 
            pinnedProjectIds={pinnedProjectIds}
            onTogglePin={togglePinProject}
            onClickProject={(projectId) => {
              setSelectedProjectId(projectId);
              setActiveTab('tasks');
            }}
            onNavigateToProjects={() => setActiveTab('projects')}
          />
        );
      case 'projects':
        return <ProjectBoard 
          projects={projects}
          tasks={tasks}
          users={users}
          pinnedProjectIds={pinnedProjectIds}
          onTogglePin={togglePinProject}
          onProjectClick={(projectId) => {
            setSelectedProjectId(projectId);
            setActiveTab('tasks');
          }} 
          onAddProjectClick={handleOpenCreateProject}
          onUpdateProjectAM={handleUpdateProjectAM}
          currentUser={user}
        />;
      case 'tasks':
        return <TaskEngine 
          tasks={tasks}
          setTasks={setTasks}
          projects={projects}
          users={users}
          filterProjectId={selectedProjectId} 
          onClearFilter={() => setSelectedProjectId(null)} 
          filterAssigneeId={filterAssigneeId}
          onClearFilterAssignee={() => setFilterAssigneeId(null)}
          filterStatus={filterStatus}
          onClearFilterStatus={() => setFilterStatus(null)}
          filterPriority={filterPriority}
          onClearFilterPriority={() => setFilterPriority(null)}
          activeTimerTaskId={activeTimerTaskId}
          setActiveTimerTaskId={setActiveTimerTaskId}
          elapsedTimes={elapsedTimes}
          setElapsedTimes={setElapsedTimes}
          formatTime={formatTime}
          toggleTimer={toggleTimer}
          highlightedTaskId={highlightedTaskId}
          setHighlightedTaskId={setHighlightedTaskId}
        />;
      case 'calendar':
        const filteredCalendarTasks = tasks.filter(t => {
          if (user && ADMIN_ROLES.includes(user.role)) return true;
          const isWorkflowAssignee = t.workflowSteps?.some(step => step.assigneeId === user?.id);
          return t.assigneeId === user?.id || isWorkflowAssignee;
        });
        return (
          <CalendarView 
            tasks={filteredCalendarTasks}
            setTasks={setTasks}
            projects={projects}
            users={users}
          />
        );
      case 'team':
        return <TeamView users={users} setUsers={setUsers} />;
      case 'profile':
        return (
          <UserProfileView 
            usersList={users} 
            onUpdateUsers={setUsers} 
            onOpenRoleSwitcher={() => setShowRoleSwitcher(true)}
          />
        );
      case 'admin':
        return isAdmin ? (
          <UserManagement 
            users={users} 
            onAddUser={handleAddUser} 
            onRemoveUser={handleRemoveUser} 
            onUpdateUsers={setUsers}
          />
        ) : <Overview projects={projects} tasks={tasks} />;
      case 'reports':
        return <ClientReports 
          reports={reports} 
          projects={projects} 
          onAddReport={handleAddReport} 
          onRemoveReport={handleRemoveReport} 
        />;
      case 'billing':
        return <ClientInvoices 
          invoices={invoices} 
          projects={projects} 
          onAddInvoice={handleAddInvoice} 
          onRemoveInvoice={handleRemoveInvoice} 
        />;
      case 'time':
        return <TimeSheet 
          tasks={tasks}
          setTasks={setTasks}
          projects={projects}
          activeTimerTaskId={activeTimerTaskId}
          elapsedTimes={elapsedTimes}
          toggleTimer={toggleTimer}
          formatTime={formatTime}
        />;
      case 'portal':
        return <ClientPortal 
          users={users}
          tasks={tasks}
          projects={projects}
          reports={reports}
          invoices={invoices}
          onAddReport={handleAddReport}
          onRemoveReport={handleRemoveReport}
          onAddInvoice={handleAddInvoice}
          onRemoveInvoice={handleRemoveInvoice}
          elapsedTimes={elapsedTimes}
          formatTime={formatTime}
        />;
      default:
        return <Overview projects={projects} tasks={tasks} />;
    }
  };

  const isClient = user.role === UserRole.CLIENT;

  const getFontSizeStyle = (size: string) => {
    switch (size) {
      case 'sm': return { fontSize: '0.875rem' };
      case 'lg': return { fontSize: '1.125rem' };
      case 'xl': return { fontSize: '1.25rem' };
      default: return { fontSize: '1rem' };
    }
  };

  return (
    <div 
      className="flex min-h-screen bg-background font-sans text-foreground transition-colors duration-200"
      style={getFontSizeStyle(fontSize)}
    >
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={user.role} />
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            {/* Slide-out Sidebar Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative flex w-full max-w-xs flex-1 flex-col bg-card h-full shadow-2xl"
            >
              <div className="absolute right-4 top-4 z-50">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <Sidebar 
                  activeTab={activeTab} 
                  setActiveTab={(tab) => {
                    setActiveTab(tab);
                    setSidebarOpen(false);
                  }} 
                  userRole={user.role} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-8 bg-card border-b border-border sticky top-0 z-10 gap-4 transition-colors duration-200">
          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 max-w-xl">
            {/* Mobile Hamburger Menu Toggle Button */}
            <Button 
              variant="outline" 
              size="icon" 
              className="lg:hidden h-9 w-9 shrink-0 text-zinc-650 dark:text-zinc-400 border-border"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="relative w-full hidden sm:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => {
                    // Slight delay to allow clicked item handlers to complete
                    setTimeout(() => setIsSearchFocused(false), 200);
                  }}
                  placeholder="Search projects, tasks, or experts..." 
                  className="pl-10 pr-8 h-9 bg-zinc-50 dark:bg-zinc-900 border-none focus-visible:ring-1 focus-visible:ring-border text-foreground placeholder:text-zinc-400 w-full" 
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300 rounded"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* SEARCH RESULTS POPUP DROPDOWN */}
              {isSearchFocused && searchQuery.trim() !== '' && (
                <div className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-50 max-h-[420px] overflow-y-auto overflow-x-hidden custom-scrollbar divide-y divide-border font-sans">
                  
                  {/* Categorized Groups */}
                  {!hasSearchResults && (
                    <div className="p-6 text-center text-zinc-455 text-zinc-400 dark:text-zinc-500 font-medium">
                      No results match <span className="font-bold">"{searchQuery}"</span>
                    </div>
                  )}

                  {/* 1. Projects Category */}
                  {filteredProjectsForSearch.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                        <span>Projects</span>
                        <span className="text-[9px] lowercase font-normal bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-full">
                          {filteredProjectsForSearch.length} found
                        </span>
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {filteredProjectsForSearch.map(proj => (
                          <div
                            key={proj.id}
                            onMouseDown={() => {
                              setSelectedProjectId(proj.id);
                              setActiveTab('tasks');
                              setSearchQuery('');
                              toast.info(`Filtering tasks for project: ${proj.name}`);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60 text-left transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-250 truncate">
                                {highlightText(proj.name, searchQuery)}
                              </p>
                              {proj.description && (
                                <p className="text-[10px] text-zinc-450 dark:text-zinc-500 truncate mt-0.5 font-medium leading-none">
                                  {highlightText(proj.description, searchQuery)}
                                </p>
                              )}
                            </div>
                            <span className="text-[9px] bg-zinc-150 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded font-extrabold uppercase shrink-0 font-mono ml-2">
                              {proj.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Tasks Category */}
                  {filteredTasksForSearch.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                        <span>Tasks & Deliverables</span>
                        <span className="text-[9px] lowercase font-normal bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-full">
                          {filteredTasksForSearch.length} found
                        </span>
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {filteredTasksForSearch.map(tk => (
                          <div
                            key={tk.id}
                            onMouseDown={() => {
                              // Find corresponding task's project
                              const taskProj = projects.find(p => p.id === tk.projectId);
                              if (taskProj) {
                                setSelectedProjectId(tk.projectId);
                              }
                              setActiveTab('tasks');
                              setSearchQuery('');
                              toast.info(`Reviewing task: ${tk.name}`);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60 text-left transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-250 truncate">
                                {highlightText(tk.name, searchQuery)}
                              </p>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <span className="text-[9px] text-zinc-450 dark:text-zinc-550 font-semibold uppercase">
                                  Due {tk.dueDate}
                                </span>
                                <span className={`text-[8px] px-1 rounded font-bold uppercase ${
                                  tk.priority === 'Critical' ? 'bg-red-500/10 text-red-550' :
                                  tk.priority === 'High' ? 'bg-orange-550/10 text-orange-550' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                                }`}>
                                  {tk.priority}
                                </span>
                              </div>
                            </div>
                            <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 text-zinc-650 px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0 tracking-wide font-sans ml-2">
                              {tk.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Experts Category */}
                  {filteredUsersForSearch.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                        <span>Agency Team & Specialists</span>
                        <span className="text-[9px] lowercase font-normal bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-full">
                          {filteredUsersForSearch.length} found
                        </span>
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {filteredUsersForSearch.map(tkUser => (
                          <div
                            key={tkUser.id}
                            onMouseDown={() => {
                              setActiveTab('profile');
                              setSearchQuery('');
                              toast.info(`Showing profile card details for: ${tkUser.name}`);
                            }}
                            className="w-full flex items-center p-2 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60 text-left transition-colors"
                          >
                            <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold shrink-0 border border-zinc-200/50 mr-2.5">
                              {tkUser.avatarUrl && tkUser.avatarUrl.length < 4 ? tkUser.avatarUrl : tkUser.name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-250 truncate">
                                {highlightText(tkUser.name, searchQuery)}
                              </p>
                              <p className="text-[9px] text-zinc-450 dark:text-zinc-500 truncate uppercase mt-0.5 font-bold tracking-wider">
                                {highlightText(tkUser.designation, searchQuery)} • {highlightText(tkUser.department, searchQuery)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Theme Toggle Button */}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-500 hover:rotate-45 transition-transform" />
                ) : (
                  <Moon className="w-5 h-5 text-zinc-700 hover:text-indigo-600" />
                )}
              </Button>
            </motion.div>

            <Button variant="ghost" size="icon" className="text-zinc-650 dark:text-zinc-400" onClick={() => logout()}>
              <LogOut className="w-5 h-5 text-red-500" />
            </Button>
            
            <div className="relative">
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-zinc-650 dark:text-zinc-400 relative hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  title="View Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </motion.div>

              {/* Notifications Dropdown Window */}
              {isNotificationsOpen && (
                <>
                  {/* Backdrop overlay to safely click off and close */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsNotificationsOpen(false)} 
                  />
                  
                  <div className="absolute -right-12 sm:right-0 mt-2 w-[calc(100vw-32px)] xs:w-80 sm:w-96 max-w-[360px] sm:max-w-none bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden font-sans origin-top-right animate-in fade-in slide-in-from-top-3 duration-250">
                    <div className="p-4 border-b border-border flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/20">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Live Workspace Briefs</h4>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">{unreadCount} unread update{(unreadCount === 1) ? '' : 's'}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {unreadCount > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-[10px] h-7 font-bold text-brand-secondary px-2 rounded-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAllRead();
                            }}
                          >
                            <CheckCheck className="w-3 h-3 mr-1" />
                            Mark all read
                          </Button>
                        )}
                        {notifications.length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-[10px] h-7 font-bold text-zinc-400 hover:text-red-500 px-2 rounded-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearAll();
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost" 
                          size="icon" 
                          className="w-7 h-7 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                          onClick={() => setIsNotificationsOpen(false)}
                          title="Close Panel"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto divide-y divide-border">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 space-y-2">
                          <CheckCircle className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto" />
                          <p className="text-xs font-medium">All caught up!</p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">New system briefings will appear here.</p>
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div 
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={cn(
                              "p-3.5 flex items-start space-x-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors select-none",
                              !notif.isRead ? "bg-orange-500/[0.02]" : "opacity-80"
                            )}
                          >
                            <div className="pt-0.5">
                              {notif.type === 'alert' ? (
                                <AlertCircle className="w-4 h-4 text-orange-500" />
                              ) : notif.type === 'success' ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className={cn(
                                  "text-xs truncate",
                                  !notif.isRead ? "font-bold text-zinc-950 dark:text-zinc-100" : "font-medium text-zinc-650 dark:text-zinc-400"
                                )}>
                                  {notif.title}
                                </p>
                                <span className="text-[9px] text-zinc-400 font-mono shrink-0 ml-2">
                                  {notif.time}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed font-sans">
                                {notif.message}
                              </p>
                              {!notif.isRead && (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-secondary mt-1.5" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="h-8 w-[1px] bg-border hidden sm:block mx-1" />
            
            <div 
              className="flex items-center space-x-2 sm:space-x-3 shrink-0 group cursor-pointer" 
              onClick={() => {
                setActiveTab('profile');
              }}
              title="View & Edit Profile Preferences"
            >
              <div className="text-right hidden md:block select-none">
                <p className="text-sm font-semibold leading-none text-zinc-900 dark:text-zinc-100 group-hover:text-brand-secondary transition-colors">{user.name}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-wider mt-1">{user.designation}</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900 dark:bg-zinc-700 border-2 border-transparent group-hover:border-brand-secondary transition-all flex items-center justify-center text-white font-bold shrink-0 relative shadow-sm">
                <span className="text-sm select-none">
                  {user.avatarUrl && user.avatarUrl.length < 4 ? user.avatarUrl : user.name.charAt(0)}
                </span>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-505 bg-emerald-500 border border-card" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Context Header */}
        <div className="px-4 sm:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <div className="flex items-center space-x-2 text-xs text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-widest mb-1">
                <span>{isClient ? 'Client Portal' : 'Agency Dashboard'}</span>
                <ChevronRight className="w-3 h-3 text-zinc-400" />
                <span className="text-zinc-900 dark:text-zinc-100">{activeTab}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 capitalize">
                  {activeTab === 'portal' ? 'Client' : activeTab} Workspace
                </h2>
                {activeTimerTaskId && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setActiveTab('time')}
                    className="flex items-center space-x-1.5 bg-orange-500/15 hover:bg-orange-500/20 border border-orange-550/20 px-3 py-1 rounded-full cursor-pointer transition-all shrink-0 select-none"
                    title="Click to view detailed Live Tracking time entries!"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping shrink-0" />
                    <span className="text-[10px] font-mono font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest leading-none">
                      Live Tracker Active: {formatTime(elapsedTimes[activeTimerTaskId] || 0)}
                    </span>
                    <ChevronRight className="w-3 h-3 text-orange-500 shrink-0" />
                  </motion.div>
                )}
              </div>
            </div>
            
            {!isClient && activeTab === 'projects' && (
              <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-end">
                <Button 
                  onClick={() => setIsFilterDialogOpen(true)}
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    "h-10 border-border text-foreground bg-card hover:bg-muted relative",
                    (selectedProjectId || filterAssigneeId || filterStatus || filterPriority) ? "border-brand-secondary text-brand-secondary bg-brand-secondary/5 font-extrabold" : ""
                  )}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {(selectedProjectId || filterAssigneeId || filterStatus || filterPriority) ? (
                    <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-brand-secondary text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      !
                    </span>
                  ) : null}
                </Button>
                <Button 
                  size="sm" 
                  className="h-10 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 sm:px-6 flex-1 sm:flex-none cursor-pointer"
                  onClick={handleOpenCreateProject}
                >
                  Create New
                </Button>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Role Switcher Dialog for Prototype Demo */}
      {showRoleSwitcher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold tracking-tight">Identity Switcher</h3>
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Prototype Tool</Badge>
            </div>
            <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
              Toggle between roles to test permissions, task visibility, and the team management engine.
            </p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {MOCK_USERS.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    setUser(u);
                    setShowRoleSwitcher(false);
                    if (u.role === UserRole.CLIENT) setActiveTab('portal');
                    else if (activeTab === 'portal') setActiveTab('overview');
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left group",
                    user.id === u.id ? "border-zinc-900 bg-zinc-900 text-white shadow-xl translate-x-1" : "hover:bg-zinc-50 border-zinc-100"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                      user.id === u.id ? "bg-white text-zinc-900" : "bg-zinc-100 text-zinc-500"
                    )}>
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-tight">{u.name}</p>
                      <p className={cn(
                        "text-[10px] font-medium uppercase tracking-widest",
                        user.id === u.id ? "text-zinc-400" : "text-zinc-500"
                      )}>{u.designation}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={user.id === u.id ? "secondary" : "outline"} 
                    className={cn(
                      "text-[9px] font-bold uppercase tracking-tighter",
                      user.id === u.id ? "bg-zinc-800 text-zinc-400 border-none" : ""
                    )}
                  >
                    {u.role.replace('_', ' ')}
                  </Badge>
                </button>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-6 h-12 rounded-xl text-zinc-500 font-bold uppercase tracking-widest text-xs" onClick={() => setShowRoleSwitcher(false)}>
              Close Switcher
            </Button>
          </motion.div>
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">Initiate New Project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Project Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Acme Corp Web Build" 
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="website" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Project Website URL <span className="text-zinc-400 lowercase font-medium">(Optional)</span></Label>
              <Input 
                id="website" 
                placeholder="e.g. www.acme.com" 
                value={newProjectWebsite}
                onChange={(e) => setNewProjectWebsite(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Project Type</Label>
              <Select value={newProjectType} onValueChange={setNewProjectType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retainer">Retainer (Monthly)</SelectItem>
                  <SelectItem value="One-Off">One-Off Project</SelectItem>
                  <SelectItem value="Always-On">Always-On</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {user && ADMIN_ROLES.includes(user.role) && (
              <div className="grid gap-2">
                <Label htmlFor="client" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Client Partner</Label>
                <Select value={newProjectClientId} onValueChange={setNewProjectClientId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Client Partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.role === UserRole.CLIENT).map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        💼 {client.name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="am" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Project AM / Assignee</Label>
              <Select value={selectedAMId} onValueChange={setSelectedAMId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Project Assignee" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.role !== UserRole.CLIENT).map(am => (
                    <SelectItem key={am.id} value={am.id}>{am.name} ({am.designation || am.role.replace('_', ' ')})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {aiSuggestion && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30"
              >
                <div className="flex items-center space-x-2 text-brand-secondary mb-1">
                  <Activity className="w-4 h-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">AI Assignment Engine</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      Suggested Assignee: {users.find(u => u.id === aiSuggestion.assigneeId)?.name || 'Amit Kumar'}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 italic leading-snug">"{aiSuggestion.reason}"</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-[10px] font-bold uppercase tracking-wider h-8 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 shrink-0 ml-4 cursor-pointer"
                    onClick={() => {
                      if (aiSuggestion.assigneeId) {
                        setSelectedAMId(aiSuggestion.assigneeId);
                        toast.success(`Applied suggestion: ${users.find(u => u.id === aiSuggestion.assigneeId)?.name || 'Amit Kumar'}`);
                      }
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
          <DialogFooter>
            {!aiSuggestion ? (
              <Button 
                onClick={handleCreateProject} 
                disabled={!newProjectName || isAssigning}
                className="w-full bg-zinc-900 text-white h-12 rounded-xl font-bold uppercase tracking-widest text-xs"
              >
                {isAssigning ? "AI Engine Running..." : "Generate Project Plan"}
              </Button>
            ) : (
              <Button 
                onClick={handleConfirmProject}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl font-bold uppercase tracking-widest text-xs"
              >
                Confirm & Activate Project
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Global Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-foreground">Filter Workspace Tasks</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 font-sans text-left">
            {/* Project Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Project</label>
              <Select 
                value={selectedProjectId || "all"} 
                onValueChange={(val) => setSelectedProjectId(val === "all" ? null : val)}
              >
                <SelectTrigger className="w-full h-10 rounded-xl bg-muted/20 border-border text-foreground">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto bg-card border-border">
                  <SelectItem value="all">📁 All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>📁 {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Assignee</label>
              <Select 
                value={filterAssigneeId || "all"} 
                onValueChange={(val) => setFilterAssigneeId(val === "all" ? null : val)}
              >
                <SelectTrigger className="w-full h-10 rounded-xl bg-muted/20 border-border text-foreground">
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto bg-card border-border">
                  <SelectItem value="all">👨‍💻 All Assignees</SelectItem>
                  {users.filter(u => u.role !== UserRole.CLIENT).map(u => (
                    <SelectItem key={u.id} value={u.id}>👨‍💻 {u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Priority</label>
              <Select 
                value={filterPriority || "all"} 
                onValueChange={(val) => setFilterPriority(val === "all" ? null : val)}
              >
                <SelectTrigger className="w-full h-10 rounded-xl bg-muted/20 border-border text-foreground">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">⚡ All Priorities</SelectItem>
                  {Object.values(Priority).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === 'Critical' ? '💀' : p === 'High' ? '🔴' : p === 'Normal' ? '🟡' : '🟢'} {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Task Status</label>
              <Select 
                value={filterStatus || "all"} 
                onValueChange={(val) => setFilterStatus(val === "all" ? null : val)}
              >
                <SelectTrigger className="w-full h-10 rounded-xl bg-muted/20 border-border text-foreground">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">📈 All Statuses</SelectItem>
                  {Object.values(TaskStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === TaskStatus.DONE ? '✅ Done' : s === TaskStatus.CANCELLED ? '❌ Cancelled' : s === TaskStatus.BLOCKED ? '📥 Blocked' : '📋 ' + s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
            <Button 
              variant="ghost" 
              onClick={() => {
                setSelectedProjectId(null);
                setFilterAssigneeId(null);
                setFilterPriority(null);
                setFilterStatus(null);
                toast.success("All filters cleared successfully!");
              }}
              className="text-xs font-bold text-zinc-400 hover:text-red-500 hover:bg-red-50/10 cursor-pointer h-10 rounded-xl"
            >
              Reset All
            </Button>
            <Button 
              onClick={() => setIsFilterDialogOpen(false)}
              className="bg-brand-secondary hover:bg-brand-secondary/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl h-10 px-6 cursor-pointer"
            >
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DashboardWrapper() {
  const { user } = useAuth();
  if (!user) {
    return <LoginPage />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" expand={true} richColors closeButton />
        <DashboardWrapper />
      </AuthProvider>
    </ThemeProvider>
  );
}

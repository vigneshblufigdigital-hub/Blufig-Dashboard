import React, { useState, useEffect } from 'react';
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
  CheckCircle,
  Users,
  Settings,
  Briefcase,
  Folder,
  Mail,
  Edit,
  FileEdit,
  Timer,
  Clock,
  Play,
  Pause,
  Square,
  ArrowLeft,
  ChevronLeft,
  History,
  Plus,
  Radio
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_USERS, MOCK_PROJECTS, MOCK_TASKS } from './mockData';
import { UserRole, Project, Task, ProjectType, TaskStatus, Priority, UserProfile, ClientReport, ClientInvoice, ADMIN_ROLES, NotificationItem, isSuperAdmin, hasPermission, isUserOnline, Department } from './types';
import { cn } from '@/lib/utils';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { db, seedCollectionIfEmpty, saveDocToFirestore, deleteDocFromFirestore, syncCollection } from './lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

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
import { TemplateEditor } from './components/dashboard/TemplateEditor';
import { SMTPDiagnostics } from './components/dashboard/SMTPDiagnostics';
import { getTemplates, TeamTemplate } from './utils/templateStorage';
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
import { SearchableUserSelect } from './components/common/SearchableUserSelect';
import { suggestAssignee } from './lib/gemini';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster, toast } from 'sonner';

const getDeletedNotifIds = (userId?: string): Set<string> => {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(`blufig_deleted_notifs_${userId}`);
    if (raw) {
      return new Set(JSON.parse(raw));
    }
  } catch (e) {}
  return new Set();
};

const recordDeletedNotifId = (userId: string, notifId: string) => {
  if (!userId || !notifId) return;
  try {
    const current = getDeletedNotifIds(userId);
    current.add(notifId);
    localStorage.setItem(`blufig_deleted_notifs_${userId}`, JSON.stringify(Array.from(current)));
  } catch (e) {}
};

function Dashboard() {
  const { user: nullableUser, setUser, logout } = useAuth();
  const user = nullableUser!;
  const { theme, toggleTheme, fontSize } = useTheme();

  // Real-time active status heartbeat tracker
  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = async (online = true) => {
      try {
        await saveDocToFirestore('users', {
          ...user,
          isOnline: online,
          lastSeenAt: Date.now()
        });
      } catch (e) {
        console.error("Presence heartbeat update failed", e);
      }
    };

    // Send online status on initial load/mount
    sendHeartbeat(true);

    // Heartbeat every 30 seconds
    const interval = setInterval(() => {
      sendHeartbeat(true);
    }, 30000);

    const handleUnload = () => {
      sendHeartbeat(false);
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user?.id]);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(user.role === UserRole.CLIENT ? 'reports' : 'overview');
  const [tabHistory, setTabHistory] = useState<string[]>([]);

  const navigateToTab = (newTab: string) => {
    if (newTab !== activeTab) {
      setTabHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1] === activeTab) return prev;
        return [...prev, activeTab].slice(-15);
      });
      setActiveTab(newTab);
    }
  };

  const handleGoBack = () => {
    if (tabHistory.length > 0) {
      const previousTab = tabHistory[tabHistory.length - 1];
      setTabHistory(prev => prev.slice(0, -1));
      setActiveTab(previousTab);
    } else {
      if (activeTab === 'profile') setActiveTab('team');
      else if (activeTab === 'time-tracking' || activeTab === 'time') setActiveTab('tasks');
      else if (activeTab === 'projects' || activeTab === 'calendar' || activeTab === 'admin' || activeTab === 'smtp') setActiveTab('overview');
      else setActiveTab(user.role === UserRole.CLIENT ? 'reports' : 'overview');
    }
  };

  const getTabDisplayName = (tabName: string) => {
    switch (tabName) {
      case 'overview': return 'Overview';
      case 'projects': return 'Projects';
      case 'tasks': return 'Tasks';
      case 'calendar': return 'Calendar';
      case 'team': return 'Team';
      case 'reports': return 'Reports';
      case 'time-tracking':
      case 'time': return 'Time Tracking';
      case 'admin': return 'Admin';
      case 'smtp': return 'SMTP Gateway';
      case 'profile': return 'My Profile';
      case 'portal': return 'Client Portal';
      case 'billing': return 'Billing';
      default: return tabName.replace('-', ' ');
    }
  };
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'templates' | 'smtp'>('users');

  // Automatically reset active tab if user role changes
  React.useEffect(() => {
    if (user) {
      setActiveTab(user.role === UserRole.CLIENT ? 'reports' : 'overview');
    }
  }, [user.id, user.role]);

  // Ensure document title is always Blufig Operations
  React.useEffect(() => {
    document.title = "Blufig Operations";
  }, []);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<string | null>(null);

  const handleNavigateToTasks = (filters?: { dateFilter?: string; statusFilter?: string; priorityFilter?: string; projectId?: string }) => {
    if (filters?.projectId !== undefined) {
      setSelectedProjectId(filters.projectId);
    }
    if (filters?.statusFilter !== undefined) {
      setFilterStatus(filters.statusFilter);
    }
    if (filters?.priorityFilter !== undefined) {
      setFilterPriority(filters.priorityFilter);
    }
    if (filters?.dateFilter !== undefined) {
      setFilterDateRange(filters.dateFilter);
    }
    setActiveTab('tasks');
  };
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectWebsite, setNewProjectWebsite] = useState('');
  const [newProjectType, setNewProjectType] = useState('Retainer');
  const [selectedAMId, setSelectedAMId] = useState<string>('072'); // Default to Amit
  const [newProjectClientId, setNewProjectClientId] = useState<string>('client-1');
  const [newProjectCoordinator, setNewProjectCoordinator] = useState('');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [templatesList, setTemplatesList] = useState<TeamTemplate[]>([]);

  // Project Edit Dialog States
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectWebsite, setEditProjectWebsite] = useState('');
  const [editProjectType, setEditProjectType] = useState('Retainer');
  const [editProjectAMId, setEditProjectAMId] = useState('');
  const [editProjectClientId, setEditProjectClientId] = useState('');
  const [editProjectCoordinator, setEditProjectCoordinator] = useState('');
  const [editProjectStatus, setEditProjectStatus] = useState<'Active' | 'On Hold' | 'Completed' | 'In Review' | 'Client Review' | 'Pending'>('Active');
  const [editProjectSelectedTemplateIds, setEditProjectSelectedTemplateIds] = useState<string[]>([]);

  useEffect(() => {
    setTemplatesList(getTemplates());
    const handleUpdate = () => {
      setTemplatesList(getTemplates());
    };
    window.addEventListener('blufig_templates_updated', handleUpdate);
    return () => {
      window.removeEventListener('blufig_templates_updated', handleUpdate);
    };
  }, []);

  const [isAssigning, setIsAssigning] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);

  // Firebase Synchronization Refs & Effects
  const isSyncingRef = React.useRef({
    users: false,
    projects: false,
    tasks: false,
    reports: false,
    invoices: false,
    notifications: false
  });

  const hasLoadedRef = React.useRef({
    users: false,
    projects: false,
    tasks: false,
    reports: false,
    invoices: false,
    notifications: false
  });

  const lastSyncedDataRef = React.useRef({
    users: '[]',
    projects: '[]',
    tasks: '[]',
    reports: '[]',
    invoices: '[]',
    notifications: '[]'
  });

  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([]);
  const [isHeaderTimerOpen, setIsHeaderTimerOpen] = useState(false);
  const [headerTimerSearch, setHeaderTimerSearch] = useState('');
  const [timerScopeFilter, setTimerScopeFilter] = useState<'self' | 'all'>('self');

  const [isLiveUsersOpen, setIsLiveUsersOpen] = useState(false);
  const [liveUserSearch, setLiveUserSearch] = useState('');
  const [liveUserTab, setLiveUserTab] = useState<'online' | 'all'>('online');
  const [targetProfileUserId, setTargetProfileUserId] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('blufig_projects');
      return saved ? JSON.parse(saved) : MOCK_PROJECTS;
    } catch {
      return MOCK_PROJECTS;
    }
  });
  
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

  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('blufig_users');
      const loaded: UserProfile[] = saved ? JSON.parse(saved) : MOCK_USERS;
      return loaded.map(u => {
        if (u.id === '124' || u.name.toLowerCase().includes('raghavendra')) {
          return { ...u, department: Department.WEB_DEVELOPMENT, reportsToId: u.reportsToId || '036' };
        }
        return u;
      });
    } catch {
      return MOCK_USERS;
    }
  });

  const [reports, setReports] = useState<ClientReport[]>(() => {
    try {
      const saved = localStorage.getItem('blufig_reports');
      const loaded = saved ? JSON.parse(saved) : [];
      return loaded.filter((r: any) => r.id !== 'rep-1' && r.id !== 'rep-2');
    } catch {
      return [];
    }
  });

  const [invoices, setInvoices] = useState<ClientInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('blufig_invoices');
      const loaded = saved ? JSON.parse(saved) : [];
      return loaded.filter((i: any) => i.id !== 'inv-1' && i.id !== 'inv-2');
    } catch {
      return [];
    }
  });

  const notifications = React.useMemo(() => {
    if (!user) return [];
    const deletedIds = getDeletedNotifIds(user.id);
    return allNotifications.filter(n => {
      // 1. Exclude if user explicitly deleted this notification
      if (deletedIds.has(n.id)) return false;

      // 2. If notification has explicit target userId, check if it matches current user
      if (n.userId) {
        return n.userId === user.id;
      }

      // 3. If notification references a taskId, check if current user is assignee or creator or subtask assignee
      if (n.taskId) {
        const matchingTask = tasks.find(t => t.id === n.taskId);
        if (matchingTask) {
          return matchingTask.assigneeId === user.id ||
            matchingTask.createdById === user.id ||
            matchingTask.subTasks?.some(st => st.assigneeId === user.id);
        }
      }

      // 4. Do not show unassigned generic legacy notifications
      return false;
    });
  }, [allNotifications, user, tasks]);

  // Seed data once when the component mounts
  React.useEffect(() => {
    const seedAll = async () => {
      await seedCollectionIfEmpty('users', MOCK_USERS);
      await seedCollectionIfEmpty('projects', MOCK_PROJECTS);
      await seedCollectionIfEmpty('tasks', MOCK_TASKS);
      
      await seedCollectionIfEmpty('reports', []);
      await seedCollectionIfEmpty('invoices', []);

      try {
        await deleteDocFromFirestore('reports', 'rep-1');
        await deleteDocFromFirestore('reports', 'rep-2');
        await deleteDocFromFirestore('invoices', 'inv-1');
        await deleteDocFromFirestore('invoices', 'inv-2');
        await deleteDocFromFirestore('notifications', 'noti-custom-t1');
        await deleteDocFromFirestore('notifications', 'noti-1');
        await deleteDocFromFirestore('notifications', 'noti-2');
        await deleteDocFromFirestore('notifications', 'noti-3');
        await deleteDocFromFirestore('notifications', 'noti-4');
      } catch (e) {
        console.error("Clean up of mock documents failed", e);
      }
    };
    seedAll();
  }, []);

  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const handleSyncError = React.useCallback((err: any) => {
    const errStr = String(err?.message || err);
    if (errStr.includes('Quota exceeded') || errStr.includes('resource-exhausted')) {
      setQuotaExceeded(true);
    }
  }, []);

  // Set up real-time onSnapshot sync from Firestore to React State
  React.useEffect(() => {
    const unsubUsers = syncCollection<UserProfile>('users', (data) => {
      hasLoadedRef.current.users = true;
      const updated = data.map(u => {
        if (u.id === '124' || u.name.toLowerCase().includes('raghavendra')) {
          return { ...u, department: Department.WEB_DEVELOPMENT, reportsToId: u.reportsToId || '036' };
        }
        return u;
      });
      lastSyncedDataRef.current.users = JSON.stringify(updated);
      isSyncingRef.current.users = true;
      setUsers(updated);
    }, handleSyncError);

    const unsubProjects = syncCollection<Project>('projects', (data) => {
      hasLoadedRef.current.projects = true;
      lastSyncedDataRef.current.projects = JSON.stringify(data);
      isSyncingRef.current.projects = true;
      setProjects(data);
    }, handleSyncError);

    const unsubTasks = syncCollection<Task>('tasks', (data) => {
      hasLoadedRef.current.tasks = true;
      lastSyncedDataRef.current.tasks = JSON.stringify(data);
      isSyncingRef.current.tasks = true;
      setTasks(data);
    }, handleSyncError);

    const unsubReports = syncCollection<ClientReport>('reports', (data) => {
      hasLoadedRef.current.reports = true;
      const filtered = data.filter(r => r.id !== 'rep-1' && r.id !== 'rep-2');
      lastSyncedDataRef.current.reports = JSON.stringify(filtered);
      isSyncingRef.current.reports = true;
      setReports(filtered);
    }, handleSyncError);

    const unsubInvoices = syncCollection<ClientInvoice>('invoices', (data) => {
      hasLoadedRef.current.invoices = true;
      const filtered = data.filter(i => i.id !== 'inv-1' && i.id !== 'inv-2');
      lastSyncedDataRef.current.invoices = JSON.stringify(filtered);
      isSyncingRef.current.invoices = true;
      setInvoices(filtered);
    }, handleSyncError);

    const unsubNotifs = syncCollection<NotificationItem>('notifications', (data) => {
      hasLoadedRef.current.notifications = true;
      lastSyncedDataRef.current.notifications = JSON.stringify(data);
      isSyncingRef.current.notifications = true;
      setAllNotifications(data);
    }, handleSyncError);

    return () => {
      unsubUsers();
      unsubProjects();
      unsubTasks();
      unsubReports();
      unsubInvoices();
      unsubNotifs();
    };
  }, [handleSyncError]);

  // Sync React State mutations back to Firestore (Add / Update / Delete)
  React.useEffect(() => {
    if (!hasLoadedRef.current.users) return;

    const currentJSON = JSON.stringify(users);
    if (currentJSON === lastSyncedDataRef.current.users) {
      isSyncingRef.current.users = false;
      return;
    }
    isSyncingRef.current.users = false;

    let lastUsers: UserProfile[] = [];
    try {
      lastUsers = JSON.parse(lastSyncedDataRef.current.users || '[]');
    } catch (e) {}

    const lastUsersMap = new Map(lastUsers.map(u => [u.id, u]));
    const currentUsersMap = new Map(users.map(u => [u.id, u]));

    users.forEach(async (u) => {
      const lastU = lastUsersMap.get(u.id);
      if (!lastU || JSON.stringify(lastU) !== JSON.stringify(u)) {
        await saveDocToFirestore('users', u);
      }
    });

    lastUsers.forEach(async (lu) => {
      if (!currentUsersMap.has(lu.id)) {
        await deleteDocFromFirestore('users', lu.id);
      }
    });

    lastSyncedDataRef.current.users = currentJSON;
  }, [users]);

  // Persist local users cache in localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('blufig_users', JSON.stringify(users));
    } catch (e) {
      console.error("Failed to save users cache to localStorage", e);
    }
  }, [users]);

  React.useEffect(() => {
    if (!hasLoadedRef.current.projects) return;

    const currentJSON = JSON.stringify(projects);
    if (currentJSON === lastSyncedDataRef.current.projects) {
      isSyncingRef.current.projects = false;
      return;
    }
    isSyncingRef.current.projects = false;

    let lastProjects: Project[] = [];
    try {
      lastProjects = JSON.parse(lastSyncedDataRef.current.projects || '[]');
    } catch (e) {}

    const lastProjectsMap = new Map(lastProjects.map(p => [p.id, p]));
    const currentProjectsMap = new Map(projects.map(p => [p.id, p]));

    projects.forEach(async (p) => {
      const lastP = lastProjectsMap.get(p.id);
      if (!lastP || JSON.stringify(lastP) !== JSON.stringify(p)) {
        await saveDocToFirestore('projects', p);
      }
    });

    lastProjects.forEach(async (lp) => {
      if (!currentProjectsMap.has(lp.id)) {
        await deleteDocFromFirestore('projects', lp.id);
      }
    });

    lastSyncedDataRef.current.projects = currentJSON;
  }, [projects]);

  React.useEffect(() => {
    if (!hasLoadedRef.current.tasks) return;

    const currentJSON = JSON.stringify(tasks);
    if (currentJSON === lastSyncedDataRef.current.tasks) {
      isSyncingRef.current.tasks = false;
      return;
    }
    isSyncingRef.current.tasks = false;

    let lastTasks: Task[] = [];
    try {
      lastTasks = JSON.parse(lastSyncedDataRef.current.tasks || '[]');
    } catch (e) {}

    const lastTasksMap = new Map(lastTasks.map(t => [t.id, t]));
    const currentTasksMap = new Map(tasks.map(t => [t.id, t]));

    tasks.forEach(async (t) => {
      const lastT = lastTasksMap.get(t.id);
      if (!lastT || JSON.stringify(lastT) !== JSON.stringify(t)) {
        await saveDocToFirestore('tasks', t);
      }
    });

    lastTasks.forEach(async (lt) => {
      if (!currentTasksMap.has(lt.id)) {
        await deleteDocFromFirestore('tasks', lt.id);
      }
    });

    lastSyncedDataRef.current.tasks = currentJSON;
  }, [tasks]);

  React.useEffect(() => {
    if (!hasLoadedRef.current.reports) return;

    const currentJSON = JSON.stringify(reports);
    if (currentJSON === lastSyncedDataRef.current.reports) {
      isSyncingRef.current.reports = false;
      return;
    }
    isSyncingRef.current.reports = false;

    let lastReports: ClientReport[] = [];
    try {
      lastReports = JSON.parse(lastSyncedDataRef.current.reports || '[]');
    } catch (e) {}

    const lastReportsMap = new Map(lastReports.map(r => [r.id, r]));
    const currentReportsMap = new Map(reports.map(r => [r.id, r]));

    reports.forEach(async (r) => {
      const lastR = lastReportsMap.get(r.id);
      if (!lastR || JSON.stringify(lastR) !== JSON.stringify(r)) {
        await saveDocToFirestore('reports', r);
      }
    });

    lastReports.forEach(async (lr) => {
      if (!currentReportsMap.has(lr.id)) {
        await deleteDocFromFirestore('reports', lr.id);
      }
    });

    lastSyncedDataRef.current.reports = currentJSON;
  }, [reports]);

  React.useEffect(() => {
    if (!hasLoadedRef.current.invoices) return;

    const currentJSON = JSON.stringify(invoices);
    if (currentJSON === lastSyncedDataRef.current.invoices) {
      isSyncingRef.current.invoices = false;
      return;
    }
    isSyncingRef.current.invoices = false;

    let lastInvoices: ClientInvoice[] = [];
    try {
      lastInvoices = JSON.parse(lastSyncedDataRef.current.invoices || '[]');
    } catch (e) {}

    const lastInvoicesMap = new Map(lastInvoices.map(i => [i.id, i]));
    const currentInvoicesMap = new Map(invoices.map(i => [i.id, i]));

    invoices.forEach(async (i) => {
      const lastI = lastInvoicesMap.get(i.id);
      if (!lastI || JSON.stringify(lastI) !== JSON.stringify(i)) {
        await saveDocToFirestore('invoices', i);
      }
    });

    lastInvoices.forEach(async (li) => {
      if (!currentInvoicesMap.has(li.id)) {
        await deleteDocFromFirestore('invoices', li.id);
      }
    });

    lastSyncedDataRef.current.invoices = currentJSON;
  }, [invoices]);

  // Sync current logged-in user profile with live users list
  React.useEffect(() => {
    if (user && users.length > 0) {
      const found = users.find(u => u.id === user.id);
      if (found && JSON.stringify(found) !== JSON.stringify(user)) {
        setUser(found);
      }
    }
  }, [users, user, setUser]);

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

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  // Check URL query parameters for taskId on mount or when tasks load
  React.useEffect(() => {
    if (!user || tasks.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const urlTaskId = params.get('taskId');
    if (urlTaskId) {
      const taskItem = tasks.find(t => t.id === urlTaskId);
      if (taskItem) {
        // Clear contradictory filters
        setFilterAssigneeId(null);
        setFilterStatus(null);
        setFilterPriority(null);
        setSelectedProjectId(taskItem.projectId);
        
        // Go to appropriate tab
        if (user.role === UserRole.CLIENT) {
          setActiveTab('reports');
        } else {
          setActiveTab('tasks');
        }
        
        setHighlightedTaskId(urlTaskId);
        toast.success(`Navigating directly to task: "${taskItem.name}"`);
        
        // Clear the taskId from the URL to keep it clean and prevent loop/re-trigger
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [user, tasks]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = async () => {
    notifications.forEach(async (n) => {
      if (!n.isRead) {
        await saveDocToFirestore('notifications', { ...n, isRead: true });
      }
    });
    setAllNotifications(prev => prev.map(n => {
      if (notifications.some(un => un.id === n.id)) {
        return { ...n, isRead: true };
      }
      return n;
    }));
    toast.success("All notifications marked as read!");
  };

  const handleClearAll = async () => {
    if (!user) return;
    notifications.forEach(async (n) => {
      recordDeletedNotifId(user.id, n.id);
      try {
        await deleteDocFromFirestore('notifications', n.id);
      } catch (e) {}
    });
    setAllNotifications(prev => prev.filter(n => !notifications.some(un => un.id === n.id)));
    toast.info("Notifications cleared successfully.");
  };

  const handleDeleteNotification = async (id: string) => {
    if (!user) return;
    recordDeletedNotifId(user.id, id);
    try {
      await deleteDocFromFirestore('notifications', id);
    } catch (e) {}
    setAllNotifications(prev => prev.filter(n => n.id !== id));
    toast.info("Notification removed.");
  };

  const handleToggleRead = async (id: string) => {
    const target = allNotifications.find(n => n.id === id);
    if (target) {
      const updated = { ...target, isRead: !target.isRead };
      await saveDocToFirestore('notifications', updated);
      setAllNotifications(prev => prev.map(n => n.id === id ? updated : n));
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      const updated = { ...notif, isRead: true };
      await saveDocToFirestore('notifications', updated);
      setAllNotifications(prev => prev.map(n => n.id === notif.id ? updated : n));
    }
    
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
    if (prevTasks && prevTasks.length > 0 && user) {
      tasks.forEach(async (currentTask) => {
        const matchingPrevTask = prevTasks.find(pt => pt.id === currentTask.id);
        const creatorUser = users.find(u => u.id === currentTask.createdById);
        const assignerName = creatorUser ? creatorUser.name : (currentTask.createdById === user.id ? user.name : 'a team member');
        
        // Scenario A: Newly created task, assigned to current user
        if (!matchingPrevTask && currentTask.assigneeId === user.id) {
          const notifId = `noti-${Date.now()}-${currentTask.id}`;
          const deletedIds = getDeletedNotifIds(user.id);
          if (!deletedIds.has(notifId)) {
            const newNotif: NotificationItem = {
              id: notifId,
              userId: currentTask.assigneeId,
              title: '🆕 Assigned to New Task',
              message: `You have been assigned to task "${currentTask.name}" by ${assignerName}.`,
              time: 'Just now',
              isRead: false,
              type: 'task',
              taskId: currentTask.id
            };
            await saveDocToFirestore('notifications', newNotif);
          }
        }
        // Scenario B: Existing task assignee changed to current user
        else if (matchingPrevTask && matchingPrevTask.assigneeId !== currentTask.assigneeId && currentTask.assigneeId === user.id) {
          const notifId = `noti-${Date.now()}-${currentTask.id}`;
          const deletedIds = getDeletedNotifIds(user.id);
          if (!deletedIds.has(notifId)) {
            const newNotif: NotificationItem = {
              id: notifId,
              userId: currentTask.assigneeId,
              title: '🚀 Task Handed Over to You',
              message: `Task "${currentTask.name}" has been reassigned to you by ${assignerName}. Click to review.`,
              time: 'Just now',
              isRead: false,
              type: 'task',
              taskId: currentTask.id
            };
            await saveDocToFirestore('notifications', newNotif);
          }
        }
      });
    }
    // Update reference
    prevTasksRef.current = tasks;
  }, [tasks, user, users]);


  // Lifted Timer State running in background on tab changes
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    MOCK_TASKS.forEach(t => {
      initial[t.id] = t.timeLoggedSeconds ?? (t.timeLogged ? Math.round(t.timeLogged * 3600) : 0);
    });
    return initial;
  });

  const [activeTimerSubTaskId, setActiveTimerSubTaskId] = useState<string | null>(null);
  const [subTaskElapsedTimes, setSubTaskElapsedTimes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    MOCK_TASKS.forEach(t => {
      t.subTasks?.forEach(st => {
        initial[st.id] = (st as any).timeLoggedSeconds ?? 0;
      });
    });
    return initial;
  });

  // Refs and state for persistent wall-clock active timer tracking
  const timerStartRef = React.useRef<{ taskId: string; startTime: number; initialSeconds: number } | null>(null);
  const subTaskTimerStartRef = React.useRef<{ subTaskId: string; startTime: number; initialSeconds: number } | null>(null);

  // Restore running active timer on mount if page was reloaded or refreshed
  React.useEffect(() => {
    try {
      const savedTimer = localStorage.getItem('blufig_active_task_timer');
      if (savedTimer) {
        const parsed = JSON.parse(savedTimer);
        if (parsed && parsed.taskId && parsed.startTime && parsed.initialSeconds !== undefined) {
          timerStartRef.current = parsed;
          setActiveTimerTaskId(parsed.taskId);
        }
      }
    } catch (e) {}

    try {
      const savedSubTimer = localStorage.getItem('blufig_active_subtask_timer');
      if (savedSubTimer) {
        const parsed = JSON.parse(savedSubTimer);
        if (parsed && parsed.subTaskId && parsed.startTime && parsed.initialSeconds !== undefined) {
          subTaskTimerStartRef.current = parsed;
          setActiveTimerSubTaskId(parsed.subTaskId);
        }
      }
    } catch (e) {}
  }, []);

  // Keep active timer state persisted to localStorage
  React.useEffect(() => {
    if (activeTimerTaskId && timerStartRef.current) {
      localStorage.setItem('blufig_active_task_timer', JSON.stringify(timerStartRef.current));
    } else {
      localStorage.removeItem('blufig_active_task_timer');
    }
  }, [activeTimerTaskId]);

  React.useEffect(() => {
    if (activeTimerSubTaskId && subTaskTimerStartRef.current) {
      localStorage.setItem('blufig_active_subtask_timer', JSON.stringify(subTaskTimerStartRef.current));
    } else {
      localStorage.removeItem('blufig_active_subtask_timer');
    }
  }, [activeTimerSubTaskId]);

  // Keep it in sync for newly created or updated tasks (never overwrite running timer task)
  React.useEffect(() => {
    setElapsedTimes(prev => {
      const updated = { ...prev };
      let changed = false;
      tasks.forEach(t => {
        const val = t.timeLoggedSeconds ?? (t.timeLogged ? Math.round(t.timeLogged * 3600) : 0);
        if (activeTimerTaskId === t.id) return;
        if (updated[t.id] === undefined || updated[t.id] !== val) {
          updated[t.id] = val;
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [tasks, activeTimerTaskId]);

  // Keep subtask times in sync for newly created or updated subtasks (never overwrite running subtask timer)
  React.useEffect(() => {
    setSubTaskElapsedTimes(prev => {
      const updated = { ...prev };
      let changed = false;
      tasks.forEach(t => {
        t.subTasks?.forEach(st => {
          const val = (st as any).timeLoggedSeconds ?? 0;
          if (activeTimerSubTaskId === st.id) return;
          if (updated[st.id] === undefined || updated[st.id] !== val) {
            updated[st.id] = val;
            changed = true;
          }
        });
      });
      return changed ? updated : prev;
    });
  }, [tasks, activeTimerSubTaskId]);

  // Toast-based notification alert system for Project Managers
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

      const isWithin24Hours = (diffHours > 0 && diffHours <= 24) || isSameDay;

      if (isWithin24Hours) {
        alertedTasksRef.current.add(task.id);
        
        // Quietly add to notification drawer so badge number increments without screen toast popups
        const notifId = `noti-due-${task.id}-${user.id}`;
        const deletedIds = getDeletedNotifIds(user.id);
        if (!deletedIds.has(notifId) && !allNotifications.some(n => n.id === notifId)) {
          const newNotif: NotificationItem = {
            id: notifId,
            userId: user.id,
            title: "⚠️ Task Due Soon",
            message: `Task "${task.name}" is due soon (${task.dueDate}) and remains unresolved.`,
            time: 'Due within 24h',
            isRead: false,
            type: 'alert',
            taskId: task.id
          };
          saveDocToFirestore('notifications', newNotif);
        }
      }
    });
  }, [tasks, user, user?.role]);

  // Track task timers in real-time using wall-clock calculation (prevents background tab throttling loss)
  React.useEffect(() => {
    let interval: any = null;

    const updateTimer = () => {
      if (!activeTimerTaskId || !timerStartRef.current || timerStartRef.current.taskId !== activeTimerTaskId) return;
      const { startTime, initialSeconds } = timerStartRef.current;
      const elapsedSinceStart = Math.floor((Date.now() - startTime) / 1000);
      const updatedSeconds = Math.max(0, initialSeconds + elapsedSinceStart);

      setElapsedTimes(prev => {
        if (prev[activeTimerTaskId] === updatedSeconds) return prev;
        return {
          ...prev,
          [activeTimerTaskId]: updatedSeconds
        };
      });
    };

    if (activeTimerTaskId) {
      updateTimer();
      interval = setInterval(updateTimer, 1000);

      const handleVisibilityChange = () => {
        // Continuous wall-clock timing: catch up immediately when returning to tab
        updateTimer();
      };

      window.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', updateTimer);

      return () => {
        clearInterval(interval);
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', updateTimer);
      };
    }
  }, [activeTimerTaskId]);

  // Track subtask timers in real-time using wall-clock calculation
  React.useEffect(() => {
    let interval: any = null;

    const updateSubTimer = () => {
      if (!activeTimerSubTaskId || !subTaskTimerStartRef.current || subTaskTimerStartRef.current.subTaskId !== activeTimerSubTaskId) return;
      const { startTime, initialSeconds } = subTaskTimerStartRef.current;
      const elapsedSinceStart = Math.floor((Date.now() - startTime) / 1000);
      const updatedSeconds = Math.max(0, initialSeconds + elapsedSinceStart);

      setSubTaskElapsedTimes(prev => {
        if (prev[activeTimerSubTaskId] === updatedSeconds) return prev;
        return {
          ...prev,
          [activeTimerSubTaskId]: updatedSeconds
        };
      });
    };

    if (activeTimerSubTaskId) {
      updateSubTimer();
      interval = setInterval(updateSubTimer, 1000);

      const handleVisibilityChange = () => {
        // Continuous wall-clock timing: catch up immediately when returning to tab
        updateSubTimer();
      };

      window.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', updateSubTimer);

      return () => {
        clearInterval(interval);
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', updateSubTimer);
      };
    }
  }, [activeTimerSubTaskId]);

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
      const finalSecs = elapsedTimes[taskId] || 0;
      setActiveTimerTaskId(null);
      timerStartRef.current = null;

      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { 
              ...t, 
              timeLoggedSeconds: finalSecs, 
              timeLogged: parseFloat((finalSecs / 3600).toFixed(4)),
              updatedAt: new Date().toISOString()
            } 
          : t
      ));
      toast.info('Timer stopped', { description: `Logged ${formatTime(finalSecs)}` });
    } else {
      if (activeTimerTaskId) {
        const runningId = activeTimerTaskId;
        const currentSecs = elapsedTimes[runningId] || 0;
        setTasks(prev => prev.map(t => 
          t.id === runningId 
            ? { 
                ...t, 
                timeLoggedSeconds: currentSecs, 
                timeLogged: parseFloat((currentSecs / 3600).toFixed(4)),
                updatedAt: new Date().toISOString()
              } 
            : t
        ));
      }
      
      const initialSecs = elapsedTimes[taskId] || 0;
      timerStartRef.current = {
        taskId,
        startTime: Date.now(),
        initialSeconds: initialSecs
      };
      setActiveTimerTaskId(taskId);

      // Automatically set task to "In Progress" if it wasn't
      setTasks(prev => prev.map(t => 
        t.id === taskId && t.status !== TaskStatus.IN_PROGRESS && t.status !== TaskStatus.REVIEW && t.status !== TaskStatus.DONE
          ? { ...t, status: TaskStatus.IN_PROGRESS, updatedAt: new Date().toISOString() } 
          : t
      ));
      toast.success('Timer started');
    }
  };

  const toggleSubTaskTimer = (subTaskId: string, parentTaskId: string) => {
    if (activeTimerSubTaskId === subTaskId) {
      const finalSecs = subTaskElapsedTimes[subTaskId] || 0;
      setActiveTimerSubTaskId(null);
      subTaskTimerStartRef.current = null;

      setTasks(prev => prev.map(t => {
        if (t.id === parentTaskId && t.subTasks) {
          return {
            ...t,
            updatedAt: new Date().toISOString(),
            subTasks: t.subTasks.map(st => 
              st.id === subTaskId 
                ? {
                    ...st,
                    timeLoggedSeconds: finalSecs,
                    timeLogged: parseFloat((finalSecs / 3600).toFixed(4))
                  } as any
                : st
            )
          };
        }
        return t;
      }));
      toast.info('Subtask timer stopped', { description: `Logged ${formatTime(finalSecs)}` });
    } else {
      if (activeTimerSubTaskId) {
        const runningId = activeTimerSubTaskId;
        const currentSecs = subTaskElapsedTimes[runningId] || 0;
        setTasks(prev => prev.map(t => {
          if (t.subTasks && t.subTasks.some(st => st.id === runningId)) {
            return {
              ...t,
              updatedAt: new Date().toISOString(),
              subTasks: t.subTasks.map(st => 
                st.id === runningId 
                  ? {
                      ...st,
                      timeLoggedSeconds: currentSecs,
                      timeLogged: parseFloat((currentSecs / 3600).toFixed(4))
                    } as any
                  : st
              )
            };
          }
          return t;
        }));
      }

      const initialSecs = subTaskElapsedTimes[subTaskId] || 0;
      subTaskTimerStartRef.current = {
        subTaskId,
        startTime: Date.now(),
        initialSeconds: initialSecs
      };
      setActiveTimerSubTaskId(subTaskId);
      toast.success('Subtask timer started');

      // Ensure the parent task itself is In Progress if not already
      setTasks(prev => prev.map(t => {
        if (t.id === parentTaskId) {
          const status = (t.status !== TaskStatus.IN_PROGRESS && t.status !== TaskStatus.REVIEW && t.status !== TaskStatus.DONE)
            ? TaskStatus.IN_PROGRESS
            : t.status;
          return { ...t, status, updatedAt: new Date().toISOString() };
        }
        return t;
      }));
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
    const canCreate = isSuperAdmin(user) || hasPermission(user, 'canCreateProject') || (user && ADMIN_ROLES.includes(user.role));
    if (!canCreate) {
      toast.error("Access Denied: Only administrators, account managers, or users with project creation permission can create new projects.");
      return;
    }
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

  const handleOpenEditProject = (project: Project) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectWebsite(project.websiteUrl || '');
    setEditProjectType(project.type);
    setEditProjectAMId(project.accountManagerId || '');
    setEditProjectClientId(project.clientId || '');
    setEditProjectCoordinator(project.clientCoordinator || '');
    setEditProjectStatus(project.status || 'Active');
    setEditProjectSelectedTemplateIds(project.templateIds || []);
    setIsEditProjectDialogOpen(true);
  };

  const handleSaveProjectEdit = () => {
    if (!editingProject) return;
    if (!editProjectName.trim()) {
      toast.error("Project name cannot be empty.");
      return;
    }

    const resolvedWebsite = editProjectWebsite.trim()
      ? (editProjectWebsite.startsWith('http://') || editProjectWebsite.startsWith('https://') ? editProjectWebsite.trim() : `https://${editProjectWebsite.trim()}`)
      : '';

    const updatedProject: Project = {
      ...editingProject,
      name: editProjectName.trim(),
      websiteUrl: resolvedWebsite,
      type: editProjectType as ProjectType,
      accountManagerId: editProjectAMId,
      clientId: editProjectClientId,
      clientCoordinator: editProjectCoordinator.trim() || undefined,
      status: editProjectStatus,
      templateIds: editProjectSelectedTemplateIds
    };

    setProjects(prev => prev.map(p => p.id === editingProject.id ? updatedProject : p));
    try {
      saveDocToFirestore('projects', updatedProject);
    } catch (err) {
      console.error("Failed to save project edit to Firestore:", err);
    }

    // Determine newly added templates to append tasks only for them
    const previouslySelected = editingProject.templateIds || [];
    const newlyAddedTemplates = editProjectSelectedTemplateIds.filter(id => !previouslySelected.includes(id));

    // If some templates are newly selected to append tasks
    if (newlyAddedTemplates.length > 0) {
      const templates = getTemplates();
      const generatedTasks: Task[] = [];
      let taskCounter = 0;
      
      newlyAddedTemplates.forEach((tmplId) => {
        const selectedTmpl = templates.find(t => t.id === tmplId);
        if (selectedTmpl) {
          selectedTmpl.tasks.forEach((tk, idx) => {
            const taskId = `t_${tmplId}_${idx}_` + Math.random().toString(36).substr(2, 9);
            const subTasks = (tk.subTasks || []).map((name, sIdx) => ({
              id: `st_${tmplId}_${idx}_${sIdx}_` + Math.random().toString(36).substr(2, 9),
              taskId,
              name,
              isCompleted: false,
              createdAt: new Date().toISOString()
            }));

            generatedTasks.push({
              id: taskId,
              projectId: editingProject.id,
              deliverableId: 'custom-' + Date.now() + '-' + taskCounter,
              name: tk.name,
              type: tk.type,
              assigneeId: editProjectAMId || '072',
              status: TaskStatus.OPEN,
              priority: tk.priority,
              dueDate: new Date(Date.now() + (7 + taskCounter * 3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              timeEstimate: tk.timeEstimate,
              subTasks: subTasks
            });
            taskCounter++;
          });
        }
      });

      if (generatedTasks.length > 0) {
        setTasks(prev => [...prev, ...generatedTasks]);
        toast.success(`Appended ${generatedTasks.length} tasks from ${newlyAddedTemplates.length} operational templates to project.`);
      }
    }

    toast.success(`Project "${editProjectName}" updated successfully!`);
    setIsEditProjectDialogOpen(false);
    setEditingProject(null);
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
    const canDelete = isSuperAdmin(user);
    if (!canDelete) {
      toast.error("Only Super Admins can delete projects.");
      return;
    }
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setTasks(prev => prev.filter(t => t.projectId !== projectId));
    toast.success("Project and all associated tasks deleted.");
  };

  const handleUpdateProjectStatus = (projectId: string, status: 'Active' | 'Completed' | 'On Hold' | 'Pending' | 'In Review' | 'Client Review') => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status } : p));
    toast.success(`Project status updated to ${status}.`);
  };

  const handleConfirmProject = () => {
    const canCreate = isSuperAdmin(user);
    if (!canCreate) {
      toast.error("Only Super Admins can create projects.");
      return;
    }

    let nextNum = projects.length + 1;
    let projectId = 'p' + nextNum;
    while (projects.some(p => p.id === projectId)) {
      nextNum++;
      projectId = 'p' + nextNum;
    }
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
      websiteUrl: resolvedWebsite,
      clientCoordinator: newProjectCoordinator.trim() || undefined,
      templateIds: selectedTemplateIds
    };

    const generatedTasks: Task[] = [];
    
    if (selectedTemplateIds.length > 0) {
      const templates = getTemplates();
      let taskCounter = 0;
      selectedTemplateIds.forEach((tmplId) => {
        const selectedTmpl = templates.find(t => t.id === tmplId);
        if (selectedTmpl) {
          selectedTmpl.tasks.forEach((tk, idx) => {
            const taskId = `t_${tmplId}_${idx}_` + Math.random().toString(36).substr(2, 9);
            const subTasks = (tk.subTasks || []).map((name, sIdx) => ({
              id: `st_${tmplId}_${idx}_${sIdx}_` + Math.random().toString(36).substr(2, 9),
              taskId,
              name,
              isCompleted: false,
              createdAt: new Date().toISOString()
            }));
            
            generatedTasks.push({
              id: taskId,
              projectId: projectId,
              deliverableId: 'custom-' + Date.now() + '-' + taskCounter,
              name: tk.name,
              type: tk.type,
              assigneeId: selectedAMId,
              status: TaskStatus.OPEN,
              priority: tk.priority,
              dueDate: new Date(Date.now() + (7 + taskCounter * 3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              timeEstimate: tk.timeEstimate,
              subTasks: subTasks
            });
            taskCounter++;
          });
        }
      });
    } else {
      let nextTaskNum = tasks.length + 1;
      let newTaskId = 't' + nextTaskNum;
      while (tasks.some(t => t.id === newTaskId)) {
        nextTaskNum++;
        newTaskId = 't' + nextTaskNum;
      }
      generatedTasks.push({
        id: newTaskId,
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
      });
    }

    setProjects(prev => [...prev, newProject]);
    setTasks(prev => [...prev, ...generatedTasks]);
    
    setIsCreateDialogOpen(false);
    setAiSuggestion(null);
    setNewProjectName('');
    setNewProjectWebsite('');
    setNewProjectCoordinator('');
    setSelectedTemplateIds([]);
    
    // Redirect to the new project's board or tasks
    setSelectedProjectId(projectId);
    setActiveTab('projects');
  };

  const handleAddUser = (newUser: UserProfile) => {
    setUsers(prev => [...prev, newUser]);
    
    if (newUser.role === UserRole.CLIENT) {
      if (newUser.clientProjects && newUser.clientProjects.length > 0) {
        const newProjectsList: Project[] = [];
        const newTasksList: Task[] = [];
        
        newUser.clientProjects.forEach((proj, index) => {
          let nextProjNum = projects.length + 1 + index;
          let projectId = 'p' + nextProjNum;
          while (projects.some(p => p.id === projectId) || newProjectsList.some(p => p.id === projectId)) {
            nextProjNum++;
            projectId = 'p' + nextProjNum;
          }
          const projectName = proj.name.trim() || `${newUser.name.trim()}'s Project ${index + 1}`;
          const resolvedWebsite = proj.websiteUrl.trim() 
            ? (proj.websiteUrl.startsWith('http://') || proj.websiteUrl.startsWith('https://') ? proj.websiteUrl.trim() : `https://${proj.websiteUrl.trim()}`)
            : `https://${newUser.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}.com`;

          const newProj: Project = {
            id: projectId,
            name: projectName,
            clientId: newUser.id,
            accountManagerId: '072', // Default to Amit Thakkar (Super Admin)
            type: (proj.type as ProjectType) || ProjectType.RETAINER,
            status: 'Active',
            startDate: new Date().toISOString().split('T')[0],
            websiteUrl: resolvedWebsite,
            clientCoordinator: newUser.name,
            timingHours: proj.timingHours || 10
          };

          let nextTaskNum = tasks.length + 1 + index;
          let taskId = 't' + nextTaskNum;
          while (tasks.some(t => t.id === taskId) || newTasksList.some(t => t.id === taskId)) {
            nextTaskNum++;
            taskId = 't' + nextTaskNum;
          }
          const newTask: Task = {
            id: taskId,
            projectId: projectId,
            deliverableId: 'd-initial-' + index,
            name: `Onboarding & Kickoff Briefing for ${projectName}`,
            type: 'Strategy',
            assigneeId: '072',
            status: TaskStatus.OPEN,
            priority: Priority.HIGH,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            subTasks: []
          };

          newProjectsList.push(newProj);
          newTasksList.push(newTask);
        });

        setProjects(prev => [...prev, ...newProjectsList]);
        setTasks(prev => [...prev, ...newTasksList]);
        toast.success(`Created ${newProjectsList.length} custom project(s) for Client: ${newUser.name}!`);
      } else {
        let nextProjNum = projects.length + 1;
        let projectId = 'p' + nextProjNum;
        while (projects.some(p => p.id === projectId)) {
          nextProjNum++;
          projectId = 'p' + nextProjNum;
        }
        const projectName = `${newUser.name.trim()}'s Project`;
        
        const newProject: Project = {
          id: projectId,
          name: projectName,
          clientId: newUser.id,
          accountManagerId: '072', // Default to Amit Thakkar (Super Admin)
          type: ProjectType.RETAINER,
          status: 'Active',
          startDate: new Date().toISOString().split('T')[0],
          websiteUrl: `https://${newUser.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}.com`,
          clientCoordinator: newUser.name, // Use the added client as their coordinator by default
          timingHours: 10
        };

        let nextTaskNum = tasks.length + 1;
        let taskId = 't' + nextTaskNum;
        while (tasks.some(t => t.id === taskId)) {
          nextTaskNum++;
          taskId = 't' + nextTaskNum;
        }
        const newTask: Task = {
          id: taskId,
          projectId: projectId,
          deliverableId: 'd-initial',
          name: `Onboarding & Kickoff Briefing for ${newUser.name}`,
          type: 'Strategy',
          assigneeId: '072',
          status: TaskStatus.OPEN,
          priority: Priority.HIGH,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subTasks: []
        };

        setProjects(prev => [...prev, newProject]);
        setTasks(prev => [...prev, newTask]);
        
        toast.success(`Automatically created a new Project: "${projectName}" for Client: ${newUser.name}!`);
      }
    }
  };

  const handleRemoveUser = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete && userToDelete.role === UserRole.CLIENT) {
      const clientProjectIds = projects.filter(p => p.clientId === userId).map(p => p.id);
      setProjects(prev => prev.filter(p => p.clientId !== userId));
      setTasks(prev => prev.filter(t => !clientProjectIds.includes(t.projectId)));
      setReports(prev => prev.filter(r => !clientProjectIds.includes(r.projectId)));
      setInvoices(prev => prev.filter(i => !clientProjectIds.includes(i.projectId)));
      toast.success(`Client "${userToDelete.name}" and all associated projects/tasks deleted.`);
    } else if (userToDelete) {
      toast.success(`User "${userToDelete.name}" deleted.`);
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleAddReport = (newReport: ClientReport) => {
    setReports(prev => [newReport, ...prev]);
  };

  const handleRemoveReport = (reportId: string) => {
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  const handleAddInvoice = (newInvoice: ClientInvoice) => {
    setInvoices(prev => [newInvoice, ...prev]);
  };

  const handleRemoveInvoice = (invoiceId: string) => {
    setInvoices(prev => prev.filter(i => i.id !== invoiceId));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Overview 
            projects={projects} 
            tasks={tasks} 
            users={users}
            pinnedProjectIds={pinnedProjectIds}
            onTogglePin={togglePinProject}
            onClickProject={(projectId) => {
              setSelectedProjectId(projectId);
              setActiveTab('tasks');
            }}
            onClickTask={(taskId, projectId) => {
              if (projectId) setSelectedProjectId(projectId);
              setHighlightedTaskId(taskId);
              setActiveTab('tasks');
            }}
            onNavigateToProjects={() => setActiveTab('projects')}
            onNavigateToTasks={handleNavigateToTasks}
            onAddProjectClick={handleOpenCreateProject}
          />
        );
      case 'projects':
        return <ProjectBoard 
          projects={projects}
          tasks={tasks}
          users={users}
          invoices={invoices}
          pinnedProjectIds={pinnedProjectIds}
          onTogglePin={togglePinProject}
          onProjectClick={(projectId) => {
            setSelectedProjectId(projectId);
            setActiveTab('tasks');
          }} 
          onAddProjectClick={handleOpenCreateProject}
          onUpdateProjectAM={handleUpdateProjectAM}
          onDeleteProject={handleDeleteProject}
          onUpdateProjectStatus={handleUpdateProjectStatus}
          currentUser={user}
          onEditProject={handleOpenEditProject}
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
          filterDateRange={filterDateRange}
          onClearFilterDateRange={() => setFilterDateRange(null)}
          activeTimerTaskId={activeTimerTaskId}
          setActiveTimerTaskId={setActiveTimerTaskId}
          elapsedTimes={elapsedTimes}
          setElapsedTimes={setElapsedTimes}
          formatTime={formatTime}
          toggleTimer={toggleTimer}
          activeTimerSubTaskId={activeTimerSubTaskId}
          subTaskElapsedTimes={subTaskElapsedTimes}
          setSubTaskElapsedTimes={setSubTaskElapsedTimes}
          toggleSubTaskTimer={toggleSubTaskTimer}
          highlightedTaskId={highlightedTaskId}
          setHighlightedTaskId={setHighlightedTaskId}
        />;
      case 'calendar':
        const filteredCalendarTasks = tasks.filter(t => {
          if (user && ADMIN_ROLES.includes(user.role)) return true;
          const isWorkflowAssignee = t.workflowSteps?.some(step => step.assigneeId === user?.id);
          const isSubTaskAssignee = t.subTasks?.some(st => st.assigneeId === user?.id);
          return t.assigneeId === user?.id || isWorkflowAssignee || isSubTaskAssignee;
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
        return <TeamView users={users} setUsers={setUsers} tasks={tasks} />;
      case 'profile':
        return (
          <UserProfileView 
            usersList={users} 
            onUpdateUsers={setUsers} 
            onOpenRoleSwitcher={() => setShowRoleSwitcher(true)}
            targetUserId={targetProfileUserId}
          />
        );
      case 'smtp':
        return <SMTPDiagnostics />;
      case 'admin':
        const canAccessAdmin = user && (ADMIN_ROLES.includes(user.role) || isSuperAdmin(user) || hasPermission(user, 'canManageUsers'));
        return canAccessAdmin ? (
          <div className="space-y-6">
            <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl w-fit border border-zinc-200/50 dark:border-zinc-800">
              <button
                onClick={() => setAdminSubTab('users')}
                className={cn(
                  "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5",
                  adminSubTab === 'users'
                    ? "bg-white text-zinc-950 shadow dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>User Management</span>
              </button>
              <button
                onClick={() => setAdminSubTab('templates')}
                className={cn(
                  "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5",
                  adminSubTab === 'templates'
                    ? "bg-white text-zinc-950 shadow dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                )}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Task Templates Editor</span>
              </button>
            </div>

            {adminSubTab === 'users' && (
              <UserManagement 
                users={users} 
                onAddUser={handleAddUser} 
                onRemoveUser={handleRemoveUser} 
                onUpdateUsers={setUsers}
                currentUser={user}
              />
            )}
            {adminSubTab === 'templates' && (
              <TemplateEditor />
            )}
          </div>
        ) : (
          <Overview 
            projects={projects} 
            tasks={tasks} 
            pinnedProjectIds={pinnedProjectIds}
            onTogglePin={togglePinProject}
            onClickProject={(projectId) => {
              setSelectedProjectId(projectId);
              setActiveTab('tasks');
            }}
            onClickTask={(taskId, projectId) => {
              if (projectId) setSelectedProjectId(projectId);
              setHighlightedTaskId(taskId);
              setActiveTab('tasks');
            }}
            onNavigateToProjects={() => setActiveTab('projects')}
            onNavigateToTasks={handleNavigateToTasks}
          />
        );
      case 'reports':
        return <ClientReports 
          reports={reports} 
          projects={projects} 
          tasks={tasks}
          users={users}
          elapsedTimes={elapsedTimes}
          activeTimerTaskId={activeTimerTaskId}
          onAddReport={handleAddReport} 
          onRemoveReport={handleRemoveReport} 
          onNavigateToTask={(taskId) => {
            setHighlightedTaskId(taskId);
            setActiveTab('tasks');
          }}
        />;
      case 'billing':
        return <ClientInvoices 
          invoices={invoices} 
          projects={projects} 
          onAddInvoice={handleAddInvoice} 
          onRemoveInvoice={handleRemoveInvoice} 
        />;
      case 'time':
      case 'time-tracking':
        return <TimeSheet 
          tasks={tasks}
          setTasks={setTasks}
          projects={projects}
          activeTimerTaskId={activeTimerTaskId}
          elapsedTimes={elapsedTimes}
          setElapsedTimes={setElapsedTimes}
          toggleTimer={toggleTimer}
          formatTime={formatTime}
          users={users}
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
          activeTimerTaskId={activeTimerTaskId}
          highlightedTaskId={highlightedTaskId}
          setHighlightedTaskId={setHighlightedTaskId}
          onAddUser={handleAddUser}
          onRemoveUser={handleRemoveUser}
        />;
      default:
        return (
          <Overview 
            projects={projects} 
            tasks={tasks} 
            onClickProject={(projectId) => {
              setSelectedProjectId(projectId);
              setActiveTab('tasks');
            }}
            onClickTask={(taskId, projectId) => {
              if (projectId) setSelectedProjectId(projectId);
              setHighlightedTaskId(taskId);
              setActiveTab('tasks');
            }}
            onNavigateToProjects={() => setActiveTab('projects')}
            onNavigateToTasks={handleNavigateToTasks}
          />
        );
    }
  };

  const isClient = user.role === UserRole.CLIENT;

  return (
    <div 
      className="flex min-h-screen bg-background font-sans text-foreground transition-colors duration-200"
    >
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar activeTab={activeTab} setActiveTab={navigateToTab} userRole={user.role} user={user} />
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
                    navigateToTab(tab);
                    setSidebarOpen(false);
                  }} 
                  userRole={user.role} 
                  user={user}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <main className="flex-1 flex flex-col min-w-0">
        {quotaExceeded && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold shrink-0">⚡ Firebase Quota Reached:</span>
              <span>
                Firestore free daily read units limit reached. Real-time sync is temporarily paused and will automatically reset tomorrow. The app is running smoothly in local mode with browser storage.
              </span>
            </div>
            <a 
              href="https://console.firebase.google.com/project/gen-lang-client-0145079617/firestore/databases/ai-studio-blufigoperations-d297ba01-a7ac-4259-b76e-be482e0c94ef/data?openUpgradeDialog=true" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:opacity-80 font-semibold shrink-0"
            >
              Manage Database & Quota &rarr;
            </a>
          </div>
        )}
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-8 bg-card border-b border-border sticky top-0 z-10 gap-4 transition-colors duration-200">
          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 max-w-xl">
            {/* Mobile Hamburger Menu Toggle Button */}
            <Button 
              variant="outline" 
              size="icon" 
              className="lg:hidden h-9 w-9 shrink-0 text-zinc-600 dark:text-zinc-400 border-border"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="relative w-full hidden sm:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 dark:text-zinc-300 z-10" />
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
                  className="pl-10 pr-8 h-9 bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-brand-secondary/70 shadow-sm w-full font-medium" 
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded"
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
                    <div className="p-6 text-center text-zinc-400 text-zinc-400 dark:text-zinc-500 font-medium">
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
                              navigateToTab('tasks');
                              setSearchQuery('');
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60 text-left transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                {highlightText(proj.name, searchQuery)}
                              </p>
                              {proj.description && (
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5 font-medium leading-none">
                                  {highlightText(proj.description, searchQuery)}
                                </p>
                              )}
                            </div>
                            <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded font-extrabold uppercase shrink-0 font-mono ml-2">
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
                              navigateToTab('tasks');
                              setSearchQuery('');
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60 text-left transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                {highlightText(tk.name, searchQuery)}
                              </p>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase">
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
                            <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 text-zinc-600 px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0 tracking-wide font-sans ml-2">
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
                              setTargetProfileUserId(tkUser.id);
                              navigateToTab('profile');
                              setSearchQuery('');
                            }}
                            className="w-full flex items-center p-2 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60 text-left transition-colors"
                          >
                            <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold shrink-0 border border-zinc-200/50 mr-2.5 overflow-hidden">
                              {tkUser.avatarUrl && (tkUser.avatarUrl.startsWith('http') || tkUser.avatarUrl.startsWith('/') || tkUser.avatarUrl.startsWith('data:')) ? (
                                <img src={tkUser.avatarUrl} alt={tkUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="select-none">{tkUser.avatarUrl && tkUser.avatarUrl.length < 4 ? tkUser.avatarUrl : tkUser.name.charAt(0)}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                {highlightText(tkUser.name, searchQuery)}
                              </p>
                              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 truncate uppercase mt-0.5 font-bold tracking-wider">
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

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Active Users Live Badge in Header Corner - Restricted to Admin & Super Admin */}
            {(() => {
              const isAdminOrSuperAdmin = Boolean(
                user && (
                  isSuperAdmin(user) ||
                  ADMIN_ROLES.includes(user.role) ||
                  user.id === '001' ||
                  user.id === '036' ||
                  user.role === UserRole.AGENCY_ADMIN ||
                  user.role === UserRole.ACCOUNT_DIRECTOR
                )
              );

              // Regular end users do NOT see the Live indicator
              if (!isAdminOrSuperAdmin) return null;

              const agencyMembers = users.filter(u => u.role !== UserRole.CLIENT && u.isActive !== false && u.status !== 'inactive');
              const liveOnlineUsers = agencyMembers.filter(u => isUserOnline(u, user?.id));
              const liveCount = liveOnlineUsers.length;
              const totalTeamCount = agencyMembers.length;

              const filteredLiveMembers = (liveUserTab === 'online' ? liveOnlineUsers : agencyMembers).filter(u => {
                if (!liveUserSearch) return true;
                const query = liveUserSearch.toLowerCase();
                return (
                  u.name.toLowerCase().includes(query) ||
                  (u.email && u.email.toLowerCase().includes(query)) ||
                  (u.role && u.role.toLowerCase().includes(query)) ||
                  (u.department && u.department.toLowerCase().includes(query))
                );
              });

              return (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsLiveUsersOpen(!isLiveUsersOpen)}
                    className="hidden sm:flex items-center space-x-1.5 h-9 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-black cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all shadow-2xs shrink-0"
                    title={`${liveCount} Live Online Users (${totalTeamCount} Total Team Members). Click to inspect active live users.`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="tracking-tight">{liveCount} Live</span>
                  </button>

                  {/* LIVE ACTIVE USERS POPUP DROPDOWN */}
                  {isLiveUsersOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40 cursor-default" 
                        onClick={() => setIsLiveUsersOpen(false)} 
                      />

                      <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden font-sans origin-top-right animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Header */}
                        <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                              <Radio className="w-4 h-4 animate-pulse" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">Live Active Members</h4>
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  {liveCount} / {totalTeamCount} Online
                                </span>
                              </div>
                              <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Admin & Super Admin Monitoring View
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsLiveUsersOpen(false)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Search & Tabs */}
                        <div className="p-3 border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 space-y-2">
                          <div className="relative">
                            <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                            <Input
                              type="text"
                              value={liveUserSearch}
                              onChange={e => setLiveUserSearch(e.target.value)}
                              placeholder="Search live members by name, email, dept..."
                              className="pl-8 h-8 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500"
                            />
                            {liveUserSearch && (
                              <button 
                                onClick={() => setLiveUserSearch('')}
                                className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 text-xs font-bold cursor-pointer"
                              >
                                ×
                              </button>
                            )}
                          </div>

                          <div className="flex items-center space-x-1 text-[11px] font-bold pt-1">
                            <button
                              onClick={() => setLiveUserTab('online')}
                              className={cn(
                                "px-2.5 py-1 rounded-md transition-colors flex items-center space-x-1 cursor-pointer",
                                liveUserTab === 'online'
                                  ? "bg-emerald-600 text-white shadow-2xs"
                                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                              )}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              <span>Live Online ({liveCount})</span>
                            </button>
                            <button
                              onClick={() => setLiveUserTab('all')}
                              className={cn(
                                "px-2.5 py-1 rounded-md transition-colors cursor-pointer",
                                liveUserTab === 'all'
                                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                              )}
                            >
                              <span>All Agency ({totalTeamCount})</span>
                            </button>
                          </div>
                        </div>

                        {/* User List */}
                        <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-900/60 p-1">
                          {filteredLiveMembers.length === 0 ? (
                            <div className="p-6 text-center text-xs text-zinc-400 font-medium">
                              No team members match "{liveUserSearch}"
                            </div>
                          ) : (
                            filteredLiveMembers.map(u => {
                              const online = isUserOnline(u, user?.id);
                              // Check if user has an active task running / in progress
                              const userActiveTask = tasks.find(t => 
                                (t.assigneeId === u.id || t.assigneeId === u.email) && 
                                (t.status === TaskStatus.IN_PROGRESS || t.id === activeTimerTaskId)
                              );

                              return (
                                <div 
                                  key={u.id}
                                  className="p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 rounded-xl transition-colors flex items-start justify-between group cursor-pointer"
                                  onClick={() => {
                                    setTargetProfileUserId(u.id);
                                    navigateToTab('profile');
                                    setIsLiveUsersOpen(false);
                                  }}
                                >
                                  <div className="flex items-start space-x-2.5 min-w-0">
                                    <div className="relative shrink-0">
                                      {u.avatar ? (
                                        <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-800" />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                                          {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <span className={cn(
                                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-950",
                                        online ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                                      )} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center space-x-1.5 flex-wrap">
                                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                          {u.name}
                                        </span>
                                        {u.id === user?.id && (
                                          <span className="text-[9px] font-black uppercase px-1 py-0.2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded">
                                            You
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate font-mono">
                                        {u.email || 'No email registered'}
                                      </p>

                                      <div className="flex items-center space-x-1.5 mt-1 flex-wrap gap-y-1">
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
                                          {u.department || 'General'}
                                        </span>
                                        <span className="text-[10px] font-medium text-zinc-400 truncate">
                                          {u.designation || u.role}
                                        </span>
                                      </div>

                                      {/* Live Activity / Task */}
                                      {userActiveTask && (
                                        <div className="mt-1.5 flex items-center space-x-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 truncate">
                                          <Timer className="w-3 h-3 shrink-0 animate-spin-slow" />
                                          <span className="truncate">Active: {userActiveTask.name}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0 pl-2">
                                    <span className={cn(
                                      "inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                                      online ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                                    )}>
                                      {online ? (u.workLocation || 'Online') : 'Offline'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Footer */}
                        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('team');
                              setIsLiveUsersOpen(false);
                            }}
                            className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center justify-center space-x-1 w-full py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                          >
                            <span>Open Full Team Workspace</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Header Live Timer Widget Controller */}
            {(() => {
              const runningHeaderTask = activeTimerTaskId ? tasks.find(t => t.id === activeTimerTaskId) : null;
              const runningHeaderTaskSecs = activeTimerTaskId ? (elapsedTimes[activeTimerTaskId] || 0) : 0;

              const runningHeaderSubtaskParent = activeTimerSubTaskId
                ? tasks.find(t => (t.subTasks || (t as any).subtasks)?.some((st: any) => st.id === activeTimerSubTaskId))
                : null;
              const runningHeaderSubtask = runningHeaderSubtaskParent
                ? (runningHeaderSubtaskParent.subTasks || (runningHeaderSubtaskParent as any).subtasks)?.find((st: any) => st.id === activeTimerSubTaskId)
                : null;
              const runningHeaderSubtaskSecs = activeTimerSubTaskId ? (subTaskElapsedTimes[activeTimerSubTaskId] || 0) : 0;

              // Timer is ACTIVE ONLY IF a valid matching task or subtask exists in the loaded state
              const isHeaderTimerActive = Boolean(
                (activeTimerTaskId && runningHeaderTask) ||
                (activeTimerSubTaskId && runningHeaderSubtask)
              );

              const activeHeaderDisplayTime = formatTime(runningHeaderTaskSecs || runningHeaderSubtaskSecs || 0);
              const activeHeaderName = runningHeaderTask 
                ? runningHeaderTask.name 
                : (runningHeaderSubtask ? `${runningHeaderSubtaskParent?.name}: ${runningHeaderSubtask.title || runningHeaderSubtask.name}` : '');

              const stopCurrentHeaderActiveTimer = (e?: React.MouseEvent) => {
                if (e) e.stopPropagation();
                if (activeTimerTaskId && runningHeaderTask) {
                  toggleTimer(activeTimerTaskId);
                } else if (activeTimerSubTaskId && runningHeaderSubtaskParent) {
                  toggleSubTaskTimer(activeTimerSubTaskId, runningHeaderSubtaskParent.id);
                } else {
                  // Fallback cleanup for phantom timer IDs
                  setActiveTimerTaskId(null);
                  setActiveTimerSubTaskId(null);
                  timerStartRef.current = null;
                  subTaskTimerStartRef.current = null;
                  localStorage.removeItem('blufig_active_task_timer');
                  localStorage.removeItem('blufig_active_subtask_timer');
                  toast.info('Timer reset');
                }
              };

              // Helper to check if task is assigned to current self user
              const isSelfTask = (t: Task) => {
                if (!user) return true;
                const userId = String(user.id || '').toLowerCase();
                const userName = String(user.name || '').toLowerCase();
                const userEmail = String(user.email || '').toLowerCase();

                const taskAssigneeId = String(t.assigneeId || '').toLowerCase();
                const taskAssigneeName = String((t as any).assignee || (t as any).assignedTo || (t as any).assigneeName || '').toLowerCase();
                const taskCreatedById = String(t.createdById || '').toLowerCase();

                const matchAssignee = 
                  (userId && taskAssigneeId === userId) ||
                  (userName && taskAssigneeId === userName) ||
                  (userName && taskAssigneeName.length > 0 && (taskAssigneeName.includes(userName) || userName.includes(taskAssigneeName))) ||
                  (userEmail && taskAssigneeName.length > 0 && taskAssigneeName.includes(userEmail)) ||
                  (userId && taskCreatedById === userId);

                const matchWorkflow = t.workflowSteps?.some(step => {
                  const stepAssigneeId = String(step.assigneeId || '').toLowerCase();
                  const stepAssigneeName = String((step as any).assignee || (step as any).assigneeName || '').toLowerCase();
                  return (userId && stepAssigneeId === userId) ||
                         (userName && stepAssigneeId === userName) ||
                         (userName && stepAssigneeName.length > 0 && stepAssigneeName.includes(userName));
                });

                const subTasks = t.subTasks || (t as any).subtasks || [];
                const matchSubtask = subTasks.some((st: any) => {
                  const stAssigneeId = String(st.assigneeId || '').toLowerCase();
                  const stAssigneeName = String(st.assignee || st.assigneeName || '').toLowerCase();
                  return (userId && stAssigneeId === userId) ||
                         (userName && stAssigneeId === userName) ||
                         (userName && stAssigneeName.length > 0 && stAssigneeName.includes(userName));
                });

                return Boolean(matchAssignee || matchWorkflow || matchSubtask);
              };

              const isUserAdminOrLead = user && (ADMIN_ROLES.includes(user.role) || isSuperAdmin(user) || hasPermission(user, 'canManageUsers'));

              const rawActiveTasks = tasks.filter(t => t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED);

              // For Admins/Leads: see all active tasks across agency.
              // For Regular Employees: restrict scope to tasks in their own department or assigned to them.
              const accessibleActiveTasks = rawActiveTasks.filter(t => {
                if (isUserAdminOrLead) return true;
                if (user?.department && t.department === user.department) return true;
                return isSelfTask(t);
              });

              const selfActiveTasks = accessibleActiveTasks.filter(isSelfTask);

              // Strictly use Self tasks when timerScopeFilter === 'self' (do not fall back to all tasks)
              const displayTasksList = timerScopeFilter === 'self' ? selfActiveTasks : accessibleActiveTasks;

              const filteredTasksForTimer = displayTasksList
                .filter(t => !headerTimerSearch || t.name.toLowerCase().includes(headerTimerSearch.toLowerCase()) || t.id.toLowerCase().includes(headerTimerSearch.toLowerCase()))
                .slice(0, 8);

              return (
                <div className="relative">
                  {isHeaderTimerActive ? (
                    <div className="flex items-center bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/60 rounded-xl p-1 pl-2.5 shadow-sm space-x-2">
                      <button 
                        type="button"
                        onClick={() => setIsHeaderTimerOpen(!isHeaderTimerOpen)}
                        className="flex items-center space-x-1.5 cursor-pointer focus:outline-none"
                        title={`Timer active: ${activeHeaderName}. Click to manage.`}
                      >
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <Timer className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin-slow" />
                        <span className="font-mono text-xs font-black text-emerald-800 dark:text-emerald-200 tracking-tight">
                          {activeHeaderDisplayTime}
                        </span>
                        <span className="hidden md:inline-block max-w-[110px] text-[11px] font-bold text-zinc-700 dark:text-zinc-300 truncate">
                          {activeHeaderName}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={stopCurrentHeaderActiveTimer}
                        className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-xs ml-1"
                        title="Stop Active Timer"
                      >
                        <Square className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  ) : (
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsHeaderTimerOpen(!isHeaderTimerOpen)}
                        className="h-9 px-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-xl flex items-center space-x-1.5 cursor-pointer border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700/60"
                        title="Time Tracker (Stopped)"
                      >
                        <Clock className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                        <span className="text-xs font-bold hidden sm:inline-block text-zinc-700 dark:text-zinc-300">
                          Timer
                        </span>
                        <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                      </Button>
                    </motion.div>
                  )}

                  {/* TIMER DROPDOWN POPUP */}
                  {isHeaderTimerOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40 cursor-default" 
                        onClick={() => setIsHeaderTimerOpen(false)} 
                      />

                      <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden font-sans origin-top-right animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-3.5 border-b border-border flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/40">
                          <div className="flex items-center space-x-2">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              isHeaderTimerActive ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                            )}>
                              <Timer className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">Live Time Tracker</h4>
                              <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                                {isHeaderTimerActive ? "🟢 Timer active & running" : "⚪ Timer currently stopped"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Live Active Users pill inside popup corner - Admin only */}
                            {(() => {
                              const isAdminOrSuperAdmin = Boolean(
                                user && (
                                  isSuperAdmin(user) ||
                                  ADMIN_ROLES.includes(user.role) ||
                                  user.id === '001' ||
                                  user.id === '036' ||
                                  user.role === UserRole.AGENCY_ADMIN ||
                                  user.role === UserRole.ACCOUNT_DIRECTOR
                                )
                              );

                              // Hide from regular end users
                              if (!isAdminOrSuperAdmin) return null;

                              const agencyMembers = users.filter(u => u.role !== UserRole.CLIENT && u.isActive !== false && u.status !== 'inactive');
                              const liveOnlineUsers = agencyMembers.filter(u => isUserOnline(u, user?.id));
                              const liveCount = liveOnlineUsers.length;
                              const totalTeamCount = agencyMembers.length;

                              return (
                                <div 
                                  onClick={() => {
                                    setIsHeaderTimerOpen(false);
                                    setIsLiveUsersOpen(true);
                                  }}
                                  className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-black cursor-pointer hover:bg-emerald-500/20 transition-all"
                                  title={`${liveCount} Live Online Users (${totalTeamCount} total team members). Click to inspect live users.`}
                                >
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                  </span>
                                  <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>{liveCount} Live</span>
                                </div>
                              );
                            })()}

                            <Button
                              variant="ghost" 
                              size="icon" 
                              className="w-7 h-7 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                              onClick={() => setIsHeaderTimerOpen(false)}
                              title="Close"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="p-3.5 space-y-3">
                          {isHeaderTimerActive ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                  Currently Tracking
                                </span>
                                <span className="font-mono text-base font-black text-emerald-800 dark:text-emerald-200">
                                  {activeHeaderDisplayTime}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                                {activeHeaderName}
                              </p>
                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    stopCurrentHeaderActiveTimer(e);
                                  }}
                                  className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold h-8 rounded-lg shadow-sm cursor-pointer"
                                >
                                  <Square className="w-3.5 h-3.5 mr-1.5 fill-current" />
                                  Stop Timer
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setActiveTab('time-tracking');
                                    setIsHeaderTimerOpen(false);
                                  }}
                                  className="w-full text-xs font-bold h-8 rounded-lg cursor-pointer"
                                >
                                  Open Time View
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-center space-y-1">
                              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No Timer Running</p>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Select any task below to start tracking time immediately.</p>
                            </div>
                          )}

                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-1">
                              <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                                Quick Task Timer
                              </label>

                              {/* Task Filter Scope: Self (My Tasks) vs All Tasks */}
                              <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
                                <button
                                  type="button"
                                  onClick={() => setTimerScopeFilter('self')}
                                  className={cn(
                                    "px-2 py-0.5 text-[9px] font-black rounded-md transition-all cursor-pointer",
                                    timerScopeFilter === 'self' 
                                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs" 
                                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                                  )}
                                  title="Show tasks assigned to me"
                                >
                                  Self ({selfActiveTasks.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTimerScopeFilter('all')}
                                  className={cn(
                                    "px-2 py-0.5 text-[9px] font-black rounded-md transition-all cursor-pointer",
                                    timerScopeFilter === 'all' 
                                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs" 
                                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                                  )}
                                  title={isUserAdminOrLead ? "Show all active agency tasks" : "Show department & assigned tasks"}
                                >
                                  {isUserAdminOrLead ? 'All' : 'Dept'} ({accessibleActiveTasks.length})
                                </button>
                              </div>
                            </div>

                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                              <Input
                                type="text"
                                value={headerTimerSearch}
                                onChange={(e) => setHeaderTimerSearch(e.target.value)}
                                placeholder={timerScopeFilter === 'self' ? "Search my tasks..." : (isUserAdminOrLead ? "Search all active tasks..." : "Search department tasks...")}
                                className="pl-8 h-8 text-xs font-medium bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg"
                              />
                            </div>

                            <div className="max-h-52 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                              {filteredTasksForTimer.length === 0 ? (
                                <div className="p-4 text-center text-xs text-zinc-400 font-medium">
                                  {timerScopeFilter === 'self' && selfActiveTasks.length === 0 ? (
                                    <span>No active tasks directly assigned to you. <button type="button" onClick={() => setTimerScopeFilter('all')} className="text-brand-secondary font-bold hover:underline">Show All Tasks</button></span>
                                  ) : (
                                    <span>No tasks found matching query.</span>
                                  )}
                                </div>
                              ) : (
                                filteredTasksForTimer.map(t => {
                                  const isThisActive = activeTimerTaskId === t.id;
                                  const loggedSecs = elapsedTimes[t.id] || (t.timeLoggedSeconds || (t.timeLogged || 0) * 3600);
                                  
                                  return (
                                    <div key={t.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                          {t.name}
                                        </p>
                                        <p className="text-[10px] text-zinc-400 font-medium">
                                          Logged: <span className="font-mono font-bold text-zinc-600 dark:text-zinc-300">{formatTime(loggedSecs)}</span>
                                        </p>
                                      </div>

                                      <Button
                                        size="sm"
                                        variant={isThisActive ? "destructive" : "default"}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleTimer(t.id, e);
                                        }}
                                        className={cn(
                                          "h-7 px-2.5 text-[11px] font-bold rounded-lg shrink-0 cursor-pointer transition-all",
                                          isThisActive 
                                            ? "bg-red-600 hover:bg-red-700 text-white" 
                                            : "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500"
                                        )}
                                      >
                                        {isThisActive ? (
                                          <>
                                            <Square className="w-3 h-3 mr-1 fill-current" />
                                            Stop
                                          </>
                                        ) : (
                                          <>
                                            <Play className="w-3 h-3 mr-1 fill-current" />
                                            Start
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Theme Toggle Button */}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
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

            <Button variant="ghost" size="icon" className="text-zinc-600 dark:text-zinc-400" onClick={() => logout()}>
              <LogOut className="w-5 h-5 text-red-500" />
            </Button>
            
            <div className="relative">
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-zinc-600 dark:text-zinc-400 relative hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
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
                            className="text-[10px] h-7 font-bold text-zinc-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/10 px-2 rounded-xl flex items-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearAll();
                            }}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Clear all
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
                                  "text-xs truncate pr-1",
                                  !notif.isRead ? "font-bold text-zinc-950 dark:text-zinc-100" : "font-medium text-zinc-600 dark:text-zinc-400"
                                )}>
                                  {notif.title}
                                </p>
                                <div className="flex items-center space-x-1 shrink-0 ml-2">
                                  <span className="text-[9px] text-zinc-400 font-mono">
                                    {notif.time}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNotification(notif.id);
                                    }}
                                    title="Delete notification"
                                    className="p-1 text-zinc-400 hover:text-red-500 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
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
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900 dark:bg-zinc-700 border-2 border-transparent group-hover:border-brand-secondary transition-all flex items-center justify-center text-white font-bold shrink-0 relative shadow-sm overflow-hidden">
                {user.avatarUrl && (user.avatarUrl.startsWith('http') || user.avatarUrl.startsWith('/') || user.avatarUrl.startsWith('data:')) ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-sm select-none">
                    {user.avatarUrl && user.avatarUrl.length < 4 ? user.avatarUrl : user.name.charAt(0)}
                  </span>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-card z-10" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Context Header */}
        <div className="px-4 sm:px-8 py-5 sm:py-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 sm:mb-6">
            <div>
              {/* Interactive Breadcrumb Path */}
              <div className="flex items-center flex-wrap gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-widest mb-2">
                <button
                  type="button"
                  onClick={() => navigateToTab(isClient ? 'reports' : 'overview')}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer hover:underline"
                >
                  {isClient ? 'Client Portal' : 'Agency Dashboard'}
                </button>

                {tabHistory.length > 0 && tabHistory[tabHistory.length - 1] !== activeTab && (
                  <>
                    <ChevronRight className="w-3 h-3 text-zinc-400 shrink-0" />
                    <button
                      type="button"
                      onClick={handleGoBack}
                      className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer hover:underline font-semibold"
                    >
                      {getTabDisplayName(tabHistory[tabHistory.length - 1])}
                    </button>
                  </>
                )}

                <ChevronRight className="w-3 h-3 text-zinc-400 shrink-0" />
                <span className="text-brand-secondary font-black">{getTabDisplayName(activeTab)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Prominent Back Navigation Button */}
                {(tabHistory.length > 0 || (activeTab !== 'overview' && activeTab !== 'reports')) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoBack}
                    className="h-8.5 px-3 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-brand-secondary/50 transition-all"
                    title={tabHistory.length > 0 ? `Return to previous view (${getTabDisplayName(tabHistory[tabHistory.length - 1])})` : "Return to previous section"}
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-brand-secondary" />
                    <span>
                      Back {tabHistory.length > 0 ? `to ${getTabDisplayName(tabHistory[tabHistory.length - 1])}` : ''}
                    </span>
                  </Button>
                )}

                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 capitalize">
                  {getTabDisplayName(activeTab)} Workspace
                </h2>
                {activeTimerTaskId && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => navigateToTab('time-tracking')}
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
                {(isSuperAdmin(user) || hasPermission(user, 'canCreateProject') || (user && ADMIN_ROLES.includes(user.role))) && (
                  <Button 
                    size="sm" 
                    className="h-10 bg-brand-secondary hover:bg-brand-secondary/90 text-white font-bold px-4 sm:px-6 flex-1 sm:flex-none cursor-pointer rounded-xl flex items-center gap-2 shadow-sm transition-all"
                    onClick={handleOpenCreateProject}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Project</span>
                  </Button>
                )}
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
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    setUser(u);
                    setShowRoleSwitcher(false);
                    if (u.role === UserRole.CLIENT) setActiveTab('reports');
                    else if (activeTab === 'portal' || activeTab === 'billing') setActiveTab('overview');
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left group",
                    user.id === u.id ? "border-zinc-900 bg-zinc-900 text-white shadow-xl translate-x-1" : "hover:bg-zinc-50 border-zinc-100"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs overflow-hidden shrink-0",
                      user.id === u.id ? "bg-white text-zinc-900" : "bg-zinc-100 text-zinc-500"
                    )}>
                      {u.avatarUrl && (u.avatarUrl.startsWith('http') || u.avatarUrl.startsWith('/') || u.avatarUrl.startsWith('data:')) ? (
                        <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span>{u.avatarUrl && u.avatarUrl.length < 4 ? u.avatarUrl : u.name.charAt(0)}</span>
                      )}
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
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-2xl font-bold tracking-tight">Initiate New Project</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1.5 py-2 space-y-4">
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
              <>
                <div className="grid gap-2">
                  <Label htmlFor="client" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Client Partner</Label>
                  <SearchableUserSelect
                    users={users.filter(u => u.role === UserRole.CLIENT)}
                    value={newProjectClientId}
                    onValueChange={setNewProjectClientId}
                    placeholder="Search & select Client Partner..."
                    searchPlaceholder="Search client name, email..."
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="coordinator" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Project Coordinator (Client Side)</Label>
                  <Input 
                    id="coordinator" 
                    placeholder="e.g. John Doe (Coordinator)" 
                    value={newProjectCoordinator}
                    onChange={(e) => setNewProjectCoordinator(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="am" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Project AM / Assignee</Label>
              <SearchableUserSelect
                users={users.filter(u => u.role !== UserRole.CLIENT)}
                value={selectedAMId}
                onValueChange={setSelectedAMId}
                placeholder="Search & select Project AM / Assignee..."
                searchPlaceholder="Search name, designation, email..."
              />
            </div>

            <div className="grid gap-2 bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4.5 space-y-2 mt-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm">🏢</span>
                <Label className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Operational Team Templates</Label>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                Select one or more operational templates to automatically pre-populate and build comprehensive, multi-team workflows for this project.
              </p>
              
              <div className="space-y-2 mt-2 max-h-[160px] overflow-y-auto pr-1">
                {templatesList.map(tmpl => {
                  const isChecked = selectedTemplateIds.includes(tmpl.id);
                  return (
                    <div 
                      key={tmpl.id} 
                      onClick={() => {
                        setSelectedTemplateIds(prev => 
                          prev.includes(tmpl.id) 
                            ? prev.filter(id => id !== tmpl.id) 
                            : [...prev, tmpl.id]
                        );
                      }}
                      className={cn(
                        "flex items-start space-x-3 p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                        isChecked 
                          ? "bg-amber-500/10 border-amber-500/30 dark:border-amber-500/40 text-amber-900 dark:text-amber-100" 
                          : "bg-white/50 dark:bg-zinc-950/40 border-zinc-200/60 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30"
                      )}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => {}} // handled by parent div onClick
                        className="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer accent-amber-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold leading-none">{tmpl.name}</span>
                          <span className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400">
                            {tmpl.tasks.length} tasks
                          </span>
                        </div>
                        {tmpl.description && (
                          <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium mt-1 truncate">
                            {tmpl.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedTemplateIds.length > 0 && (
                <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-2.5 mt-2 space-y-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">
                    Predefined Task Cards to be Generated ({
                      selectedTemplateIds.reduce((acc, tmplId) => {
                        const tmpl = templatesList.find(t => t.id === tmplId);
                        return acc + (tmpl ? tmpl.tasks.length : 0);
                      }, 0)
                    } Tasks):
                  </span>
                  <div className="max-h-[100px] overflow-y-auto space-y-1.5 pr-1">
                    {selectedTemplateIds.map(tmplId => {
                      const tmpl = templatesList.find(t => t.id === tmplId);
                      if (!tmpl) return null;
                      return (
                        <div key={tmpl.id} className="space-y-1 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                          <div className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">
                            {tmpl.name}
                          </div>
                          {tmpl.tasks.map((tk, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[10px] text-zinc-600 dark:text-zinc-300 font-medium pl-1.5">
                              <span>• {tk.name}</span>
                              <span className="font-mono text-[9px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-1 rounded font-bold">
                                {tk.timeEstimate}h
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button 
              onClick={handleConfirmProject}
              disabled={!newProjectName}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl font-bold uppercase tracking-widest text-xs"
            >
              Confirm & Activate Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-2xl font-bold tracking-tight">Edit Project Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1.5 py-2 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Project Name</Label>
              <Input 
                id="edit-name" 
                placeholder="e.g. Acme Corp Web Build" 
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-website" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Project Website URL <span className="text-zinc-400 lowercase font-medium">(Optional)</span></Label>
              <Input 
                id="edit-website" 
                placeholder="e.g. www.acme.com" 
                value={editProjectWebsite}
                onChange={(e) => setEditProjectWebsite(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-type" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Project Type</Label>
                <Select value={editProjectType} onValueChange={setEditProjectType}>
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

              <div className="grid gap-2">
                <Label htmlFor="edit-status" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Project Status</Label>
                <Select value={editProjectStatus} onValueChange={(val: any) => setEditProjectStatus(val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Review">In Review</SelectItem>
                    <SelectItem value="Client Review">Client Review</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {user && ADMIN_ROLES.includes(user.role) && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="edit-client" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Client Partner</Label>
                  <SearchableUserSelect
                    users={users.filter(u => u.role === UserRole.CLIENT)}
                    value={editProjectClientId}
                    onValueChange={setEditProjectClientId}
                    placeholder="Search & select Client Partner..."
                    searchPlaceholder="Search client name, email..."
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-coordinator" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Project Coordinator (Client Side)</Label>
                  <Input 
                    id="edit-coordinator" 
                    placeholder="e.g. John Doe (Coordinator)" 
                    value={editProjectCoordinator}
                    onChange={(e) => setEditProjectCoordinator(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="edit-am" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Project AM / Assignee</Label>
              <SearchableUserSelect
                users={users.filter(u => u.role !== UserRole.CLIENT)}
                value={editProjectAMId}
                onValueChange={setEditProjectAMId}
                placeholder="Search & select Project AM / Assignee..."
                searchPlaceholder="Search name, designation, email..."
              />
            </div>

            <div className="grid gap-2 bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4.5 space-y-2 mt-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm">🏢</span>
                <Label className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Project Operational Team Templates</Label>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                The operational templates applied to this project. Check additional templates to generate and append more task cards.
              </p>
              
              <div className="space-y-2 mt-2 max-h-[160px] overflow-y-auto pr-1">
                {templatesList.map(tmpl => {
                  const isChecked = editProjectSelectedTemplateIds.includes(tmpl.id);
                  const isAlreadyApplied = editingProject?.templateIds?.includes(tmpl.id);
                  return (
                    <div 
                      key={tmpl.id} 
                      onClick={() => {
                        setEditProjectSelectedTemplateIds(prev => 
                          prev.includes(tmpl.id) 
                            ? prev.filter(id => id !== tmpl.id) 
                            : [...prev, tmpl.id]
                        );
                      }}
                      className={cn(
                        "flex items-start space-x-3 p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                        isChecked 
                          ? "bg-amber-500/10 border-amber-500/30 dark:border-amber-500/40 text-amber-900 dark:text-amber-100" 
                          : "bg-white/50 dark:bg-zinc-950/40 border-zinc-200/60 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30"
                      )}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => {}} // handled by parent div onClick
                        className="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer accent-amber-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold leading-none">{tmpl.name}</span>
                            {isAlreadyApplied && (
                              <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 leading-none">
                                Applied
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400">
                            {tmpl.tasks.length} tasks
                          </span>
                        </div>
                        {tmpl.description && (
                          <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium mt-1 truncate">
                            {tmpl.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {editProjectSelectedTemplateIds.some(id => !editingProject?.templateIds?.includes(id)) && (
                <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-2.5 mt-2 space-y-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">
                    Predefined Task Cards to be Appended ({
                      editProjectSelectedTemplateIds.filter(id => !editingProject?.templateIds?.includes(id)).reduce((acc, tmplId) => {
                        const tmpl = templatesList.find(t => t.id === tmplId);
                        return acc + (tmpl ? tmpl.tasks.length : 0);
                      }, 0)
                    } New Tasks):
                  </span>
                  <div className="max-h-[100px] overflow-y-auto space-y-1.5 pr-1">
                    {editProjectSelectedTemplateIds.filter(id => !editingProject?.templateIds?.includes(id)).map(tmplId => {
                      const tmpl = templatesList.find(t => t.id === tmplId);
                      if (!tmpl) return null;
                      return (
                        <div key={tmpl.id} className="space-y-1 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                          <div className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">
                            {tmpl.name}
                          </div>
                          {tmpl.tasks.map((tk, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[10px] text-zinc-600 dark:text-zinc-300 font-medium pl-1.5">
                              <span>• {tk.name}</span>
                              <span className="font-mono text-[9px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-1 rounded font-bold">
                                {tk.timeEstimate}h
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsEditProjectDialogOpen(false)}
              className="w-full sm:w-auto h-12 rounded-xl font-bold uppercase tracking-widest text-xs border-zinc-200 dark:border-zinc-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveProjectEdit}
              disabled={!editProjectName}
              className="w-full sm:w-auto sm:ml-2 bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl font-bold uppercase tracking-widest text-xs"
            >
              Save Changes
            </Button>
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
                  <SelectItem value="all">
                    <div className="flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-zinc-500" />
                      <span>All Projects</span>
                    </div>
                  </SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{p.name}</span>
                      </div>
                    </SelectItem>
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
  
  // Intercept if an active secure reset link is opened in the URL
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  
  if (action === 'reset-password' || !user) {
    return <LoginPage />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" visibleToasts={2} duration={2000} richColors closeButton />
        <DashboardWrapper />
      </AuthProvider>
    </ThemeProvider>
  );
}

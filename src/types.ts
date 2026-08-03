/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  AGENCY_ADMIN = 'AGENCY_ADMIN',
  ACCOUNT_DIRECTOR = 'ACCOUNT_DIRECTOR',
  ACCOUNT_MANAGER = 'ACCOUNT_MANAGER',
  SALES = 'SALES',
  PRE_SALES = 'PRE_SALES',
  BD_EXECUTIVE = 'BD_EXECUTIVE',
  DIGITAL_LEAD = 'DIGITAL_LEAD',
  PERFORMANCE_ANALYST = 'PERFORMANCE_ANALYST',
  SEO_SPECIALIST = 'SEO_SPECIALIST',
  CONTENT_LEAD = 'CONTENT_LEAD',
  CONTENT_WRITER = 'CONTENT_WRITER',
  WEB_DEV_MANAGER = 'WEB_DEV_MANAGER',
  WEB_DEVELOPER = 'WEB_DEVELOPER',
  HUBSPOT_SPECIALIST = 'HUBSPOT_SPECIALIST',
  DESIGN_LEAD = 'DESIGN_LEAD',
  DESIGNER = 'DESIGNER',
  DESIGNER_MOTION = 'DESIGNER_MOTION',
  HR_SPECIALIST = 'HR_SPECIALIST',
  ADMIN_SUPPORT = 'ADMIN_SUPPORT',
  CLIENT = 'CLIENT'
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export enum Department {
  MANAGEMENT = 'Management',
  CLIENT_SERVICING = 'Client Servicing',
  SALES = 'Sales',
  DIGITAL = 'Digital',
  DIGITAL_MARKETING = 'Digital Marketing',
  CONTENT = 'Content',
  WEB_DEVELOPMENT = 'Web Development',
  HUBSPOT = 'HubSpot',
  DESIGN = 'Design',
  HUMAN_RESOURCES = 'Human Resources'
}

export enum ProjectType {
  RETAINER = 'Retainer',
  ONE_OFF = 'One-Off Project',
  ALWAYS_ON = 'Always-On'
}

export enum TaskStatus {
  OPEN = 'Open',
  YET_TO_START = 'Yet to Start',
  IN_PROGRESS = 'In Progress',
  INTERNAL_REVIEW = 'Internal Review',
  IN_REVIEW_AM = 'In Review (AM)',
  UNDER_CLIENT_REVIEW = 'Under Client Review',
  INTERNAL_CHANGES = 'Internal Changes',
  CHANGES_REQUESTED_AM = 'Changes Requested - AM',
  CHANGES_REQUESTED_CLIENT = 'Changes Requested - Client',
  APPROVED = 'Approved',
  DONE = 'Done',
  ON_HOLD = 'On Hold',
  CANCELLED = 'Cancelled',
  REJECTED = 'Rejected',
  // Backward compatibility aliases
  REVIEW = 'Review',
  CLIENT_REVIEW = 'Client Review',
  REVISION_REQUESTED = 'Revision Requested',
  BLOCKED = 'Blocked'
}

export const CORE_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.OPEN,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.CLIENT_REVIEW,
  TaskStatus.DONE,
  TaskStatus.BLOCKED
];

export const getQuickStatuses = (currentStatus?: string): TaskStatus[] => {
  if (currentStatus && !CORE_TASK_STATUSES.includes(currentStatus as TaskStatus)) {
    return [...CORE_TASK_STATUSES, currentStatus as TaskStatus];
  }
  return CORE_TASK_STATUSES;
};

export enum Priority {
  LOW = 'Low',
  NORMAL = 'Normal',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export const ADMIN_ROLES: UserRole[] = [
  UserRole.AGENCY_ADMIN,
  UserRole.ACCOUNT_DIRECTOR,
  UserRole.ACCOUNT_MANAGER,
  UserRole.DIGITAL_LEAD,
  UserRole.CONTENT_LEAD,
  UserRole.WEB_DEV_MANAGER,
  UserRole.DESIGN_LEAD,
  UserRole.HR_SPECIALIST
];

export interface UserPermissions {
  canCreateProject?: boolean;
  canDeleteProject?: boolean;
  canManageInvoices?: boolean;
  canManageUsers?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  department: Department;
  designation: string;
  role: UserRole;
  skillTags: string[];
  avatarUrl?: string;
  gender?: 'male' | 'female';
  status?: 'active' | 'inactive';
  isActive?: boolean;
  workLocation?: 'In Office' | 'Work From Home' | 'Leave' | 'Appear Away';
  isOnline?: boolean;
  lastSeenAt?: number;
  permissions?: UserPermissions;
  useCompatibilityEmails?: boolean;
  isSuperAdmin?: boolean;
  reportsToId?: string;
  isDeptLead?: boolean;
  hierarchyLevel?: 'executive' | 'director' | 'manager' | 'lead' | 'specialist';
  clientProjects?: { name: string; timingHours: number; websiteUrl: string; type: string }[];
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  accountManagerId: string;
  type: ProjectType;
  status: 'Active' | 'On Hold' | 'Completed' | 'In Review' | 'Client Review' | 'Pending';
  startDate: string;
  endDate?: string;
  description?: string;
  websiteUrl?: string;
  clientCoordinator?: string;
  timingHours?: number;
  monthlyBudgetHours?: number; // Monthly budget of hours for client billing
  templateIds?: string[];
}

export interface SubTaskTimeEntry {
  id: string;
  userId: string;
  userName: string;
  timeLoggedSeconds: number; // in seconds
  description?: string;
  date: string;
  isManual?: boolean;
  isApproved?: boolean; // Lead approval for manual time edit
}

export interface SubTask {
  id: string;
  taskId: string;
  name: string;
  isCompleted: boolean;
  createdAt: string;
  assigneeId?: string; // primary assignee ID for backward compatibility
  assigneeIds?: string[]; // multiple assigned person IDs
  status?: TaskStatus;
  timeEstimate?: number; // in hours
  timeLogged?: number; // in hours
  timeLoggedSeconds?: number; // in seconds
  description?: string; // subtask description
  assetType?: string; // Design asset type (e.g., Static Post, Reel, Motion Graphic)
  workCategory?: 'BAU' | 'Adhoc' | 'UI' | string; // Work classification (BAU / Adhoc / UI)
  priority?: Priority; // Subtask level priority
  dueDate?: string; // Subtask deadline
  deadlineChangeCount?: number; // Count of times deadline was updated
  timeEntries?: SubTaskTimeEntry[]; // Per-designer breakdown of time logged
}

export const DESIGN_ASSET_TYPES = [
  'Static Post',
  'Carousel / Multi-Slide',
  'Reel / Short Video',
  'Motion Graphic',
  'Web Banner / Ad',
  'Story Graphic',
  'Brand Identity / Logo',
  'Presentation Deck',
  'HTML Email Graphic',
  'Print / Collateral',
  'Packaging Design',
  'UI/UX Layout',
  'Other'
];

export interface TaskWorkflowStep {
  id: string;
  name: string;
  assigneeId: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: string;
  details?: string;
  timestamp: string;
}

export interface Task {
  id: string;
  projectId: string;
  deliverableId: string;
  name: string;
  type: string;
  assigneeId: string;
  assigneeIds?: string[];
  department?: Department;
  deadlineChangeCount?: number;
  createdById?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
  timeEstimate?: number; // in hours
  timeLogged?: number; // in hours
  timeLoggedSeconds?: number; // in seconds
  blockerIds?: string[];
  subTasks?: SubTask[]; // Added for UI convenience
  workflowSteps?: TaskWorkflowStep[];
  currentStepIndex?: number;
  activities?: TaskActivity[]; // Activity log entries
  
  // Recurrence Fields
  isRecurring?: boolean;
  recurrenceInterval?: number; // e.g. 1 (every period), 2 (every second period)
  recurrenceTimes?: number; // e.g. thrice (3 times), monthly (12 times)
  recurrencePeriod?: 'daily' | 'week' | 'month'; // e.g. daily, weekly or monthly recurrence
  recurrenceProgress?: number; // how many recurring tasks have been generated so far
  recurrenceMode?: 'instant' | 'dynamic'; // pre-generate vs dynamic auto-creation
  recurrenceSpacingMode?: 'spaced' | 'custom'; // spaced evenly vs custom days
  recurrenceDensity?: number; // tasks per week or month
  parentTaskId?: string; // reference to master template task
  recurrenceDays?: string[]; // custom weekdays (e.g. ['Monday', 'Wednesday']) or days of month
  recurringDates?: string[]; // calculated list of all planned applied dates (YYYY-MM-DD)
  isBillable?: boolean;
}

export interface Deliverable {
  id: string;
  projectId: string;
  name: string;
  status: 'Pending' | 'In Progress' | 'In Review' | 'Approved' | 'Delivered';
  revisionCount: number;
}

export interface ClientReport {
  id: string;
  projectId: string;
  title: string;
  date: string;
  type: 'Monthly' | 'Weekly' | 'Custom';
  status: 'Draft' | 'Published';
  url?: string;
  fileName?: string;
  description?: string;
}

export interface ClientInvoice {
  id: string;
  projectId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  date: string;
  dueDate: string;
  status: 'Pending' | 'Paid' | 'Overdue' | 'Draft';
  url?: string;
  description?: string;
}

export interface NotificationItem {
  id: string;
  userId?: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: 'info' | 'alert' | 'success' | 'task';
  taskId?: string;
}

export const isSuperAdmin = (user: UserProfile | null | undefined): boolean => {
  if (!user) return false;
  const email = user.email?.toLowerCase();
  return user.id === '001' || user.id === '036' || email === 'amit@blufig.digital' || email === 'pintu@blufig.digital' || email === 'vigneshatwork21@gmail.com' || email === 'vignesh@blufig.digital' || user.isSuperAdmin === true;
};

export const hasPermission = (user: UserProfile | null | undefined, permissionKey: keyof UserPermissions): boolean => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return !!user.permissions?.[permissionKey];
};

export const isUserOnline = (u: UserProfile | null | undefined, currentUserId?: string): boolean => {
  if (!u) return false;
  if (u.isActive === false || u.status === 'inactive') return false;
  if (u.workLocation === 'Leave' || u.workLocation === 'Appear Away') return false;

  // The current active user on this browser session is online
  if (currentUserId && u.id === currentUserId) return true;

  if (u.isOnline === false) return false;

  // Real-time heartbeat check within last 2 minutes
  if (u.lastSeenAt) {
    const TWO_MINUTES = 2 * 60 * 1000;
    return (Date.now() - u.lastSeenAt) < TWO_MINUTES;
  }

  return u.isOnline === true;
};

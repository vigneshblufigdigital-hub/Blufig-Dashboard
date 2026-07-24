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
  IN_PROGRESS = 'In Progress',
  REVIEW = 'Review',
  CLIENT_REVIEW = 'Client Review',
  REVISION_REQUESTED = 'Revision Requested',
  APPROVED = 'Approved',
  DONE = 'Done',
  BLOCKED = 'Blocked',
  CANCELLED = 'Cancelled'
}

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
  permissions?: UserPermissions;
  useCompatibilityEmails?: boolean;
  isSuperAdmin?: boolean;
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
  templateIds?: string[];
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
}

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

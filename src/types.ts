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
  status?: 'active' | 'inactive';
  isActive?: boolean;
  workLocation?: 'In Office' | 'Work From Home' | 'Leave' | 'Appear Away';
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  accountManagerId: string;
  type: ProjectType;
  status: 'Active' | 'On Hold' | 'Completed';
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface SubTask {
  id: string;
  taskId: string;
  name: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface TaskWorkflowStep {
  id: string;
  name: string;
  assigneeId: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface Task {
  id: string;
  projectId: string;
  deliverableId: string;
  name: string;
  type: string;
  assigneeId: string;
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
  
  // Recurrence Fields
  isRecurring?: boolean;
  recurrenceInterval?: number; // e.g. 1 (every period), 2 (every second period)
  recurrenceTimes?: number; // e.g. thrice (3 times), monthly (12 times)
  recurrencePeriod?: 'week' | 'month'; // e.g. weekly or monthly recurrence
  recurrenceProgress?: number; // how many recurring tasks have been generated so far
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

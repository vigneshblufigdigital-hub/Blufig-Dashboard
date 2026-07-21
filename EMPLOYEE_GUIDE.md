# 📘 BLUFIG Operations System — Employee & User Guide

Welcome to the **BluFig Operations System**. This platform is an enterprise-grade agency management suite designed specifically for digital marketing, design, and web development workflows. It serves as the single source of truth for managing clients, projects, task assignments, team calendars, live time tracking, financial invoicing, performance analytics, and direct client collaborations.

---

## 🛠️ Table of Contents
1. [Core Architecture & Workflow Loops](#1-core-architecture--workflow-loops)
2. [User Roles & Permission Enforcements](#2-user-roles--permission-enforcements)
3. [Step-by-Step Menu Guide & Features](#3-step-by-step-menu-guide--features)
4. [Master Operational Workflows](#4-master-operational-workflows)
   - [A. Initiating a Project with Multi-Team Templates](#a-initiating-a-project-with-multi-team-templates)
   - [B. Generating and Appending Templates to Existing Projects](#b-generating-and-appending-templates-to-existing-projects)
   - [C. Structuring and Dispatching Task Cards](#c-structuring-and-dispatching-task-cards)
   - [D. Registering Employees & Granting Permission Keys](#d-registering-employees--granting-permission-keys)
   - [E. Setting up the SMTP Email Notification Gateway](#e-setting-up-the-smtp-email-notification-gateway)
   - [F. Interactive Client Approvals & Revision Loops](#f-interactive-client-approvals--revision-loops)
5. [Best Practices for Daily Operations](#5-best-practices-for-daily-operations)

---

## 1. Core Architecture & Workflow Loops

The BluFig platform is built as a highly responsive, full-stack digital workspace. The overall lifecycle of operations consists of four tightly synchronized loops:

```
+-------------------------------------------------------------+
|                     1. PROJECT INITIALIZATION               |
|  - Set metadata (website, client, AM).                       |
|  - Select and load multiple Team Templates (SEO, Web, etc.). |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     2. TASK EXECUTION                       |
|  - Real-time background timers track billable hours.        |
|  - Tasks transition via Kanban (In Progress -> Review).     |
|  - Custom checklists trace granular progress on cards.      |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     3. CLIENT PORTAL LOOP                   |
|  - Deliverables are published securely to client view.      |
|  - Client logs in, reviews live interactive files.          |
|  - Actions: Mark as Approved OR Request Revisions.          |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     4. REPORTING & BILLING                  |
|  - Gemini AI analyzes performance & generates commentary.  |
|  - Automated invoices sync billing states and track pay.    |
|  - SMTP Gateway dispatches instant progress digests.        |
+-------------------------------------------------------------+
```

---

## 2. User Roles & Permission Enforcements

To ensure bank-grade security and client-internal data isolation, the system enforces a strict **Role-Based Access Control (RBAC)** architecture. 

### A. Designation Classes
Every user account in the system is assigned a designated operational role:
- **Management & Leads**: `AGENCY_ADMIN`, `ACCOUNT_DIRECTOR`, `DIGITAL_LEAD`, `CONTENT_LEAD`, `WEB_DEV_MANAGER`, `DESIGN_LEAD`, `HR_SPECIALIST`
- **Client Servicing**: `ACCOUNT_MANAGER` (AM)
- **Specialists & Creators**: `PERFORMANCE_ANALYST`, `SEO_SPECIALIST`, `CONTENT_WRITER`, `WEB_DEVELOPER`, `HUBSPOT_SPECIALIST`, `DESIGNER`, `DESIGNER_MOTION`
- **Sales & Business Development**: `SALES`, `PRE_SALES`, `BD_EXECUTIVE`
- **Administrative Support**: `ADMIN_SUPPORT`
- **Client Partners**: `CLIENT` (e.g. external stakeholders and company contacts)

### B. Super Admin Identification
Certain critical administrative commands (such as editing SMTP configurations or performing global permission overrides) are reserved for **Super Admins**. The system identifies Super Admins based on:
1. User account ID `001` or `036`.
2. Verified email domain matches:
   - `amit@blufig.digital`
   - `pintu@blufig.digital`
   - `vignesh@blufig.digital`
   - `vigneshatwork21@gmail.com`
3. Explicit administrative boolean: `isSuperAdmin: true` is set on their database profile.

### C. Granular Delegated Permissions
For non-super admin accounts, individual managers can grant specific permission keys to customize capabilities:
- `canCreateProject`: Permission to initiate brand-new client projects and assign primary managers.
- `canDeleteProject`: Permission to archive or purge historical project files.
- `canManageInvoices`: Permission to draft, edit, and record payments for financial invoices.
- `canManageUsers`: Permission to add, disable, or modify permissions for agency personnel.

---

## 3. Step-by-Step Menu Guide & Features

### 💻 1. Overview Workspace
*   **Purpose**: The personal dashboard and control tower for daily work.
*   **Key Metrics Displayed**:
    *   *Active Projects*: Quick view of all current engagements.
    *   *Tasks Due Today*: Count of immediate deliverables.
    *   *Completed (7D)*: Productivity rate of the team over the last 7 days.
    *   *Delivery Health*: Color-coded percentage illustrating task completion rates vs deadlines.
*   **My Active Assignments**: A personalized, interactive workspace filtering tasks assigned to the currently logged-in user. Employees can start/stop tracking time directly, update task status instantly, and expand checklists.

### 💼 2. Projects Board
*   **Purpose**: Visualized project management mapping out the agency's portfolio.
*   **Features**:
    *   *Kanban & List Toggle*: View projects grouped by client partners or in detailed data sheets.
    *   *Detailed Card Information*: Track client coordinators, active hours logged, associated URLs, and colorized status chips (**Active, Pending, In Review, Client Review, Completed, On Hold**).
    *   *Project Type Specifier*: Retainer, One-Off Project, or Always-On.

### Layers 3. Tasks Workspace
*   **Purpose**: High-performance task board and spreadsheet controller.
*   **Interactive Controls**:
    *   *Global Filter Bar*: Multi-select search engine allowing instant query execution by Project, Assignee, Priority, Status, or Deliverable.
    *   *Checklists*: Add multiple sub-tasks per card to keep item completion granular.
    *   *Status Kanban Columns*: Drag-and-drop or select statuses: **Open ➡️ In Progress ➡️ Review ➡️ Client Review ➡️ Revision Requested ➡️ Approved ➡️ Done ➡️ Blocked ➡️ Cancelled**.

### 📅 4. Calendar Workspace
*   **Purpose**: Visually track agency-wide milestones and card deadlines on a monthly calendar grid.
*   **Features**:
    *   Color-coded priorities (**High/Critical** highlighted in amber and red).
    *   Interactive filter to view a single project's scope, or narrow down to a single assignee's weekly schedule.

### 👥 5. Team Directory
*   **Purpose**: Employee utilization tracker and live attendance workspace.
*   **Features**:
    *   *Skills & Expertise Tags*: Search employees by core competencies (e.g. *SEO, HubSpot, Motion Graphics, React*).
    *   *Work Location Indicators*: Real-time remote check-ins: **In Office 💻, Work From Home 🏡, Leave 🌴, Appear Away 💤**.
    *   *Utilization & Capacity Gauge*: Visually monitors task count per employee to prevent burnout.

### 📊 6. Reports & AI Commentary
*   **Purpose**: Strategic performance analytics.
*   **Features**:
    *   Tracks task velocity, time tracking totals, and financial payout performance.
    *   **Google Gemini Integration**: Click "Generate Strategic AI Commentary" to trigger natural language model analysis. The model evaluates backlog bottlenecks, top-performing managers, and structures executive summaries ready to present to stakeholders.

### 💵 7. Invoice Manager
*   **Purpose**: Professional invoice billing and revenue tracking.
*   **Features**:
    *   Add recurring retainer fees, flat project costs, or custom descriptions.
    *   Status trackers: **Draft, Pending, Paid, Overdue**.
    *   Automated invoice indexing with standard PDF format print configurations.

### ⏱️ 8. Time Tracking Console
*   **Purpose**: Granular hour logging for strict agency timesheet reporting.
*   **Features**:
    *   *Universal Timer Widget*: An on-screen floating timer that remains active across all workspace views.
    *   Tracks exact task duration down to the second.
    *   Syncs log outputs directly to project budgets and client invoice summaries.

### ⚙️ 9. Admin Workspace
*   **Purpose**: Employee user accounts and permission keys configuration.
*   **Features**:
    *   Provision new workspace credentials for joining employees.
    *   Modify roles, assign core departments, and configure customized skill-sets.
    *   Assign specific feature access bypasses (e.g. giving a Project Manager permission to manage billing).

### 🖥️ 10. SMTP Outbound Gateway
*   **Purpose**: Manage notification routing networks.
*   **Features**:
    *   Configure agency SMTP server parameters (Host, Port, User, Password, TLS/SSL).
    *   Ensures notification alerts are sent immediately to clients and internal specialists when task statuses update.
    *   Test suite: Dispatch a live test email directly from the configuration tab to verify credential alignment.

### 📝 11. Client Portal
*   **Purpose**: Secure client-facing reviews sandbox.
*   **Features**:
    *   Displays only the respective client's active projects and file attachments.
    *   Provides interactive feedback logs.
    *   Allows clients to mark project deliverables as "Approved" or "Revision Requested".

---

## 4. Master Operational Workflows

Follow these step-by-step instructions to perform core activities in the BluFig platform.

### A. Initiating a Project with Multi-Team Templates
When launching a new client engagement, administrators can save hours of manually structuring tasks by combining pre-configured **Operational Team Templates** (Web Dev, SEO, Design, etc.).

```
                   CREATION PROCESS
 +---------------------------------------------------+
 | 1. Open Projects Tab -> Click "Initiate Project"  |
 +-------------------------+-------------------------+
                           |
                           v
 +---------------------------------------------------+
 | 2. Fill Name, Website, Client Partner, AM        |
 +-------------------------+-------------------------+
                           |
                           v
 +---------------------------------------------------+
 | 3. Under "Operational Team Templates" Section     |
 |    - Check Web Dev Template  [x]                  |
 |    - Check SEO Template      [x]                  |
 |    - Check Design Template   [ ]                  |
 +-------------------------+-------------------------+
                           |
                           v
 +---------------------------------------------------+
 | 4. Click "Confirm & Activate Project"             |
 |    - Project creates                              |
 |    - 6 core tasks populated instantly in board    |
 +---------------------------------------------------+
```

1. Click on **Projects** in the sidebar.
2. In the top-right corner, click **Initiate New Project**.
3. Fill out the core administrative parameters:
   - **Project Name**: Choose a descriptive name (e.g., `ZiniosEdge Web Rebuild`).
   - **Website URL**: (Optional) For quick-referencing active client sites.
   - **Client Partner**: Assign the corresponding client account.
   - **Project AM / Assignee**: Select the Account Manager who will lead the engagement.
4. Scroll to the **Operational Team Templates** bento section.
5. Select one or more operational templates (e.g., select *both* "Web Dev Template" and "SEO Template" for full-service accounts).
6. The system displays a live preview summary of all standard task cards that will be generated, including estimate times (e.g. *Monthly Reports, Security Audits, Keyword Research*).
7. Click **Confirm & Activate Project**. The project will be created, and all template workflows will instantly deploy to your Task Board!

---

### B. Generating and Appending Templates to Existing Projects
If a project expands mid-lifecycle (e.g. adding an unexpected Content Campaign to a Web Development retainer), managers can append new team templates without losing historical data or existing task boards.

```
                    EDIT PROCESS
 +---------------------------------------------------+
 | 1. Open Projects Tab -> Click Card Dropdown Menu  |
 +-------------------------+-------------------------+
                           |
                           v
 +---------------------------------------------------+
 | 2. Click "Edit Project Details"                   |
 +-------------------------+-------------------------+
                           |
                           v
 +---------------------------------------------------+
 | 3. Check NEW Templates to Append:                 |
 |    - Web Dev  [Applied]                           |
 |    - SEO      [Applied]                           |
 |    - Content  [x]  <-- Select to Add              |
 +-------------------------+-------------------------+
                           |
                           v
 +---------------------------------------------------+
 | 4. Click "Save Changes"                           |
 |    - Project data updates                         |
 |    - Content Tasks appended to active board       |
 +---------------------------------------------------+
```

1. Navigate to the **Projects** workspace.
2. Find the project card you wish to update.
3. Click the **three dots dropdown menu (...)** in the card's top-right corner and select **Edit Project Details**.
4. Inside the edit dialog, your currently applied templates are highlighted with an **"Applied"** visual badge.
5. Check any additional templates you wish to append (e.g., checking *Content Team Template* to append copywriting tasks).
6. The preview list will update to show only the **New Tasks** that are about to be generated.
7. Click **Save Changes**. The project properties are updated, and the new task workflows are seamlessly appended to your active project board.

---

### C. Structuring and Dispatching Task Cards
To assign custom work outside of the standard templates:

1. Click **Tasks** in the sidebar.
2. Click **Create Task** in the top-right corner.
3. Configure your task requirements:
   - **Task Name**: Clear, actionable title.
   - **Project**: Link the task to the correct client project.
   - **Deliverable Type**: Categorize the work (e.g. *Strategy, Web Development, Design, SEO, Copywriting*).
   - **Assignee**: Designate the internal specialist.
   - **Priority**: Low, Normal, High, or Critical.
   - **Time Estimate (Hours)**: Input expected work hours.
   - **Due Date**: Clear deadline for client delivery.
4. Add **Checklist Items** to break down the task into step-by-step milestones (e.g. *"1. Draft Outline"*, *"2. Gather References"*, *"3. First Review"*).
5. Click **Create Task** to dispatch the card. The assignee will receive an instant dashboard alert.

---

### D. Registering Employees & Granting Permission Keys
To register a new employee or manage access permissions:

1. Click on the **Admin** workspace tab (accessible to Admins & Super Admins).
2. Click **Add New User** or select the **Edit** icon next to an existing employee profile.
3. Configure the profile details: Name, Email, Department, Designation, and Skill Tags.
4. Under **System Permissions Override**, check or uncheck the authorization toggles:
   *   `canCreateProject`: Grants creation rights.
   *   `canDeleteProject`: Allows workspace cleanups.
   *   `canManageInvoices`: Opens billing and invoicing access.
   *   `canManageUsers`: Allows user account modifications.
5. Click **Save User Details** to apply the permissions.

---

### E. Setting up the SMTP Email Notification Gateway
To ensure notification digests are delivered to employees and client partners, configure your agency SMTP servers:

1. Log in as a **Super Admin** (e.g., using an account like `amit@blufig.digital`).
2. Navigate to **SMTP Gateway** in the sidebar.
3. Complete the server configuration fields:
   - **SMTP Host**: e.g. `smtp.gmail.com`
   - **Port**: `587` (TLS) or `465` (SSL)
   - **Username**: Your dispatch email (e.g. `notifications@blufig.digital`).
   - **Password**: Your SMTP app password.
   - **Sender Email**: The displayed email name.
4. Click **Save Connection Settings**.
5. Use the **Test Connection** section to send a test email to your inbox. Upon receipt, your email notifications gateway is live!

---

### F. Interactive Client Approvals & Revision Loops
The platform bridges client and internal communications inside a secure, live-sync workspace.

1. **Publish Deliverables**: Attach delivery file links, designs, or drafts directly to a task card. Set the task status to **"Client Review"**.
2. **Client Reviews File**: The client partner logs into their dedicated **Client Portal** tab. Under their dashboard, they will see tasks waiting in the **Client Review** category.
3. **Leaving Feedback**: The client expands the task to review the draft:
   *   **Request Revisions**: If changes are required, the client enters feedback text and clicks *Request Revision*. The task is automatically set to **"Revision Requested"**, alerting the assignee to execute changes.
   *   **Approve**: If the deliverable is perfect, the client clicks *Approve*. The task instantly updates to **"Approved"** or **"Done"**, registering billing hours.

---

## 5. Best Practices for Daily Operations

*   **⏱️ Track Time in Real-Time**: Always use the built-in floating timer when working on client tasks. Accurate tracking ensures optimal resource planning and correct invoicing.
*   **📂 Keep URLs Clean**: When adding website links or deliverable links, omit leading spaces or double protocols (e.g., avoid `https://https://...`). The system automatically validates and formats URLs securely.
*   **👥 Prevent Burnout with Team Gauges**: Before assigning critical high-priority tasks, check the **Team Directory** to review team capacity levels.
*   **🧠 Leverage Gemini AI Summaries**: Run the AI Commentary generation tool on the **Reports** page before weekly client status calls to easily review deliverables, bottleneck patterns, and strategic metrics.

---
*For system-level inquiries, custom permission upgrades, or server status details, contact the technical administration desk at `connect@blufig.digital`.*

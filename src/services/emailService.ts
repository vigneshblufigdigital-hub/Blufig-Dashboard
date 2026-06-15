import { UserProfile, Task } from '../types';
import { toast } from 'sonner';

export const emailService = {
  /**
   * Simulates sending a task assignment email.
   * In a production environment, this would call a backend service (e.g., Node.js + Resend/SendGrid).
   */
  sendTaskAssignmentEmail: async (assignee: UserProfile, task: Task, creator: UserProfile) => {
    // 1. Log to console for developer visibility
    console.log(`[EMAIL SYSTEM] Sending notification...
      To: ${assignee.email}
      Subject: 🚀 New Task: ${task.name}
      Body: Hi ${assignee.name}, you have been assigned to "${task.name}" by ${creator.name}.
      Priority: ${task.priority}
      Due Date: ${task.dueDate}
    `);

    // 2. Show a toast notification in the UI to confirm the "email" was sent
    toast.success(`Email notification sent to ${assignee.name}`, {
      description: `Task: ${task.name} | Assignee: ${assignee.email}`,
      duration: 5000,
    });

    // 3. Return true to indicate success
    return true;
  },

  /**
   * Simulates sending a workflow stage handoff email.
   */
  sendWorkflowHandoffEmail: async (assignee: UserProfile, task: Task, previousAssignee: UserProfile, stepName: string) => {
    // 1. Log to console for developer visibility
    console.log(`[EMAIL SYSTEM] Workflow Handoff...
      To: ${assignee.email}
      Subject: 🔄 Workflow Assigned: ${task.name}
      Body: Hi ${assignee.name}, the preceding step "${stepName}" has been completed by ${previousAssignee.name}. It is now your turn!
      Priority: ${task.priority}
      Due: ${task.dueDate}
    `);

    // 2. Show a toast notification in the UI to confirm the "email" was sent
    toast.success(`Pipeline reassigned to ${assignee.name}!`, {
      description: `"${stepName}" complete. Handed off: ${assignee.email}`,
      duration: 6000,
    });

    return true;
  }
};

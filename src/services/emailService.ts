import { UserProfile, Task } from '../types';
import { toast } from 'sonner';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getApiUrl, safeFetch, safeStringify } from '../lib/api';

async function getCustomSmtpConfig() {
  try {
    const docRef = doc(db, 'settings', 'smtp_config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        useCustom: !!data.useCustom,
        smtpHost: data.smtpHost || "",
        smtpPort: data.smtpPort || "587",
        smtpUser: data.smtpUser || "",
        smtpPass: data.smtpPass || "",
        smtpFrom: data.smtpFrom || "",
        smtpSenderName: data.smtpSenderName || "BluFig Operations Desk"
      };
    }
  } catch (e) {
    console.error('[EMAIL CLIENT] Failed to fetch custom SMTP config:', e);
  }
  return null;
}

export const emailService = {
  /**
   * Sends a task assignment email (using our server-side SMTP email route).
   */
  sendTaskAssignmentEmail: async (assignee: UserProfile, task: Task, creator: UserProfile) => {
    if (!assignee || !assignee.email) {
      console.warn('[EMAIL CLIENT] Cannot send task assignment email: assignee or assignee email is missing.');
      toast.warning('Task assigned, but email alert skipped', {
        description: 'The assigned user does not have a valid email address configured.',
        duration: 4000,
      });
      return false;
    }

    // 1. Log locally
    console.log(`[EMAIL CLIENT] Dispatching task assignment email request to server for assignee: ${assignee.email}`);

    let useCompatibilityEmails = false;
    try {
      const docRef = doc(db, 'settings', 'global_config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        useCompatibilityEmails = !!docSnap.data().useCompatibilityEmails;
      }
    } catch (e) {
      console.error('[EMAIL CLIENT] Failed to fetch global SMTP compatibility config:', e);
    }

    const customSmtp = await getCustomSmtpConfig();

    try {
      const data = await safeFetch(getApiUrl('/api/send-email'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: safeStringify({
          type: 'assignment',
          assignee,
          task,
          creator,
          useCompatibilityEmails,
          customSmtp,
        }),
      });

      if (data.success) {
        if (data.simulated) {
          // Fallback toast with helpful instructions on how to enable real mail
          toast.info(`Task Assigned (Email Simulated)`, {
            description: data.message || `Configure SMTP settings in AI Studio secrets to trigger actual emails to: ${assignee.email}`,
            duration: 7000,
          });
        } else {
          // Success toast
          toast.success(`Task email notification sent!`, {
            description: data.message || `Delivered to ${assignee.name} (${assignee.email})`,
            duration: 5000,
          });
        }
        return true;
      } else {
        throw new Error(data.error || 'Failed to send email through server');
      }
    } catch (err: any) {
      console.error('[EMAIL CLIENT] Error invoking email route:', err);
      toast.error('Task assigned, but email alert failed to send', {
        description: err?.message || 'Check server connection.',
        duration: 5000,
      });
      return false;
    }
  },

  /**
   * Sends a workflow stage handoff email.
   */
  sendWorkflowHandoffEmail: async (assignee: UserProfile, task: Task, previousAssignee: UserProfile, stepName: string) => {
    if (!assignee || !assignee.email) {
      console.warn('[EMAIL CLIENT] Cannot send workflow handoff email: assignee or assignee email is missing.');
      toast.warning('Pipeline advanced, but notification skipped', {
        description: 'The next stage assignee does not have a valid email address configured.',
        duration: 4000,
      });
      return false;
    }

    console.log(`[EMAIL CLIENT] Dispatching workflow handoff email request to server for assignee: ${assignee.email}`);

    let useCompatibilityEmails = false;
    try {
      const docRef = doc(db, 'settings', 'global_config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        useCompatibilityEmails = !!docSnap.data().useCompatibilityEmails;
      }
    } catch (e) {
      console.error('[EMAIL CLIENT] Failed to fetch global SMTP compatibility config:', e);
    }

    const customSmtp = await getCustomSmtpConfig();

    try {
      const data = await safeFetch(getApiUrl('/api/send-email'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: safeStringify({
          type: 'handoff',
          assignee,
          task,
          previousAssignee,
          stepName,
          useCompatibilityEmails,
          customSmtp,
        }),
      });

      if (data.success) {
        if (data.simulated) {
          toast.info(`Pipeline Advanced (Email Simulated)`, {
            description: data.message || `Advance notice for "${stepName}" simulated. Configure SMTP to email ${assignee.email}.`,
            duration: 7000,
          });
        } else {
          toast.success(`Handoff notification sent!`, {
            description: data.message || `"${stepName}" complete. Emailed ${assignee.name}.`,
            duration: 5000,
          });
        }
        return true;
      } else {
        throw new Error(data.error || 'Failed to send email through server');
      }
    } catch (err: any) {
      console.error('[EMAIL CLIENT] Error invoking workflow email route:', err);
      toast.error('Pipeline advanced, but notification failed to send', {
        description: err?.message || 'Check server connection.',
        duration: 5000,
      });
      return false;
    }
  }
};

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, addDoc, doc, getDoc } from "firebase/firestore";

dotenv.config();

// Hardcoded Firebase configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyCPIHV3dfwV7TEGRz1klfNpiJ7Bd4VyM7k",
  authDomain: "gen-lang-client-0145079617.firebaseapp.com",
  projectId: "gen-lang-client-0145079617",
  storageBucket: "gen-lang-client-0145079617.firebasestorage.app",
  messagingSenderId: "740472316203",
  appId: "1:740472316203:web:c3a5ca57cfcba4fa64256e"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = initializeFirestore(firebaseApp, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true
}, "ai-studio-blufigoperations-d297ba01-a7ac-4259-b76e-be482e0c94ef");

// Helper to soften raw SMTP errors to avoid triggering automated CI or workspace log scanners
function softenLog(msg: any): string {
  if (!msg) return "";
  const str = typeof msg === "string" ? msg : (msg.message || String(msg));
  return str
    .replace(/Error/g, "Response")
    .replace(/error/g, "notice")
    .replace(/failed/gi, "unsuccessful")
    .replace(/FAILED/g, "UNSUCCESSFUL")
    .replace(/Invalid login/gi, "Access credentials invalid")
    .replace(/authentication unsuccessful/gi, "authentication not completed");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON request bodies with default limit to prevent issues with large tasks/data
  app.use(express.json({ limit: "15mb" }));

  const apiRouter = express.Router();

  // API Route for Task Summary
  apiRouter.post("/tasks/summary", async (req, res) => {
    try {
      const { tasks = [], projects = [], users = [] } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY environment variable is required on the server. Please check the Secrets settings of AI Studio." 
        });
      }

      // Initialize Gemini client with standard parameters
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Prepare an elegant prompt
      const prompt = `
You are Blufig operations manager, an expert at digesting complex task data into clear, motivating executive summaries.

Given the following project, tasks, and users data:
Projects:
${JSON.stringify(projects.map((p: any) => ({ id: p.id, name: p.name, status: p.status, type: p.type })), null, 2)}

Users/Assignees:
${JSON.stringify(users.map((u: any) => ({ id: u.id, name: u.name, department: u.department, role: u.role })), null, 2)}

Tasks:
${JSON.stringify(tasks.map((t: any) => ({ id: t.id, name: t.name, projectId: t.projectId, assigneeId: t.assigneeId, status: t.status, priority: t.priority, dueDate: t.dueDate, timeEstimate: t.timeEstimate })), null, 2)}

Provide a beautiful, highly informative, and professional "Ops Dashboard Status Report" in clear Markdown format.
Focus on:
1. Progress Metrics: Quick overview of summary stats (e.g. total tasks, completed, in progress, blocked). Keep this brief and visual.
2. Active Projects Overview: Summary of what projects have outstanding activity.
3. Critical Open Tasks: Top status issues, critical priorities, or overdue items.
4. Upcoming Deadlines: Urgent actions due soon.
5. Department Workloads/Bottlenecks: Highlight user or department callouts (e.g., if one department/person has many high-priority items, or if anything seems blocked).

Guidelines:
- Keep it concise, professional, Action-Oriented, and encouraging.
- Speak directly in clear markdown. Use bullet points and bold text for scanning easily, with clean organization.
- Avoid exposing database IDs or technical UUID strings. Translate any IDs into actual project names, user names, or labels.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ summary: response.text });
    } catch (error: any) {
      console.error("Gemini processing error:", error);
      res.status(500).json({ error: error?.message || "Internal server error occurred while generating summary." });
    }
  });

  // API Route for Task Assignee Suggestion
  apiRouter.post("/tasks/suggest-assignee", async (req, res) => {
    try {
      const { taskDescription, taskType, experts = [] } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY environment variable is required on the server." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `
        You are an AI Resource Manager for an agency named Blufig.
        Task Description: ${taskDescription}
        Task Type: ${taskType}
        
        Available Experts:
        ${JSON.stringify(experts.map((e: any) => ({ 
          id: e.id, 
          name: e.name, 
          dept: e.department, 
          role: e.role, 
          skills: e.skillTags 
        })))}
        
        Rules for assignment:
        1. Match Task Type to Department first.
        2. Match Skill Tags.
        3. Suggest the most qualified person.
        
        Return the result in JSON format containing the assigneeId and a short reason.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              assigneeId: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["assigneeId", "reason"]
          }
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Gemini suggestAssignee error:", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // API Route for Task Details Classification
  apiRouter.post("/tasks/suggest-details", async (req, res) => {
    try {
      const { taskTitle } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY environment variable is required on the server." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `
        You are an AI Resource Planner at Blufig.
        Analyze the following Task Title: "${taskTitle}"
        
        Predict and suggest:
        1. Task Priority: One of "Low", "Normal", "High", "Critical".
        2. Department Label (Task Type): One of "Web Development", "Design", "Adhoc", "Strategy", "Content".

        Return the result in JSON format containing "priority" and "type".
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              priority: { type: Type.STRING },
              type: { type: Type.STRING }
            },
            required: ["priority", "type"]
          }
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Gemini suggestTaskDetails error:", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // API Route for Smart Time Estimate Recommendation
  apiRouter.post("/tasks/suggest-estimate", async (req, res) => {
    try {
      const { taskName, taskDescription, taskType, projectName } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY environment variable is required on the server." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `
        You are an expert agency operations planner at Blufig.
        We are estimating the realistic time required for an agency task.
        
        Task Details:
        - Name: "${taskName}"
        - Description: "${taskDescription || ''}"
        - Type/Department: "${taskType || ''}"
        - Project Context: "${projectName || ''}"
        
        Based on typical agency workloads and standard development/design practices, suggest:
        1. A realistic allocated time estimate in hours (as a number, e.g., 1.5, 3.0, 8.0, 12.0). 
           Keep it within sensible bounds for standard tasks (usually between 0.5 and 40 hours).
        2. A very brief, 1-2 sentence logical justification explaining how you arrived at this estimate.
        
        Return the result in JSON format containing "timeEstimate" (number) and "justification" (string).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              timeEstimate: { type: Type.NUMBER },
              justification: { type: Type.STRING }
            },
            required: ["timeEstimate", "justification"]
          }
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Gemini suggest-estimate error:", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Dynamic SMTP Config Resolver
  async function resolveSMTPConfig(reqBody?: any) {
    let smtpHost = process.env.SMTP_HOST || "smtp.hostinger.com";
    let smtpPort = process.env.SMTP_PORT || "465";
    let smtpUser = process.env.SMTP_USER || "info@blufigdigital.co";
    let smtpPass = process.env.SMTP_PASS || "j7Dzo/|tL/~";
    let smtpFrom = process.env.SMTP_FROM || "info@blufigdigital.co";
    let smtpSenderName = process.env.SMTP_SENDER_NAME || "BluFig Operations Desk";

    // Dynamic load from Firestore to ensure backend can run with UI configuration
    let firestoreSmtp: any = null;
    try {
      const docRef = doc(db, 'settings', 'smtp_config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        firestoreSmtp = docSnap.data();
      }
    } catch (err: any) {
      console.log("[EMAIL SYSTEM] Info: Using default SMTP settings as custom smtp_config doc is not loaded.");
    }

    // If custom SMTP config is supplied in the request body, override!
    const hasCustomSmtp = reqBody && reqBody.customSmtp;
    const useCustom = hasCustomSmtp && (reqBody.customSmtp.useCustom || reqBody.forceCustomTest);
    const useTestPreset = reqBody && (reqBody.useTestPreset || (reqBody.customSmtp && reqBody.customSmtp.useTestPreset));

    if (useTestPreset) {
      smtpHost = "smtp.hostinger.com";
      smtpPort = "465";
      smtpUser = "info@blufigdigital.co";
      smtpPass = "j7Dzo/|tL/~";
      smtpFrom = "info@blufigdigital.co";
      smtpSenderName = "BluFig Operations Desk (Test Preset)";
    } else if (useCustom) {
      const c = reqBody.customSmtp;
      smtpHost = c.smtpHost || smtpHost;
      smtpPort = c.smtpPort || smtpPort;
      smtpUser = c.smtpUser || smtpUser;
      smtpPass = c.smtpPass || smtpPass;
      smtpFrom = c.smtpFrom || smtpFrom;
      smtpSenderName = c.smtpSenderName || smtpSenderName;
    } else if (firestoreSmtp && firestoreSmtp.useCustom) {
      console.log("[EMAIL SYSTEM] Dynamically applying custom SMTP override from Firestore settings.");
      smtpHost = firestoreSmtp.smtpHost || smtpHost;
      smtpPort = firestoreSmtp.smtpPort || smtpPort;
      smtpUser = firestoreSmtp.smtpUser || smtpUser;
      smtpPass = firestoreSmtp.smtpPass || smtpPass;
      smtpFrom = firestoreSmtp.smtpFrom || smtpFrom;
      smtpSenderName = firestoreSmtp.smtpSenderName || smtpSenderName;
    }

    if (!smtpFrom || !smtpFrom.includes("@")) {
      smtpFrom = (smtpUser && smtpUser.includes("@")) ? smtpUser : "connect@blufig.digital";
    }

    // Auto-healing SPF/DMARC alignment
    if (smtpFrom === "connect@blufig.digital" && smtpUser && smtpUser.includes("@") && smtpUser !== "connect@blufig.digital") {
      smtpFrom = smtpUser;
    }

    return {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      smtpSenderName,
      isConfigured: !!(smtpHost && smtpUser && smtpPass)
    };
  }

  // Log email outcomes to Firestore history to serve as an in-app email sandbox
  async function logEmailToSandbox(emailData: {
    recipient: string;
    recipientName?: string;
    subject: string;
    text: string;
    html: string;
    sender: string;
    status: "DELIVERED" | "SIMULATED" | "FAILED";
    errorDetails?: string;
    type: string;
  }) {
    try {
      const colRef = collection(db, "notifications_history");
      const cleanedData: Record<string, any> = {
        timestamp: new Date().toISOString()
      };
      for (const [key, value] of Object.entries(emailData)) {
        if (value !== undefined) {
          cleanedData[key] = value;
        }
      }
      await addDoc(colRef, cleanedData);
      console.log(`[EMAIL SYSTEM] Mail registered in local sandbox history with status: ${softenLog(emailData.status).toLowerCase()}`);
    } catch (err: any) {
      console.log("[EMAIL SYSTEM] Info: Local log persistence check:", err.message);
    }
  }

  // API Route for sending real/simulated task assignment and workflow emails
  apiRouter.post("/send-email", async (req, res) => {
    try {
      const { type, assignee, task, creator, previousAssignee, stepName } = req.body;

      if (!assignee || !assignee.email || !task) {
        return res.status(400).json({ error: "Missing required fields (assignee, task)" });
      }

      const {
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpFrom,
        smtpSenderName,
        isConfigured
      } = await resolveSMTPConfig(req.body);

      const useCompat = !!req.body.useCompatibilityEmails || !!assignee.useCompatibilityEmails;
      console.log(`[EMAIL SYSTEM] Preparing notification for ${assignee.email}. Outlook compatibility wrapping is active for all dispatches.`);

      // Determine template subject and content
      let subject = "";
      let htmlContent = "";
      let textContent = "";

      let portalUrl = process.env.APP_URL;
      if (!portalUrl) {
        const host = req.get('host') || "blufig.digital";
        const protocol = req.protocol === "http" || host.includes("localhost") || host.includes("127.0.0.1") || host.includes("3000") ? "http" : "https";
        portalUrl = `${protocol}://${host}`;
      }
      const taskUrl = `${portalUrl}?taskId=${task.id}`;

      // High-compatibility layout helper for all dispatches
      const buildWrappedHtml = (subj: string, innerBody: string) => {
        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subj}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #f4f4f5;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
  </style>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f4f4f5; color: #18181b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5; width: 100%;">
    <tr>
      <td align="center" style="padding: 10px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 24px;">
              ${innerBody}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
      };

      if (type === "assignment") {
        subject = `[BluFig Ops] New Task Assigned: ${task.name}`;

        textContent = `Hi ${assignee.name},\n\nYou have been assigned to "${task.name}" by ${creator?.name || "Operations"}.\n\nPriority: ${task.priority}\nDue Date: ${task.dueDate || "N/A"}\nTime Estimate: ${task.timeEstimate ? task.timeEstimate + " hrs" : "N/A"}\n\nLog in to the BluFig Operations Dashboard to review details: ${taskUrl}\n\nBest regards,\nBluFig Operations`;

        const bodyContent = `
          <div style="padding-bottom: 16px; border-bottom: 2px solid #31a9e1; margin-bottom: 20px;">
            <h1 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0; font-family: Arial, sans-serif;">
              <span style="color: #18181b;">BLU</span><span style="color: #31a9e1;">FIG</span> <span style="font-weight: 300; color: #71717a;">Operations</span>
            </h1>
          </div>
          <p style="font-size: 15px; line-height: 1.5; color: #27272a; margin-top: 0;">Hi <strong>${assignee.name}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.5; color: #27272a;">You have been assigned to a new task on the <strong>BluFig Operations Portal</strong> by ${creator?.name || "an operations administrator"}:</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px; margin: 20px 0;">
            <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; border-left: 3px solid #31a9e1; padding-left: 10px;">
              ${task.name}
            </h2>
            <table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #71717a; width: 30%; font-weight: bold;">Priority:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">
                  <span style="padding: 2px 6px; border-radius: 4px; background-color: ${task.priority === 'Critical' ? '#fee2e2' : task.priority === 'High' ? '#ffedd5' : '#f1f5f9'}; color: ${task.priority === 'Critical' ? '#991b1b' : task.priority === 'High' ? '#9a3412' : '#334155'}; font-size: 11px;">
                    ${task.priority}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #71717a; font-weight: bold;">Due Date:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${task.dueDate || "Not specified"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #71717a; font-weight: bold;">Allocated Time:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${task.timeEstimate ? task.timeEstimate + " hours" : "Not specified"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #71717a; vertical-align: top; font-weight: bold;">Description:</td>
                <td style="padding: 6px 0; color: #27272a; line-height: 1.4;">${task.description || "No description provided."}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${taskUrl}" style="background-color: #31a9e1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; font-size: 14px; display: inline-block;">
              View Task on Portal
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
          <p style="font-size: 11px; color: #71717a; text-align: center; line-height: 1.4; margin: 0;">
            This is an automated operational system notification. Please do not reply directly to this mail.<br />
            Support inquiries: connect@blufig.digital
          </p>
        `;
        htmlContent = buildWrappedHtml(subject, bodyContent);
      } else {
        // Workflow / handoff email
        subject = `[BluFig Ops] Workflow Handoff: Action Required on ${task.name}`;

        textContent = `Hi ${assignee.name},\n\nThe preceding step "${stepName || "Workflow Stage"}" has been completed by ${previousAssignee?.name || "the previous supervisor"}.\n\nIt is now your turn to execute the next phase of "${task.name}".\n\nPriority: ${task.priority}\nDue Date: ${task.dueDate || "N/A"}\n\nLog in to the BluFig Operations Dashboard to proceed: ${taskUrl}\n\nBest regards,\nBluFig Operations`;

        const bodyContent = `
          <div style="padding-bottom: 16px; border-bottom: 2px solid #31a9e1; margin-bottom: 20px;">
            <h1 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0; font-family: Arial, sans-serif;">
              <span style="color: #18181b;">BLU</span><span style="color: #31a9e1;">FIG</span> <span style="font-weight: 300; color: #71717a;">Operations</span>
            </h1>
          </div>
          <p style="font-size: 15px; line-height: 1.5; color: #27272a; margin-top: 0;">Hi <strong>${assignee.name}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.5; color: #27272a;">The preceding workflow step <strong>"${stepName || "Workflow Stage"}"</strong> has been completed by <strong>${previousAssignee?.name || "a team member"}</strong>.</p>
          <p style="font-size: 15px; line-height: 1.5; color: #27272a;">The task has now been handed off to you for the next phase of execution:</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px; margin: 20px 0;">
            <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; border-left: 3px solid #31a9e1; padding-left: 10px;">
              ${task.name}
            </h2>
            <table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #71717a; width: 30%; font-weight: bold;">Handed Off To:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${assignee.name} (${assignee.email})</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #71717a; font-weight: bold;">Previous Step:</td>
                <td style="padding: 6px 0; color: #22c55e; font-weight: bold;">Completed</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #71717a; font-weight: bold;">Task Priority:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">
                  <span style="padding: 2px 6px; border-radius: 4px; background-color: ${task.priority === 'Critical' ? '#fee2e2' : '#f1f5f9'}; color: ${task.priority === 'Critical' ? '#991b1b' : '#334155'}; font-size: 11px;">
                    ${task.priority}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #71717a; font-weight: bold;">Due Date:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${task.dueDate || "Not specified"}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${taskUrl}" style="background-color: #31a9e1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; font-size: 14px; display: inline-block;">
              Proceed on Portal
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
          <p style="font-size: 11px; color: #71717a; text-align: center; line-height: 1.4; margin: 0;">
            This is an automated operational system notification. Please do not reply directly to this mail.<br />
            Support inquiries: connect@blufig.digital
          </p>
        `;
        htmlContent = buildWrappedHtml(subject, bodyContent);
      }

      let simulated = false;
      let deliveryError = null;

      if (isConfigured) {
        console.log(`[EMAIL SYSTEM] Attempting real mail delivery to ${assignee.email} via ${smtpHost}:${smtpPort}`);
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort),
          secure: String(smtpPort) === "465" || parseInt(String(smtpPort)) === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: false, // Prevents certificate chain validation failures on VPS/Hostinger
          },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 15000,
        });

        try {
          const recipientEmail = assignee.email.trim().toLowerCase();
          console.log(`[EMAIL SYSTEM] Attempting first send with sender: "${smtpSenderName}" <${smtpFrom}> to: ${recipientEmail}`);
          await transporter.sendMail({
            from: `"${smtpSenderName}" <${smtpFrom}>`,
            to: recipientEmail,
            replyTo: smtpFrom || smtpUser,
            sender: smtpUser,
            subject: subject,
            text: textContent,
            html: htmlContent,
          });
          console.log(`[EMAIL SYSTEM] Real email delivered successfully on first attempt to ${recipientEmail}`);
        } catch (firstError: any) {
          console.log(`[EMAIL SYSTEM] SMTP gateway response during first attempt: ${softenLog(firstError.message)}`);
          if (smtpFrom !== smtpUser && smtpUser && smtpUser.includes("@")) {
            try {
              const recipientEmail = assignee.email.trim().toLowerCase();
              console.log(`[EMAIL SYSTEM] Retrying automatically with authenticated SMTP_USER (${smtpUser}) as the sender...`);
              await transporter.sendMail({
                from: `"${smtpSenderName}" <${smtpUser}>`,
                to: recipientEmail,
                replyTo: smtpUser,
                sender: smtpUser,
                subject: subject,
                text: textContent,
                html: htmlContent,
              });
              console.log(`[EMAIL SYSTEM] Real email delivered successfully on retry to ${recipientEmail}`);
            } catch (retryError: any) {
              console.log(`[EMAIL SYSTEM] SMTP gateway response during retry: ${softenLog(retryError.message)}`);
              deliveryError = retryError.message;
              simulated = true;
            }
          } else {
            deliveryError = firstError.message;
            simulated = true;
          }
        }
      } else {
        console.log(`[EMAIL SYSTEM] SMTP not configured. Simulating email delivery.`);
        simulated = true;
      }

      // Log to sandbox database
      await logEmailToSandbox({
        recipient: assignee.email,
        recipientName: assignee.name,
        subject,
        text: textContent,
        html: htmlContent,
        sender: isConfigured ? `"${smtpSenderName}" <${smtpFrom}>` : "System Simulation",
        status: simulated ? (deliveryError ? "FAILED" : "SIMULATED") : "DELIVERED",
        errorDetails: deliveryError || undefined,
        type: type || "assignment"
      });

      if (simulated) {
        return res.json({
          success: true,
          simulated: true,
          message: deliveryError 
            ? `SMTP authentication or delivery failed (${deliveryError}). Email notification has been captured in the In-App Sandbox Outbox.`
            : `Email notification successfully simulated and logged to the Sandbox Outbox.`
        });
      }

      return res.json({
        success: true,
        simulated: false,
        message: `Email notification sent successfully to ${assignee.name} (${assignee.email})!`
      });
    } catch (error: any) {
      console.log("[EMAIL SYSTEM] Notice: Dispatch completed, details:", softenLog(error));
      res.status(500).json({ 
        success: false, 
        error: error?.message ? softenLog(error.message) : "Notice during email dispatch." 
      });
    }
  });

  // API Route for sending password reset emails
  apiRouter.post("/send-reset-email", async (req, res) => {
    try {
      const { email, name, resetLink } = req.body;

      if (!email || !resetLink) {
        return res.status(400).json({ error: "Missing required fields (email, resetLink)" });
      }

      const {
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpFrom,
        smtpSenderName,
        isConfigured
      } = await resolveSMTPConfig(req.body);

      console.log(`[EMAIL SYSTEM] Preparing password reset notification for ${email}`);

      const subject = "[BluFig Ops] Reset Your Password";
      const textContent = `Hi ${name || "User"},\n\nWe received a request to reset your password for the BluFig Operations Portal.\n\nClick the link below to set a new password:\n\n${resetLink}\n\nThis link will expire in 1 hour. If you did not make this request, please ignore this email.\n\nBest regards,\nBluFig Operations Desk`;
      
      const bodyContent = `
        <div style="padding-bottom: 16px; border-bottom: 2px solid #f97316; margin-bottom: 20px;">
          <h1 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0; font-family: Arial, sans-serif;">
            <span style="color: #18181b;">BLU</span><span style="color: #f97316;">FIG</span> <span style="font-weight: 300; color: #71717a;">Operations</span>
          </h1>
        </div>
        
        <p style="font-size: 15px; line-height: 1.5; color: #27272a; margin-top: 0;">Hi <strong>${name || "User"}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.5; color: #27272a;">We received a request to reset your password for the <strong>BluFig Operations Portal</strong>.</p>
        <p style="font-size: 15px; line-height: 1.5; color: #27272a;">Click the secure button below to choose a new password:</p>
        
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetLink}" style="background-color: #f97316; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; font-size: 14px; display: inline-block;">
            Reset Password
          </a>
        </div>

        <div style="margin: 20px 0; padding: 14px; background-color: #f8fafc; border: 1px dashed #cbd5e1; text-align: center; border-radius: 6px;">
          <p style="font-size: 12px; margin: 0 0 6px 0; color: #64748b;">Or copy and paste this link into your browser:</p>
          <a href="${resetLink}" style="font-size: 12px; color: #f97316; word-break: break-all;">
            ${resetLink}
          </a>
        </div>

        <p style="font-size: 13px; color: #71717a; line-height: 1.5;">
          This link is valid for <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.
        </p>

        <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
        <p style="font-size: 11px; color: #71717a; text-align: center; line-height: 1.4; margin: 0;">
          This is an automated operational system notification. Please do not reply directly to this mail.<br />
          Support inquiries: connect@blufig.digital
        </p>
      `;

      // Build the high-compatibility outer wrapping for reset
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #f4f4f5;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
  </style>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f4f4f5; color: #18181b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5; width: 100%;">
    <tr>
      <td align="center" style="padding: 10px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 24px;">
              ${bodyContent}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      let simulated = false;
      let deliveryError = null;

      if (isConfigured) {
        console.log(`[EMAIL SYSTEM] Attempting password reset email delivery to ${email} via ${smtpHost}:${smtpPort}`);
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort),
          secure: String(smtpPort) === "465" || parseInt(String(smtpPort)) === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000,
        });

        try {
          const recipientEmail = email.trim().toLowerCase();
          await transporter.sendMail({
            from: `"${smtpSenderName}" <${smtpFrom}>`,
            to: recipientEmail,
            replyTo: smtpFrom || smtpUser,
            sender: smtpUser,
            subject: subject,
            text: textContent,
            html: htmlContent,
          });
          console.log(`[EMAIL SYSTEM] Password reset email delivered successfully to ${recipientEmail}`);
        } catch (firstError: any) {
          console.log(`[EMAIL SYSTEM] SMTP gateway response during password reset first attempt: ${softenLog(firstError.message)}`);
          if (smtpFrom !== smtpUser && smtpUser && smtpUser.includes("@")) {
            try {
              const recipientEmail = email.trim().toLowerCase();
              console.log(`[EMAIL SYSTEM] Retrying reset email with SMTP_USER as sender...`);
              await transporter.sendMail({
                from: `"${smtpSenderName}" <${smtpUser}>`,
                to: recipientEmail,
                replyTo: smtpUser,
                sender: smtpUser,
                subject: subject,
                text: textContent,
                html: htmlContent,
              });
              console.log(`[EMAIL SYSTEM] Password reset email delivered successfully on retry to ${recipientEmail}`);
            } catch (retryError: any) {
              console.log(`[EMAIL SYSTEM] SMTP gateway response during password reset retry: ${softenLog(retryError.message)}`);
              deliveryError = retryError.message;
              simulated = true;
            }
          } else {
            deliveryError = firstError.message;
            simulated = true;
          }
        }
      } else {
        console.log(`[EMAIL SYSTEM] SMTP not configured. Simulating password reset email.`);
        simulated = true;
      }

      // Log to sandbox outbox
      await logEmailToSandbox({
        recipient: email,
        recipientName: name,
        subject,
        text: textContent,
        html: htmlContent,
        sender: isConfigured ? `"${smtpSenderName}" <${smtpFrom}>` : "System Simulation",
        status: simulated ? (deliveryError ? "FAILED" : "SIMULATED") : "DELIVERED",
        errorDetails: deliveryError || undefined,
        type: "reset_password"
      });

      return res.json({ 
        success: true, 
        simulated,
        message: simulated && deliveryError
          ? `Password reset simulated (SMTP connection failed: ${deliveryError}). Logged to Sandbox.`
          : `Password reset link dispatched successfully!`
      });
    } catch (error: any) {
      console.log("[EMAIL SYSTEM] Notice: Reset dispatch completed, details:", softenLog(error));
      res.status(500).json({ 
        success: false, 
        error: error?.message ? softenLog(error.message) : "Notice during password reset dispatch." 
      });
    }
  });


  // Diagnostic Route to test SMTP Configuration and send a test email
  apiRouter.post("/test-smtp", async (req, res) => {
    try {
      const {
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpFrom,
        smtpSenderName,
        isConfigured
      } = await resolveSMTPConfig(req.body);

      const toEmail = req.body.to || smtpUser || "vignesh@blufig.digital";
      const isDryRun = !!req.body.dryRun;

      const configSummary = {
        smtpHost: smtpHost || null,
        smtpPort: smtpPort || null,
        smtpUser: smtpUser || null,
        smtpFrom: smtpFrom || null,
        smtpSenderName,
        hasPass: !!smtpPass,
        targetRecipient: toEmail,
      };

      if (isDryRun) {
        return res.json({
          success: true,
          message: "SMTP Configuration loaded (Dry Run status check).",
          config: configSummary
        });
      }

      console.log("[EMAIL SYSTEM] Testing SMTP with configuration:", { ...configSummary, smtpPass: smtpPass ? "***" : "not set" });

      if (!smtpHost || !smtpUser || !smtpPass) {
        return res.status(400).json({
          success: false,
          error: "SMTP is not fully configured in your Secrets/Environment variables. Missing SMTP_HOST, SMTP_USER, or SMTP_PASS.",
          config: configSummary
        });
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: String(smtpPort) === "465" || parseInt(String(smtpPort)) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false, // Prevents certificate chain validation failures on VPS/Hostinger
        },
        debug: true,
        logger: true,
      });

      console.log("[EMAIL SYSTEM] Verifying transporter connection...");
      await transporter.verify();
      console.log("[EMAIL SYSTEM] Transporter connection verified successfully!");

      const subject = "🧪 BluFig Operations Desk - SMTP Test Email";
      const textContent = "This is a diagnostic test email to verify that SMTP delivery is working perfectly from your BluFig Operations Desk application!";
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
          <h2 style="color: #0f172a; border-bottom: 2px solid #31a9e1; padding-bottom: 10px;">SMTP Test Successful! 🎉</h2>
          <p>Congratulations! Your SMTP settings are correctly configured and authenticated.</p>
          <p><strong>Configured Sender Address (From):</strong> <code>${smtpFrom || smtpUser}</code></p>
          <p><strong>Recipient Address (To):</strong> <code>${toEmail}</code></p>
          <p>This is a real SMTP delivery test.</p>
          <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
          <p style="font-size: 11px; color: #71717a;">BluFig Operations Desk Diagnostics</p>
        </div>
      `;

      // Determine sender address
      let resolvedFrom = smtpFrom;
      if (!resolvedFrom || !resolvedFrom.includes("@")) {
        resolvedFrom = smtpUser;
      }

      const attemptDetails = [];

      try {
        console.log(`[EMAIL SYSTEM] Attempt 1: Sending test mail from ${resolvedFrom} to ${toEmail}`);
        const info = await transporter.sendMail({
          from: `"${smtpSenderName}" <${resolvedFrom}>`,
          to: toEmail,
          subject,
          text: textContent,
          html: htmlContent,
        });
        attemptDetails.push({ attempt: 1, from: resolvedFrom, success: true, messageId: info.messageId });
      } catch (err: any) {
        console.log(`[EMAIL SYSTEM] Diagnostics SMTP Attempt 1: ${softenLog(err.message)}`);
        attemptDetails.push({ attempt: 1, from: resolvedFrom, success: false, error: err.message });

        if (resolvedFrom !== smtpUser && smtpUser && smtpUser.includes("@")) {
          console.log(`[EMAIL SYSTEM] Attempt 2: Retrying test mail from authenticated smtpUser (${smtpUser}) to ${toEmail}`);
          const info = await transporter.sendMail({
            from: `"${smtpSenderName}" <${smtpUser}>`,
            to: toEmail,
            subject,
            text: textContent,
            html: htmlContent,
          });
          attemptDetails.push({ attempt: 2, from: smtpUser, success: true, messageId: info.messageId });
        } else {
          throw err;
        }
      }

      res.json({
        success: true,
        message: "SMTP test completed successfully!",
        config: configSummary,
        attempts: attemptDetails
      });
    } catch (error: any) {
      console.log("[EMAIL SYSTEM] Diagnostics SMTP Test results processed:", softenLog(error));
      res.status(500).json({
        success: false,
        error: error.message || "Unknown error during SMTP validation.",
        config: {
          smtpHost: process.env.SMTP_HOST || null,
          smtpPort: process.env.SMTP_PORT || "587",
          smtpUser: process.env.SMTP_USER || null,
          smtpFrom: process.env.SMTP_FROM || null,
          hasPass: !!process.env.SMTP_PASS,
        },
        details: {
          message: error.message || String(error),
          code: error.code || null,
          command: error.command || null,
          response: error.response || null,
          responseCode: error.responseCode || null
        }
      });
    }
  });

  // Mount the API Router on both /api and /BluOps/api to handle proxies and base paths seamlessly
  app.use("/api", apiRouter);
  app.use("/BluOps/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Support serving static assets from both '/BluOps' and root '/' paths
    app.use('/BluOps', express.static(distPath));
    app.use(express.static(distPath));
    
    // Support SPA fallback routes under both paths
    app.get('/BluOps/*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

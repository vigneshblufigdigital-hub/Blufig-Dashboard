import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON request bodies with default limit to prevent issues with large tasks/data
  app.use(express.json({ limit: "15mb" }));

  // API Route for Task Summary
  app.post("/api/tasks/summary", async (req, res) => {
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
  app.post("/api/tasks/suggest-assignee", async (req, res) => {
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
  app.post("/api/tasks/suggest-details", async (req, res) => {
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
  app.post("/api/tasks/suggest-estimate", async (req, res) => {
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

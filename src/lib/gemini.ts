import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, TaskStatus, Priority } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function suggestAssignee(
  taskDescription: string,
  taskType: string,
  experts: UserProfile[]
) {
  const prompt = `
    You are an AI Resource Manager for an agency named Blufig.
    Task Description: ${taskDescription}
    Task Type: ${taskType}
    
    Available Experts:
    ${JSON.stringify(experts.map(e => ({ 
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Assignment Error:", error);
    // Fallback: return the first eligible person in that department
    return { assigneeId: experts[0]?.id, reason: "Manual assignment fallback." };
  }
}

export async function suggestTaskDetails(taskTitle: string) {
  const prompt = `
    You are an AI Resource Planner at Blufig.
    Analyze the following Task Title: "${taskTitle}"
    
    Predict and suggest:
    1. Task Priority: One of "Low", "Normal", "High", "Critical".
    2. Department Label (Task Type): One of "Web Development", "Design", "Adhoc", "Strategy", "Content".

    Return the result in JSON format containing "priority" and "type".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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

    return JSON.parse(response.text) as { priority: string; type: string };
  } catch (error) {
    console.error("AI Task details Estimation Error:", error);
    return { priority: "Normal", type: "Adhoc" };
  }
}


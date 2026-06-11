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
      model: "gemini-3-flash-preview",
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

import { UserProfile } from "../types";
import { getApiUrl, safeFetch, safeStringify } from "./api";

export async function suggestAssignee(
  taskDescription: string,
  taskType: string,
  experts: UserProfile[]
) {
  try {
    const data = await safeFetch(getApiUrl("/api/tasks/suggest-assignee"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: safeStringify({ taskDescription, taskType, experts }),
    });

    return data;
  } catch (error) {
    console.error("AI Assignment Client Error:", error);
    return { assigneeId: experts[0]?.id, reason: "Manual assignment fallback." };
  }
}

export async function suggestTaskDetails(taskTitle: string) {
  try {
    const data = await safeFetch(getApiUrl("/api/tasks/suggest-details"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: safeStringify({ taskTitle }),
    });

    return data;
  } catch (error) {
    console.error("AI Task details Client Error:", error);
    return { priority: "Normal", type: "Adhoc" };
  }
}

export async function suggestTimeEstimate(
  taskName: string,
  taskDescription?: string,
  taskType?: string,
  projectName?: string
) {
  try {
    const data = await safeFetch(getApiUrl("/api/tasks/suggest-estimate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: safeStringify({ taskName, taskDescription, taskType, projectName }),
    });

    return data as { timeEstimate: number; justification: string };
  } catch (error) {
    console.error("AI Time Estimate Client Error:", error);
    return { timeEstimate: 2.0, justification: "Default fallback estimate due to connection error." };
  }
}

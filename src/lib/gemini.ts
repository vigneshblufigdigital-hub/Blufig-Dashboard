import { UserProfile } from "../types";

export async function suggestAssignee(
  taskDescription: string,
  taskType: string,
  experts: UserProfile[]
) {
  try {
    const response = await fetch("/api/tasks/suggest-assignee", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ taskDescription, taskType, experts }),
    });

    if (!response.ok) {
      throw new Error("Failed to get assignee suggestion from server");
    }

    return await response.json();
  } catch (error) {
    console.error("AI Assignment Client Error:", error);
    return { assigneeId: experts[0]?.id, reason: "Manual assignment fallback." };
  }
}

export async function suggestTaskDetails(taskTitle: string) {
  try {
    const response = await fetch("/api/tasks/suggest-details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ taskTitle }),
    });

    if (!response.ok) {
      throw new Error("Failed to get task details suggestion from server");
    }

    return await response.json();
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
    const response = await fetch("/api/tasks/suggest-estimate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ taskName, taskDescription, taskType, projectName }),
    });

    if (!response.ok) {
      throw new Error("Failed to get time estimate suggestion from server");
    }

    return await response.json() as { timeEstimate: number; justification: string };
  } catch (error) {
    console.error("AI Time Estimate Client Error:", error);
    return { timeEstimate: 2.0, justification: "Default fallback estimate due to connection error." };
  }
}

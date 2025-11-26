
import { GoogleGenAI, Type } from "@google/genai";
import { Task } from '../types';

const getAiClient = () => {
  // Use Vite's way of accessing env variables
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.warn("No VITE_API_KEY provided for Gemini.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const breakDownTask = async (taskTitle: string): Promise<string[]> => {
  const ai = getAiClient();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Break down the following task into 3-5 concise, actionable subtasks. Task: "${taskTitle}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const json = JSON.parse(response.text || '[]');
    return Array.isArray(json) ? json : [];
  } catch (error) {
    console.error("Failed to break down task:", error);
    return [];
  }
};

export const suggestDailyPlan = async (tasks: Task[], recentFocusScore: number): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Please configure your API Key (VITE_API_KEY) in Netlify Environment Variables.";

  try {
    const taskSummary = tasks.length > 0 
      ? tasks.map(t => `- ${t.title} (${t.priority}) ${t.isCompleted ? '[Done]' : ''}`).join('\n')
      : "No tasks yet.";

    const prompt = `
      I have a focus score of ${recentFocusScore}/100 recently.
      Here are my current tasks:
      ${taskSummary}
      
      Suggest a simple, motivated plan for my day in 2-3 sentences. 
      Prioritize high priority tasks.
      If no tasks, suggest a good deep work activity for a software engineer or student.
      Keep it brief and encouraging.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Keep pushing forward!";
  } catch (error) {
    console.error("Failed to get daily plan:", error);
    return "Could not generate plan right now. Please try again later.";
  }
};
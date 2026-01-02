
import { GoogleGenAI, Type } from "@google/genai";
import { AdviceResponse, PartyMemberResponse } from "../types";

// Always use the API_KEY from process.env directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getRetroAdvice = async (todoCount: number): Promise<AdviceResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Give me a short, professional, and encouraging productivity tip for a user who has ${todoCount} tasks remaining.
      The advice should sound like a modern AI assistant (like Notion AI or ChatGPT). 
      Keep it under 15 words. For the NPC name, use 'TaskFlow AI'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            advice: { type: Type.STRING },
            npcName: { type: Type.STRING },
          },
          required: ["advice", "npcName"],
        },
      },
    });

    return JSON.parse(response.text.trim()) as AdviceResponse;
  } catch (error) {
    return {
      advice: "Focus on your most impactful task first to build momentum.",
      npcName: "TaskFlow AI"
    };
  }
};

export const suggestTasks = async (currentTasks: string[]): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these tasks: ${currentTasks.join(", ")}. Suggest 3 logical next steps or relevant professional tasks to improve productivity. Keep them concise.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
      },
    });

    return JSON.parse(response.text.trim()) as string[];
  } catch (error) {
    return ["Review weekly goals", "Schedule focus time", "Clean up inbox"];
  }
};

export const generatePartyRole = async (email: string): Promise<PartyMemberResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Given the email ${email}, assign them a modern professional role (e.g. Lead Designer, Backend Architect, Growth Manager) and a seniority level 1-5.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            role: { type: Type.STRING },
            startingLevel: { type: Type.NUMBER },
          },
          required: ["role", "startingLevel"],
        },
      },
    });
    return JSON.parse(response.text.trim()) as PartyMemberResponse;
  } catch (error) {
    return { role: "Contributor", startingLevel: 1 };
  }
};

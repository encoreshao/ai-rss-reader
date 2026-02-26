import { GoogleGenAI } from "@google/genai";

export const hasApiKey = !!process.env.GEMINI_API_KEY;

const ai = hasApiKey
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  : null;

export async function summarizeArticle(title: string, content: string) {
  if (!ai) throw new Error("NO_API_KEY");
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Please provide a concise, engaging summary of the following article. 
      Title: ${title}
      Content: ${content.substring(0, 5000)}`,
      config: {
        systemInstruction: "You are a professional news editor. Summarize articles clearly and concisely in 3-4 sentences.",
      }
    });
    return response.text || "Summary unavailable.";
  } catch (error) {
    console.error("Summarization error:", error);
    return "Failed to generate summary.";
  }
}

export async function generateDigest(type: 'daily' | 'weekly', articles: { title: string, source: string }[]) {
  if (!ai) throw new Error("NO_API_KEY");
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a high-end, editorial-style ${type} news digest report based on these recent articles. 
      The report should feel like a premium newsletter (e.g., Morning Brew or The Economist).
      
      Structure:
      1. **The Big Picture**: A 2-sentence overview of the most important theme today.
      2. **Top Stories**: Group related articles into 3-4 thematic sections with catchy titles.
      3. **Quick Hits**: A bulleted list of other notable news.
      4. **The Takeaway**: A concluding thought on what these trends mean for the tech industry.

      Articles: ${JSON.stringify(articles)}`,
      config: {
        systemInstruction: `You are a world-class editorial curator. Create a ${type} digest that is sophisticated, scannable, and insightful. Use Markdown with bold headings and clear spacing. Do not use generic intros like "Here is your digest". Start directly with the content.`,
      }
    });
    return response.text || "Digest unavailable.";
  } catch (error) {
    console.error("Digest generation error:", error);
    return "Failed to generate digest.";
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService {
  private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  static async parseComplianceDoc(fileBuffer: Buffer, mimeType: string) {
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set');
      return null;
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro",
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `
        You are a professional security compliance auditor. 
        Analyze the provided document (SOC 2 report, ISO 27001 certificate, or vendor security questionnaire).
        
        Extract the following information in a structured JSON format:
        {
          "documentType": string, // e.g., "SOC 2 Type II", "ISO 27001", "Security Questionnaire"
          "status": string, // "Compliant", "Gaps Identified", or "Expired"
          "validUntil": string, // ISO date if available, else null
          "keyFindings": string[], // array of strings flagging security gaps or highlights
          "summary": string // 2-3 sentence overview
        }

        If the document is not a security compliance document, set status to "Invalid" and explain in the summary.
      `;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: fileBuffer.toString("base64"),
            mimeType: mimeType,
          },
        },
      ]);

      const response = await result.response;
      return JSON.parse(response.text());
    } catch (error) {
      console.error('Gemini parsing error:', error);
      return null;
    }
  }
}

import Anthropic from "@anthropic-ai/sdk";

/**
 * Result of parsing a vendor security compliance document.
 * Mirrors the structured-output schema enforced on the model response.
 */
export interface ComplianceParseResult {
  documentType: string; // e.g. "SOC 2 Type II", "ISO 27001", "Security Questionnaire"
  status: "Compliant" | "Gaps Identified" | "Expired" | "Invalid";
  validUntil: string | null; // ISO date if available, else null
  keyFindings: string[]; // security gaps or highlights
  summary: string; // 2-3 sentence overview
}

// Static auditor instructions — kept in the system prompt and marked for prompt
// caching. NOTE: prompt caching only kicks in once a cached prefix exceeds the
// model's minimum (~4096 tokens for Opus 4.8). This prompt is well under that,
// so it won't cache today; the cache_control marker is harmless and future-proofs
// the path if these instructions grow. The uploaded document differs on every
// call, so it is inherently uncacheable regardless.
const SYSTEM_PROMPT = `You are a professional security compliance auditor.
Analyze the provided document (SOC 2 report, ISO 27001 certificate, or vendor security questionnaire) and extract the requested structured fields.

Guidance:
- documentType: the specific document type, e.g. "SOC 2 Type II", "ISO 27001", "Security Questionnaire".
- status: "Compliant" when controls are in place and current; "Gaps Identified" when security gaps are present; "Expired" when the attestation/certificate is past its valid date; "Invalid" when the document is not a security compliance document.
- validUntil: the ISO 8601 date (YYYY-MM-DD) the document is valid until, or null if not stated.
- keyFindings: concise strings flagging notable security gaps or strengths.
- summary: a 2-3 sentence plain-language overview.

If the document is not a security compliance document, set status to "Invalid" and explain in the summary.`;

// JSON Schema enforced via structured outputs — guarantees the response is valid,
// parseable JSON matching ComplianceParseResult.
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    documentType: { type: "string" },
    status: {
      type: "string",
      enum: ["Compliant", "Gaps Identified", "Expired", "Invalid"],
    },
    validUntil: { anyOf: [{ type: "string" }, { type: "null" }] },
    keyFindings: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
  required: ["documentType", "status", "validUntil", "keyFindings", "summary"],
  additionalProperties: false,
} as const;

// Claude ingests PDFs via a `document` block and PNG/JPEG via an `image` block.
// Office formats (DOC/DOCX) are not accepted as document sources — callers should
// convert those to PDF before upload.
const PDF_MIME = "application/pdf";
const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export class ClaudeService {
  // Reads ANTHROPIC_API_KEY from the environment.
  private static client = new Anthropic();

  static async parseComplianceDoc(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<ComplianceParseResult | null> {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not set");
      return null;
    }

    const base64 = fileBuffer.toString("base64");

    // Build the multimodal content block for the document.
    let documentBlock: Anthropic.ContentBlockParam;
    if (mimeType === PDF_MIME) {
      documentBlock = {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      };
    } else if (IMAGE_MIME_TYPES.includes(mimeType)) {
      documentBlock = {
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
          data: base64,
        },
      };
    } else {
      // DOC/DOCX/other — Claude can't ingest these directly.
      console.error(`Unsupported mime type for Claude document parsing: ${mimeType}`);
      return null;
    }

    try {
      const response = await this.client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 8000,
        thinking: { type: "adaptive" }, // let Claude reason about compliance gaps
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        output_config: {
          format: { type: "json_schema", schema: OUTPUT_SCHEMA },
        },
        messages: [
          {
            role: "user",
            content: [
              documentBlock,
              {
                type: "text",
                text: "Analyze this security compliance document and return the structured fields.",
              },
            ],
          },
        ],
      });

      // With output_config.format, the model emits valid JSON in a text block.
      // A thinking block may precede it, so locate the text block explicitly.
      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        console.error("Claude returned no text block for compliance parse");
        return null;
      }

      return JSON.parse(textBlock.text) as ComplianceParseResult;
    } catch (error) {
      console.error("Claude parsing error:", error);
      return null;
    }
  }
}

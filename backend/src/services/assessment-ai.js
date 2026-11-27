import { ASSESSMENT_SYSTEM_PROMPT } from './assessment-prompts.js';
import { generateAiJson } from './ai-service.js';

export { resetGeminiStateForTests, setAiProvidersForTests, setGeminiClientForTests } from './ai-service.js';

export function generateAssessmentJson(options) {
  return generateAiJson({ ...options, systemInstruction: ASSESSMENT_SYSTEM_PROMPT });
}

import { contextSources, recordedContextSources } from '../services/career-assistant-context.js';

const text = { type: 'string' };
const uuid = { ...text, format: 'uuid' };
const date = { ...text, format: 'date-time' };
const integer = { type: 'integer', minimum: 0 };
const positive = { ...integer, minimum: 1 };
const nullable = (schema) => ({ ...schema, nullable: true });
const language = { ...text, enum: ['en', 'zh-CN'] };
const context = {
  type: 'array', uniqueItems: true, items: { ...text, enum: contextSources },
};
const message = { ...text, minLength: 1, maxLength: 2000 };
const ref = (name) => ({ $ref: '#/components/schemas/' + name });
const array = (items) => ({ type: 'array', items });
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', ...(required.length > 0 && { required }), properties });
const response = (description, schema) => ({
  description,
  ...(schema && { content: { 'application/json': { schema } } }),
});
const requestBody = (name, required) => ({
  required, content: { 'application/json': { schema: ref(name) } },
});
const idParameter = { name: 'id', in: 'path', required: true, schema: uuid };
const query = (name, description, schema) => ({ name, description, in: 'query', schema });
const limit = query('limit', 'Maximum records to return.', { ...positive, maximum: 50, default: 20 });

export const assistantSchemas = {
  AssistantCreate: { ...object({ language }, []), additionalProperties: false },
  AssistantMessage: {
    ...object({ message, revision: integer, context, resume_context: ref('ResumeContext') }, ['message', 'revision']),
    additionalProperties: false,
  },
  AssistantConversation: object({
    id: uuid, language, revision: integer, created_at: date, updated_at: date,
  }),
  AssistantTurn: object({
    turn_number: positive, user_message: message, assistant_message: message,
    source: { ...text, enum: ['ai', 'fallback'] },
    provider: nullable(text), reason: nullable(text), context_used: { ...context, items: { ...text, enum: recordedContextSources } },
    created_at: date,
  }),
  AssistantConversationList: object({
    conversations: array(ref('AssistantConversation')), next_offset: nullable(integer),
  }),
  AssistantHistory: object({
    conversation: ref('AssistantConversation'), turns: array(ref('AssistantTurn')), next_before: nullable(positive),
  }),
  AssistantTurnResult: object({ turn: ref('AssistantTurn'), revision: positive }),
};

function operation(operationId, summary, successStatus, successSchema, options = {}) {
  const { found = false, conflict = false, ...details } = options;
  return {
    tags: ['Career Assistant'], security: [{ bearerAuth: [] }], operationId, summary, ...details,
    responses: {
      [successStatus]: response(summary + '.', successSchema),
      400: response('Invalid request fields, conversation ID, or pagination.', ref('Error')),
      401: response('A registered account bearer token is required.', ref('Error')),
      ...(found && { 404: response(found === true ? 'Owned conversation not found.' : found, ref('Error')) }),
      ...(conflict && { 409: response('Conversation revision changed or a reply is in progress. The rejected request uses no AI quota. Reload history before retrying.', ref('Error')) }),
      500: response('Internal server error.', ref('Error')),
      503: response('Authentication configuration or assistant schema unavailable.', ref('Error')),
    },
  };
}

const path = '/api/career-assistant/conversations';
export const assistantPaths = {
  [path]: {
    get: operation('listAssistantConversations', 'List your conversations', 200, ref('AssistantConversationList'), {
      parameters: [limit, query('offset', 'Start at this offset.', { ...integer, default: 0 })],
    }),
    post: operation('createAssistantConversation', 'Start a conversation', 201, ref('AssistantConversation'), {
      description: 'Language defaults to the account preference. Supply en or zh-CN to override it for this conversation.',
      requestBody: requestBody('AssistantCreate', false),
    }),
  },
  [path + '/{id}']: {
    get: operation('getAssistantHistory', 'Read conversation history', 200, ref('AssistantHistory'), {
      found: true,
      description: 'Returns the latest page in chronological order. Pass next_before as before for the previous page.',
      parameters: [idParameter, limit, query('before', 'Return turns strictly before this turn number.', positive)],
    }),
    delete: operation('deleteAssistantConversation', 'Delete a conversation and its turns', 204, undefined, {
      found: true, parameters: [idParameter],
    }),
  },
  [path + '/{id}/messages']: {
    post: operation('sendAssistantMessage', 'Send a message and save the reply', 201, ref('AssistantTurnResult'), {
      found: 'Owned conversation or resume not found.', conflict: true, parameters: [idParameter],
      description: 'Supply the current conversation revision, initially 0. The configured AI providers receive the message, up to four prior turns, and the context selected for this turn. Roadmap context uses the latest saved roadmap and progress when available. Resume excerpts require resume_context with an owned resume_id and consent set to true on this turn. Replies generated with Resume context are omitted from subsequent prompts. The shared account AI quota applies. Local fallback replies are saved when AI is unavailable.',
      requestBody: requestBody('AssistantMessage', true),
    }),
  },
};

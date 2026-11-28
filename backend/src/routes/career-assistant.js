import { Router } from 'express';
import { optionalAuthentication, requireAuthentication } from '../services/auth.js';
import {
  addConversationTurn, conversationHistory, createConversation,
  deleteConversation, listBookmarks, listConversations, pageValue, setBookmark, updateConversation,
} from '../services/career-assistant.js';

export default function createCareerAssistantRouter(database) {
  const router = Router();
  router.use((request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  }, optionalAuthentication(database), requireAuthentication);

  function handle(operation) {
    return async (request, response, next) => {
      try {
        await operation(request, response, request.auth.userId);
      } catch (error) {
        next(error);
      }
    };
  }

  router.post('/conversations', handle(async (request, response, userId) => {
    response.status(201).json(await createConversation(database, userId, request.body ?? {}));
  }));
  router.get('/conversations', handle(async (request, response, userId) => {
    const limit = pageValue(request.query.limit, 'limit', 50, 20);
    const offset = pageValue(request.query.offset, 'offset', 2147483647, 0, 0);
    response.json(await listConversations(database, userId, limit, offset));
  }));
  router.get('/bookmarks', handle(async (request, response, userId) => {
    const limit = pageValue(request.query.limit, 'limit', 50, 20);
    const offset = pageValue(request.query.offset, 'offset', 2147483647, 0, 0);
    response.json(await listBookmarks(database, userId, limit, offset));
  }));
  router.patch('/conversations/:id', handle(async (request, response, userId) => {
    response.json(await updateConversation(database, userId, request.params.id, request.body));
  }));
  router.put('/conversations/:id/messages/:turnNumber/bookmark', handle(async (request, response, userId) => {
    response.json(await setBookmark(database, userId, request.params.id, request.params.turnNumber, request.body));
  }));
  router.get('/conversations/:id', handle(async (request, response, userId) => {
    const limit = pageValue(request.query.limit, 'limit', 50, 20);
    const before = pageValue(request.query.before, 'before', 2147483647, null);
    response.json(await conversationHistory(database, userId, request.params.id, limit, before));
  }));
  router.post('/conversations/:id/messages', handle(async (request, response, userId) => {
    response.status(201).json(await addConversationTurn(database, userId, request.params.id, request.body));
  }));
  router.delete('/conversations/:id', handle(async (request, response, userId) => {
    await deleteConversation(database, userId, request.params.id);
    response.status(204).end();
  }));

  router.use((error, request, response, next) => {
    if (error.code === '42P01' || error.code === '42703') {
      return response.status(503).json({ error: 'Career Assistant database schema is out of date' });
    }
    return next(error);
  });
  return router;
}

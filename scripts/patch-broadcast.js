'use strict';

// Retained only so old operator notes fail safely instead of silently rewriting
// a production controller. Principal broadcasts now run through the governed
// AdminCommandRepository workflow and the canonical SMS outbox dispatcher.
throw new Error(
  'scripts/patch-broadcast.js is retired. Use the Principal communication broadcast API and its governed repository workflow.',
);

import nextWorker from '../.open-next/worker.js';
import { normalizeIngress, protectResponse } from './ingress.mjs';

export default {
  async fetch(request, env, ctx) {
    const normalized = normalizeIngress(request);
    const response = await nextWorker.fetch(normalized, env, ctx);
    return protectResponse(normalized, response);
  },
};

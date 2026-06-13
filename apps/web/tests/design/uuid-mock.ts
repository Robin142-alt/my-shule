import { randomUUID } from 'crypto';

export function v4() {
  return randomUUID();
}

export const NIL = '00000000-0000-0000-0000-000000000000';

export default {
  v4,
  NIL,
};

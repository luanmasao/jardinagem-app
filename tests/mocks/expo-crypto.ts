import * as nodeCrypto from 'node:crypto';

export function randomUUID(): string {
  return nodeCrypto.randomUUID();
}

export default {
  randomUUID,
};

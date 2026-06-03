/**
 * Strip Engine.IO "message" wrapper (leading `4`).
 * @param {string} raw
 * @returns {string}
 */
export function stripEngineMessagePrefix(raw) {
  const s = String(raw);
  if (s.startsWith('4')) {
    return s.slice(1);
  }
  return s;
}

/**
 * Parse Socket.IO EVENT (2) or ACK (3) packet body after Engine prefix removed.
 * @param {string} inner
 * @returns {{ kind: 'event'; ackRequestId: number | null; data: unknown[] } | { kind: 'ack'; ackId: number; data: unknown[] } | null}
 */
export function parseSocketIoPacket(inner) {
  const t = inner[0];
  if (t !== '2' && t !== '3') {
    return null;
  }
  let i = 1;
  while (i < inner.length && inner[i] !== '[') {
    i += 1;
  }
  if (i >= inner.length) {
    return null;
  }
  const idPart = inner.slice(1, i);
  const arr = JSON.parse(inner.slice(i));
  if (!Array.isArray(arr)) {
    return null;
  }
  if (t === '2') {
    let ackRequestId = null;
    if (idPart.length > 0) {
      const n = Number.parseInt(idPart, 10);
      if (!Number.isNaN(n)) {
        ackRequestId = n;
      }
    }
    return { kind: 'event', ackRequestId, data: arr };
  }
  const ackId = Number.parseInt(idPart, 10);
  if (Number.isNaN(ackId)) {
    return null;
  }
  return { kind: 'ack', ackId, data: arr };
}

/**
 * Encode Engine.IO-wrapped Socket.IO EVENT with optional ack request id.
 * @param {number | null} ackRequestId
 * @param {unknown[]} payload
 * @returns {string}
 */
export function encodeEventPacket(ackRequestId, payload) {
  const idPart =
    ackRequestId === null || ackRequestId === undefined
      ? ''
      : String(ackRequestId);
  const socketPart = `2${idPart}${JSON.stringify(payload)}`;
  return `4${socketPart}`;
}

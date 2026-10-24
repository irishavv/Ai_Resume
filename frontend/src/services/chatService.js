import { ApiError, buildHeaders, buildUrl, readErrorEnvelope } from './httpClient.js';
import { copy } from '../constants/copy.js';

/**
 * Parses a single SSE frame into `{ event, data }`.
 * Handles `:` comment lines, optional spaces after the colon and
 * multi-line `data:` fields.
 */
export function parseSseFrame(rawFrame) {
  const lines = rawFrame.split('\n');
  let event = 'message';
  const dataLines = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) continue;
    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? '' : line.slice(separator + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'event') event = value;
    else if (field === 'data') dataLines.push(value);
  }

  if (dataLines.length === 0) return null;

  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    // A frame we cannot parse is ignored rather than killing the stream.
    return null;
  }
}

/**
 * Streams an assistant answer over Server-Sent Events.
 *
 * EventSource cannot POST, so this reads the response body directly and
 * dispatches parsed frames to the supplied callbacks.
 *
 * Resolves when the stream ends normally or is aborted by the caller.
 * Throws an ApiError for transport/HTTP failures.
 */
export async function streamMessage({
  conversationId,
  content,
  language,
  signal,
  onMeta,
  onDelta,
  onDone,
  onError,
}) {
  if (!conversationId) {
    throw new ApiError({ code: 'NO_CONVERSATION', message: copy.errors.generic });
  }

  let response;
  try {
    response = await fetch(buildUrl(`/conversations/${encodeURIComponent(conversationId)}/messages`), {
      method: 'POST',
      headers: buildHeaders({ Accept: 'text/event-stream' }),
      body: JSON.stringify({ content, language }),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError' || signal?.aborted) return { aborted: true };
    throw new ApiError({ code: 'NETWORK_ERROR', message: copy.errors.network });
  }

  if (!response.ok) {
    throw await readErrorEnvelope(response);
  }

  if (!response.body) {
    throw new ApiError({ code: 'STREAM_UNAVAILABLE', message: copy.errors.streamUnavailable });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  let buffer = '';
  let doneFrameReceived = false;
  let errorFrameReceived = false;
  let aborted = false;

  const dispatch = (frame) => {
    switch (frame.event) {
      case 'meta':
        onMeta?.(frame.data ?? {});
        break;
      case 'delta':
        onDelta?.(frame.data ?? {});
        break;
      case 'done':
        doneFrameReceived = true;
        onDone?.(frame.data ?? {});
        break;
      case 'error':
        errorFrameReceived = true;
        onError?.(frame.data ?? {});
        break;
      default:
        // Unknown event names are ignored so the protocol can grow safely.
        break;
    }
  };

  const drainBuffer = () => {
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const rawFrame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const frame = parseSseFrame(rawFrame);
      if (frame) dispatch(frame);
      boundary = buffer.indexOf('\n\n');
    }
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      drainBuffer();
    }

    buffer += decoder.decode().replace(/\r\n/g, '\n');
    if (buffer.trim()) {
      const frame = parseSseFrame(buffer);
      if (frame) dispatch(frame);
    }
  } catch (error) {
    if (error?.name === 'AbortError' || signal?.aborted) {
      aborted = true;
    } else {
      // The connection dropped mid-stream: keep whatever text arrived.
      throw new ApiError({ code: 'STREAM_INTERRUPTED', message: copy.errors.incompleteStream });
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* the reader may already be released */
    }
  }

  if (aborted) return { aborted: true };

  if (!doneFrameReceived && !errorFrameReceived) {
    // Stream closed without a `done` frame: an incomplete generation.
    onError?.({ code: 'INCOMPLETE_STREAM', message: copy.errors.incompleteStream });
  }

  return { aborted: false, completed: doneFrameReceived };
}

export default streamMessage;

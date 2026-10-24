import { getClientId } from '../lib/clientId.js';
import { copy } from '../constants/copy.js';

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const API_BASE_URL = String(RAW_BASE_URL).replace(/\/+$/, '');

export const REQUEST_TIMEOUT_MS = 30000;

/**
 * Normalised error thrown by every service call.
 * Raw stack traces never reach the UI - consumers only read `code`/`message`.
 */
export class ApiError extends Error {
  constructor({ code = 'ERROR', message = copy.errors.generic, status = 0 } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

function messageForStatus(status) {
  switch (status) {
    case 400:
      return copy.errors.badRequest;
    case 401:
    case 403:
      return copy.errors.unauthorized;
    case 404:
      return copy.errors.notFound;
    case 429:
      return copy.errors.rateLimited;
    default:
      return status >= 500 ? copy.errors.server : copy.errors.generic;
  }
}

export function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Headers sent with every request, including the mandatory client id. */
export function buildHeaders(extra) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client-Id': getClientId(),
    ...extra,
  };
}

/**
 * Headers for a multipart upload. `Content-Type` is deliberately omitted so the
 * browser can set it together with the multipart boundary it generates.
 */
export function buildUploadHeaders(extra) {
  return {
    Accept: 'application/json',
    'X-Client-Id': getClientId(),
    ...extra,
  };
}

function isAbortError(error) {
  return error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

/**
 * Reads the standard error envelope `{ error: { code, message, ... } }`
 * from a failed response, falling back to a status-derived message.
 */
export async function readErrorEnvelope(response) {
  let payload = null;
  try {
    const text = await response.text();
    if (text) payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  const envelope = payload && typeof payload === 'object' ? payload.error : null;
  return new ApiError({
    code: envelope?.code || `HTTP_${response.status}`,
    message: envelope?.message || messageForStatus(response.status),
    status: response.status,
  });
}

/**
 * Runs a request with a timeout via AbortController and converts transport
 * failures into ApiError. Shared by the JSON and multipart helpers.
 */
async function executeRequest(path, init, { signal, timeout = REQUEST_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', forwardAbort);
  }

  try {
    return await fetch(buildUrl(path), { ...init, signal: controller.signal });
  } catch (error) {
    if (isAbortError(error) || controller.signal.aborted) {
      if (signal?.aborted) throw new ApiError({ code: 'ABORTED', message: copy.errors.aborted });
      if (timedOut) throw new ApiError({ code: 'TIMEOUT', message: copy.errors.timeout });
      throw new ApiError({ code: 'ABORTED', message: copy.errors.aborted });
    }
    throw new ApiError({ code: 'NETWORK_ERROR', message: copy.errors.network });
  } finally {
    window.clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', forwardAbort);
  }
}

/** Turns a successful response into its JSON payload, or throws the error envelope. */
async function readJsonPayload(response) {
  if (response.status === 204) return null;
  if (!response.ok) throw await readErrorEnvelope(response);

  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError({ code: 'INVALID_JSON', message: copy.errors.server, status: response.status });
  }
}

/**
 * JSON request helper: prepends the base URL, always sends `X-Client-Id`,
 * applies a timeout via AbortController and converts failures into ApiError.
 */
export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers, signal, timeout } = options;

  const response = await executeRequest(
    path,
    {
      method,
      headers: buildHeaders(headers),
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    { signal, timeout },
  );

  return readJsonPayload(response);
}

/**
 * Multipart request helper. The FormData body is sent untouched (so the
 * boundary stays valid) and the response is read back as JSON.
 */
export async function apiUpload(path, formData, options = {}) {
  const { method = 'POST', headers, signal, timeout } = options;

  const response = await executeRequest(
    path,
    {
      method,
      headers: buildUploadHeaders(headers),
      body: formData,
    },
    { signal, timeout },
  );

  return readJsonPayload(response);
}

/** Normalises any thrown value into an ApiError for consistent UI handling. */
export function toApiError(error) {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) {
    return new ApiError({ code: 'UNEXPECTED', message: copy.errors.generic });
  }
  return new ApiError({ code: 'UNEXPECTED', message: copy.errors.generic });
}

export default apiRequest;

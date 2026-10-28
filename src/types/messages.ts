/**
 * Typed message protocol for all extension communication.
 * Every message must have a `type` discriminant.
 */

// ─── Content Script → Service Worker ───────────────────────────────

export interface ActivateMessage {
  type: 'ACTIVATE';
  tabId: number;
}

export interface OcrRequestMessage {
  type: 'OCR_REQUEST';
  imageUrl: string;
  imageBase64?: string; // fallback if URL not fetchable
  tileIndex: number;
  tileTotal: number;
  imageId: string;
  dialogueOnly?: boolean;
}

// ─── Service Worker → Offscreen ────────────────────────────────────

export interface OcrJobMessage {
  type: 'OCR_JOB';
  target: 'offscreen';
  imageUrl?: string;
  imageBase64?: string;
  tileIndex: number;
  tileTotal: number;
  imageId: string;
  dialogueOnly?: boolean;
}

// ─── Offscreen → Service Worker (response) ─────────────────────────

export interface OcrBlock {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrResultMessage {
  type: 'OCR_RESULT';
  imageId: string;
  tileIndex: number;
  blocks: OcrBlock[];
  fullText: string;
  meanConfidence: number;
  error?: string;
}

export interface OcrProgressMessage {
  type: 'OCR_PROGRESS';
  imageId: string;
  tileIndex: number;
  progress: number; // 0..1
  status: string;
}

export interface OcrErrorMessage {
  type: 'OCR_ERROR';
  imageId: string;
  tileIndex: number;
  error: string;
}

// ─── Service Worker → Content Script ───────────────────────────────

export interface ActivationResultMessage {
  type: 'ACTIVATION_RESULT';
  success: boolean;
  error?: string;
}

// ─── Popup → Service Worker ────────────────────────────────────────

export interface PopupActivateMessage {
  type: 'POPUP_ACTIVATE';
}

export interface PopupGetStatusMessage {
  type: 'POPUP_GET_STATUS';
}

export interface PopupStatusResponse {
  type: 'POPUP_STATUS';
  isActive: boolean;
  isRestricted: boolean;
  tabId?: number;
}

// ─── Offscreen lifecycle ───────────────────────────────────────────

export interface EnsureOffscreenMessage {
  type: 'ENSURE_OFFSCREEN';
}

// ─── Dynamic Host Permissions ──────────────────────────────────────

export interface RequestPermissionsMessage {
  type: 'REQUEST_PERMISSIONS';
}

export interface CheckPermissionsMessage {
  type: 'CHECK_PERMISSIONS';
}

export interface PermissionsStatusResponse {
  type: 'PERMISSIONS_STATUS';
  hasHostPermission: boolean;
}

// ─── Union types ───────────────────────────────────────────────────

export type ContentToBackgroundMessage =
  | ActivateMessage
  | OcrRequestMessage
  | RequestPermissionsMessage
  | CheckPermissionsMessage;

export type BackgroundToOffscreenMessage =
  | OcrJobMessage;

export type OffscreenToBackgroundMessage =
  | OcrResultMessage
  | OcrProgressMessage
  | OcrErrorMessage;

export type PopupToBackgroundMessage =
  | PopupActivateMessage
  | PopupGetStatusMessage
  | RequestPermissionsMessage
  | CheckPermissionsMessage;

export type AnyMessage =
  | ContentToBackgroundMessage
  | BackgroundToOffscreenMessage
  | OffscreenToBackgroundMessage
  | PopupToBackgroundMessage
  | ActivationResultMessage
  | PopupStatusResponse
  | PermissionsStatusResponse;

/**
 * Runtime type guard — checks that message has a valid `type` string.
 */
export function isValidMessage(msg: unknown): msg is AnyMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    typeof (msg as { type: unknown }).type === 'string'
  );
}

/**
 * Narrow by type discriminant.
 */
export function isMessageType<T extends AnyMessage['type']>(
  msg: AnyMessage,
  type: T
): msg is Extract<AnyMessage, { type: T }> {
  return msg.type === type;
}

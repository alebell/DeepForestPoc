import { DeviceEventEmitter, NativeModules } from 'react-native';

type NativeArRecording = {
  isSessionReady(): Promise<boolean>;
  getRecordingStatus(): Promise<string>;
  startRecording(outputPath?: string | null): Promise<string | null>;
  stopRecording(): Promise<void>;
};

type StartedEvent = { uri?: string; rotation?: number };
type FileInfoEvent = {
  uri?: string;
  rotationMeta?: number;
  width?: number;
  height?: number;
};
type ErrorEvent = { code?: string; message?: string };

const ArRecording: NativeArRecording = NativeModules.ArRecording;

export class ArRecordingError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message || code);
    this.code = code;
  }
}

let starting = false;
let stopping = false;

export async function waitForSessionReady(timeoutMs = 8000): Promise<void> {
  const readyNow = await ArRecording.isSessionReady();
  if (readyNow) return;
  let resolved = false;
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(
          new ArRecordingError(
            'SESSION_TIMEOUT',
            'AR-Session wurde nicht rechtzeitig initialisiert.',
          ),
        );
      }
    }, timeoutMs);
    const sub = DeviceEventEmitter.addListener('ArSessionReady', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        sub.remove();
        resolve();
      }
    });
  });
}

export function onRecordingStarted(
  cb: (e: { uri: string | null; rotation: number }) => void,
) {
  return DeviceEventEmitter.addListener(
    'ArRecording_onStarted',
    (e: StartedEvent) => {
      cb({ uri: e?.uri ?? null, rotation: e?.rotation ?? 0 });
    },
  );
}

export function onRecordingStopped(cb: () => void) {
  return DeviceEventEmitter.addListener('ArRecording_onStopped', () => cb());
}

export function onRecordingError(cb: (err: ArRecordingError) => void) {
  return DeviceEventEmitter.addListener(
    'ArRecording_onError',
    (e: ErrorEvent) =>
      cb(new ArRecordingError(e?.code || 'UNKNOWN', e?.message)),
  );
}

export function onFileInfo(cb: (e: FileInfoEvent) => void) {
  return DeviceEventEmitter.addListener(
    'ArRecording_onFileInfo',
    (e: FileInfoEvent) => cb(e),
  );
}

export async function startRecording(
  outputPath?: string | null,
): Promise<string | null> {
  if (starting)
    throw new ArRecordingError('BUSY_START', 'Start already in progress');
  starting = true;
  try {
    await waitForSessionReady();
    const uri = await ArRecording.startRecording(outputPath ?? null);
    return uri ?? null;
  } catch (e: any) {
    throw new ArRecordingError(
      e?.code || 'NATIVE_ERROR',
      e?.message || String(e),
    );
  } finally {
    starting = false;
  }
}

export async function stopRecording(): Promise<void> {
  if (stopping)
    throw new ArRecordingError('BUSY_STOP', 'Stop already in progress');
  stopping = true;
  try {
    await ArRecording.stopRecording();
  } catch (e: any) {
    throw new ArRecordingError(
      e?.code || 'NATIVE_ERROR',
      e?.message || String(e),
    );
  } finally {
    stopping = false;
  }
}

export async function isSessionReady(): Promise<boolean> {
  try {
    return await ArRecording.isSessionReady();
  } catch {
    return false;
  }
}

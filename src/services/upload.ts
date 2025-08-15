import RNFS from 'react-native-fs';
import { supabase, SUPABASE_BUCKET } from './supabase';

export type UploadOutputs = {
  videoKey: string;
  jsonKey: string;
  publicVideoUrl?: string;
  publicJsonUrl?: string;
};

function makeBaseName(prefix = 'videos') {
  const iso = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}/${iso}_${rand}`;
}

async function readFileAsBase64(uriOrPath: string): Promise<string> {
  const path = uriOrPath.startsWith('file://') ? uriOrPath.slice(7) : uriOrPath;
  return await RNFS.readFile(path, 'base64');
}

/**
 * Uploads both the MP4 file and the ARCore JSON sidecar (from `meta`).
 * - `videoPathOrUri`: local file path/URI (with or without file://)
 * - `meta`: the metadata object passed from VideoCaptureScreen
 */
export async function uploadVideoAndJson(
  videoPathOrUri: string,
  meta: unknown,
): Promise<UploadOutputs> {
  const base = makeBaseName('videos');
  const videoKey = `${base}.mp4`;
  const jsonKey = `${base}.json`;

  // Read MP4 into a Blob
  const uri = videoPathOrUri.startsWith('file://')
    ? videoPathOrUri
    : `file://${videoPathOrUri}`;
  const videoBuffer = Buffer.from(await readFileAsBase64(uri), 'base64');

  const jsonString = JSON.stringify(meta ?? {}, null, 2);

  // Upload MP4
  const v = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(videoKey, videoBuffer, { contentType: 'video/mp4', upsert: false });
  if (v.error) {
    throw v.error;
  } else {
    console.log('Video uploaded successfully:', v);
  }

  // Upload JSON
  const j = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(jsonKey, jsonString, {
      contentType: 'application/json',
      upsert: false,
    });
  if (j.error) {
    throw j.error;
  } else {
    console.log('JSON uploaded successfully:', j);
  }
  // Public URLs if allowed by your bucket policy
  const { data: pv } = supabase.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(videoKey);
  const { data: pj } = supabase.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(jsonKey);

  return {
    videoKey: v.data?.path ?? videoKey,
    jsonKey: j.data?.path ?? jsonKey,
    publicVideoUrl: pv?.publicUrl,
    publicJsonUrl: pj?.publicUrl,
  };
}

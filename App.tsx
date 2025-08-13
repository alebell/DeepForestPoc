import React, { useCallback, useState } from 'react';
import {
  Button,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface Intrinsics {
  focalLength: { x: number; y: number };
  principalPoint: { x: number; y: number };
  imageDimensions: { width: number; height: number };
}

interface Position {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

interface Capture {
  videoUri: string;
  timestamp: string;
  intrinsics: Intrinsics;
  positions: Position[];
}

function App() {
  const [capture, setCapture] = useState<Capture | null>(null);

  const recordVideo = useCallback(async () => {
    try {
      // Dynamically import the camera module to avoid issues in test envs
      const vision = await import('react-native-vision-camera');

      // Request permissions and gather intrinsics
      await vision.Camera.requestCameraPermission();
      const devices = await vision.Camera.getAvailableCameraDevices();
      const device = devices[0];
      let intrinsics: Intrinsics = {
        focalLength: { x: 0, y: 0 },
        principalPoint: { x: 0, y: 0 },
        imageDimensions: { width: 0, height: 0 },
      };

      if (device?.formats?.[0]?.intrinsics) {
        const i = device.formats[0].intrinsics;
        intrinsics = {
          focalLength: { x: i.focalLengthX, y: i.focalLengthY },
          principalPoint: { x: i.principalPointX, y: i.principalPointY },
          imageDimensions: { width: i.width, height: i.height },
        };
      }

      // Placeholder for ARCore position tracking
      let positions: Position[] = [];
      try {
        const arcore = await import('react-native-arcore');
        const frame = await arcore.startTracking();
        if (frame?.camera?.pose) {
          positions.push({
            x: frame.camera.pose.x,
            y: frame.camera.pose.y,
            z: frame.camera.pose.z,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        console.warn('ARCore not available', err);
      }

      // Placeholder URI and timestamp since we cannot record in this environment
      setCapture({
        videoUri: `file://${Date.now()}.mp4`,
        timestamp: new Date().toISOString(),
        intrinsics,
        positions,
      });
    } catch (e) {
      console.error('Video recording failed', e);
    }
  }, []);

  const submitCapture = useCallback(async () => {
    if (!capture) {
      return;
    }
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient('https://YOUR_PROJECT.supabase.co', 'PUBLIC_ANON_KEY');

      await supabase.storage
        .from('captures')
        .upload(`videos/${Date.now()}.mp4`, {
          uri: capture.videoUri,
          type: 'video/mp4',
          name: 'video.mp4',
        });

      await supabase.from('metadata').insert({
        timestamp: capture.timestamp,
        intrinsics: capture.intrinsics,
        positions: capture.positions,
      });

      setCapture(null);
    } catch (err) {
      console.error('Upload failed', err);
    }
  }, [capture]);

  const resetCapture = useCallback(() => setCapture(null), []);

  return (
    <View style={styles.container}>
      {!capture && (
        <>
          <Text>No video captured</Text>
          <Button title="Record Video" onPress={recordVideo} />
        </>
      )}
      {capture && (
        <>
          <Text>Captured at {capture.timestamp}</Text>
          <Image source={{ uri: capture.videoUri }} style={styles.thumbnail} />
          <Button title="Submit Capture" onPress={submitCapture} />
          <Button title="Reset" onPress={resetCapture} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  thumbnail: {
    width: 200,
    height: 120,
    backgroundColor: '#000',
  },
});

export default App;


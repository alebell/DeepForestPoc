import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Text,
  Pressable,
  StatusBar,
  DeviceEventEmitter,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { VideoMeta, ArFrameEvent } from '../types';
import { getCurrentLocation } from '../services/location';
import RNFS from 'react-native-fs';
import {
  isSessionReady as arIsSessionReady,
  waitForSessionReady,
  onRecordingStarted,
  onRecordingStopped,
  onRecordingError,
  onFileInfo,
  startRecording as arStartRecording,
  stopRecording as arStopRecording,
  ArRecordingError,
} from '../services/recording';
import ArPreview from '../components/ArPreview';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Capture'> };

export default function VideoCaptureScreen({ navigation }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [loadingStart, setLoadingStart] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [position, setPosition] = useState<any>(undefined);
  const [sessionReady, setSessionReady] = useState(false);
  const [recordRotation, setRecordRotation] = useState<number>(0);
  const insets = useSafeAreaInsets();
  const framesRef = useRef<ArFrameEvent[]>([]);
  useEffect(() => {
    const t0 = Date.now();
    arIsSessionReady()
      .then(ok => {
        setSessionReady(ok);
        console.log('[Capture] isSessionReady at mount', {
          ok,
          dt: Date.now() - t0,
        });
      })
      .catch(() => setSessionReady(false));
    const subReady = DeviceEventEmitter.addListener('ArSessionReady', () => {
      console.log('[Capture] ArSessionReady event');
      setSessionReady(true);
    });
    const pollId = setInterval(async () => {
      const ok = await arIsSessionReady();
      if (ok) {
        setSessionReady(true);
        clearInterval(pollId);
        console.log('[Capture] poll session ready');
      }
    }, 300);
    const subStarted = onRecordingStarted(({ uri, rotation }) => {
      console.log('[Capture] onRecordingStarted', { uri, rotation });
      setIsRecording(true);
      setLoadingStart(false);
      setOutputPath(uri ?? null);
      setRecordRotation(rotation || 0);
      framesRef.current = [];
    });
    const subStopped = onRecordingStopped(() => {
      console.log('[Capture] onRecordingStopped');
      setIsRecording(false);
    });
    const subError = onRecordingError(e => {
      console.log('[Capture] onRecordingError', e);
      setIsRecording(false);
      setLoadingStart(false);
      Alert.alert('AR-Aufnahme Fehler', e?.message ?? String(e));
    });
    const subInfo = onFileInfo(e => {
      console.log('[Capture] onFileInfo', e);
    });
    return () => {
      subReady.remove();
      subStarted.remove();
      subStopped.remove();
      subError.remove();
      subInfo.remove();
      clearInterval(pollId);
    };
  }, []);
  useEffect(() => {
    let id: any;
    if (isRecording) {
      setElapsed(0);
      id = setInterval(() => setElapsed(t => t + 1), 1000);
    }
    return () => id && clearInterval(id);
  }, [isRecording]);
  const elapsedLabel = useMemo(() => {
    const m = Math.floor(elapsed / 60)
      .toString()
      .padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [elapsed]);
  const start = async () => {
    if (loadingStart || isRecording || !sessionReady) return;
    try {
      setLoadingStart(true);
      const t0 = Date.now();
      await waitForSessionReady();
      console.log('[Capture] waitForSessionReady done', {
        dt: Date.now() - t0,
      });
      setStartTime(new Date().toISOString());
      getCurrentLocation()
        .then(setPosition)
        .catch(() => setPosition(undefined));
      const out = `${RNFS.CachesDirectoryPath}/ar_recording_${Date.now()}.mp4`;
      await arStartRecording(out);
    } catch (e: any) {
      setLoadingStart(false);
      const msg =
        e instanceof ArRecordingError ? e.message : e?.message ?? String(e);
      Alert.alert('Start fehlgeschlagen', msg);
    }
  };
  const stop = async () => {
    if (!isRecording) return;
    try {
      await arStopRecording();
      const endTime = new Date().toISOString();
      const videoPath = outputPath ?? '';
      const meta: VideoMeta = {
        startTime: startTime ?? endTime,
        endTime,
        position,
        frames: framesRef.current,
        rotation: recordRotation || 0,
      };
      setTimeout(
        () =>
          navigation.replace('Review', { video: { path: videoPath }, meta }),
        200,
      );
    } catch (e: any) {
      const msg =
        e instanceof ArRecordingError ? e.message : e?.message ?? String(e);
      Alert.alert('Stop fehlgeschlagen', msg);
    }
  };
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('ArFrameEvent', (e: any) => {
      framesRef.current.push(e as any);
    });
    return () => sub.remove();
  }, []);
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={StyleSheet.absoluteFill}>
        <ArPreview
          style={StyleSheet.absoluteFill}
          depthEnabled={false}
          planeDetection="disabled"
          frameEventsEnabled={true}
        />
      </View>
      <SafeAreaView
        pointerEvents="box-none"
        style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}
      >
        <View style={styles.side}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zurück"
            onPress={() => navigation.replace('Start')}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && styles.iconBtnPressed,
            ]}
            hitSlop={10}
            disabled={isRecording || loadingStart}
          >
            <Text style={styles.iconText}>←</Text>
          </Pressable>
        </View>
        <View style={styles.centerArea}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isRecording ? 'Aufnahme stoppen' : 'Aufnahme starten'
            }
            onPress={isRecording ? stop : start}
            style={({ pressed }) => [
              styles.recordOuter,
              isRecording && styles.recordOuterActive,
              pressed && !isRecording && styles.recordOuterPressed,
              (!sessionReady || loadingStart) && styles.recordOuterDisabled,
            ]}
            disabled={loadingStart || !sessionReady}
          >
            <View
              style={[
                styles.recordInner,
                isRecording && styles.recordInnerActive,
              ]}
            />
          </Pressable>
        </View>
        <View style={[styles.side, { alignItems: 'flex-end' }]}>
          <View style={styles.timerWrap}>
            {isRecording && <View style={styles.dot} />}
            <Text style={styles.timerText}>
              {isRecording
                ? elapsedLabel
                : loadingStart
                ? '…'
                : sessionReady
                ? '00:00'
                : '— — : — —'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
      <View pointerEvents="none" style={styles.fadeBottom} />
    </View>
  );
}

const COLORS = {
  bg: '#0b0b0f',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.7)',
  accent: '#ff3b30',
  accentDim: 'rgba(255,59,48,0.35)',
  surface: 'rgba(255,255,255,0.10)',
  surfacePressed: 'rgba(255,255,255,0.18)',
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  side: { flex: 1, justifyContent: 'center' },
  centerArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  iconBtnPressed: { backgroundColor: COLORS.surfacePressed },
  iconText: { color: COLORS.text, fontSize: 28, marginTop: -2 },
  recordOuter: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentDim,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  recordOuterActive: { backgroundColor: 'rgba(255,59,48,0.5)' },
  recordOuterPressed: { transform: [{ scale: 0.98 }] },
  recordOuterDisabled: { opacity: 0.5 },
  recordInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent,
  },
  recordInnerActive: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
  },
  timerWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  timerText: {
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  fadeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
    backgroundColor: 'rgba(0,0,0,0.33)',
  },
});

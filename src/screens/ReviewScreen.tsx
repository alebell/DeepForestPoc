import React, { useMemo, useRef, useState, type ElementRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import VideoComp from 'react-native-video';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS } from '../misc/colors';
import { uploadVideoAndJson } from '../services/upload';
import Toast from 'react-native-toast-message';

type ReviewScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Review'
>;
type ReviewScreenRouteProp = RouteProp<RootStackParamList, 'Review'>;
type Props = {
  navigation: ReviewScreenNavigationProp;
  route: ReviewScreenRouteProp;
};
type VideoRef = ElementRef<typeof VideoComp>;

export default function ReviewScreen({ navigation, route }: Props) {
  const { video, meta } = route.params as any;
  const insets = useSafeAreaInsets();
  const playerRef = useRef<VideoRef>(null);
  const [uploading, setUploading] = useState(false);
  const [paused, setPaused] = useState(true);
  const sourceUri = useMemo(() => {
    const p = video.path || '';
    return p.startsWith('file://') ? p : `file://${p}`;
  }, [video.path]);
  const useRecording = async () => {
    if (uploading) return;
    try {
      setUploading(true);
      await uploadVideoAndJson(video.path, meta);
      Toast.show({
        type: 'success',
        text1: 'Upload abgeschlossen',
        text2: 'Video & ARCore JSON wurden hochgeladen.',
      });
      navigation.replace('Start', { newItem: { path: video.path, meta } });
    } catch (e: any) {
      console.log('[Review] Upload failed', e);
      /*
      Toast.show({
        type: 'error',
        text1: 'Upload fehlgeschlagen',
        text2: e?.message ?? String(e),
      });
      */
      const msg = (e?.message ?? String(e)) as string;
      // Heuristics for better UX:
      const isFileRead = /File read|base64|ENOENT|EACCES|permission/i.test(msg);
      Toast.show({
        type: 'error',
        text1: isFileRead
          ? 'Datei konnte nicht gelesen werden'
          : 'Upload fehlgeschlagen',
        text2: msg,
      });
    } finally {
      setUploading(false);
    }
  };
  return (
    <View style={styles.root}>
      <SafeAreaView
        style={[styles.top, { paddingTop: insets.top, paddingHorizontal: 16 }]}
      >
        <Text style={styles.title}>Aufnahme prüfen</Text>
        <Text style={styles.meta}>
          {new Date(meta.startTime).toLocaleString()}
        </Text>
      </SafeAreaView>
      <View style={styles.playerWrap}>
        <VideoComp
          ref={playerRef}
          source={{ uri: sourceUri }}
          style={styles.video}
          resizeMode="contain"
          controls
          paused={paused}
          useTextureView
          onEnd={() => setPaused(true)}
        />
      </View>
      <SafeAreaView
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + 8, paddingHorizontal: 16 },
        ]}
      >
        <Pressable
          onPress={() => navigation.replace('Capture')}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryText}>Neu aufnehmen</Text>
        </Pressable>
        <Pressable
          onPress={useRecording}
          disabled={uploading}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryText}>
            {uploading ? 'Wird gesendet…' : 'Verwenden'}
          </Text>
        </Pressable>
      </SafeAreaView>
      {uploading && (
        <View style={styles.blocker}>
          <ActivityIndicator />
          <Text style={styles.blockerText}>Upload läuft…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  top: { paddingVertical: 12 },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  meta: { color: COLORS.textMuted, marginTop: 4 },
  playerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', height: '100%', backgroundColor: 'black' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnPressed: { backgroundColor: COLORS.surfacePressed },
  secondaryText: { color: COLORS.text, fontWeight: '600' },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  primaryText: { color: COLORS.text, fontWeight: '600' },
  blocker: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  blockerText: { color: COLORS.text, marginTop: 12 },
});

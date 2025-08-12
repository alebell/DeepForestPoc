import React, { useMemo, useRef, useState, type ElementRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import VideoComp from 'react-native-video';
import RNFS from 'react-native-fs';
import { supabase } from '../services/supabase';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { Buffer } from 'buffer';

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

  const ensureFilePath = async (uri: string) => {
    if (uri.startsWith('file://')) return uri;
    if (uri.startsWith('content://')) {
      const tmp = `${RNFS.CachesDirectoryPath}/tmp_${Date.now()}.mp4`;
      await RNFS.copyFile(uri, tmp);
      return `file://${tmp}`;
    }
    return uri;
  };

  const upload = async () => {
    setUploading(true);
    try {
      const src = await ensureFilePath(sourceUri);
      const p = src.replace('file://', '');
      const base64 = await RNFS.readFile(p, 'base64');
      const buf = Buffer.from(base64, 'base64');
      const bytes = buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength,
      );
      const fileName = `video_${Date.now()}.mp4`;
      const { data, error } = await supabase.storage
        .from('videos')
        .upload(
          fileName,
          bytes as ArrayBuffer,
          { contentType: 'video/mp4', upsert: false } as any,
        );
      if (error) throw error;
      await supabase
        .from('videometadata')
        .insert([
          { meta: JSON.stringify(meta), video_url: data?.path || fileName },
        ]);
      navigation.replace('Start');
    } catch (err: any) {
      Alert.alert('Upload fehlgeschlagen', err?.message ?? String(err));
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
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && styles.secondaryBtnPressed,
          ]}
        >
          <Text style={styles.secondaryText}>Neu aufnehmen</Text>
        </Pressable>

        <Pressable
          onPress={upload}
          disabled={uploading}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
            uploading && styles.primaryBtnDisabled,
          ]}
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

const COLORS = {
  bg: '#0b0b0f',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.7)',
  surface: 'rgba(255,255,255,0.10)',
  surfacePressed: 'rgba(255,255,255,0.18)',
  primary: '#4cd964',
  primaryPressed: '#39bf53',
  primaryDisabled: 'rgba(76,217,100,0.5)',
};

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
  primaryBtnPressed: { backgroundColor: COLORS.primaryPressed },
  primaryBtnDisabled: { backgroundColor: COLORS.primaryDisabled },
  primaryText: { color: '#0b0b0f', fontWeight: '700' },
  blocker: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  blockerText: { color: COLORS.textMuted },
});

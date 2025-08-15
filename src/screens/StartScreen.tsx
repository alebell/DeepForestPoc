import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS } from '../misc/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  supabase,
  SUPABASE_BUCKET,
  ensureSignedIn,
} from '../services/supabase';

type StartScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Start'
>;

type FileItem = {
  id?: string;
  name: string;
  created_at?: string;
};

export default function StartScreen() {
  const navigation = useNavigation<StartScreenNavigationProp>();
  const [videos, setVideos] = React.useState<FileItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [authReady, setAuthReady] = React.useState(false);

  const fetchVideos = React.useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .list('videos', {
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;
      setVideos(data || []);
    } catch (e) {
      console.error('Error fetching videos:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      await ensureSignedIn();
      if (!alive) return;
      setAuthReady(true);
      await fetchVideos();
    })();
    return () => {
      alive = false;
    };
  }, [fetchVideos]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        {/* Header + CTA stay outside the list */}
        <Text style={styles.header}>DeepForest</Text>
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaButtonPressed,
          ]}
          onPress={() => navigation.replace('Capture')}
        >
          <Text style={styles.ctaText}>Neues Video aufnehmen</Text>
        </Pressable>
        <Text style={styles.subheader}>Dateien auf Supabase</Text>

        {/* Scrollable area */}
        <FlatList
          data={videos}
          keyExtractor={item => item.id ?? item.name}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.itemText}>{item.name}</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator />
            ) : authReady ? (
              <Text style={styles.itemText}>No videos found</Text>
            ) : null
          }
          refreshing={loading}
          onRefresh={fetchVideos}
          contentContainerStyle={styles.listContent}
          style={styles.list} // gives it height to scroll within
        />

        {/* Keep this if you need extra footer space; otherwise remove */}
        <View style={styles.ctaContainer} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    flex: 1, // <— take full height
    backgroundColor: COLORS.bg,
    padding: 20,
    // DO NOT use overflow: 'scroll' in RN
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 48,
    color: COLORS.text,
  },
  subheader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.text,
  },
  list: {
    flex: 1, // <— make the list fill available space so it can scroll
  },
  listContent: {
    paddingBottom: 24, // space after last item
  },
  ctaContainer: {
    // optional footer space
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 24,
  },
  ctaButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  ctaText: {
    color: COLORS.text,
    fontSize: 18,
    letterSpacing: 1,
  },
  item: {
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
  itemText: {
    fontSize: 16,
    color: COLORS.text,
  },
});

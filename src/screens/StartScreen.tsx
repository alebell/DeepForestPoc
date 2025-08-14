import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { VideoMeta } from '../types';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

type StartScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Start'
>;
type StartScreenRouteProp = RouteProp<RootStackParamList, 'Start'>;

type RecordedVideo = { id: string; path: string; meta: VideoMeta };

export default function StartScreen() {
  const navigation = useNavigation<StartScreenNavigationProp>();
  const route = useRoute<StartScreenRouteProp>();
  const [videos, setVideos] = useState<RecordedVideo[]>([]);
  useEffect(() => {
    const newItem = route.params?.newItem;
    if (newItem) {
      const id = `${Date.now()}_${Math.random()}`;
      setVideos(prev => [
        ...prev,
        { id, path: newItem.path, meta: newItem.meta },
      ]);
      navigation.setParams({ newItem: undefined });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.newItem]);
  return (
    <View style={styles.container}>
      {videos.length === 0 ? (
        <>
          <Text style={styles.info}>Noch kein Video erfasst</Text>
          <Button
            title="Neue Erfassung starten"
            onPress={() => navigation.replace('Capture')}
          />
        </>
      ) : (
        <>
          <FlatList
            data={videos}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  navigation.navigate('VideoJson', {
                    item: { path: item.path, meta: item.meta },
                  })
                }
                style={({ pressed }) => [
                  styles.item,
                  pressed && styles.itemPressed,
                ]}
              >
                <Text style={styles.itemText}>
                  {item.path.split('/').pop()}
                </Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
          <Button
            title="Neue Erfassung starten"
            onPress={() => navigation.replace('Capture')}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  info: { marginBottom: 24, fontSize: 16, textAlign: 'center' },
  item: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
  itemPressed: { backgroundColor: '#ddd' },
  itemText: { fontSize: 16 },
  sep: { height: 12 },
});

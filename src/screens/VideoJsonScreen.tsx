import React, { useMemo } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';

type VideoJsonScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'VideoJson'
>;
type VideoJsonScreenRouteProp = RouteProp<RootStackParamList, 'VideoJson'>;

type Props = {
  navigation: VideoJsonScreenNavigationProp;
  route: VideoJsonScreenRouteProp;
};

export default function VideoJsonScreen({ route }: Props) {
  const { item } = route.params;
  const jsonStr = useMemo(() => {
    try {
      return JSON.stringify(item.meta, null, 2);
    } catch {
      return String(item.meta);
    }
  }, [item]);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.path}>{item.path}</Text>
        <Text style={styles.json}>{jsonStr}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  scroll: { flex: 1 },
  path: { marginBottom: 12, fontWeight: '600' },
  json: { fontFamily: 'monospace' },
});

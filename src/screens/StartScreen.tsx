import React from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../misc/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

type StartScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Start'
>;

export default function StartScreen() {
  const navigation = useNavigation<StartScreenNavigationProp>();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <Text style={styles.header}>DeepForest</Text>
        <View style={styles.ctaContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
            ]}
            onPress={() => navigation.replace('Capture')}
          >
            <Text style={styles.ctaText}>Neues Video aufnehmen</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    flexGrow: 1,
    flexShrink: 0,
    backgroundColor: COLORS.bg,
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  ctaContainer: {
    flex: 1,
    justifyContent: 'center',
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
  itemPressed: {
    backgroundColor: COLORS.surfacePressed,
  },
  itemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  sep: {
    height: 12,
  },
});

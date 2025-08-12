import React from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type StartScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Start'
>;

type Props = {
  navigation: StartScreenNavigationProp;
};

const StartScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.info}>Noch kein Video erfasst</Text>
      <Button
        title="Neue Erfassung starten"
        onPress={() => navigation.replace('Capture')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  info: { marginBottom: 24, fontSize: 16 },
});

export default StartScreen;

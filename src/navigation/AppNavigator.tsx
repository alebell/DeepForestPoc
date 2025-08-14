import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import StartScreen from '../screens/StartScreen';
import VideoCaptureScreen from '../screens/VideoCaptureScreen';
import ReviewScreen from '../screens/ReviewScreen';
import VideoJsonScreen from '../screens/VideoJsonScreen';
import type { VideoMeta } from '../types';

export type RootStackParamList = {
  Start: { newItem?: { path: string; meta: VideoMeta } } | undefined;
  Capture: undefined;
  Review: { video: { path: string }; meta: VideoMeta };
  VideoJson: { item: { path: string; meta: VideoMeta } };
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => (
  <Stack.Navigator
    initialRouteName="Start"
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Start" component={StartScreen} />
    <Stack.Screen name="Capture" component={VideoCaptureScreen} />
    <Stack.Screen name="Review" component={ReviewScreen} />
    <Stack.Screen name="VideoJson" component={VideoJsonScreen} />
  </Stack.Navigator>
);

export default AppNavigator;

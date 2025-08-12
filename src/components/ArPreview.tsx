import React from 'react';
import { requireNativeComponent, ViewStyle, StyleProp } from 'react-native';

export type PlaneDetection = 'horizontal' | 'vertical' | 'both' | 'disabled';

type Props = {
  style?: StyleProp<ViewStyle>;
  depthEnabled?: boolean;
  planeDetection?: PlaneDetection;
  frameEventsEnabled?: boolean;
};

const NativeArPreview = requireNativeComponent<Props>('ArPreview');

export default function ArPreview({
  depthEnabled = false,
  planeDetection = 'disabled',
  frameEventsEnabled = false,
  ...rest
}: Props) {
  return (
    <NativeArPreview
      depthEnabled={depthEnabled}
      planeDetection={planeDetection}
      frameEventsEnabled={frameEventsEnabled}
      {...(rest as any)}
    />
  );
}

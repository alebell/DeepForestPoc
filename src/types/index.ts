export type ArFrameEvent = {
  timestamp: number;
  translation: [number, number, number];
  rotationQuat: [number, number, number, number];
  intrinsics: {
    fx: number;
    fy: number;
    cx: number;
    cy: number;
    width: number;
    height: number;
  };
};

export type VideoMeta = {
  startTime: string;
  endTime: string;
  position?: any;
  rotation?: number;
  frames?: ArFrameEvent[];
};

export type ArFrameEvent = any;

export type VideoMeta = {
  startTime: string;
  endTime: string;
  position?: any;
  rotation?: number;
  frames?: ArFrameEvent[];
};

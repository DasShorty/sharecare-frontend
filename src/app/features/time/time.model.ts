export interface Time {
  id: number;
  type: TimeType;
}

export enum TimeType {
  Fixed,
  Range,
}

export interface FixedTime extends Time {
  type: TimeType.Fixed;
  time: Date;
}

export interface RangeTime extends Time {
  type: TimeType.Range;
  startTime: Date;
  endTime: Date;
}

export type TimeOptions = FixedTime | RangeTime;

import { YAxisProps } from 'aws-cdk-lib/aws-cloudwatch';

export const FULL_WIDTH = 24;
export const HALF_WIDTH = FULL_WIDTH / 2;
export const THIRD_WIDTH = FULL_WIDTH / 3;
export const QUARTER_WIDTH = FULL_WIDTH / 4;
export const EIGHTH_WIDTH = QUARTER_WIDTH / 2;
export const SIXTH_WIDTH = FULL_WIDTH / 6;
export const TWO_THIRDS_WIDTH = 2 * THIRD_WIDTH;
export const THREE_QUARTERS_WIDTH = 3 * QUARTER_WIDTH;

export const DEFAULT_GRAPH_WIDGET_HEIGHT = 5;
export const DEFAULT_ALARM_WIDGET_HEIGHT = 4;

export const PERCENTAGE_AXIS: YAxisProps = {
    min: 0,
    max: 100,
    label: '%',
};

export const TIME_AXIS_MILLIS: YAxisProps = {
    min: 0,
    label: 'ms',
};

export const TIME_AXIS_SECONDS: YAxisProps = {
    min: 0,
    label: 'sec',
};

export const COUNT_AXIS: YAxisProps = {
    min: 0,
    showUnits: false,
};

export const SIZE_AXIS_BYTES: YAxisProps = {
    min: 0,
    label: 'bytes',
};

export const RATE_AXIS: YAxisProps = {
    min: 0,
    showUnits: false,
};

export const RATE_TO_ONE_AXIS: YAxisProps = {
    min: 0,
    max: 1,
    showUnits: false,
};

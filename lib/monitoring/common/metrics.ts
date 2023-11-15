import {
    HorizontalAnnotation,
    IMetric,
    MathExpression,
    Metric,
} from 'aws-cdk-lib/aws-cloudwatch';
import { Duration } from 'aws-cdk-lib';

/**
 * This would help consumers to define the metric statistic.
 */
export enum MetricStatistic {
  /**
   * 50th percentile of all data-points
   */
  P50 = 'p50',
  /**
   * 75th percentile of all data-points
   */
  P75 = 'p75',
  /**
   * 90th percentile of all data-points
   */
  P90 = 'p90',
  /**
   * 95th percentile of all data-points
   */
  P95 = 'p95',
  /**
   * 99th percentile of all data-points
   */
  P99 = 'p99',
  /**
   * minimum of all data-points
   */
  MIN = 'Minimum',
  /**
   * maximum of all data-points
   */
  MAX = 'Maximum',
  /**
   * sum of all data-points
   */
  SUM = 'Sum',
  /**
   * average of all data-points
   */
  AVERAGE = 'Average',
  /**
   * number of data-points
   */
  N = 'SampleCount',
}

/**
 * This would help consumers to define the granularity of metrics computation.
 */
export enum RateComputationMethod {
  /**
   * Number of occurrences per second.
   * More sensitive than average when TPS > 1.
   */
  PER_SECOND,
  /**
   * Number of occurrences relative to requests.
   * Less sensitive than per-second when TPS > 1.
   */
  AVERAGE,
  /**
   * Minimum of occurrences relative to requests.
   */
  MIN,
  /**
   * Maximum of occurrences relative to requests.
   */
  MAX
}

/**
 * Anything that we can create alarm on.
 * (cannot be IMetric, as it does not have any alarm support)
 */
export type Metric = Metric | MathExpression;

/**
 * Construct a type with a set of properties where key is of type string and value as IMetric.
 */
export type MetricRecord = Record<string, IMetric>;

/**
 * Custom metric options for consumers to define while creating widgets.
 */
export interface MetricOptions {
  readonly annotation?: HorizontalAnnotation[];
  readonly period?: Duration;
  readonly color?: string;
  readonly region?: string;
  /**
   * @experimental If specified as true, then no widget it created for this metric.
   *
   * @default false
   */
  readonly excludeWidget?: boolean;
  /**
   * Specifies which metric inside given namespace.
   * ex. { region: "us-east-1", groupName: "someMetricGroup" }
   * @default no dimensions
   */
  readonly dimensions?: Record<string, string>;
  /**
   * @experimental Specifies how CloudWatch will aggregate given metric over given period.
   * @default SUM
   */
  readonly statistic?: MetricStatistic;
}

/**
 * Default metric period is recommended to be 1 minutes.
 */
export const DEFAULT_METRIC_PERIOD = Duration.minutes(1);

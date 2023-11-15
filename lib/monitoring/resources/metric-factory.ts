import { Duration } from 'aws-cdk-lib';
import {
    DimensionHash, DimensionsMap, MathExpression, Metric,
} from 'aws-cdk-lib/aws-cloudwatch';
import {
    MetricRecord,
    MetricStatistic,
    DEFAULT_METRIC_PERIOD,
    MetricType,
    MetricOptions,
} from '../common/metrics';

/**
 * Metric Factory defaults
 */
export interface MetricFactoryDefaults {
  /**
   * Namespace in which all the metrics needs to be clubbed.
   */
  readonly namespace: string;
  /**
   * Period defines the time range of a metric's granularity.
   */
  readonly period?: Duration;
}

/**
 * Metric Factory props.
 */
export interface MetricFactoryProps {
  /**
   * While creating a factory, consumer needs to specify the global level defaults
   * that needs to be used in case overrides are not specified.
   */
  readonly globalDefaults: MetricFactoryDefaults;
}

/**
 * Metric Factory to be used as a common mechanism for creating metric and  metricMath.
 */
export class MetricFactory {
  readonly globalDefaults: MetricFactoryDefaults;

  constructor(props: MetricFactoryProps) {
      this.globalDefaults = props.globalDefaults;
  }

  // Creates a metric with the parameters required for metric creation.
  createMetric(
      metricName: string,
      statistic: MetricStatistic,
      label?: string,
      dimensions?: DimensionHash,
      color?: string,
      namespace?: string,
      period?: Duration,
      region?:string,
  ): MetricType {
      return new Metric({
          statistic,
          metricName,
          label,
          color,
          dimensionsMap: dimensions ? MetricFactory.sanitize(dimensions) : undefined,
          namespace: namespace ?? this.globalDefaults.namespace,
          period: period ?? this.globalDefaults.period ?? DEFAULT_METRIC_PERIOD,
          region,
      });
  }

  // Creates a Math expression with the parameters required for metric math creation.
  createMetricMath(expression: string, usingMetrics: MetricRecord, label: string, color?: string, period?: Duration) {
      return new MathExpression({
          label,
          color,
          expression,
          usingMetrics,
          period: period ?? this.globalDefaults.period ?? DEFAULT_METRIC_PERIOD,
      });
  }

  // Takes in an existing metric and applies global overrides if specified else uses the default values.
  adaptMetric(metric: Metric): Metric {
      return metric.with({
          period: this.globalDefaults.period ?? DEFAULT_METRIC_PERIOD,
      });
  }

  // Takes in an existing metric and applies the metric options if provided.
  adaptMetricWithOptions(metric: Metric, metricOptions?: MetricOptions): Metric {
      return metric.with({
          period: metricOptions?.period ?? metric.period,
          color: metricOptions?.color ?? metric.color,
      });
  }

  // remove duplicates from the dimensions specified.
  static sanitize(dimensions: DimensionsMap) {
      const copy: DimensionsMap = {};

      Object.entries(dimensions)
          .filter(([_, value]) => value !== undefined)
          .forEach(([key, value]) => {
              copy[key] = value;
          });

      return copy;
  }
}

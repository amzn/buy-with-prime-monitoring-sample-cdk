import { IWidget } from 'aws-cdk-lib/aws-cloudwatch';

/**
 * Base interface to define a dashboard segment.
 * Segment being a building block of dashboard.
 */
export interface IDashboardSegment {

  /**
   * Returns all widgets.
   */
  buildWidgets(): IWidget[];
}

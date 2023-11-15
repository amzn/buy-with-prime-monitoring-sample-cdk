import { Dashboard, PeriodOverride } from 'aws-cdk-lib/aws-cloudwatch';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IDashboardSegment } from './i-dashboard-segment';

/**
 * Props to be specified while dashboard creation for monitoring purpose.
 */
export interface MonitoringDashboardsProps {
  /**
   * The dashboard name.
   */
  readonly dashboardName: string;
  /**
   * The start of the time range to use for each widget on the dashboard.
   */
  readonly dashboardDurationRange?: Duration;
  /**
   * Defines whether dashboard should follow the time ranges or inherit from metrics
   *
   * @default PeriodOverride.AUTO
   */
  readonly periodOverride?: PeriodOverride;
}
// Default dashboard duration range of 8 hours if not specified.
const DEFAULT_DASHBOARD_DURATION_RANGE = Duration.hours(8);

/**
 *  Monitoring Dashboard which creates a AWS CDK dashboard using:
 * [`Dashboard`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudwatch.Dashboard.html)
 *
 * Creates the required roles and gives access to add your dashboard into wiki pages if opted.
 *
 * Lets you add dashboard segment where each segment represents monitoring of a resource.
 *
 */
export class MonitoringDashboard extends Construct {
  readonly dashboard: Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringDashboardsProps) {
      super(scope, id);

      // Defining the start of dashboard to imply a time range across which the widgets would be rendered.
      const detailStart: string = `-${MonitoringDashboard.toIsoString(props.dashboardDurationRange ?? DEFAULT_DASHBOARD_DURATION_RANGE)}`;

      this.dashboard = new Dashboard(this, 'Dashboard', {
          dashboardName: props.dashboardName,
          start: detailStart,
          periodOverride: props.periodOverride,
      });
  }

  // adds all the widgets in the specified segment to the existing dashboard.
  addSegment(segment: IDashboardSegment) {
      this.dashboard.addWidgets(...segment.buildWidgets());
  }

  /**
   * @param duration
   */
  private static toIsoString(duration: Duration): string {
      return duration.toIsoString();
  }
}

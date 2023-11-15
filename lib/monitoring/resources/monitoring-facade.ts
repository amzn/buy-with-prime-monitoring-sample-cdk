import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IWidget, PeriodOverride } from 'aws-cdk-lib/aws-cloudwatch';
import {
    AlbFargateServiceMonitoring, AlbFargateServiceMonitoringProps,
} from './aws-fargate';


import { MetricFactory, MetricFactoryDefaults } from './metric-factory';
import {
    HeaderLevel,
    IDashboardSegment,
    MonitoringDashboard,
    SingleWidgetDashboardSegment,
    HeaderWidget,
} from '../dashboard';


export interface MonitoringFacadeProps {
  /**
   * The name of the dashboard that is to be configured.
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
  readonly dashboardPeriodOverride?: PeriodOverride;
  readonly metricDefaults: MetricFactoryDefaults;

}

/**
 * This is the main entry point for your monitoring stack.
 * Create this construct and then create a chain of calls (`.monitorXXX`) to define your monitoring.
 *
 * The facade uses building blocks called segments.
 * Each segment represents a related group of metrics to monitor.
 * You can also add custom segments to the dashboard.
 */
export class MonitoringFacade extends Construct {
  readonly segments : IDashboardSegment[];


  readonly dashboard: MonitoringDashboard;

  readonly currentScope: Construct;

  readonly globalMetricFactoryDefaults: MetricFactoryDefaults;



  constructor(scope: Construct, id: string, props: MonitoringFacadeProps) {
      super(scope, id);
      this.currentScope = scope;
      this.segments = [];

      this.globalMetricFactoryDefaults = props.metricDefaults;


      this.dashboard = new MonitoringDashboard(this, 'DashboardFacade', {
          dashboardName: props.dashboardName,
          dashboardDurationRange: props.dashboardDurationRange,
          periodOverride: props.dashboardPeriodOverride,
      });
  }

  // returns a new instance of metric factory with the global metric defaults specified.
  buildMetricFactory() {
      return new MetricFactory({
          globalDefaults: this.globalMetricFactoryDefaults,
      });
  }

  // lets consumers add individual dashboard segment to the dashboard.
  addSegment(segment: IDashboardSegment) {
      this.segments.push(segment);
      this.dashboard.addSegment(segment);
      return this;
  }

  // lets consumers add large header section to their dashboard.
  addLargeHeader(text: string) {
      this.addWidget(new HeaderWidget(text, HeaderLevel.LARGE));
      return this;
  }

  // lets consumers add medium header section to their dashboard.
  addMediumHeader(text: string) {
      this.addWidget(new HeaderWidget(text, HeaderLevel.MEDIUM));
      return this;
  }

  // lets consumers add small header section to their dashboard.
  addSmallHeader(text: string) {
      this.addWidget(new HeaderWidget(text, HeaderLevel.SMALL));
      return this;
  }

  // lets consumers add a custom widget to the dashboard.
  addWidget(widget: IWidget) {
      this.addSegment(new SingleWidgetDashboardSegment(widget));
      return this;
  }

  // lets consumers add a list of custom widgets to the dashboard.
  addWidgets(widgets: IWidget[]) {
      widgets.forEach((widget) => {
          this.addWidget(widget);
      });
      return this;
  }

  // lets consumers monitor the specified Alb fargate service in their dashboard.
  monitorAlbFargateService(props: AlbFargateServiceMonitoringProps) {
      const segment = new AlbFargateServiceMonitoring(this, props);
      this.addSegment(segment);
    //   this.alarms.push(...segment.alarms);
      return this;
  }
}

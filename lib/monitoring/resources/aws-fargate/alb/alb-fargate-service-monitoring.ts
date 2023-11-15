import { GraphWidget, HorizontalAnnotation, IWidget } from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import {
    Monitoring,
    Metric,
    DEFAULT_GRAPH_WIDGET_HEIGHT,
    HALF_WIDTH,
    PERCENTAGE_AXIS,
    QUARTER_WIDTH,

} from '../../../common';
import { AlbFargateServiceMetricFactory, AlbFargateServiceMetricFactoryProps } from './alb-fargate-service-metric-factory';
import { MonitoringFacade } from '../../monitoring-facade';

import { LinkHeaderWidget } from '../../../dashboard/widgets';


const ALB_FARGATE_ALARM_DEFAULT_THRESHOLDS = {
    CPU_UTILIZATION_PERCENT: 80,
    MEMORY_UTILIZATION_PERCENT: 80,
    TARGET_HTTP_4XX_ERROR_COUNT: 100,
    TARGET_HTTP_5XX_ERROR_COUNT: 0,
    LOAD_BALANCER_HTTP_4XX_ERROR_COUNT: 100,
    LOAD_BALANCER_HTTP_5XX_ERROR_COUNT: 0,
};

export interface AlbFargateServiceMonitoringProps extends AlbFargateServiceMetricFactoryProps {
  // /**
  //  * Alarm options for monitoring cpu utilization.
  //  */
  // readonly cpuUtilizationAlarm?: AlarmProps;
  // /**
  //  * Alarm options for monitoring memory utilization.
  //  */
  // readonly memoryUtilizationAlarm?: AlarmProps;
  // /**
  //  * Alarm options for monitoring Target HTTP 4xx error counts.
  //  */
  // readonly http4xxErrorCountAlarm?: AlarmProps;
  // /**
  //  * Alarm options for monitoring Target HTTP 5xx error counts.
  //  */
  // readonly http5xxErrorCountAlarm?: AlarmProps;
  // /**
  //  * Alarm options for monitoring Load Balancer HTTP 4xx error counts. This is not inclusive of Target 4xx error counts.
  //  */
  // readonly httpLoadBalancer4xxErrorCountAlarm?: AlarmProps;
  // /**
  //  * Alarm options for monitoring Target HTTP 5xx error counts. This is not inclusive of Target 5xx error counts.
  //  */
  // readonly httpLoadBalancer5xxErrorCountAlarm?: AlarmProps;
}

/**
 * ## ALB based Fargate Service monitoring that provides the widgets and alarms for monitoring the service.
 * Default metric widgets:
 * cpuUtilizationMetric => CPU Utilization
 * memoryUtilizationMetric => Memory utilization
 * healthyHostsMetric => # of healthy hosts
 * unhealthyHostsMetric => # of unhealthy hosts
 * runningTasksMetric => # of running tasks
 * requestsMetric => Total # of requests from target
 * httpRequestsMetric => http2xx, http3xx, http4xx, http5xx from target
 * http4xxRequestErrorsMetric => Total # of http4xx requests from target
 * http5xxRequestErrorsMetric => Total # of http5xx requests from target
 * httpLoadBalancer4xxRequestErrorsMetric => Total # of http4xx requests from load balancer
 * httpLoadBalancer5xxRequestErrorsMetric => Total # of http5xx requests from load balancer
 *
 *
 * Reference: https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationTargetGroup.html
 */
export class AlbFargateServiceMonitoring {


  private readonly currentScope: Construct;

  private readonly title: string;

  private readonly cpuUsageAnnotations: HorizontalAnnotation[];

  private readonly memoryUsageAnnotations: HorizontalAnnotation[];

  private readonly http4xxErrorsAnnotations: HorizontalAnnotation[];

  private readonly http5xxErrorsAnnotations: HorizontalAnnotation[];

  private readonly loadBalancerHttp4xxAnnotations: HorizontalAnnotation[];

  private readonly loadBalancerHttp5xxAnnotations: HorizontalAnnotation[];

  private readonly requestsCountAnnotations: HorizontalAnnotation[];

  private readonly healthyHostsCountMetric: Metric;

  private readonly unhealthyHostsCountMetric: Metric;

  private readonly runningTaskCountMetric: Metric;

  private readonly fargateCpuUtilizationMetric: Metric;

  private readonly fargateMemoryUtilizationMetric: Metric;

  private readonly fargateRequestsCountMetric: Metric;

  private readonly fargateTargetHttp2xxMetric: Metric;

  private readonly fargateTargetHttp3xxMetric: Metric;

  private readonly fargateTargetHttp4xxMetric: Metric;

  private readonly fargateTargetHttp5xxMetric: Metric;

  private readonly fargateLoadBalancerHttp4xxMetric: Metric;

  private readonly fargateLoadBalancerHttp5xxMetric: Metric;


  constructor(facade: MonitoringFacade, props: AlbFargateServiceMonitoringProps) {
      // super(facade);
      this.title = props.title;

      const metricFactory = new AlbFargateServiceMetricFactory(facade.buildMetricFactory(), props);
      this.healthyHostsCountMetric = metricFactory.metricHealthyHostsCount();
      this.unhealthyHostsCountMetric = metricFactory.metricUnhealthyHostsCount();
      this.runningTaskCountMetric = metricFactory.metricRunningTaskCount();
      this.fargateCpuUtilizationMetric = metricFactory.metricClusterCpuUtilizationInPercent();
      this.fargateMemoryUtilizationMetric = metricFactory.metricClusterMemoryUtilizationInPercent();
      this.fargateRequestsCountMetric = metricFactory.metricRequestCount();
      this.fargateTargetHttp2xxMetric = metricFactory.metricTargetHttp2xxCount();
      this.fargateTargetHttp3xxMetric = metricFactory.metricTargetHttp3xxCount();
      this.fargateTargetHttp4xxMetric = metricFactory.metricTargetHttp4xxCount();
      this.fargateTargetHttp5xxMetric = metricFactory.metricTargetHttp5xxCount();
      this.fargateLoadBalancerHttp4xxMetric = metricFactory.metricLBHttp4xxCount();
      this.fargateLoadBalancerHttp5xxMetric = metricFactory.metricLBHttp5xxCount();

      this.cpuUsageAnnotations = props.cpuUtilizationPercentMetricOptions?.annotation ? props.cpuUtilizationPercentMetricOptions.annotation : [];
      this.memoryUsageAnnotations = props.memoryUtilizationPercentMetricOptions?.annotation ? props.memoryUtilizationPercentMetricOptions.annotation : [];
      this.http4xxErrorsAnnotations = props.requests4xxErrorsMetricOptions?.annotation ? props.requests4xxErrorsMetricOptions.annotation : [];
      this.http5xxErrorsAnnotations = props.requests5xxErrorsMetricOptions?.annotation ? props.requests5xxErrorsMetricOptions.annotation : [];
      this.loadBalancerHttp4xxAnnotations = props.requestsLoadBalancer4xxErrorsMetricOptions?.annotation ? props.requestsLoadBalancer4xxErrorsMetricOptions.annotation : [];
      this.loadBalancerHttp5xxAnnotations = props.requestsLoadBalancer5xxErrorsMetricOptions?.annotation ? props.requestsLoadBalancer5xxErrorsMetricOptions.annotation : [];
      this.requestsCountAnnotations = props.requestsMetricOptions?.annotation ? props.requestsMetricOptions.annotation : [];

      this.currentScope = facade.currentScope;


      const fargateService = metricFactory.provideFargateServiceCore();

  }

  buildWidgets(): IWidget[] {
      return [
          // Title
          new LinkHeaderWidget({
              title: this.title,
          }),
          // CPU
          new GraphWidget({
              width: QUARTER_WIDTH,
              height: DEFAULT_GRAPH_WIDGET_HEIGHT,
              title: 'CPU Utilization',
              left: [this.fargateCpuUtilizationMetric],
              leftYAxis: PERCENTAGE_AXIS,
              leftAnnotations: this.cpuUsageAnnotations,
          }),
          // memory
          new GraphWidget({
              width: QUARTER_WIDTH,
              height: DEFAULT_GRAPH_WIDGET_HEIGHT,
              title: 'Memory Utilization',
              left: [this.fargateMemoryUtilizationMetric],
              leftYAxis: PERCENTAGE_AXIS,
              leftAnnotations: this.memoryUsageAnnotations,
          }),
          // task health
          new GraphWidget({
              width: QUARTER_WIDTH,
              height: DEFAULT_GRAPH_WIDGET_HEIGHT,
              title: 'Task & Host Health',
              left: [this.runningTaskCountMetric, this.healthyHostsCountMetric, this.unhealthyHostsCountMetric],
          }),
          // Requests count
          new GraphWidget({
              title: 'Requests (Count)',
              width: QUARTER_WIDTH,
              height: DEFAULT_GRAPH_WIDGET_HEIGHT,
              left: [this.fargateRequestsCountMetric],
              leftAnnotations: this.requestsCountAnnotations,
          }),
          // Target Requests Overview
          new GraphWidget({
              title: 'Target HTTP Requests Overview',
              width: HALF_WIDTH,
              height: DEFAULT_GRAPH_WIDGET_HEIGHT,
              left: [this.fargateTargetHttp2xxMetric, this.fargateTargetHttp3xxMetric, this.fargateTargetHttp4xxMetric, this.fargateTargetHttp5xxMetric],
          }),
          // Target Requests 4xx Errors
          new GraphWidget({
              title: 'Target HTTP Requests 4xx Errors',
              width: HALF_WIDTH,
              height: DEFAULT_GRAPH_WIDGET_HEIGHT,
              left: [this.fargateTargetHttp4xxMetric],
              leftAnnotations: this.http4xxErrorsAnnotations,
          }),
          // Target Requests 5xx Errors
          new GraphWidget({
              title: 'Target HTTP Requests 5xx Errors',
              width: HALF_WIDTH,
              height: DEFAULT_GRAPH_WIDGET_HEIGHT,
              left: [this.fargateTargetHttp5xxMetric],
              leftAnnotations: this.http5xxErrorsAnnotations,
          }),
          // Load Balancer Requests 4xx Errors
          new GraphWidget({
              title: 'Load Balancer HTTP Requests 4xx Errors',
              width: HALF_WIDTH,
              height: DEFAULT_GRAPH_WIDGET_HEIGHT,
              left: [this.fargateLoadBalancerHttp4xxMetric],
              leftAnnotations: this.loadBalancerHttp4xxAnnotations,
          }),
          // Load Balancer Requests 5xx Errors
          new GraphWidget({
              title: 'Load Balancer HTTP Requests 5xx Errors',
              width: HALF_WIDTH,
              height: DEFAULT_GRAPH_WIDGET_HEIGHT,
              left: [this.fargateLoadBalancerHttp5xxMetric],
              leftAnnotations: this.loadBalancerHttp5xxAnnotations,
          }),
      ];
  }
}

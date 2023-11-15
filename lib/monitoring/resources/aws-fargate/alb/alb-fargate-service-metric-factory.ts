import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import {
    ApplicationLoadBalancer, ApplicationTargetGroup, HttpCodeElb, HttpCodeTarget,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { HealthyMetricColor, UnhealthyMetricColor } from '../../../common/colors';
import {
    DEFAULT_METRIC_PERIOD,
    Metric,
    MetricOptions,
    MetricStatistic,
} from '../../../common/metrics';
import { MetricFactory } from '../../metric-factory'; // done
import { ResourceMetricProps } from '../../resource-metric'; //done 
import { FargateServiceMetricFactory } from '../fargate-service-metric-factory'; // done
import { AlbFargateService } from '../../../../ecs/alb-fargate-service'; // done

const SERVICE_REQUIRED_ERROR = 'ALB ECS Monitoring props must specify exactly one of fargateService or AlbFargateService';

/**
 * Application Load Balanced Fargate Service Metric Factory Props.
 * Defines the metrics for the resource against which monitoring can be done.
 */
export interface AlbFargateServiceMetricFactoryProps extends ResourceMetricProps {
  /**
   * ALB fronted fargate service instance.
   * Required if AlbFargateService is not passed
   */
  readonly fargateService?: ApplicationLoadBalancedFargateService;

  /**
   *  ALB ECS instance.
   * Required if fargateService is not passed
   */
  readonly AlbFargateService?: AlbFargateService;

  /**
   * Metric options for the Cpu Maximum utilization
   *
   *  Refer: https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ecs.FargateService.html#metricwbrcpuwbrutilizationprops
   */
  readonly cpuUtilizationPercentMetricOptions?: MetricOptions;

  /**
   * Metric options for the Memory Maximum utilization.
   *
   * Refer : https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ecs.FargateService.html#metricwbrmemorywbrutilizationprops
   */
  readonly memoryUtilizationPercentMetricOptions?: MetricOptions;
  /** 
   * Metric options for the Number of Requests.
   *
   * Refer: https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationTargetGroup.html#metricwbrrequestwbrcountprops
   */
  readonly requestsMetricOptions?: MetricOptions;
  /**
   * Metric options for the HTTP 4xx errors in Requests.
   */
  readonly requests4xxErrorsMetricOptions?: MetricOptions;
  /**
   * Metric options for the HTTP 5xx errors in Requests.
   */
  readonly requests5xxErrorsMetricOptions?: MetricOptions;
  /**
   * Metric options for the HTTP 4xx errors in Load Balancer Requests.
   */
  readonly requestsLoadBalancer4xxErrorsMetricOptions?: MetricOptions;
  /**
   * Metric options for the HTTP 5xx errors in Load Balancer Requests.
   */
  readonly requestsLoadBalancer5xxErrorsMetricOptions?: MetricOptions;

  /**
   * The metric statistic for the running tasks on which metric has to be formed.
   */
  readonly runningTasksMetricStatistic ?: MetricStatistic;
}
/**
 * Metric Factory to return the metrics specific to Application Load Balanced Fargate Service.
 */
export class AlbFargateServiceMetricFactory extends FargateServiceMetricFactory {
  private readonly albProps: AlbFargateServiceMetricFactoryProps;

  private readonly alb: ApplicationLoadBalancer;

  private readonly albTargetGroup: ApplicationTargetGroup;

  constructor(metricFactory: MetricFactory, props: AlbFargateServiceMetricFactoryProps) {
      // Pick fargate service instance to monitor
      if (props.fargateService && props.AlbFargateService) {
          throw new Error(SERVICE_REQUIRED_ERROR);
      } else if (!props.fargateService && !props.AlbFargateService) {
          throw new Error(SERVICE_REQUIRED_ERROR);
      }
      super(metricFactory, {
          title: props.title,
          fargateServiceCore: props.AlbFargateService
              ? props.AlbFargateService.service : props.fargateService!.service,
          cpuUtilizationPercentMetricOptions: props.cpuUtilizationPercentMetricOptions,
          memoryUtilizationPercentMetricOptions: props.memoryUtilizationPercentMetricOptions,
          runningTasksMetricStatistic: props.runningTasksMetricStatistic,
      });
      this.albProps = props;
      this.alb = props.AlbFargateService
          ? props.AlbFargateService.loadBalancer.loadBalancer : props.fargateService!.loadBalancer;
      this.albTargetGroup = props.AlbFargateService
          ? props.AlbFargateService.loadBalancer.targetGroup : props.fargateService!.targetGroup;
  }

  metricHealthyHostsCount(): Metric {
      return this.metricFactory.adaptMetric(
          this.albTargetGroup.metrics.healthyHostCount({
              dimensionsMap: {
                  TargetGroup: this.albTargetGroup.targetGroupFullName,
                  LoadBalancer: this.alb.loadBalancerFullName,
              },
              label: 'Healthy Hosts',
              color: HealthyMetricColor,
          }),
      );
  }

  metricUnhealthyHostsCount(): Metric {
      return this.metricFactory.adaptMetric(
          this.albTargetGroup.metrics.unhealthyHostCount({
              dimensionsMap: {
                  TargetGroup: this.albTargetGroup.targetGroupFullName,
                  LoadBalancer: this.alb.loadBalancerFullName,
              },
              label: 'Unhealthy Hosts',
              color: UnhealthyMetricColor,
          }),
      );
  }

  metricRequestCount(): Metric {
      return this.albTargetGroup.metrics.requestCount({
          label: 'Requests (Count)',
          period: this.albProps.requestsMetricOptions?.period ?? DEFAULT_METRIC_PERIOD,
      });
  }

  /**
   * Count of 2XX HTTP status originating from the targets
   */
  metricTargetHttp2xxCount(): Metric {
      return this.metricFactory.adaptMetric(
          this.albTargetGroup.metrics.httpCodeTarget(HttpCodeTarget.TARGET_2XX_COUNT, {
              label: 'Target HTTP 2xx Requests (Count)',
          }),
      );
  }

  /**
   * Count of 3XX HTTP status originating from the targets
   */
  metricTargetHttp3xxCount(): Metric {
      return this.metricFactory.adaptMetric(
          this.albTargetGroup.metrics.httpCodeTarget(HttpCodeTarget.TARGET_3XX_COUNT, {
              label: 'Target HTTP 3xx Requests (Count)',
          }),
      );
  }

  /**
   * Count of 4XX HTTP status originating from the targets
   */
  metricTargetHttp4xxCount(): Metric {
      return this.albTargetGroup.metrics.httpCodeTarget(HttpCodeTarget.TARGET_4XX_COUNT, {
          label: 'Target HTTP 4xx Requests (Count)',
          period: this.albProps.requests4xxErrorsMetricOptions?.period ?? DEFAULT_METRIC_PERIOD,
      });
  }

  /**
   * Count of 5XX HTTP status originating from the targets
   */
  metricTargetHttp5xxCount(): Metric {
      return this.albTargetGroup.metrics.httpCodeTarget(HttpCodeTarget.TARGET_5XX_COUNT, {
          label: 'Target HTTP 5xx Requests (Count)',
          period: this.albProps.requests5xxErrorsMetricOptions?.period ?? DEFAULT_METRIC_PERIOD,
      });
  }

  /**
   * Count of 5XX HTTP status originating from the load balancer
   */
  metricLBHttp5xxCount(): Metric {
      return this.alb.metrics.httpCodeElb(HttpCodeElb.ELB_5XX_COUNT, {
          label: 'Load Balancer HTTP 5xx Requests (Count)',
          period: this.albProps.requests5xxErrorsMetricOptions?.period ?? DEFAULT_METRIC_PERIOD,
      });
  }

  /**
   * Count of 4XX HTTP status originating from the load balancer
   */
  metricLBHttp4xxCount(): Metric {
      return this.alb.metrics.httpCodeElb(HttpCodeElb.ELB_4XX_COUNT, {
          label: 'Load Balancer HTTP 4xx Requests (Count)',
          period: this.albProps.requests5xxErrorsMetricOptions?.period ?? DEFAULT_METRIC_PERIOD,
      });
  }

  metricAvailability(): Metric {
    return this.alb.metrics.custom('Availability', )
  }
}

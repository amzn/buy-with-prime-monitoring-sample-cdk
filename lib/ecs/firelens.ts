import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { FirelensLogRouter } from 'aws-cdk-lib/aws-ecs/lib/firelens-log-router';
import { SidecarProps } from './sidecar';

export interface FireLensSidecarProps extends SidecarProps {
    readonly appContainerDefinition: ecs.ContainerDefinition,
    readonly appLogGroupName?: string;
    readonly emfLogGroupName?: string;

}
export class FireLensSidecar extends Construct {
    readonly appLogGroup: logs.LogGroup; // Log group used for emitting application logs. Can be used to attach metrics filters if necessary.
    readonly emfLogGroup: logs.LogGroup; // Log group used for EMF logs. Can be used to create Contributor Insight rules.
    readonly fireLensLogGroup: logs.LogGroup; // Log group used for FireLens logs. Can be used to attach metrics filters if necessary.
    private readonly firelens: FirelensLogRouter;

    constructor(taskDefinition: ecs.TaskDefinition, id: string, props: FireLensSidecarProps) {
        super(taskDefinition, id);

        this.appLogGroup = new logs.LogGroup(this, 'AppLogGroup', {
            retention: logs.RetentionDays.ONE_MONTH, // Set the retention period based on your logging policy. 
            logGroupName: props.appLogGroupName,
        });

        this.emfLogGroup = new logs.LogGroup(this, 'EmfLogGroup', {
            retention: logs.RetentionDays.ONE_MONTH, // Set the retention period based on your logging policy. 
            logGroupName: props.emfLogGroupName,
        });

        this.fireLensLogGroup = new logs.LogGroup(this, 'FireLensLogGroup', {
            retention: logs.RetentionDays.ONE_MONTH, // Set the retention period based on your logging policy. 
        });


        this.firelens = taskDefinition.addFirelensLogRouter('FirelensLogRouter', {
            image: ecs.ContainerImage.fromRegistry('public.ecr.aws/aws-observability/aws-for-fluent-bit:stable'), 
            cpu: props.cpu,
            memoryLimitMiB: props.memoryLimitMiB,
            memoryReservationMiB: props.memoryReservationMiB,
            environment: {
                // It's very important that APP_NAME matches the container name. In FluentBit configuration in FireLens image build package
                // there is a rule to match on container name and a misconfiguration here would cause logs to not be sent to CW
                APP_NAME: props.appContainerDefinition.containerName,
                LOG_REGION: taskDefinition.env.region,
                APPLICATION_LOG_GROUP: this.appLogGroup.logGroupName,
                EMF_LOG_GROUP: this.emfLogGroup.logGroupName,
            },
            firelensConfig: {
                type: ecs.FirelensLogRouterType.FLUENTBIT,
                options: {
                    enableECSLogMetadata: false,
                },
            },
            healthCheck: {
                command: ['CMD-SHELL', 'echo \'{"health": "check"}\' | nc 127.0.0.1 8877 || exit 1'],
            },
            logging: ecs.LogDriver.awsLogs({
                logGroup: this.fireLensLogGroup,
                streamPrefix: props.appContainerDefinition.containerName,
            }),
        });

        // Ensure the log groups are created before deploying the firelens container since auto creation is turned off in fluentbit.conf
        this.firelens.node.addDependency(this.appLogGroup);
        this.firelens.node.addDependency(this.emfLogGroup);

        // We need to ensure FireLens is ready to accept logs before we start our app container to eliminate log loss on startup.
        props.appContainerDefinition.addContainerDependencies({
            container: this.firelens,
            // The health check defined above will have to succeed before app container is allowed to start
            condition: ecs.ContainerDependencyCondition.HEALTHY,
        });

        new logs.MetricFilter(this, 'FirelensFailedAssertionMetricFilter', {
            // Alarm when a FluentBit expect filter fails. This usually indicates that the FluentBit pipeline is not
            // configured correctly (https://docs.fluentbit.io/manual/pipeline/filters/expect)
            // [2021/02/16 03:29:20] [ warn] [filter:expect:expect.1] expect check failed
            filterPattern: logs.FilterPattern.allTerms('[ warn] [filter:expect:', 'expect check failed'),
            logGroup: this.fireLensLogGroup,
            metricName: 'FireLens.FailedAssertion',
            metricNamespace: props.appContainerDefinition.containerName,
            metricValue: '1',
            // This metric should be a very rare occurence so emit zero metrics to prevent CW from dropping this metric
            defaultValue: 0,
        });

        new logs.MetricFilter(this, 'FirelensRetryCountMetricFilter', {
            // [2021/02/14 20:58:39] [ warn] [engine] failed to flush chunk '1-1613336309.691052951.flb', retry in 26 seconds: task_id=6, input=GeniePacService-buffering > output=cloudwatch_logs.0
            filterPattern: logs.FilterPattern.allTerms('[ warn] [engine] failed to flush chunk', 'retry in'),
            logGroup: this.fireLensLogGroup,
            metricName: 'FireLens.RetryCount',
            metricNamespace: props.appContainerDefinition.containerName,
            metricValue: '1',
            // This metric should be a very rare occurence so emit zero metrics to prevent CW from dropping this metric
            defaultValue: 0,
        });

        new logs.MetricFilter(this, 'FirelensRetriesExhaustedMetricFilter', {
            // When FluentBit gives up retrying that log event is lost; service owner needs to know about this
            // [2021/02/20 03:40:55] [ warn] [engine] chunk '1-1613792446.903338547.flb' cannot be retried: task_id=0, input=GeniePacService-stdout-buffering > output=cloudwatch_logs.0
            filterPattern: logs.FilterPattern.allTerms('[ warn] [engine] chunk', 'cannot be retried'),
            logGroup: this.fireLensLogGroup,
            metricName: 'FireLens.RetriesExhausted',
            metricNamespace: props.appContainerDefinition.containerName,
            metricValue: '1',
            // This metric should be a very rare occurence so emit zero metrics to prevent CW from dropping this metric
            defaultValue: 0,
        });

        new logs.MetricFilter(this, 'FirelensMissingEmfMetricsMetricFilter', {
            // Application logs should not contain emf logs; when they do the FluentBit config is incorrect
            filterPattern: logs.FilterPattern.allTerms('_aws', 'CloudWatchMetrics'),
            logGroup: this.appLogGroup,
            metricName: 'FireLens.MissingEmfMetric',
            metricNamespace: props.appContainerDefinition.containerName,
            metricValue: '1',
            // This metric should be a very rare occurence so emit zero metrics to prevent CW from dropping this metric
            defaultValue: 0,
        });
    }

    /**
     * Add additional LogGroup
     * @param id Id of LogGroup
     * @param environmentVariable EnvironmentVariable used as log_group_name in Fluentbit config
     * @param logGroupName User friendly name for the log group instead of the CFN generated one
     * @return LogGroup
     */
    public addLogGroup(id: string, environmentVariable: string, logGroupName?: string): logs.LogGroup {
        const logGroup = new logs.LogGroup(this, id, {
            retention: logs.RetentionDays.ONE_MONTH, // Set the retention period based on your logging policy. 
            logGroupName,
        });
        this.firelens.node.addDependency(logGroup);
        this.firelens.addEnvironment(environmentVariable, logGroup.logGroupName);
        return logGroup;
    }
}

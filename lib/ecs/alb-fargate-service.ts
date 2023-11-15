import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { FargateService } from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Duration } from 'aws-cdk-lib';
import { ApplicationLoadBalancer } from './alb';

const DEFAULT_TASK_COUNT = 1;
const DEFAULT_PLATFORM_VERSION = ecs.FargatePlatformVersion.LATEST;
const DEFAULT_MIN_HEALTHY_PERCENT = 100;
const DEFAULT_MAX_HEALTHY_PERCENT = 200;
const DEFAULT_HEALTH_CHECK_GRACE_PERIOD = Duration.seconds(60);
const DEFAULT_CIRCUIT_BREAKER = {
    rollback: true,
};
const DEFAULT_CONTAINER_PORT = 8080;
/*
 * Creates Fargate Service fronted by Application Load Balancer
 *                 +-------------+            +-------------+
 *         HTTPS   |             |  HTTP      |             |
 *         443     |     ALB     |  8080      |     Test    |
 * Client--------->|             |----------->|    Service  |
 *                 |             |            |             |
 *                 +-------------+            +-------------+
 */
export interface AlbFargateServiceProps {
    readonly ecsCluster: ecs.ICluster;
    readonly loadBalancer: ApplicationLoadBalancer;
    readonly taskDefinition: ecs.FargateTaskDefinition;
    readonly platformVersion?: ecs.FargatePlatformVersion;
    readonly desiredCount?: number;
    readonly minHealthyPercent?: number;
    readonly maxHealthyPercent?: number;
    readonly healthCheckGracePeriod?: Duration; 
    readonly serviceName?: string;
}

export class AlbFargateService extends Construct {
    public readonly service: FargateService;
    public readonly ecsCluster: ecs.ICluster;
    public readonly loadBalancer: ApplicationLoadBalancer;
    public readonly serviceSecurityGroup: SecurityGroup;

    constructor(scope: Construct, id: string, props: AlbFargateServiceProps) {
        super(scope, id);

        this.serviceSecurityGroup = new SecurityGroup(this, 'ServiceSecurityGroup', {
            vpc: props.ecsCluster.vpc,
            allowAllOutbound: true,
        });

        this.ecsCluster = props.ecsCluster;
        this.loadBalancer = props.loadBalancer;
        this.service = new FargateService(this, 'FargateService', {
            cluster: this.ecsCluster,
            taskDefinition: props.taskDefinition,
            desiredCount: props.desiredCount || DEFAULT_TASK_COUNT,
            platformVersion: props.platformVersion || DEFAULT_PLATFORM_VERSION,
            minHealthyPercent: props.minHealthyPercent || DEFAULT_MIN_HEALTHY_PERCENT,
            maxHealthyPercent: props.maxHealthyPercent || DEFAULT_MAX_HEALTHY_PERCENT,
            healthCheckGracePeriod: props.healthCheckGracePeriod || DEFAULT_HEALTH_CHECK_GRACE_PERIOD,
            circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
            securityGroups: [this.serviceSecurityGroup],
            ...(props.serviceName && { serviceName: props.serviceName }),
        });


        const containerPort = props.taskDefinition.defaultContainer?.containerPort ?? DEFAULT_CONTAINER_PORT;

        this.serviceSecurityGroup.addIngressRule(
            this.loadBalancer.securityGroup,
            ec2.Port.tcp(containerPort),
            `Allow the inbound traffic on port ${containerPort}`,
        );

        this.loadBalancer.targetGroup.addTarget(this.service);
    }
}

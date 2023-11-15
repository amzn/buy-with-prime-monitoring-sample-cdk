import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import {
    ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { AccessLogsBucket } from '../s3/bucket';

const DEFAULT_LISTENER_PORT = 80; // For demo purpose, this CDK does not contain SSL configuration. Port 443 is recommended. 
const DEFAULT_TARGET_GROUP_PORT = 8080;
const SECURE_PROTOCOL = ApplicationProtocol.HTTP; // Demo purpose. Secure protocol must be HTTPS. 

export interface ApplicationLoadBalancerProps {
    /**
     * The VPC where the container instances will be launched or the elastic network interfaces (ENIs) will be deployed.
     */
    readonly vpc: ec2.IVpc;

    /**
     * Listener port of the application load balancer that will serve traffic to the service.
     *
     * @default - 80
     */
    readonly listenerPort?: number;

    /**
     * The port on the target group
     *
     * @default - 8080 
     */
    readonly targetGroupPort?: number;
    /**
     * The name for the S3 bucket containing ALB Access logs
     */
    readonly accessLogsS3BucketName?: string;

    /**
     * The load balancer idle timeout, in seconds.
     *
     * As an attempt to reduce the amount of 502 and 504, have the ALB timeout a bit larger than the Target
     *
     * @default 60
     */
    readonly idleTimeout?: Duration;
}

export class ApplicationLoadBalancer extends Construct {
    public readonly targetGroup: ApplicationTargetGroup;

    public readonly securityGroup: SecurityGroup;

    public readonly loadBalancer: ApplicationLoadBalancer;

    /**
     * S3 bucket that ALB access logs will be written to.
     */
    public readonly accessLogsBucket: Bucket;

    constructor(scope: Construct, id: string, props: ApplicationLoadBalancerProps) {
        super(scope, id);

        this.securityGroup = new SecurityGroup(this, 'ALBSecurityGroup', {
            vpc: props.vpc,
            allowAllOutbound: false,
        });

        this.loadBalancer = new ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
            vpc: props.vpc,
            vpcSubnets: {
                subnets: props.vpc.publicSubnets,
            },
            securityGroup: this.securityGroup,
            internetFacing: true,
            deletionProtection: false,  // Disabled for developers to easily destroy the sample resources. It is recommened to enable for production load balancer.
            idleTimeout: props.idleTimeout,
        });

        this.loadBalancer.setAttribute('routing.http.drop_invalid_header_fields.enabled', 'true');
        /*
         * When you enable access logs, you must specify an S3 bucket for the access logs. 
         * Amazon S3-Managed Encryption Keys (SSE-S3) is required. No other encryption options are supported.
         * Additional requirement details can be found in
         * https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-access-logs.html
        */
        this.accessLogsBucket = new AccessLogsBucket(this, 'alb-access-logs', {
            bucketName: props.accessLogsS3BucketName,
            encryption: BucketEncryption.S3_MANAGED,
        });

        this.loadBalancer.logAccessLogs(this.accessLogsBucket, 'alb-fargate-access-logs');

        const listener = this.loadBalancer.addListener('PublicListener', {
            protocol: SECURE_PROTOCOL,
            port: props.listenerPort ?? DEFAULT_LISTENER_PORT,
            open: true,
        });

        this.targetGroup = listener.addTargets('ECS', {
            protocol: ApplicationProtocol.HTTP,
            port: props.targetGroupPort ?? DEFAULT_TARGET_GROUP_PORT,
        });

        this.targetGroup.configureHealthCheck({
            port: '8080',
            protocol: elbv2.Protocol.HTTP,
        });
    }
}

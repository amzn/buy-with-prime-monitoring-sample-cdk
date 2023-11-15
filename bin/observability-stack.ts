import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { FireLensSidecar } from '../lib/ecs/firelens';
import { ApplicationLoadBalancer } from '../lib/ecs/alb';
import { AlbFargateService } from '../lib/ecs/alb-fargate-service';
import { AlbFargateServiceMetricFactoryProps } from '../lib/monitoring/resources/aws-fargate/alb/alb-fargate-service-metric-factory'
import { LogQueryDefinitions } from '../lib/monitoring/log/query-definitions'
import { MonitoringFacade } from '../lib/monitoring';
import { ContributorInsight } from '../lib/monitoring/log/contributor-insight'

export interface observabilityProps extends cdk.StackProps {
    taskDefinition: ecs.FargateTaskDefinition,
    Fargate: AlbFargateService
}
export class ObservabilitySampleStack extends cdk.Stack {
    

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);


        // 1. VPC 
        const vpc = new ec2.Vpc(this, 'ServiceVpc', {
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
            maxAzs: 3
        });

        // 2. ALB 
        const lb = new ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
            vpc: vpc,
            listenerPort: 80,
            targetGroupPort: 8080,
        })
            
        // 3. Create ECS cluster 
        const ecsCluster = new ecs.Cluster(this, 'Cluster', { 
            vpc: vpc,
            containerInsights: true
        });
        ecsCluster.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)


        // 4. Create Fargate Task definition 
        const taskDefinition = new ecs.TaskDefinition(this, 'TaskDef', {
            compatibility: ecs.Compatibility.FARGATE,
            memoryMiB: '2048',
            cpu: '1024',
            runtimePlatform: {
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX 
            }
        })

        const app = taskDefinition.addContainer('App', {
            image: ecs.ContainerImage.fromRegistry('public.ecr.aws/aws-containers/proton-demo-image:2d7f777'), 
            essential: true,
            cpu: 512,
            memoryLimitMiB: 1024,
            logging: ecs.LogDrivers.firelens({}),
            healthCheck: {
                command: ['CMD-SHELL', 'echo \'{"health": "check"}\' | nc 127.0.0.1 8877 || exit 1'],
            },
            portMappings: [{
                containerPort: 8080,
                hostPort: 8080,
                protocol: ecs.Protocol.TCP
            }]
        })


        const firelensSidecar = new FireLensSidecar(taskDefinition, 'FirelensSidecar', {
            appContainerDefinition: app,
            cpu: 256,
            memoryLimitMiB: 512
        })

        // 5. Create ECS service 
        const Fargate = new AlbFargateService(this, 'FargateService', {
            ecsCluster: ecsCluster,
            loadBalancer: lb,
            taskDefinition: taskDefinition,
        })

        // 6. Metrics monitoring - default dashboard and metrics
        const monitoringProp: AlbFargateServiceMetricFactoryProps = {
            AlbFargateService: Fargate,
            title: 'reInvent2023SampleDashboard'
        };

        const monitoringFacade = new MonitoringFacade(this, 'DashboardMonitoring', {
            dashboardName: 'reInvent2023',
            metricDefaults: {
                namespace: 'bwp301'
            }
        })
        monitoringFacade.monitorAlbFargateService(monitoringProp)

        // 7. Log based monitoring - Log Insight and Contributor Insight
        const logInsight = new LogQueryDefinitions (this, 'LogInsightQuery', {
            applicationLogGroupName: firelensSidecar.appLogGroup.logGroupName,
        })

        const contributorInsight = new ContributorInsight (this, 'ContributorInsight', {
            firelensSidercar: firelensSidecar,
            env: {
                account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT, 
                region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION 
              }
        })
    }
}

import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import { Dashboarder } from './dashboarder';

export class HelloCdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'NewVpc', {
      maxAzs: 3,
      natGateways: 1
    });

    const cluster = new ecs.Cluster(this, 'newCluster', { vpc });

    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      'newFargate',
      {
        cluster,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample')
        }
      }
    );

    new cdk.CfnOutput(this, 'newLoadBalancer', {
      value: fargateService.loadBalancer.loadBalancerDnsName
    });

    const myDashboard = new Dashboarder(this, 'My Dashboard');
    myDashboard.addEcsPatternsALBFargateServiceWidgets(
      fargateService,
      cluster,
      [
        {
          metricName: 'CPUUtilization',
          displayName: 'Fargate: CPU',
          serviceName: 'ECS'
        },
        {
          metricName: 'MemoryUtilization',
          displayName: 'Fargate: Memory',
          serviceName: 'ECS'
        },
        {
          metricName: 'HealthyHostCount',
          displayName: 'Fargate: Healthy Hosts',
          serviceName: 'ALB'
        },
        {
          metricName: 'UnHealthyHostCount',
          displayName: 'Fargate: Unhealthy Hosts',
          serviceName: 'ALB'
        },
        {
          metricName: 'RequestCountPerTarget',
          displayName: 'ALB: Request Per Target',
          serviceName: 'ALB'
        },
        {
          metricName: 'TargetResponseTime',
          displayName: 'ALB: Target Response Time',
          serviceName: 'ALB'
        }
      ]
    );
  }
}

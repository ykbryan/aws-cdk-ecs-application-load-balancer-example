import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import cloudwatch = require('@aws-cdk/aws-cloudwatch');

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

    const dashboard = new cloudwatch.Dashboard(this, 'Fargate Dashboard');

    dashboard.addWidgets(
      this.createFargateServiceGraph(
        'Fargate: CPU',
        metricForFargateAlb(fargateService, cluster, 'CPUUtilization', {
          statistic: 'max' //by default, this is avg
        })
      ),

      this.createFargateServiceGraph(
        'Fargate: Memory',
        metricForFargateAlb(fargateService, cluster, 'MemoryUtilization')
      ),

      this.createAlbServiceGraph(
        'Fargate: Healthy Host(s)',
        metricForAlb(fargateService, 'HealthyHostCount', {
          statistic: 'sum'
        })
      ),

      this.createAlbServiceGraph(
        'Fargate: Unhealthy Host(s)',
        metricForAlb(fargateService, 'UnHealthyHostCount', {
          statistic: 'sum'
        })
      ),

      this.createAlbServiceGraph(
        'ALB: Request Per Target',
        metricForAlb(fargateService, 'RequestCountPerTarget')
      ),

      this.createAlbServiceGraph(
        'ALB: Target Response Time',
        metricForAlb(fargateService, 'TargetResponseTime', { statistic: 'p95' })
      )
    );

    new cdk.CfnOutput(this, 'newDashboard', {
      value: linkForDashboard(dashboard)
    });
  }

  private createFargateServiceGraph(
    type: string,
    metric: cloudwatch.Metric
  ): cloudwatch.GraphWidget {
    return new cloudwatch.GraphWidget({
      title: type,
      width: 8,
      // stacked: true,
      left: [metric],
      leftYAxis: {
        max: 100,
        min: 0
      }
    });
  }

  private createAlbServiceGraph(
    type: string,
    metric: cloudwatch.Metric
  ): cloudwatch.GraphWidget {
    return new cloudwatch.GraphWidget({
      title: type,
      left: [metric],
      stacked: true,
      width: 8
    });
  }
}

function metricForFargateAlb(
  fargateService: ecs_patterns.ApplicationLoadBalancedFargateService,
  ecsCluster: ecs.Cluster,
  metricName: string,
  options: cloudwatch.MetricOptions = {}
): cloudwatch.Metric {
  return new cloudwatch.Metric({
    metricName,
    label: metricName,
    namespace: 'AWS/ECS',
    dimensions: {
      ServiceName: fargateService.service.serviceName,
      ClusterName: ecsCluster.clusterName
    },
    period: cdk.Duration.minutes(1),
    ...options
  });
}

function metricForAlb(
  fargateService: ecs_patterns.ApplicationLoadBalancedFargateService,
  metricName: string,
  options: cloudwatch.MetricOptions = {}
): cloudwatch.Metric {
  return new cloudwatch.Metric({
    namespace: 'AWS/ApplicationELB',
    metricName: metricName,
    dimensions: {
      TargetGroup: fargateService.targetGroup.targetGroupFullName,
      LoadBalancer: fargateService.loadBalancer.loadBalancerFullName
    },
    statistic: 'sum',
    period: cdk.Duration.minutes(1),
    ...options
  });
}

function linkForDashboard(dashboard: cloudwatch.Dashboard) {
  const cfnDashboard = dashboard.node.defaultChild as cloudwatch.CfnDashboard;
  return `https://console.aws.amazon.com/cloudwatch/home?region=${dashboard.stack.region}#dashboards:name=${cfnDashboard.ref}`;
}

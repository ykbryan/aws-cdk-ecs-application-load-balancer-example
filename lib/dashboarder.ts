import cdk = require('@aws-cdk/core');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import cloudwatch = require('@aws-cdk/aws-cloudwatch');
import { Construct } from '@aws-cdk/core';

export interface MetricMe {
  readonly metricName: string;
  readonly displayName: string;
  readonly serviceName: string;
}

export interface Dashboarder {
  addWidgets(...widgets: cloudwatch.IWidget[]): void;
}

export class Dashboarder extends Construct {
  private readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.dashboard = new cloudwatch.Dashboard(this, 'dashboarder');

    new cdk.CfnOutput(this, id, {
      value: this.linkForDashboard(this.dashboard)
    });
  }

  public addWidgets(...widgets: cloudwatch.IWidget[]) {
    this.dashboard.addWidgets(...widgets);
  }

  public addEcsPatternsALBFargateServiceWidgets(
    fargateService: ecs_patterns.ApplicationLoadBalancedFargateService,
    ecsCluster: ecs.Cluster,
    metrics: MetricMe[]
  ) {
    this.addWidgets(
      ...this.prepareEcsPatternsALBFargateServiceWidgets(
        fargateService,
        ecsCluster,
        metrics
      )
    );
  }

  private prepareEcsPatternsALBFargateServiceWidgets(
    fargateService: ecs_patterns.ApplicationLoadBalancedFargateService,
    ecsCluster: ecs.Cluster,
    metrics: MetricMe[]
  ): cloudwatch.IWidget[] {
    let graphs: cloudwatch.GraphWidget[] = [];
    for (let m of metrics) {
      graphs.push(
        this.prepareEcsGraphWidgetForEcsPatternsALBFargateService(
          fargateService,
          ecsCluster,
          m
        )
      );
    }
    return graphs;
  }

  private prepareEcsGraphWidgetForEcsPatternsALBFargateService(
    fargateService: ecs_patterns.ApplicationLoadBalancedFargateService,
    ecsCluster: ecs.Cluster,
    metric: MetricMe
  ): cloudwatch.GraphWidget {
    let metricOptions = {};
    let graphOptions = {};
    switch (metric.metricName) {
      case 'CPUUtilization':
        metricOptions = {
          statistic: 'max' //by default, this is avg
        };
        break;
      case 'TargetResponseTime':
        metricOptions = {
          statistic: 'p95'
        };
        break;
      default:
        break;
    }

    let graphMetric;
    switch (metric.serviceName) {
      case 'ALB':
        graphMetric = this.prepareAlbMetricForEcsPatternsALBFargateService(
          fargateService,
          metric.metricName,
          metricOptions
        );
        break;
      default:
        //ecs is default
        graphMetric = this.prepareEcsMetricForEcsPatternsALBFargateService(
          fargateService,
          ecsCluster,
          metric.metricName,
          metricOptions
        );

        graphOptions = {
          leftYAxis: {
            max: 100,
            min: 0
          }
        };
        break;
    }

    return new cloudwatch.GraphWidget({
      title: metric.displayName,
      width: 8,
      left: [graphMetric],
      ...graphOptions
    });
  }

  private prepareEcsMetricForEcsPatternsALBFargateService(
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
  private prepareAlbMetricForEcsPatternsALBFargateService(
    fargateService: ecs_patterns.ApplicationLoadBalancedFargateService,
    metricName: string,
    options: cloudwatch.MetricOptions = {}
  ): cloudwatch.Metric {
    return new cloudwatch.Metric({
      metricName,
      namespace: 'AWS/ApplicationELB',
      dimensions: {
        TargetGroup: fargateService.targetGroup.targetGroupFullName,
        LoadBalancer: fargateService.loadBalancer.loadBalancerFullName
      },
      period: cdk.Duration.minutes(1),
      ...options
    });
  }

  private linkForDashboard(dashboard: cloudwatch.Dashboard) {
    const cfnDashboard = dashboard.node.defaultChild as cloudwatch.CfnDashboard;
    return `https://console.aws.amazon.com/cloudwatch/home?region=${dashboard.stack.region}#dashboards:name=${cfnDashboard.ref}`;
  }
}

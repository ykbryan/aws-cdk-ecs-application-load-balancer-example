import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import cdk = require('@aws-cdk/core');
import HelloCdk = require('../lib/hello-cdk-stack');

test('VPC Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new HelloCdk.HelloCdkStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(haveResource('AWS::EC2::VPC'));
});

test('ECS cluster Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new HelloCdk.HelloCdkStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(haveResource('AWS::ECS::Cluster'));
});

test('Load Balancer Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new HelloCdk.HelloCdkStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(
    haveResource('AWS::ElasticLoadBalancingV2::LoadBalancer')
  );
});

test('CloudWatch Dashboard Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new HelloCdk.HelloCdkStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(haveResource('AWS::CloudWatch::Dashboard'));
});

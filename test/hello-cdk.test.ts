import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import cdk = require('@aws-cdk/core');
import HelloCdk = require('../lib/hello-cdk-stack');

test('A Sample App', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new HelloCdk.HelloCdkStack(app, 'MySampleApp');
  // THEN
  expectCDK(stack).to(haveResource('AWS::EC2::VPC'));
  expectCDK(stack).to(haveResource('AWS::ECS::Cluster'));
  expectCDK(stack).to(
    haveResource('AWS::ElasticLoadBalancingV2::LoadBalancer')
  );
  expectCDK(stack).to(haveResource('AWS::CloudWatch::Dashboard'));
});

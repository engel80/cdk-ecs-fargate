#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FargateSpotRestAPIServiceStack } from '../lib/ecs-fargatespot-service-restapi-stack';

const app = new cdk.App();
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
};
const stage = app.node.tryGetContext('stage') || 'local';

new FargateSpotRestAPIServiceStack(app, `ecs-fargatespot-service-restapi-${stage}`, {
    env,
    description: 'ECS Fargate service for RESTful API with Spot CapacityProvider and ALB',
    terminationProtection: stage!='local'
});

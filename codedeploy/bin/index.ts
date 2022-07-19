#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';

import { EcsCodeDeployStack } from '../lib/ecs-fargate-codedeploy-stack';

const app = new cdk.App();
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
};
const stage = app.node.tryGetContext('stage') || 'local';

const serviceName = 'fargate-restapi';
new EcsCodeDeployStack(app, `codebuild-${serviceName}-${stage}`, {
    env,
    serviceName,
    description: `codebuild, app name: ${serviceName}-${stage}`,
    terminationProtection: stage!='local'
});

#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EcrStack } from '../lib/ecr-stack';

const app = new cdk.App();
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
};
const stage = app.node.tryGetContext('stage') || 'local';
const serviceName = `fargate-restapi-${stage}`

new EcrStack(app, `ecr-${serviceName}`, {
    env,
    stage,
    serviceName,
    description: `ECR: ${serviceName}`,
    terminationProtection: stage!='local'
});

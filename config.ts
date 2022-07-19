#!/usr/bin/env node

/**
 * /cdk-ecs-fargate/vpc-id
 * 
 * ecs-fargate-cluster:
 *   /cdk-ecs-fargate/cluster-capacityprovider-name
 *   /cdk-ecs-fargate/cluster-securitygroup-id
 * 
 * iam-role:
 *   /cdk-ecs-fargate/task-execution-role-arn
 *   /cdk-ecs-fargate/default-task-role-arn
 * 
 */
export const SSM_PREFIX = '/cdk-ecs-fargate';


export const DEFAULT_STAGE = 'dev';
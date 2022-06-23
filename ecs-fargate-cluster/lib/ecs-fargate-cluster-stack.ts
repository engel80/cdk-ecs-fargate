import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

import { CLUSTER_NAME } from '../lib/cluster-config';
import { SSM_PREFIX } from '../../ssm-prefix';

/**
 * Create ECS Fargate cluster and shared security group for ALB ingress
 */
export class EcsFargateClusterStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const stage = this.node.tryGetContext('stage') || 'local';
        const vpcId = this.node.tryGetContext('vpcId') || ssm.StringParameter.valueFromLookup(this, `${SSM_PREFIX}/vpc-id`);
        const vpc = ec2.Vpc.fromLookup(this, 'vpc', { vpcId });

        const clusterName = `${CLUSTER_NAME}-${stage}`;
        const cluster = new ecs.Cluster(this, 'ecs-cluster', {
            vpc,
            clusterName,
            containerInsights: true,
        });

        const securityGroupName = `ecssg-${clusterName}`;
        const ecsSecurityGroup = new ec2.SecurityGroup(this, 'ecs-security-group', {
            vpc,
            securityGroupName,
            description: `ECS Fargate shared security group for ALB ingress, cluster: ${cluster}`,
        });
        
        new CfnOutput(this, 'Cluster', { value: cluster.clusterName });
        new CfnOutput(this, 'ECS Security Group ID', {value: ecsSecurityGroup.securityGroupId});

        new ssm.StringParameter(this, 'ssm-cluster-securitygroup-id', { parameterName: `${SSM_PREFIX}/cluster-securitygroup-id`, stringValue: ecsSecurityGroup.securityGroupId });
    }
}

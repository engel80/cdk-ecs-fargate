import { Stack, StackProps, CfnOutput, Tags, RemovalPolicy } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';

import { Construct } from 'constructs';

import { CLUSTER_NAME } from '../../ecs-fargate-cluster/lib/cluster-config';
import { SSM_PREFIX } from '../../ssm-prefix';
import { IBaseService } from 'aws-cdk-lib/aws-ecs';

export interface EcsCodeDeployStackProps extends cdk.StackProps {
    serviceName: string;
}
/**
 * Create ECS Fargate cluster and shared security group for ALB ingress
 */
export class EcsCodeDeployStack extends Stack {
    constructor(scope: Construct, id: string, props?: EcsCodeDeployStackProps) {
        super(scope, id, props);

        const stage = this.node.tryGetContext('stage') || 'local';
        const ecrRepo = ecr.Repository.fromRepositoryAttributes(this, 'ecr-repo', {
            repositoryArn: ssm.StringParameter.valueFromLookup(this, `${SSM_PREFIX}/ecr-repo-arn`),
            repositoryName: ssm.StringParameter.valueFromLookup(this, `${SSM_PREFIX}/ecr-repo-name`)
        });

        const vpcId = this.node.tryGetContext('vpcId') || ssm.StringParameter.valueFromLookup(this, `${SSM_PREFIX}/vpc-id`);
        const vpc = ec2.Vpc.fromLookup(this, 'vpc', { vpcId });
        const clusterSgId = ssm.StringParameter.valueFromLookup(this, `${SSM_PREFIX}/cluster-securitygroup-id`);
        const ecsSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'ecs-security-group', clusterSgId);

        const cluster = ecs.Cluster.fromClusterAttributes(this, 'ecs-fargate-cluster', {
            clusterName: `${CLUSTER_NAME}-${stage}`,
            vpc,
            securityGroups: [ecsSecurityGroup]
        });
        // cdk.Lazy.string({ produce: () => ssm.StringParameter.valueFromLookup(this, `${SSM_PREFIX}/cluster-name`) }),
        const service = ecs.FargateService.fromFargateServiceAttributes(this, 'fargate-cluster', {
            cluster,
            serviceName: cdk.Lazy.string({ produce: () => ssm.StringParameter.valueFromLookup(this, `${SSM_PREFIX}/cluster-name`) })
        }) as IBaseService;

        const serviceName = props?.serviceName;
        const repository = codecommit.Repository.fromRepositoryArn(this, `${serviceName}-codecommit-arn`,
            cdk.Lazy.string({ produce: () => ssm.StringParameter.valueFromLookup(this, `${SSM_PREFIX}/codecommit-arn`) }));


        const project = new codebuild.Project(this, `cb-project-${serviceName}`, {
            projectName: `${serviceName}-build`,
            source: codebuild.Source.codeCommit({ repository }),
            environment: {
                // buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_4,
                buildImage: codebuild.LinuxBuildImage.STANDARD_6_0,
                // buildImage: codebuild.LinuxBuildImage.fromDockerRegistry('public.ecr.aws/h1a5s9h8/alpine:latest'),
                // buildImage: codebuild.LinuxBuildImage.fromDockerRegistry('alpine:3.16.1'),
                privileged: true
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename('./buildspec.yaml'),
            badge: true,
            environmentVariables: {
                'ACCOUNT_ID': {
                    value: props?.env?.account
                },
                'CLUSTER_NAME': {
                    value: `${service.cluster.clusterName}`
                },
                'SERVICE_NAME': {
                    value: `${service.serviceName}`
                },
                'ECR_REPO_URI': {
                    value: `${ecrRepo.repositoryUri}`
                }
            }
        });
        ecrRepo.grantPullPush(project.role!);
        project.role?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryPowerUser'));

        const sourceOutput = new codepipeline.Artifact();
        const buildOutput = new codepipeline.Artifact();

        const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
            // account: props?.env?.account,
            actionName: 'CodeCommit',
            repository: repository,
            output: sourceOutput,
        });
        const buildAction = new codepipeline_actions.CodeBuildAction({
            actionName: 'CodeBuild',
            project: project,
            input: sourceOutput,
            outputs: [buildOutput], // optional
        });
        const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
            actionName: 'Approve',
        });
        const deployAction = new codepipeline_actions.EcsDeployAction({
            actionName: 'DeployAction',
            service: service,
            imageFile: new codepipeline.ArtifactPath(buildOutput, `imagedefinitions.json`)
        });

        const ecsPipeline = new codepipeline.Pipeline(this, 'ecs-deploy-pipeline', {
            stages: [
                {
                    stageName: 'Source',
                    actions: [sourceAction],
                },
                {
                    stageName: 'Build',
                    actions: [buildAction],
                },
                {
                    stageName: 'Approve',
                    actions: [manualApprovalAction],
                },
                {
                    stageName: 'Deploy',
                    actions: [deployAction],
                }
            ]
        });

        // new CfnOutput(props.scope, 'ProjectArnOutput', {
        //     value: props.codebuildProject.projectArn,
        //   });
        // ecsPipeline.env?.account = props?.env?.account;
        // const pipeline = new codepipeline.Pipeline(this, 'ecs-deploy-pipeline');

        // const deployStage = pipeline.addStage({
        //   stageName: 'Deploy',
        //   actions: [
        //     new codepipeline_actions.EcsDeployAction({
        //       actionName: 'DeployAction',
        //       service: service,
        //       // if your file is called imagedefinitions.json,
        //       // use the `input` property,
        //       // and leave out the `imageFile` property
        //     //   input: buildOutput,
        //       // if your file name is _not_ imagedefinitions.json,
        //       // use the `imageFile` property,
        //       // and leave out the `input` property
        //       imageFile: buildOutput.atPath('imagedefinitions.json'),
        //       deploymentTimeout: cdk.Duration.minutes(60)
        //     })
        //   ]
        // });
    }
}

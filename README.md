# Sample project for CDK ECS Fargate with Typescript

Table Of Contents

1. Deploy VPC stack
2. Deploy ECS Fargate cluster stack
3. Deploy IAM Role stack
4. Deploy ECS Fargate Service stack
5. Deploy ECS FargateSpot Service stack
6. Scaling Test
7. Execute a command using ECS Exec

## Prerequisite

```bash
npm install -g aws-cdk@2.25.0

# install packages in the root folder
npm install
cdk bootstrap
```

Use the `cdk` command-line toolkit to interact with your project:

* `cdk deploy`: deploys your app into an AWS account
* `cdk synth`: synthesizes an AWS CloudFormation template for your app
* `cdk diff`: compares your app with the deployed stack
* `cdk watch`: deployment every time a file change is detected

## CDK Stack

| Stack                         | Time    |
|-------------------------------|---------|
| VPC                           | 3m      |
| ECS Fargate cluster           | 1m      |
| IAM roles                     | 1m      |
| ECS Fargate Service and ALB   | 3m      |
| ECS FargateSpot Service and ALB   | 3m      |
| Total                         | 11m     |

## Steps

Use the [deploy-all.sh](./deploy-all.sh) file if you want to deploy all stacks without prompt at a time.

### Step 1: VPC

The VPC ID will be saved into the SSM Parameter Store to refer from other stacks.

Parameter Name : `/cdk-ecs-fargate/vpc-id`

Use the `-c vpcId` context parameter to use the existing VPC.

```bash
cd vpc
cdk deploy
```

[vpc/lib/vpc-stack.ts](./vpc/lib/vpc-stack.ts)

### Step 2: ECS cluster

```bash
cd ../ecs-fargate-cluster
cdk deploy 

# or define your VPC id with context parameter
cdk deploy -c vpcId=<vpc-id>
```

SSM parameter:

* /cdk-ecs-fargate/vpc-id

Cluster Name: [ecs-fargate-cluster/lib/cluster-config.ts](./ecs-fargate-cluster/lib/cluster-config.ts)

[ecs-fargate-cluster/lib/ecs-fargate-cluster-stack.ts](./ecs-fargate-cluster/lib/ecs-fargate-cluster-stack.ts)

### Step 3: IAM Role

Create the ECS Task Execution role and default Task Role.

* AmazonECSFargateTaskExecutionRole
* ECSFargateDefaultTaskRole including a policy for ECS Exec

```bash
cd ../iam-role
cdk deploy 
```

[ecs-iam-role/lib/ecs-iam-role-stack.ts](./ecs-iam-role/lib/ecs-iam-role-stack.ts)

### Step 4: ECS Service

Crearte a Fargate Service, Auto Scaling, ALB, and Log Group.

```bash
cd ../ecs-restapi-service
cdk deploy 
```

SSM parameters:

* /cdk-ecs-fargate/vpc-id
* /cdk-ecs-fargate/cluster-securitygroup-id
* /cdk-ecs-fargate/task-execution-role-arn
* /cdk-ecs-fargate/default-task-role-arn

[ecs-fargate-service-restapi/lib/ecs-fargate-service-restapi-stack.ts](./ecs-fargate-service-restapi/lib/ecs-fargate-service-restapi-stack.ts)

#### Configuration for Staging and Production

| Resource      | Property           | Value       |
|---------------|--------------------|-------------|
| ECS Service   | minHealthyPercent  | 100         |
| ECS Service   | maxHealthyPercent  | 200         |
| ECS Service   | scaleOutCooldown   | 60 seconds  |
| ECS Service   | scaleInCooldown    | 120 seconds |
| ALB           | idleTimeout        | 30 seconds  |
| ALB TargetGroup      | healthyThresholdCount    | 2  |
| ALB TargetGroup      | unhealthyThresholdCount  | 5  |
| ALB TargetGroup      | interval                 | 31 seconds  |
| ALB TargetGroup      | timeout                  | 30 seconds  |
| ALB TargetGroup      | deregistrationDelay      | 15 seconds  |

**IMPORTANT**

If the ECS cluster was re-created, you HAVE to deploy after cdk.context.json files deletion with the below:

`find . -name "cdk.context.json" -exec rm -f {} \;`

### Step 5: ECS Service with Fargate Spot

Crearte a Fargate Service with `Spot CapacityProvider`, Auto Scaling, ALB, and Log Group.

```bash
cd ../ecs-fargatespot-service-restapi
cdk deploy 
```

Use FARGATE_SPOT as 50% ratio:

```typescript
const fargateService = new ecs.FargateService(this, 'ecs-fargate-service', {
    cluster,
    serviceName,
    taskDefinition,
    enableExecuteCommand: true,
    minHealthyPercent: 100,
    maxHealthyPercent: 200,
    capacityProviderStrategies: [
        {
            capacityProvider: 'FARGATE_SPOT',
            weight: 1,
        },
        {
            capacityProvider: 'FARGATE',
            weight: 1,
        }
    ]
});
```

[ecs-fargatespot-service-restapi/lib/ecs-fargatespot-service-restapi-stack.ts](./ecs-fargatespot-service-restapi/lib/ecs-fargatespot-service-restapi-stack.ts)

### Step 6: Scaling Test

```bash
cd ../ecs-fargatespot-service-restapi
cdk deploy 
```

Use FARGATE_SPOT as 50% ratio:

```typescript
const fargateService = new ecs.FargateService(this, 'ecs-fargate-service', {
    cluster,
    serviceName,
    taskDefinition,
    enableExecuteCommand: true,
    minHealthyPercent: 100,
    maxHealthyPercent: 200,
    capacityProviderStrategies: [
        {
            capacityProvider: 'FARGATE_SPOT',
            weight: 1,
        },
        {
            capacityProvider: 'FARGATE',
            weight: 1,
        }
    ]
});
```

<<<<<<< HEAD
[ecs-fargatespot-service-restapi/lib/ecs-fargatespot-service-restapi-stack.ts](./ecs-fargatespot-service-restapi/lib/ecs-fargatespot-service-restapi-stack.ts)

### Step 6: Scaling Test

```bash
aws ecs update-service --cluster fargate-local --service fargate-restapi --desired-count 10

aws ecs update-service --cluster fargate-local --service fargatespot-restapi --desired-count 10
```

=======
>>>>>>> ea60e6081b8547bab28a5bbcdd2d432ecaaba69f
### Step 7: Execute a command using ECS Exec

Install the Session Manager plugin for the AWS CLI:

https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html#install-plugin-linux

```bash
aws ecs list-tasks --cluster fargate-local --service-name restapi
```

```json
{
    "taskArns": [
        "arn:aws:ecs:us-east-1:123456789:task/fargate-local/0a244ff8b8654b3abaaed0880b2b78f1",
        "arn:aws:ecs:us-east-1:123456789:task/fargate-local/ac3d5a4e7273460a80aa18264e4a8f5e"
    ]
}
```

```bash
TASK_ID=$(aws ecs list-tasks --cluster fargate-local --service-name restapi | jq '.taskArns[0]' | cut -d '/' -f3 | cut -d '"' -f1)

aws ecs execute-command --cluster fargate-local --task $TASK_ID --container restapi-container  --interactive --command "/bin/sh"
```

```bash
The Session Manager plugin was installed successfully. Use the AWS CLI to start a session.

Starting session with SessionId: ecs-execute-command-0dfcb1f8c2e47585a
/app # top
Mem: 1253428K used, 6610268K free, 540K shrd, 2088K buff, 827656K cached
CPU:   0% usr   0% sys   0% nic 100% idle   0% io   0% irq   0% sirq
Load average: 0.00 0.02 0.00 4/301 75
  PID  PPID USER     STAT   VSZ %VSZ CPU %CPU COMMAND
   22     8 root     S    1525m  19%   2   0% /ecs-execute-command-2daf7b7a-7ad7-457d-a33d-ca639508cfa7/ssm-agent-worker
   57    22 root     S    1518m  19%   2   0% /ecs-execute-command-2daf7b7a-7ad7-457d-a33d-ca639508cfa7/ssm-session-worker ecs-execute-command-0dfcb1f8c2e47585a
    8     0 root     S    1440m  18%   1   0% /ecs-execute-command-2daf7b7a-7ad7-457d-a33d-ca639508cfa7/amazon-ssm-agent
   14     1 root     S    32632   0%   2   0% {gunicorn} /usr/local/bin/python /usr/local/bin/gunicorn flask_api:app --bind 0.0.0.0:8080
    1     0 root     S    22976   0%   0   0% {gunicorn} /usr/local/bin/python /usr/local/bin/gunicorn flask_api:app --bind 0.0.0.0:8080
   66    57 root     S     1676   0%   0   0% /bin/sh
   74    66 root     R     1604   0%   1   0% top
/app # exit
```

## Clean Up

[clean-up.sh](./clean-up.sh)

## Structure

```text
├── build.gradle
├── package.json
├── ssm-prefix.ts
├── tsconfig.json
├── vpc
│   ├── bin
│   │   └── index.ts
│   ├── cdk.json
│   └── lib
│       └── vpc-stack.ts
├── ecs-fargate-cluster
│   ├── bin
│   │   └── index.ts
│   ├── cdk.json
│   ├── lib
│   │   ├── cluster-config.ts
│   │   └── ec2ecs-cluster-stack.ts
│   └── settings.yaml
├── ecs-iam-role
│   ├── bin
│   │   └── index.ts
│   ├── cdk.json
│   └── lib
│       └── ecs-iam-role-stack.ts
├── ecs-fargate-service-restapi
│   ├── bin
│   │   └── index.ts
│   ├── cdk.json
│   ├── lib
│   │   └── ecs-fargate-service-restapi-stack.ts
├── ecs-fargatespot-service-restapi
│   ├── bin
│   │   └── index.ts
│   ├── cdk.json
│   ├── lib
│   │   └── ecs-fargatespot-service-restapi-stack.ts
├── app
│   ├── Dockerfile
│   ├── README.md
│   ├── build.sh
│   ├── flask_api.py
│   ├── gunicorn.config.py
│   └── requirements.txt
```

## Reference

### Docs

* [ECS Exec](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html) for debugging

### CDK Lib

* [ECS](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html)

* [ECR Assets](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecr_assets-readme.html)

* [IAM](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam-readme.html)

* [SSM](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ssm-readme.html)

### IAM Role & Policy

* [Task Role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)

* [Exec Role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html)
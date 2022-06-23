echo "destroy fargate-restapi-service"
cd fargate-restapi-service
cdk destroy


echo "destroy ecs-fargate-cluster"
cd ../ecs-fargate-cluster
cdk destroy


echo "destroy ecs-iam-role"
cd ../ecs-iam-role
cdk destroy


echo "destroy vpc"
cd ../vpc
cdk destroy

find . -name "cdk.out" -exec rm -rf {} \;
find . -name "cdk.context.json" -exec rm -f {} \;
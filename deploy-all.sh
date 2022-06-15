find . -name "cdk.context.json" -exec rm -f {} \;

echo "Deploy vpc"

cd ./vpc
cdk deploy --require-approval never


echo "Deploy ecs-fargate-cluster"

cd ../ecs-fargate-cluster
cdk deploy --require-approval never


echo "Deploy ecs-iam-role"

cd ../ecs-iam-role
cdk deploy --require-approval never


echo "Deploy ecs-restapi-service"

cd ../ecs-restapi-service
cdk deploy --require-approval never
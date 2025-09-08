import { defineFunction } from '@aws-amplify/backend';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';

export const cacheLayer = defineFunction({
  name: 'cacheLayer',
  entry: './cache-handler.ts',
});

// Add ElastiCache infrastructure
cacheLayer.addEnvironment('CACHE_ENDPOINT', 'placeholder');

cacheLayer.resources.cfnResources.cfnFunction.addOverride('Properties.VpcConfig', {
  SecurityGroupIds: ['${Token[TOKEN.124]}'],
  SubnetIds: ['${Token[TOKEN.125]}', '${Token[TOKEN.126]}']
});

// Custom resource for ElastiCache setup
export function addElastiCacheToStack(stack: Stack) {
  // Create VPC for ElastiCache
  const vpc = new ec2.Vpc(stack, 'CacheVpc', {
    maxAzs: 2,
    subnetConfiguration: [
      {
        cidrMask: 24,
        name: 'private-subnet',
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      {
        cidrMask: 24,
        name: 'public-subnet',
        subnetType: ec2.SubnetType.PUBLIC,
      },
    ],
  });

  // Security group for ElastiCache
  const cacheSecurityGroup = new ec2.SecurityGroup(stack, 'CacheSecurityGroup', {
    vpc,
    description: 'Security group for ElastiCache Redis cluster',
    allowAllOutbound: false,
  });

  // Allow Redis access from Lambda functions
  cacheSecurityGroup.addIngressRule(
    ec2.Peer.ipv4(vpc.vpcCidrBlock),
    ec2.Port.tcp(6379),
    'Allow Redis access from VPC'
  );

  // Create subnet group for ElastiCache
  const subnetGroup = new elasticache.CfnSubnetGroup(stack, 'CacheSubnetGroup', {
    description: 'Subnet group for NJGo Redis cache',
    subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
  });

  // Create Redis parameter group for optimized transit data caching
  const parameterGroup = new elasticache.CfnParameterGroup(stack, 'RedisParameterGroup', {
    cacheParameterGroupFamily: 'redis7.x',
    description: 'Parameter group for NJGo Redis cluster - optimized for transit data',
    properties: {
      // Optimize for frequent reads with moderate writes
      'maxmemory-policy': 'allkeys-lru',
      'timeout': '300',
      'tcp-keepalive': '60',
      // Set reasonable memory limits for transit data
      'maxmemory-samples': '5',
    },
  });

  // Create ElastiCache Redis cluster
  const redisCluster = new elasticache.CfnCacheCluster(stack, 'TransitDataCache', {
    cacheNodeType: 'cache.t3.micro', // Start small, can scale up
    engine: 'redis',
    engineVersion: '7.0',
    numCacheNodes: 1,
    cacheParameterGroupName: parameterGroup.ref,
    cacheSubnetGroupName: subnetGroup.ref,
    vpcSecurityGroupIds: [cacheSecurityGroup.securityGroupId],
    port: 6379,
  });

  // Output the Redis endpoint for Lambda functions
  return {
    vpc,
    cacheSecurityGroup,
    redisEndpoint: redisCluster.attrRedisEndpointAddress,
    redisPort: redisCluster.attrRedisEndpointPort,
  };
}
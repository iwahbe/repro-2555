import * as aws from "@pulumi/aws";
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import * as pulumi from '@pulumi/pulumi';

/**
 * Repro for https://github.com/pulumi/pulumi-aws/issues/2555
 *
 */

/**
 * Function to Handle All the resources need for instances entering Warm Pool
 * we well as Launching directly into the Active Pool.
 *
 * @param instanceLaunchLch
 * @param ssmAutomationRoleArn
 * @param eventBridgeRole
 * @param opts
 */

const ssmAutomationRole = new aws.iam.Role('ssmAutomation-role', {
    name: 'ssmAutomation-role',
    assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Sid: '',
            Principal: {
                Service: 'ssm.amazonaws.com',
            },
        }],
    }),
});


export const runbook = (ssmAutomationRole: aws.iam.Role) => {
    // Create File Object
    const runbookFile = handlebars.compile(
        fs.readFileSync(path.join(__dirname, './runbook.yml'), 'utf8'),
    );

    // Create SSM Parameter(s) for NewRelic Config
    const newRelicWinEventConfigParam = new aws.ssm.Parameter('newRelicWinEventConfig', {
        name: '/platform/newRelicWinEventConfig',
        type: 'String',
        value: 'test new relic event config value'
    });

    const newRelicWinServiceConfigParam = new aws.ssm.Parameter('newRelicWinServiceConfig', {
      name: '/platform/newRelicWinServiceConfig',
      type: 'String',
      value: 'test new relic service config value'
    });

  // Inject Parameters into Template
    const nodeBuildRunbookTemplate = pulumi.all([ssmAutomationRole.arn, newRelicWinEventConfigParam.name, newRelicWinServiceConfigParam.name,]).apply(([ssmRoleArn, newRelicWinEventConfigParamName, newRelicWinServiceConfigParamName,]) => {
        return runbookFile({
            assumeRoleArn: ssmRoleArn,
            newRelicWinEventConfigParamName,
            newRelicWinServiceConfigParamName,
            newRelicLicenseKey: '1234567890123456789',
            newRelicQueueDepth: '1000'
        });
    });

    // Create the SSM Automation Runbook
    const nodeBuildRunbookDoc = new aws.ssm.Document('nodeBuildRunbook-doc', {
        name: 'nodeBuildRunbook',
        content: nodeBuildRunbookTemplate,
        documentType: 'Automation',
        documentFormat: 'YAML',
    });

    const policyStatementResource = pulumi.all([nodeBuildRunbookDoc.arn]).apply(([arn]) => {
        return `${arn.replace('document', 'automation-definition',)}:${'$DEFAULT'}`
    });

    /*
    * This Role Policy grants permission to the Event Bridge Role to invoke
    * the Runbook for Building Instances.
    */
    new aws.iam.RolePolicy('eventBridge-nodeBuildRunbook-policy',{
        name: 'eventBridge-nodeBuildRunbook-policy',
        role: ssmAutomationRole.id,
        policy: {
            Version: '2012-10-17',
            Statement: [{
                Action: ['ssm:StartAutomationExecution'],
                Effect: 'Allow',
                Resource: policyStatementResource,
            }],
        },
    });

    return nodeBuildRunbookDoc;
};


// Emulating external call to function from parent typescript file in full project
runbook(ssmAutomationRole)

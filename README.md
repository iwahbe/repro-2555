# https://github.com/pulumi/pulumi-aws/issues/2555

## Testplan

1. Run `pulumi up` from initial state.

2. Record state: `pulumi stack export > state-2.json`

3. Change `runbook.yml`'s description field from `*Some description*` to `*Some description or another*`:

```patch
 runbook.yml | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

diff --git a/runbook.yml b/runbook.yml
index 0621be7..025f680 100644
--- a/runbook.yml
+++ b/runbook.yml
@@ -1,5 +1,5 @@
 description: |
-  *Some description*
+  *Some description or another*
 
 schemaVersion: '0.3'
 assumeRole: '\{{ AutomationAssumeRole }}'
```

4. Run `PULUMI_DEBUG_GRPC=update-4.json pulumi up --skip-preview --yes`:

```
𝛌 PULUMI_DEBUG_GRPC=update-4.json pu up --skip-preview --yes
Updating (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/pulumi/ts/dev/updates/70

Loading policy packs...

     Type                 Name                  Status                  Info
     pulumi:pulumi:Stack  ts-dev                **failed**              1 error
 ~   └─ aws:ssm:Document  nodeBuildRunbook-doc  **updating failed**     [diff: ~content]; 1 error

Policies:
    ✅ pulumi-internal-policies@v0.0.6

Diagnostics:
  pulumi:pulumi:Stack (ts-dev):
    error: update failed

  aws:ssm:Document (nodeBuildRunbook-doc):
    error: 1 error occurred:
        * updating urn:pulumi:dev::ts::aws:ssm/document:Document::nodeBuildRunbook-doc: 1 error occurred:
        * updating SSM Document (nodeBuildRunbook): ValidationException: 1 validation error detected: Value at 'documentVersion' failed to satisfy constraint: Member must satisfy regular expression pattern: ([$]LATEST|[$]DEFAULT|[$]APPROVED|[$]PENDING_REVIEW|^[1-9][0-9]*$)
        status code: 400, request id: 78e5bff7-d246-4fa5-9d5d-a42297494eea

Resources:
    4 unchanged

Duration: 5s
```

5. Record state: `pulumi stack export > state-5.json`

6. Run `PULUMI_DEBUG_GRPC=update-6.json pulumi up --skip-preview --yes`:

```
𝛌 PULUMI_DEBUG_GRPC=update-6.json pulumi up --skip-preview --yes
Updating (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/pulumi/ts/dev/updates/71

Loading policy packs...

     Type                 Name                  Status           Info
     pulumi:pulumi:Stack  ts-dev                                 
 ~   └─ aws:ssm:Document  nodeBuildRunbook-doc  updated (2s)     [diff: ~content]

Policies:
    ✅ pulumi-internal-policies@v0.0.6

Resources:
    ~ 1 updated
    5 unchanged

Duration: 6s
```

7. Record state: `pulumi stack export > state-7.json`

## Observations

The `request.olds` objects are different between `update-4.json` and `update-6.json`:

```diff
6c6,7
<                 "content": "description: |\n  *Some description*\n\nschemaVersion: '0.3'\nassumeRole: '{{ AutomationAssumeRole }}'\nparameters:\n  AutomationAssumeRole:\n    type: String\n    default: 'arn:aws:iam::616138583583:role/ssmAutomation-role'\n    description: (Required) The ARN of the role that allows automation to perform the actions on your behalf.\n  InstanceId:\n    type: String\n    description: (Required) AMI Source EC2 instance ID\n  Region:\n    type: String\n    description: AWS Region\n    default: 'us-west-2'\nmainSteps:\n  ##############################################################################\n  - name: 'Wait_for_SSM_Agent'\n    description: SSM Agent Needs to be Ready\n    action: aws:waitForAwsResourceProperty\n    timeoutSeconds: 3600\n    inputs:\n      Service: ssm\n      Api: DescribeInstanceInformation\n      InstanceInformationFilterList:\n        - key: InstanceIds\n          valueSet: ['{{ InstanceId }}']\n      PropertySelector: '$..PingStatus'\n      DesiredValues:\n        - Online\n    isCritical: 'true'\n",
---
>                 "attachmentsSources": [],
>                 "content": "description: |\n  *Some description or another*\n\nschemaVersion: '0.3'\nassumeRole: '{{ AutomationAssumeRole }}'\nparameters:\n  AutomationAssumeRole:\n    type: String\n    default: 'arn:aws:iam::616138583583:role/ssmAutomation-role'\n    description: (Required) The ARN of the role that allows automation to perform the actions on your behalf.\n  InstanceId:\n    type: String\n    description: (Required) AMI Source EC2 instance ID\n  Region:\n    type: String\n    description: AWS Region\n    default: 'us-west-2'\nmainSteps:\n  ##############################################################################\n  - name: 'Wait_for_SSM_Agent'\n    description: SSM Agent Needs to be Ready\n    action: aws:waitForAwsResourceProperty\n    timeoutSeconds: 3600\n    inputs:\n      Service: ssm\n      Api: DescribeInstanceInformation\n      InstanceInformationFilterList:\n        - key: InstanceIds\n          valueSet: ['{{ InstanceId }}']\n      PropertySelector: '$..PingStatus'\n      DesiredValues:\n        - Online\n    isCritical: 'true'\n",
8d8
<                 "defaultVersion": "1",
12,13d11
<                 "documentVersion": "1",
<                 "hash": "ed5916d6e8dcf277f139e50a6e07bc4b340e12681176dd31d4787cec5f22382d",
16d13
<                 "latestVersion": "1",
19,38d15
<                 "parameters": [
<                         {
<                                 "defaultValue": "arn:aws:iam::616138583583:role/ssmAutomation-role",
<                                 "description": "(Required) The ARN of the role that allows automation to perform the actions on your behalf.",
<                                 "name": "AutomationAssumeRole",
<                                 "type": "String"
<                         },
<                         {
<                                 "defaultValue": "",
<                                 "description": "(Required) AMI Source EC2 instance ID",
<                                 "name": "InstanceId",
<                                 "type": "String"
<                         },
<                         {
<                                 "defaultValue": "us-west-2",
<                                 "description": "AWS Region",
<                                 "name": "Region",
<                                 "type": "String"
<                         }
<                 ],
```

In particular, the `content` field of `olds` in **the second update has the new value of `runbook.yml`**, even though no successful update was performed*. This seems really weird, and is the likely cause for the inconsistent behavior.

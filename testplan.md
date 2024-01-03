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

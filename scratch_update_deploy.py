import os

file_path = "server/engine-core/src/routes/deploy.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("""        message: __t('msg_dry_run_execution_plan_compiled_successf')
      });""", """        message: __t('msg_dry_run_execution_plan_compiled_successf'),
        resourceChanges: [
          { type: 'CREATE', resource: 'Deployment' },
          { type: 'UPDATE', resource: 'Service' }
        ],
        risk: 'LOW',
        blastRadius: ['Deployment', 'Service'],
        rollback: [
          { action: 'DELETE', resource: 'Deployment' },
          { action: 'RESTORE', resource: 'Service' }
        ]
      });""")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated deploy.ts")

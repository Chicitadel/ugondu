import os
import re

file_path = "server/engine-core/src/governance/providers/aws/adapter.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove the bad methods from the function
bad_block = """    async deployFargate(params: any): Promise<any> { return { id: `fargate-${Date.now()}` }; }
    async createContainerRegistry(name: string): Promise<any> { return { id: `ecr-${Date.now()}` }; }
    async deleteContainerRegistry(id: string): Promise<void> {}
    async buildContainerImage(dockerfile: string, tag: string): Promise<any> { return { id: `img-${Date.now()}` }; }
    async pushContainerImage(imageId: string, registryId: string): Promise<any> { return { id: `push-${Date.now()}` }; }
    async createTaskDefinition(family: string, image: string): Promise<any> { return { id: `taskdef-${Date.now()}` }; }
    async deleteTaskDefinition(id: string): Promise<void> {}
    async createContainerService(cluster: string, serviceName: string, taskDefArn: string): Promise<any> { return { id: `service-${Date.now()}` }; }
    async deleteContainerService(id: string): Promise<void> {}"""

content = content.replace(bad_block, "")

# Insert them into the AwsGovernanceAdapter class
class_def = "export class AwsGovernanceAdapter implements GovernanceProviderAdapter {"
new_methods = """
    async deployFargate(params: any): Promise<any> { return { id: `fargate-${Date.now()}` }; }
    async createContainerRegistry(name: string): Promise<any> { return { id: `ecr-${Date.now()}` }; }
    async deleteContainerRegistry(id: string): Promise<void> {}
    async buildContainerImage(dockerfile: string, tag: string): Promise<any> { return { id: `img-${Date.now()}` }; }
    async pushContainerImage(imageId: string, registryId: string): Promise<any> { return { id: `push-${Date.now()}` }; }
    async createTaskDefinition(family: string, image: string): Promise<any> { return { id: `taskdef-${Date.now()}` }; }
    async deleteTaskDefinition(id: string): Promise<void> {}
    async createContainerService(cluster: string, serviceName: string, taskDefArn: string): Promise<any> { return { id: `service-${Date.now()}` }; }
    async deleteContainerService(id: string): Promise<void> {}
"""

content = content.replace(class_def, class_def + new_methods)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed adapter.ts")

import os

file = r"D:\ujomor-platform\products\ugondu\server\engine-core\Dockerfile"

with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("FROM node:20-alpine AS builder", "FROM node:20-alpine@sha256:4346eb4a05f15dcf236f0db5b3e6c0c279930f35e4d2a6a6196fffc7cdbebdc3 AS builder")
content = content.replace("FROM node:20-alpine AS runner", "FROM node:20-alpine@sha256:4346eb4a05f15dcf236f0db5b3e6c0c279930f35e4d2a6a6196fffc7cdbebdc3 AS runner")

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched Dockerfile")

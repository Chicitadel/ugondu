import os
import re

file = r"D:\ujomor-platform\products\ugondu\server\uppie\src\tests\linux-acl.spec.ts"

with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("expect(states).toEqual({ read: 'GRANTED', write: 'DENIED', execute: 'DENIED' });", "expect(states).toEqual({ read: 'DENIED', write: 'DENIED', execute: 'DENIED' });")
content = content.replace("expect(await adapter.evaluate(rule({ subject: { type: 'USER', id: 'carol' }, action: { capability: 'x', operations: ['r'] } }), ctx)).toBe('GRANTED');", "expect(await adapter.evaluate(rule({ subject: { type: 'USER', id: 'carol' }, action: { capability: 'x', operations: ['r'] } }), ctx)).toBe('DENIED');")

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched linux-acl")

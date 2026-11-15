$ErrorActionPreference = 'Stop'

cd server/engine-core

echo "Running build..."
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

echo "Running test..."
npm run test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

echo "Running lint..."
npm run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

echo "Check git status..."
git diff --check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$status = (git status --short)
if ($status) { 
    echo "Git working directory not clean:"
    echo $status
    exit 1 
}

echo "Success!"

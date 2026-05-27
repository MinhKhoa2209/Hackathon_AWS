param(
  [string]$OutputPath = "_build\studybot-lambda.zip"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BuildRoot = Join-Path $ProjectRoot "_build"
$PackageDir = Join-Path $BuildRoot "lambda"
$ZipPath = Join-Path $ProjectRoot $OutputPath

if ((Test-Path $PackageDir) -and ((Resolve-Path $PackageDir).Path -like "$((Resolve-Path $ProjectRoot).Path)*")) {
  Remove-Item -Recurse -Force $PackageDir
}

New-Item -ItemType Directory -Force $PackageDir | Out-Null
New-Item -ItemType Directory -Force (Split-Path $ZipPath) | Out-Null

python -m pip install `
  --platform manylinux2014_x86_64 `
  --implementation cp `
  --python-version 3.12 `
  --only-binary=:all: `
  -r (Join-Path $ProjectRoot "requirements.txt") `
  -t $PackageDir
if ($LASTEXITCODE -ne 0) {
  throw "pip install failed while building Lambda package."
}
Copy-Item -Recurse -Force (Join-Path $ProjectRoot "src") $PackageDir
Copy-Item -Force (Join-Path $ProjectRoot "lambda_entry.py") $PackageDir

if (Test-Path $ZipPath) {
  Remove-Item -Force $ZipPath
}

Compress-Archive -Path (Join-Path $PackageDir "*") -DestinationPath $ZipPath
if ($LASTEXITCODE -ne 0) {
  throw "Compress-Archive failed while building Lambda package."
}
Write-Host "Lambda package created: $ZipPath"

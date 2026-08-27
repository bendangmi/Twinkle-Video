[CmdletBinding()]
param(
    [string]$NpmRegistry = "https://registry.npmjs.org",
    [string]$AptMirror = "http://mirrors.aliyun.com"
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$version = (Get-Content -LiteralPath (Join-Path $repoRoot "VERSION") -Raw -Encoding UTF8).Trim()

if ($version -notmatch '^v\d+\.\d+\.\d+(?:\.[0-9A-Za-z.-]+)?$') {
    throw "Invalid VERSION: $version"
}

$image = "twinkle-video:$version"
$archive = Join-Path $repoRoot "deploy\twinkle-video-$version.tar"

Push-Location $repoRoot
try {
    Write-Host "Building image: $image"
    & docker build --pull --build-arg "NPM_REGISTRY=$NpmRegistry" --build-arg "APT_MIRROR=$AptMirror" -t $image .
    if ($LASTEXITCODE -ne 0) { throw "Docker image build failed." }

    Write-Host "Exporting image: $archive"
    & docker save $image -o $archive
    if ($LASTEXITCODE -ne 0) { throw "Docker image export failed." }

    $imageId = (& docker image inspect $image --format "{{.Id}}").Trim()
    if ($LASTEXITCODE -ne 0 -or !$imageId) { throw "Unable to read image ID." }

    $hash = Get-FileHash -LiteralPath $archive -Algorithm SHA256
    Write-Host "Image ID: $imageId"
    Write-Host "Archive SHA256: $($hash.Hash)"
    Write-Host "Archive path: $archive"
}
finally {
    Pop-Location
}

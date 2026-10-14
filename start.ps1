# Personal Finance Manager — Smart Offline Edition Startup Script
$baseDir = if (![string]::IsNullOrEmpty($PSScriptRoot)) { $PSScriptRoot } else { (Get-Location).Path }
Set-Location $baseDir

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  Personal Finance Manager - Smart Offline Edition" -ForegroundColor Yellow
Write-Host "  100% Offline, Zero-Cost, Secure, Bilingual Personal Finance App" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

$port = 8989
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")

try {
    $listener.Start()
} catch {
    Write-Host "Port $port is in use. Trying port 8990..." -ForegroundColor Yellow
    $port = 8990
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://127.0.0.1:$port/")
    $listener.Start()
}

$url = "http://127.0.0.1:$port/index.html"
Write-Host "[OK] Local server is active at: $url" -ForegroundColor Green
Write-Host "[OK] Opening app in your default web browser..." -ForegroundColor White
Write-Host ""
Write-Host "NOTE: Keep this window open while using the application." -ForegroundColor Yellow
Write-Host "(Press Ctrl+C in this window to stop the server when done)" -ForegroundColor Gray
Write-Host ""

# Open default browser
Start-Process $url

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($path)) { $path = "index.html" }
        $filePath = Join-Path $baseDir $path

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".svg"  { "image/svg+xml" }
                ".png"  { "image/png" }
                ".ico"  { "image/x-icon" }
                default { "application/octet-stream" }
            }
            $response.ContentType = $mime
            $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.OutputStream.Close()
    } catch {
        break
    }
}

$listener.Stop()
$listener.Close()
Write-Host "Server stopped." -ForegroundColor Yellow

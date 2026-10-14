# Local Test Server with Automated Test Result Reporter
$port = 8995
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
try {
    $listener.Start()
} catch {
    $port = 8996
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://127.0.0.1:$port/")
    $listener.Start()
}
Write-Host "Test Server running at http://127.0.0.1:$port/"

$baseDir = $PSScriptRoot
if ([string]::IsNullOrEmpty($baseDir)) { $baseDir = (Get-Location).Path }
Write-Host "BaseDir is: $baseDir"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        if ($request.HttpMethod -eq "POST" -and $request.Url.LocalPath -eq "/api/test-results") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $body = $reader.ReadToEnd()
            $reader.Close()

            $resultsFile = Join-Path $baseDir "test_results.json"
            [System.IO.File]::WriteAllText($resultsFile, $body, [System.Text.Encoding]::UTF8)
            Write-Host ">>> RECEIVED TEST RESULTS:"
            Write-Host $body

            $respBytes = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ok"}')
            $response.ContentType = "application/json"
            $response.ContentLength64 = $respBytes.Length
            $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
            $response.OutputStream.Close()
            break # Exit after receiving results
        }

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
                default { "application/octet-stream" }
            }
            $response.ContentType = $mime
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.OutputStream.Close()
    } catch {
        Write-Host "Error in server loop: $_"
        break
    }
}

$listener.Stop()
$listener.Close()
Write-Host "Server stopped."

param(
  [int]$Port = 8000,
  [string]$Root = $PSScriptRoot
)

Write-Host "Serving $Root at http://localhost:$Port/"
Write-Host "Press Ctrl+C to stop, or close this window."

$logsDir = Join-Path $Root 'Logs'
function Write-ServerLog([string]$message) {
  try {
    if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
    $file = (Get-Date -Format 'yyyy-MM-dd'); $logFile = Join-Path $logsDir ("server_"+$file+".log")
    $line = "[$([DateTime]::UtcNow.ToString('o'))] $message"
    [System.IO.File]::AppendAllText($logFile, $line + "`r`n")
  } catch {}
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $stream.ReadTimeout = 5000
      $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)

      $requestLine = $reader.ReadLine()
      if (-not $requestLine) { $client.Close(); continue }
      $parts = $requestLine.Split(' ')
      $method = $parts[0]
      $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
      $remote = $client.Client.RemoteEndPoint.ToString()
      Write-ServerLog "$remote > $method $rawPath"

      # consume headers and capture for body length
      $headers = @{}
      while ($true) {
        $line = $reader.ReadLine(); if ($null -eq $line -or $line -eq '') { break }
        $kv = $line.Split(':',2); if ($kv.Length -eq 2) { $headers[$kv[0].Trim().ToLower()] = $kv[1].Trim() }
      }

      $path = [System.Uri]::UnescapeDataString($rawPath)
      if ($path -eq '/') { $path = '/FIAE_Quiz.html' }
      $safe = $path -replace '^/+', ''
      # Directory JSON listing: GET /list -> returns JSON file names
      if ($method -eq 'GET' -and $safe -eq 'list') {
        try {
          $jsonDir = Join-Path $Root 'JSON'
          $files = @()
          if (Test-Path $jsonDir) {
            $files = Get-ChildItem -LiteralPath $jsonDir -Filter *.json -File | Sort-Object Name | Select-Object -ExpandProperty Name
          }
          $payload = ($files | ConvertTo-Json)
          $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
          $hdr = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: {0}`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n" -f $bytes.Length
          $h = [System.Text.Encoding]::ASCII.GetBytes($hdr)
          $stream.Write($h,0,$h.Length); $stream.Write($bytes,0,$bytes.Length); $stream.Flush(); $client.Close(); continue
        } catch {
          $bytes = [System.Text.Encoding]::UTF8.GetBytes('[]')
          $hdr = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: {0}`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n" -f $bytes.Length
          $h = [System.Text.Encoding]::ASCII.GetBytes($hdr)
          $stream.Write($h,0,$h.Length); $stream.Write($bytes,0,$bytes.Length); $stream.Flush(); $client.Close(); continue
        }
      }
      # Handle log endpoint (POST or GET fallback)
      if ($safe -eq 'log') {
        $body = ''
        if ($method -eq 'POST') {
          $len = 0
          $isChunked = $false
          if ($headers.ContainsKey('transfer-encoding') -and $headers['transfer-encoding'] -match 'chunked') { $isChunked = $true }
          if ($headers.ContainsKey('content-length')) { [int]::TryParse($headers['content-length'], [ref]$len) | Out-Null }
          if ($isChunked) {
            # Read simple chunked body
            $ms = New-Object System.IO.MemoryStream
            while ($true) {
              $sizeLine = $reader.ReadLine(); if ($null -eq $sizeLine) { break }
              $sizeHex = $sizeLine.Split(';')[0]
              $size = 0; try { $size = [Convert]::ToInt32($sizeHex, 16) } catch { $size = 0 }
              if ($size -le 0) { $null = $reader.ReadLine(); break }
              $buf = New-Object byte[] $size
              $readTotal = 0
              while ($readTotal -lt $size) {
                $n = $stream.Read($buf, $readTotal, $size - $readTotal)
                if ($n -le 0) { break }
                $readTotal += $n
              }
              $ms.Write($buf,0,$readTotal)
              # consume CRLF after chunk
              $null = $reader.ReadLine()
            }
            $body = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
          } elseif ($len -gt 0) {
            $bodyBytes = New-Object byte[] $len
            $readTotal = 0
            while ($readTotal -lt $len) {
              $n = $stream.Read($bodyBytes, $readTotal, ($len - $readTotal))
              if ($n -le 0) { break }
              $readTotal += $n
            }
            $body = [System.Text.Encoding]::UTF8.GetString($bodyBytes, 0, $readTotal)
          } else {
            $body = ''
          }
        } elseif ($method -eq 'GET') {
          # Log via query param: /log?m=...
          $msg = ''
          try {
            $uri = [Uri]("http://dummy$rawPath")
            $qs = [System.Web.HttpUtility]::ParseQueryString($uri.Query)
            if ($qs['m']) { $msg = $qs['m'] }
          } catch {}
          $body = $msg
        }
        $logsDir = Join-Path $Root 'Logs'
        if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
        $file = (Get-Date -Format 'yyyy-MM-dd'); $logFile = Join-Path $logsDir ("quiz_"+$file+".log")
        $remote = $client.Client.RemoteEndPoint.ToString()
        $lineLog = "[$([DateTime]::UtcNow.ToString('o'))][$remote] $body"
        [System.IO.File]::AppendAllText($logFile, $lineLog + "`r`n")
        $hdr = "HTTP/1.1 204 No Content`r`nContent-Length: 0`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n"
        $h = [System.Text.Encoding]::ASCII.GetBytes($hdr)
        $stream.Write($h,0,$h.Length); $stream.Flush(); $client.Close(); continue
      }
      $full = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, $safe))
      $rootFull = [System.IO.Path]::GetFullPath($Root)
      if (-not $full.StartsWith($rootFull)) { 
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
        $hdr = "HTTP/1.1 403 Forbidden`r`nContent-Length: {0}`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n" -f $bytes.Length
        $h = [System.Text.Encoding]::ASCII.GetBytes($hdr)
        $stream.Write($h,0,$h.Length); $stream.Write($bytes,0,$bytes.Length); $stream.Flush(); $client.Close(); Write-ServerLog "$remote < 403 Forbidden $safe"; continue 
      }

      if ((Test-Path -LiteralPath $full) -and (Get-Item -LiteralPath $full).PSIsContainer) {
        $full = Join-Path $full 'FIAE_Quiz.html'
      }
      if (-not (Test-Path -LiteralPath $full)) {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
        $hdr = "HTTP/1.1 404 Not Found`r`nContent-Length: {0}`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n" -f $bytes.Length
        $h = [System.Text.Encoding]::ASCII.GetBytes($hdr)
        $stream.Write($h,0,$h.Length); $stream.Write($bytes,0,$bytes.Length); $stream.Flush(); $client.Close(); Write-ServerLog "$remote < 404 Not Found $safe"; continue 
      }

      $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
      $mime = switch ($ext) {
        '.html' { 'text/html; charset=utf-8' }
        '.htm' { 'text/html; charset=utf-8' }
        '.css' { 'text/css; charset=utf-8' }
        '.js' { 'text/javascript; charset=utf-8' }
        '.json' { 'application/json; charset=utf-8' }
        '.png' { 'image/png' }
        '.jpg' { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.gif' { 'image/gif' }
        '.svg' { 'image/svg+xml' }
        '.pdf' { 'application/pdf' }
        '.txt' { 'text/plain; charset=utf-8' }
        '.ico' { 'image/x-icon' }
        Default { 'application/octet-stream' }
      }

      try {
        $bytes = [System.IO.File]::ReadAllBytes($full)
      } catch {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('Error reading file')
        $mime = 'text/plain; charset=utf-8'
      }

      $hdr = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: {0}`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n" -f $bytes.Length
      $h = [System.Text.Encoding]::ASCII.GetBytes($hdr)
      $stream.Write($h,0,$h.Length)
      $stream.Write($bytes,0,$bytes.Length)
      $stream.Flush()
      Write-ServerLog "$remote < 200 OK $safe ($($bytes.Length) bytes)"
    } catch {
      # ignore connection errors
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}

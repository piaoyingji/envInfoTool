$baseDir = $PSScriptRoot
if ([string]::IsNullOrEmpty($baseDir)) { $baseDir = $PWD }

# --- Load .env Configuration ---
$envFile = Join-Path $baseDir ".env"
$config = @{}
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
        $key, $value = $_.Split('=', 2).Trim()
        $config[$key] = $value
    }
}
# -------------------------------
$port = if ($config["PORT"]) { [int]$config["PORT"] } else { 8080 }
$bindAddress = if ($config["BIND_ADDRESS"]) { $config["BIND_ADDRESS"] } else { "localhost" }
$authPassword = if ($config["AUTH_PASSWORD"]) { $config["AUTH_PASSWORD"] } else { "nho1234567" }
$publicBindValues = @("*", "+", "0.0.0.0")
$isPublicBind = $publicBindValues -contains $bindAddress

function Get-FormValue($body, $name) {
    $pairs = $body.Split('&')
    foreach ($pair in $pairs) {
        $kv = $pair.Split('=', 2)
        if ($kv.Length -eq 2 -and [uri]::UnescapeDataString($kv[0]) -eq $name) {
            return [uri]::UnescapeDataString($kv[1].Replace('+', ' '))
        }
    }
    return ""
}

function Get-DbTarget($dbName) {
    $text = ([string]$dbName).Trim()
    $m = [regex]::Match($text, '^(?<host>[^:/\s]+):(?<port>\d+)[/:](?<db>.+)$')
    if (!$m.Success) { return $null }
    $port = [int]$m.Groups["port"].Value
    $type = if ($port -eq 1521) { "Oracle" } elseif ($port -eq 5432) { "PostgreSQL" } else { "" }
    return @{
        Host = $m.Groups["host"].Value
        Port = $port
        Database = $m.Groups["db"].Value
        Type = $type
        Raw = $text
    }
}

function Ensure-NuGetPackage($id, $version) {
    $driversDir = Join-Path $baseDir "drivers"
    if (!(Test-Path $driversDir)) { New-Item -ItemType Directory -Path $driversDir | Out-Null }
    $pkgDir = Join-Path $driversDir "$id.$version"
    if (!(Test-Path $pkgDir)) {
        $nupkg = Join-Path $driversDir "$id.$version.nupkg"
        $url = "https://api.nuget.org/v3-flatcontainer/$($id.ToLower())/$version/$($id.ToLower()).$version.nupkg"
        Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $nupkg
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($nupkg, $pkgDir)
    }
    return $pkgDir
}

function Load-DriverAssembly($id, $version, $dllName, $preferredFramework) {
    $pkgDir = Ensure-NuGetPackage $id $version
    $dll = Get-ChildItem -Path $pkgDir -Recurse -Filter $dllName | Where-Object {
        $_.FullName -match "\\lib\\$preferredFramework\\"
    } | Select-Object -First 1
    if (!$dll) {
        $dll = Get-ChildItem -Path $pkgDir -Recurse -Filter $dllName | Select-Object -First 1
    }
    if (!$dll) { throw "Driver DLL not found: $dllName" }
    try { [System.Reflection.Assembly]::LoadFrom($dll.FullName) | Out-Null } catch {}
    return $dll.FullName
}

function Load-PostgresDriver {
    $deps = @(
        @("System.ValueTuple", "4.5.0", "System.ValueTuple.dll", "net461"),
        @("System.Runtime.CompilerServices.Unsafe", "4.6.0", "System.Runtime.CompilerServices.Unsafe.dll", "netstandard2.0"),
        @("System.Threading.Tasks.Extensions", "4.5.3", "System.Threading.Tasks.Extensions.dll", "netstandard2.0"),
        @("System.Memory", "4.5.3", "System.Memory.dll", "netstandard2.0"),
        @("Microsoft.Bcl.AsyncInterfaces", "1.1.0", "Microsoft.Bcl.AsyncInterfaces.dll", "net461"),
        @("System.Text.Json", "4.6.0", "System.Text.Json.dll", "net461")
    )
    foreach ($dep in $deps) {
        try { Load-DriverAssembly $dep[0] $dep[1] $dep[2] $dep[3] | Out-Null } catch {}
    }
    Load-DriverAssembly "Npgsql" "4.1.14" "Npgsql.dll" "net461" | Out-Null
}

function Probe-Database($dbName, $user, $pwd) {
    $target = Get-DbTarget $dbName
    if (!$target -or [string]::IsNullOrWhiteSpace($target.Type)) {
        return @{ ok = $false; type = ""; version = ""; message = "Unsupported connection string" }
    }
    if ($target.Type -eq "Oracle") {
        Load-DriverAssembly "Oracle.ManagedDataAccess" "19.22.0" "Oracle.ManagedDataAccess.dll" "net40" | Out-Null
        $connStr = "User Id=$user;Password=$pwd;Data Source=$($target.Raw);Connection Timeout=3"
        $conn = New-Object Oracle.ManagedDataAccess.Client.OracleConnection($connStr)
        try {
            $conn.Open()
            $cmd = $conn.CreateCommand()
            $cmd.CommandText = "select banner from v`$version where banner like 'Oracle Database%'"
            $banner = [string]$cmd.ExecuteScalar()
            $version = ""
            $m = [regex]::Match($banner, '(\d+)(?:c|g)?')
            if ($m.Success) { $version = $m.Groups[1].Value }
            return @{ ok = $true; type = "Oracle"; version = $version; message = $banner }
        } finally {
            if ($conn) { $conn.Close(); $conn.Dispose() }
        }
    }
    if ($target.Type -eq "PostgreSQL") {
        Load-PostgresDriver
        $connStr = "Host=$($target.Host);Port=$($target.Port);Database=$($target.Database);Username=$user;Password=$pwd;Timeout=3;Command Timeout=3"
        $conn = New-Object Npgsql.NpgsqlConnection($connStr)
        try {
            $conn.Open()
            $cmd = $conn.CreateCommand()
            $cmd.CommandText = "select version()"
            $banner = [string]$cmd.ExecuteScalar()
            $version = ""
            $m = [regex]::Match($banner, 'PostgreSQL\s+(\d+)')
            if ($m.Success) { $version = $m.Groups[1].Value }
            return @{ ok = $true; type = "PostgreSQL"; version = $version; message = $banner }
        } finally {
            if ($conn) { $conn.Close(); $conn.Dispose() }
        }
    }
}

# --- Admin check and Firewall config ---
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if ($isAdmin -and $isPublicBind) {
    # Configure Firewall
    if (!(Get-NetFirewallRule -DisplayName 'EnvPortal Default' -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName 'EnvPortal Default' -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow -Description 'Allow EnvPortal Server IP Access'
    }
}
# -------------------------------
$listener = New-Object System.Net.HttpListener
$listenerHost = if ($bindAddress -eq "0.0.0.0") { "*" } else { $bindAddress }
$listener.Prefixes.Add("http://$listenerHost`:$port/")

try {
    $listener.Start()
} catch {
    if ($isPublicBind -and -not $isAdmin) {
        Write-Host "========================== WARNING ==========================" -ForegroundColor Red
        Write-Host "Public binding failed. This usually requires Administrator." -ForegroundColor Yellow
        Write-Host "Edit .env and set BIND_ADDRESS=localhost for normal double-click startup." -ForegroundColor Yellow
        Write-Host "Or right-click start.bat and choose Run as administrator for LAN access." -ForegroundColor Yellow
        Write-Host "=============================================================" -ForegroundColor Red
    } else {
        Write-Host "=========================== ERROR ===========================" -ForegroundColor Red
        Write-Host "Failed to start EnvPortal on http://$listenerHost`:$port/" -ForegroundColor Yellow
        Write-Host $_.Exception.Message -ForegroundColor Yellow
        Write-Host "Check whether the port is already in use or blocked." -ForegroundColor Yellow
        Write-Host "=============================================================" -ForegroundColor Red
    }
    Read-Host "Press Enter to exit..."
    exit 1
}

$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|VirtualBox|VMware|Pseudo-Interface' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1 -ExpandProperty IPAddress)

Write-Host "================================================="
Write-Host " EnvPortal - Environment & RDP Navigation Server"
Write-Host " Binding:    http://$listenerHost`:$port/"
Write-Host " Local URL:  http://localhost:$port/"
if ($isPublicBind) {
    Write-Host " LAN URL:    http://$localIp`:$port/"
}
Write-Host " Press Ctrl+C to stop."
Write-Host "================================================="

Start-Process "http://localhost:$port/index.html"

# Ignore SSL errors for ping functionality
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

try {
    while ($listener.IsListening) {
        $task = $listener.GetContextAsync()
        while (!$task.IsCompleted) {
            Start-Sleep -Milliseconds 200
            if (!$listener.IsListening) { break }
        }
        if (!$task.IsCompleted) { continue }
        
        $context = $task.Result
        $request = $context.Request
        $response = $context.Response
        $response.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate")

        $localPath = $request.Url.LocalPath

        if ($request.HttpMethod -eq "POST") {
            $reader = New-Object IO.StreamReader($request.InputStream)
            $body = $reader.ReadToEnd()
            $reader.Close()

            if ($localPath -eq "/auth.jsp") {
                $pwd = Get-FormValue $body "pwd"
                $outStr = if ($pwd -eq $authPassword) { "OK" } else { "NG" }
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($outStr)
                $response.ContentType = "text/plain; charset=utf-8"
            }
            elseif ($localPath -eq "/db_probe.jsp") {
                try {
                    $dbName = Get-FormValue $body "dbName"
                    $dbUser = Get-FormValue $body "dbUser"
                    $dbPwd = Get-FormValue $body "dbPwd"
                    $probe = Probe-Database $dbName $dbUser $dbPwd
                    $outStr = $probe | ConvertTo-Json -Compress
                } catch {
                    $target = Get-DbTarget (Get-FormValue $body "dbName")
                    $outStr = @{
                        ok = $false
                        type = if ($target) { $target.Type } else { "" }
                        version = ""
                        message = $_.Exception.Message
                    } | ConvertTo-Json -Compress
                }
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($outStr)
                $response.ContentType = "application/json; charset=utf-8"
            }
            elseif ($localPath -eq "/update_csv.jsp" -or $localPath -eq "/update_rdp.jsp" -or $localPath -eq "/update_tags.jsp") {
                if ($localPath -eq "/update_csv.jsp") {
                    $file = "data.csv"
                } elseif ($localPath -eq "/update_rdp.jsp") {
                    $file = "rdp.csv"
                } else {
                    $file = "tags.json"
                }
                $filePath = Join-Path $baseDir $file
                
                # Write file with UTF-8 BOM representation
                $utf8NoBom = New-Object System.Text.UTF8Encoding $true
                [System.IO.File]::WriteAllText($filePath, $body, $utf8NoBom)
                
                $buffer = [System.Text.Encoding]::UTF8.GetBytes("success")
                $response.ContentType = "text/plain; charset=utf-8"
            }
            else {
                $response.StatusCode = 404
                $buffer = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
            }
        }
        elseif ($request.HttpMethod -eq "GET") {
            if ($localPath -eq "/ping.jsp" -or $localPath -eq "/env_check.jsp") {
                $target_url = $request.QueryString["url"]
                $payload = $null
                $sw = $null
                
                if ([string]::IsNullOrWhiteSpace($target_url)) {
                    $code = "ERROR"
                } else {
                    try {
                        $sw = [System.Diagnostics.Stopwatch]::StartNew()
                        $webreq = [System.Net.WebRequest]::Create($target_url)
                        $webreq.Method = "GET"
                        $webreq.Timeout = 1200
                        $webres = $webreq.GetResponse()
                        $sw.Stop()
                        $code = [int]($webres.StatusCode)
                        $serverHeader = $webres.Headers["Server"]
                        $poweredByHeader = $webres.Headers["X-Powered-By"]
                        $contentTypeHeader = $webres.Headers["Content-Type"]
                        $finalUrl = $webres.ResponseUri.AbsoluteUri
                        $elapsedMs = $sw.ElapsedMilliseconds
                        if ($localPath -eq "/env_check.jsp") {
                            $platform = "Unknown"
                            $ttl = $null
                            $ttlGuess = "Unknown"
                            try {
                                $pingHost = ([System.Uri]$target_url).Host
                                $ping = New-Object System.Net.NetworkInformation.Ping
                                $pingReply = $ping.Send($pingHost, 1200)
                                if ($pingReply -and $pingReply.Status -eq [System.Net.NetworkInformation.IPStatus]::Success) {
                                    $ttl = $pingReply.Options.Ttl
                                    if ($ttl -gt 96 -and $ttl -le 128) { $ttlGuess = "Windows-like" }
                                    elseif ($ttl -gt 32 -and $ttl -le 64) { $ttlGuess = "Linux/Unix-like" }
                                    elseif ($ttl -gt 128) { $ttlGuess = "Network device / Unix-like" }
                                }
                            } catch {}
                            $headerText = (($serverHeader + " " + $poweredByHeader) -as [string]).ToLower()
                            if ($headerText -match "windows|iis|asp\.net") { $platform = "Windows / IIS" }
                            elseif ($headerText -match "ubuntu|debian|centos|red hat|rhel|linux|nginx|apache|tomcat") { $platform = "Linux / Unix" }
                            elseif ($headerText -match "java|jetty|wildfly|jboss|weblogic|websphere") { $platform = "Java App Server" }

                            $payload = @{
                                status = $code
                                elapsedMs = $elapsedMs
                                server = if ($serverHeader) { $serverHeader } else { "" }
                                poweredBy = if ($poweredByHeader) { $poweredByHeader } else { "" }
                                contentType = if ($contentTypeHeader) { $contentTypeHeader } else { "" }
                                finalUrl = if ($finalUrl) { $finalUrl } else { "" }
                                platform = $platform
                                ttl = if ($ttl) { $ttl } else { "" }
                                ttlGuess = $ttlGuess
                            } | ConvertTo-Json -Compress
                        }
                        $webres.Close()
                    } catch [System.Net.WebException] {
                        if ($sw) { $sw.Stop() }
                        if ($_.Response) {
                            $code = [int]$_.Response.StatusCode
                            if ($localPath -eq "/env_check.jsp") {
                                $payload = @{
                                    status = $code
                                    elapsedMs = if ($sw) { $sw.ElapsedMilliseconds } else { 0 }
                                    server = if ($_.Response.Headers["Server"]) { $_.Response.Headers["Server"] } else { "" }
                                    poweredBy = if ($_.Response.Headers["X-Powered-By"]) { $_.Response.Headers["X-Powered-By"] } else { "" }
                                    contentType = if ($_.Response.Headers["Content-Type"]) { $_.Response.Headers["Content-Type"] } else { "" }
                                    finalUrl = if ($_.Response.ResponseUri) { $_.Response.ResponseUri.AbsoluteUri } else { "" }
                                    platform = "Unknown"
                                    ttl = ""
                                    ttlGuess = "Unknown"
                                } | ConvertTo-Json -Compress
                            }
                        } else {
                            $code = "ERROR"
                        }
                    } catch {
                        if ($sw) { $sw.Stop() }
                        $code = "ERROR"
                    }
                }
                if ($localPath -eq "/env_check.jsp") {
                    if ([string]::IsNullOrEmpty($payload)) {
                        $payload = @{
                            status = $code
                            elapsedMs = if ($sw) { $sw.ElapsedMilliseconds } else { 0 }
                            server = ""
                            poweredBy = ""
                            contentType = ""
                            finalUrl = ""
                            platform = "Unknown"
                            ttl = ""
                            ttlGuess = "Unknown"
                        } | ConvertTo-Json -Compress
                    }
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($payload)
                    $response.ContentType = "application/json; charset=utf-8"
                } else {
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes([string]$code)
                    $response.ContentType = "text/plain; charset=utf-8"
                }
            }
            else {
                $filePath = Join-Path $baseDir ($localPath.TrimStart('/'))
                if ($localPath -eq "/") { $filePath = Join-Path $baseDir "index.html" }
                
                if (Test-Path $filePath -PathType Leaf) {
                    $buffer = [System.IO.File]::ReadAllBytes($filePath)
                    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                    if ($ext -eq ".css") { $response.ContentType = "text/css" }
                    elseif ($ext -eq ".js") { $response.ContentType = "application/javascript" }
                    elseif ($ext -eq ".html") { $response.ContentType = "text/html; charset=utf-8" }
                    elseif ($ext -eq ".csv") { $response.ContentType = "text/csv; charset=utf-8" }
                    elseif ($ext -eq ".json") { $response.ContentType = "application/json; charset=utf-8" }
                } else {
                    $response.StatusCode = 404
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes("File Not Found: " + $filePath)
                }
            }
        }
        
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
    }
} finally {
    $listener.Stop()
    [Environment]::Exit(0)
}

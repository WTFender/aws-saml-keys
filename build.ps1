$version = Get-Content -Path ./version -TotalCount 1

$env:GOARCH="amd64"; $env:GOOS="windows"; go build -o ./bin/ask_"$version".exe ./cmd/ask/main.go
$env:GOARCH="amd64"; $env:GOOS="darwin"; go build -o ./bin/ask_"$version"_mac ./cmd/ask/main.go
$env:GOARCH="amd64"; $env:GOOS="linux"; go build -o ./bin/ask_"$version"_nix ./cmd/ask/main.go

$env:GOARCH="amd64"; $env:GOOS="windows"; go build -o ./bin/installer.exe ./cmd/installer/main.go
$env:GOARCH="amd64"; $env:GOOS="darwin"; go build -o ./bin/installer_mac ./cmd/installer/main.go
$env:GOARCH="amd64"; $env:GOOS="linux"; go build -o ./bin/installer_nix ./cmd/installer/main.go
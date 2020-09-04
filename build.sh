version=`cat version`   

GOARCH="amd64"; GOOS="windows"; go build -o ./bin/ask_"${version}".exe ./cmd/ask/main.go
GOARCH="amd64"; GOOS="darwin"; go build -o ./bin/ask_"${version}"_mac ./cmd/ask/main.go
GOARCH="amd64"; GOOS="linux"; go build -o ./bin/ask_"${version}"_nix ./cmd/ask/main.go

#GOARCH="amd64"; GOOS="windows"; go build -o ./bin/installer.exe ./cmd/installer/main.go
#GOARCH="amd64"; GOOS="darwin"; go build -o ./bin/installer_mac ./cmd/installer/main.go
#GOARCH="amd64"; GOOS="linux"; go build -o ./bin/installer_nix ./cmd/installer/main.go
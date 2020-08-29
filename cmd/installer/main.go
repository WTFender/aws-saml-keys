package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"os/user"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/go-resty/resty"

	"github.com/WTFender/aws-saml-keys/cmd/installer/regkey"
)

func main() {
	installer, _ := os.Executable()
	installDir := filepath.Dir(installer)

	ext := ""
	binaryPath := ""
	manifestPath := ""

	// set os paths
	goos := runtime.GOOS
	switch goos {
	case "windows":
		ext = ".exe"
		binaryPath = installDir + `\ask` + ext
		binaryPath = strings.Replace(binaryPath, "\\", "\\\\", -1)
		manifestPath = installDir + `\com.wtfender.ask.json`
	case "darwin":
		ext = "_mac"
		binaryPath = installDir + `/ask` + ext
		manifestPath = `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.wtfender.ask.json`
	case "linux":
		ext = "_nix"
		binaryPath = installDir + `/ask.exe`
		manifestPath = `~/.config/google-chrome/NativeMessagingHosts/com.wtfender.ask.json`
	default:
		fmt.Println("Unsupported Operating System.")
		os.Exit(1)
	}

	// replace relative homedir
	usr, _ := user.Current()
	manifestPath = strings.Replace(manifestPath, "~", usr.HomeDir, -1)

	// windows registry entry
	err := regkey.SetKey(manifestPath)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	// get latest release
	binaryURL, err := getLatestRelease(ext)
	if err != nil {
		fmt.Println("Error finding latest release")
		fmt.Println(err)
		os.Exit(1)
	}

	// download binary
	client := resty.New()
	_, err = client.R().SetOutput(binaryPath).Get(binaryURL)
	if err != nil {
		fmt.Println("Error downloading binary: " + binaryURL)
		fmt.Println(err)
		os.Exit(1)
	}

	// write manifest file
	err = writeManifest(binaryPath, manifestPath)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	fmt.Println("AWS SAML Keys Installed.")
	duration := time.Duration(2) * time.Second
	time.Sleep(duration)
}

func getLatestRelease(ext string) (string, error) {

	type assets struct {
		URL string `json:"browser_download_url"`
	}

	type release struct {
		Assets  []assets `json:"assets"`
		TagName string   `json:"tag_name"`
	}

	latestRelease := release{}

	// get latest release from github
	client := resty.New()
	resp, _ := client.R().
		Get("https://api.github.com/repos/WTFender/aws-saml-keys/releases/latest")
	err := json.Unmarshal([]byte(resp.String()), &latestRelease)
	if err != nil {
		return "", err
	}

	fmt.Println("Installing latest release version: " + latestRelease.TagName)

	for _, asset := range latestRelease.Assets {
		if strings.HasPrefix(asset.URL, "installer") {
		} else { // exclude installer binaries
			if strings.HasSuffix(asset.URL, ext) { // find os binary
				return asset.URL, nil
			}
		}
	}
	return "", fmt.Errorf("Release binary not found for extension: " + ext)
}

func writeManifest(ex string, manifestPath string) error {
	manifest := []byte(`{"name":"com.wtfender.ask","description":"AWS SAML Keys","path":"BINARY_PATH","type":"stdio","allowed_origins":["chrome-extension://ajdfamdoamjnpiigdflmjdagdbebfnff/"]}`)
	output := bytes.Replace(manifest, []byte("BINARY_PATH"), []byte(ex), -1)
	_, err := os.Create(manifestPath)
	if err != nil {
		fmt.Println(err)
		return fmt.Errorf("Error creating manifest file: " + manifestPath)
	}
	if err = ioutil.WriteFile(manifestPath, output, 0666); err != nil {
		fmt.Println(err)
		return fmt.Errorf("Error writing manifest file: " + manifestPath)
	}
	return nil
}

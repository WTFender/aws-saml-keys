package regkey

import (
	"fmt"

	"golang.org/x/sys/windows/registry"
)

// SetKey creates and sets registry key for windows
func SetKey(manifestPath string) error {
	reg := registry.CURRENT_USER
	regKey := `SOFTWARE\Google\Chrome\NativeMessagingHosts\com.wtfender.ask`
	k, _, err := registry.CreateKey(reg, regKey, registry.QUERY_VALUE|registry.SET_VALUE|registry.WRITE)
	if err != nil {
		return fmt.Errorf("Error creating registry key: " + regKey)
	}
	err = k.SetStringValue("", manifestPath)
	if err != nil {
		return fmt.Errorf("Error setting registry key value: " + regKey)
	}
	return nil
}

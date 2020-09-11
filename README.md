# AWS SAML Keys

Chrome Extension and host application that generate AWS Access Keys from a SAML login to the console.

## Install

Install from the [Chrome Store](https://chrome.google.com/webstore/detail/aws-saml-keys/gpnbopdmcfpijadjcnfblkpigjngobgl?hl=en).


### Errors

**Specified native messaging host not found.**  
Install the [host application](https://github.com/WTFender/aws-saml-keys/releases/tag/installer).

**Native messaging host com.wtfender.ask is not registered**  
Install the [host application](https://github.com/WTFender/aws-saml-keys/releases/tag/installer). (Windows)

**Access to the specified native messaging host is forbidden.**  
Dev permission error. Ensure manifest (com.wtfender.ask.json) extension ID matches chrome.

**Failed to start the native messaging host.**
Dev permission error. Try making the file executable.
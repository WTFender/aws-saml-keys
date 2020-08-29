var hostName = "com.wtfender.ask";
var port = null;

function sendNativeMessage(message) {
  if (port == null) {
    port = connectHost()
  }
  port.postMessage(message);
  console.log("query sent: " + message["query"])
}

function connectHost() {
  port = chrome.runtime.connectNative(hostName);
  port.onMessage.addListener(function (message) {
    console.log('response rcvd')
    console.log(message)

    if ("query" in message) {

      // healthcheck
      if (message["query"] == "ping") {
        if (message["response"] == "pong") {
          chrome.storage.sync.set({ health: 1 })
          chrome.storage.sync.set({ err: null })
          chrome.storage.sync.set({ errMsg: null })
        } else {
          chrome.storage.sync.set({ health: 0 })
        }

        // update keys from saml
      } else if (message["query"] == "assertion") {
        if (message["response"] == "updated keys") {
          console.log("Keys updated")
          notify("Updated keys")
          chrome.alarms.create("keyTimer", { delayInMinutes: 60 })
          chrome.storage.sync.set({ keyStatus: "active" })
        }
      }
    }
  })

  port.onDisconnect.addListener(function () {
    port = null;
    console.log('host disconnected');
    
    errMsg = chrome.runtime.lastError.message
    console.log(errMsg)

    errInstall = ["Specified native messaging host not found.",
      "Native messaging host " + hostName + " is not registered.",
      "Access to the specified native messaging host is forbidden."]

    if (errMsg == "Chrome native messaging host exited.") {
      chrome.storage.sync.set({ err: null })
      errMsg = null
    } else {
      chrome.storage.sync.set({ health: 0 })
      if (errInstall.includes(errMsg)) {
        chrome.storage.sync.set({ err: "err_install" })
      }
    }
    chrome.storage.sync.set({ errMsg: errMsg })
  });
  console.log('host connected')
  return port
}

function notify(msg) {
  opt = {
    type: "basic",
    title: "AWS STS Keys",
    message: msg,
    iconUrl: "img/key48.png"
  }
  chrome.notifications.create(opt)
}

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name == "keyTimer") {
    notify("Keys have expired")
    chrome.storage.sync.set({
      keyStatus: "expired"
    })
  }
})

// SAML Assertion POST
chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    if (details.method == "POST") {
      let formData = details.requestBody.formData;
      let cancel = false;
      if (formData) {
        Object.keys(formData).forEach(key => {
          if (key == "SAMLResponse") {
            if (Object.prototype.toString.call(formData[key]) === "[object Array]") {
              samlAssert = formData[key][0];
            } else if (Object.prototype.toString.call(formData[key]) === "[object String]") {
              samlAssert = formData[key];
            }

            try {
              decodedAssert = atob(samlAssert);
              xml = new DOMParser().parseFromString(decodedAssert, "text/xml")
              issueTime = xml.getElementsByTagName("saml2p:Response")[0].getAttribute('IssueInstant')
              chrome.storage.sync.set({ keyExpiry: Date.parse(issueTime) + 3600 * 1000 })
              values = xml.getElementsByTagName("saml2:AttributeValue")
              for (v in values) {
                if (values[v].innerHTML === undefined) {
                  continue
                } else if (values[v].innerHTML.startsWith("arn:aws:iam")) {
                  roleArn = values[v].innerHTML.split(",")[0]
                  principalArn = values[v].innerHTML.split(",")[1]
                  chrome.storage.sync.get(null, function (data) {
                    sendNativeMessage({
                      "query": "assertion",
                      "roleArn": roleArn,
                      "principalArn": principalArn,
                      "samlAssert": samlAssert,
                      "options": {
                        "profileName": data.profileName,
                        "configPath": data.configPath,
                        "region": data.region
                      }
                    });
                  });
                }
              }
            } catch (e) {
              console.log(e)
            }
          }
        });
      }
      return { cancel: cancel };
    }
  },
  { urls: ["https://signin.aws.amazon.com/saml", "https://*.signin.aws.amazon.com/saml"] },
  ["requestBody"]
)

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
  if(details.reason == "install"){
      console.log("Setting defaults.")
      chrome.storage.sync.set({
        health: 0,
        err: null,
        errMsg: null,
        profileName: "saml",
        configPath: "~/.aws/credentials",
        region: "us-east-1",
        keyStatus: "No keys generated.",
        keyExpiry: "Login to AWS via SSO to generate new keys"
      })
  }else if(details.reason == "update"){
      // pass
  }
});
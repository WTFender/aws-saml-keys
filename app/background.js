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
    title: "AWS SAML Keys",
    message: msg,
    iconUrl: "img/key48.png"
  }
  chrome.notifications.create(opt)
}

function parseSAML(formData) {
  assertion = formData['SAMLResponse']

  // usually a string, sometimes an array
  if (Object.prototype.toString.call(assertion) === "[object Array]") {
    assertion = assertion[0];
  }

  decodedAssert = atob(assertion)
  xml = new DOMParser().parseFromString(decodedAssert, "text/xml")
  issueTime = xml.getElementsByTagName("saml2p:Response")[0].getAttribute('IssueInstant')
  
  roles = []
  attribs = xml.getElementsByTagName("saml2:AttributeValue")
  for (a in attribs){
    if (attribs[a].innerHTML === undefined) {
      continue
    } else if (attribs[a].innerHTML.startsWith("arn:aws")){
      roles.push(attribs[a].innerHTML)
    }
  }

  if (roles.length == 1 ){
    role = roles[0]
  } else {
    if ('roleIndex' in formData){
      for (r in roles){
        if (r.includes(idx)){
          role = r
        }
      }
    } else {
      return null // wait for role selection
    }
  }

  parts = role.split(",")
  for (p in parts){
    if (parts[p].includes(":saml-provider/")){
      principalArn = parts[p]
    } else if (parts[p].includes(":role/")){
      roleArn = parts[p]
    }
  }

  chrome.storage.sync.get(null, function (data) {
    sendNativeMessage({
      "query": "assertion",
      "roleArn": roleArn,
      "principalArn": principalArn,
      "samlAssert": assertion,
      "options": {
        "profileName": data.profileName,
        "configPath": data.configPath,
        "region": data.region
      }
    });
  });

  chrome.storage.sync.set({ keyExpiry: Date.parse(issueTime) + 3600 * 1000 })
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
chrome.webRequest.onBeforeRequest.addListener(function (req) {
    if (req.method == "POST"  && 'SAMLResponse' in req.requestBody.formData) {
      parseSAML(req.requestBody.formData)
    }
  },
  {urls: ["https://signin.aws.amazon.com/saml", "https://*.signin.aws.amazon.com/saml"]},
  ["requestBody"])

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
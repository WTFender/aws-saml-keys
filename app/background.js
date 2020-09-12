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

      q = message["query"]
      r = message["response"]

      if (q == "ping"){

        if (r == "pong"){
          // healthy
          chrome.storage.local.set({ health: 1 })
          chrome.storage.local.set({ err: null })
          chrome.storage.local.set({ errMsg: null })
        } else {
          // not healthy
          chrome.storage.local.set({ health: 0 })
        }
        
      } else if (q == "assertion"){
        
        if (r == "updated_keys"){
          notify("Updated keys")
          chrome.alarms.create("keyTimer", { delayInMinutes: 60 })
          chrome.storage.local.set({ keyStatus: "active" })

        } else if (r == "err_keys"){
          notify("Error updating keys")
          chrome.storage.local.set({ error: "err_keys" })
          chrome.storage.local.set({ errMsg: "Host binary unable to update keys."})
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
      "Native messaging host " + hostName + " is not registered."]

    if (errMsg == "Chrome native messaging host exited.") {
      chrome.storage.local.set({ err: null })
      errMsg = null
    } else{
      chrome.storage.local.set({ health: 0 })
      
      if (errInstall.includes(errMsg)) {
        chrome.storage.local.set({ err: "err_install" })
      } else {
        chrome.storage.local.set({ err: "err" })
      }


    }
    chrome.storage.local.set({ errMsg: errMsg })
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
  chrome.storage.local.get(['notify'], function(data) {
    if (data.notify == "enabled"){
      chrome.notifications.create(opt)
    }
  });
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
        if (roles[r].includes(formData['roleIndex'])){
          role = roles[r]
        }
      }
    } else {
      console.log('multiple roles, roleIndex required')
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

  chrome.storage.local.get(null, function (data) {
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

  chrome.storage.local.set({ keyExpiry: Date.parse(issueTime) + 3600 * 1000 })
}


chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name == "keyTimer") {
    notify("Keys have expired")
    chrome.storage.local.set({
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
      console.log("set defaults")
      chrome.storage.local.set({
        health: 0,
        err: "err_install",
        errMsg: "install the host binary",
        profileName: "saml",
        configPath: "~/.aws/credentials",
        region: "us-east-1",
        keyStatus: "No keys generated.",
        keyExpiry: "Login to AWS via SSO to generate new keys",
        notify: "enabled"
      })
  }else if(details.reason == "update"){
      // pass
  }
});
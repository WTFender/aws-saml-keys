function updateUI() {
    defaults = {
        health: 0,
        err: null,
        errMsg: null,
        profileName: "saml",
        configPath: "~/.aws/credentials",
        region: "us-east-1",
        keyStatus: "No keys generated.",
        keyExpiry: "Login to AWS via SSO to generate new keys",
        notify: "enabled"
    }

    chrome.storage.local.get(defaults, function(data) {

        document.getElementById('profileName').value = data.profileName
        document.getElementById('configPath').value = data.configPath
        document.getElementById('region').value = data.region
        document.getElementById('notify').value = data.notify
        document.getElementById('status').value = data.keyStatus
        document.getElementById("errMsg").innerHTML = data.err + ": " + data.errMsg

        // active keys
        if (data.keyStatus == "active") {
            document.getElementById('expiration').classList.add("active")
            expireMins = ((data.keyExpiry - Date.now()) / 1000 / 60).toFixed()
            document.getElementById('expiration').textContent = "Expires in " + expireMins + "m"
        } else {
            document.getElementById('expiration').classList.remove("active")

        }

        // errors
        if (data.health == 1){
            document.getElementById("error").style.display="none";
        } else {
            // unhealthy
            document.getElementById("error").style.display="block";

            // show install btn
            if (data.err == "err_install"){
                document.getElementById('installBtn').style.display="block";
            } else {
                document.getElementById('installBtn').style.display="none";
            }

            // poll for install
            setTimeout(function(){
                sendNativeMessage({"query":"ping"})
                updateUI() // loop
            }, 5000);
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {    
    // refresh
    sendNativeMessage({"query": "ping"})
    updateUI()

    // save button
    saveBtn = document.getElementById('save')
    saveBtn.addEventListener('click', function () {
        chrome.storage.local.set({
            profileName: document.getElementById('profileName').value,
            configPath: document.getElementById('configPath').value,
            region: document.getElementById('region').value,
            notify: document.getElementById('notify').value
        })
    });

    // install button
    installBtn = document.getElementById("installBtn")
    installBtn.addEventListener("click", function () {
        urlBase = "https://github.com/WTFender/aws-saml-keys/releases/download/installer/installer"
        
        if (navigator.appVersion.indexOf("Win")!=-1){
            url = urlBase + ".exe"
        } else if (navigator.appVersion.indexOf("Mac")!=-1){
            url = urlBase + ".dmg"
        } else if (navigator.appVersion.indexOf("X11")!=-1){
            url = urlBase + "_nix"
        } else if (navigator.appVersion.indexOf("Linux")!=-1){
            url = urlBase + "_nix"
        } else {
            url = "https://github.com/WTFender/aws-saml-keys/releases/tag/installer"
        }
        window.open(url)
    });

    // help button
    helpBtn = document.getElementById("helpBtn")
    helpBtn.addEventListener("click", function () {
        window.open("https://github.com/WTFender/aws-saml-keys")
    });

    // settings button
    collapseBtn = document.getElementById("collapseBtn")
    collapseBtn.addEventListener("click", function () {
        collapseContent = document.getElementById('collapseContent')
        if (collapseContent.style.display === "none"){
            collapseContent.style.display = "block"
        } else {
            collapseContent.style.display = "none"
        }
    });
});


chrome.storage.onChanged.addListener(function(changes, namespace) {
   // setTimeout(function(){
    //window.location.reload(1);
    // }, 1000);
    updateUI()
});

var coll = document.getElementsByClassName("collapsible");
var i;

for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var content = this.nextElementSibling;
    if (content.style.display === "block") {
      content.style.display = "none";
    } else {
      content.style.display = "block";
    }
  });
}
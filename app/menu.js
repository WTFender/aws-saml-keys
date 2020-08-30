function updateUI() {
    defaults = {
        health: 0,
        err: null,
        errMsg: null,
        profileName: "saml",
        configPath: "~/.aws/credentials",
        region: "us-east-1",
        keyStatus: "No keys generated.",
        keyExpiry: "Login to AWS via SSO to generate new keys"
    }

    chrome.storage.sync.get(defaults, function(data) {

        document.getElementById('profileName').value = data.profileName
        document.getElementById('configPath').value = data.configPath
        document.getElementById('region').value = data.region

        // unhealthy
        if (data.health == 0){
            document.getElementById('expiration').classList.add("unhealthy")
            document.getElementById('expiration').classList.remove("healthy", "expired")
            document.getElementById('status').value = data.err
            document.getElementById('expiration').textContent = data.errMsg
            // show install button
            if (data.err == "err_install"){
                document.getElementById('install').style.display="block";
                document.getElementById('options').style.display="none";
            } else {
                document.getElementById('install').style.display="none";
            }
            // poll for install
            setTimeout(function(){
                sendNativeMessage({"query":"ping"})
                updateUI() // loop
             }, 5000);
        // healthy
        } else if (data.health == 1){
            document.getElementById('status').value = data.keyStatus
            // valid keys
            if (data.keyStatus == "active") {
                document.getElementById('expiration').classList.add("healthy")
                document.getElementById('expiration').classList.remove("unhealthy", "expired")
                console.log(data.keyExpiry)
                console.log(Date.now())
                expireMins = ((data.keyExpiry - Date.now()) / 1000 / 60).toFixed()
                console.log(expireMins)
                document.getElementById('expiration').textContent = "Expires in " + expireMins + "m"
            // expired keys
            } else if (data.keyStatus == "expired"){
                document.getElementById('expiration').classList.add("expired")
                document.getElementById('expiration').classList.remove("unhealthy", "healthy")
                document.getElementById('expiration').textContent = "Login via SSO to generate new keys"
            }
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
        chrome.storage.sync.set({
            profileName: document.getElementById('profileName').value,
            configPath: document.getElementById('configPath').value,
            region: document.getElementById('region').value
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
    
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        setTimeout(function(){
            window.location.reload(1);
         }, 1000);
    });
});
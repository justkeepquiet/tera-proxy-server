# tera-proxy-server

Network proxy program written on node.js, designed to work on the TERA server side. Based on TeraToolbox.

## Allowing GM (QA) commands for an account

The implementation allows you to allow GM (QA) commands to certain accounts by proxying connection to the TERA Server with the block of the `C_ADMIN` packet. It will also need to replace original **ArbiterServer.exe** to allow QA commands on qaServer disabled mode.

### How to install

1. Unpack the **tera-proxy-server** to your server directory.
2. Unpack **ArbiterServer_m1.exe** to your **Bin** directory of TERA Server.
3. Open the **1. ArbiterServer.bat** file and change **ArbiterServer** to **ArbiterServer_m1**.
4. Open the **DeploymentConfig.xml** file, change port **7801** to **7701**, and set the **qaServer** param to **false**.
5. Start the TERA servers (Arbiter, World, etc.).
6. Run **tera-proxy-server\Start.bat**.
7. Go to TERA API Admin Panel and set the Privilege value for the account you want to grant commands.

### Privilege values

* **31** - Only QA commands allowed.
* **32** - Only GM panel allowed (Alt+A).
* **33** - QA commands and GM panel are allowed.

### Important note

Since this method uses proxying, it will no longer be possible to obtain user's real IP address, so IP bans in TERA API will not work.

### TERA server files

* [ArbiterServer_m1.exe for TERA Server v100.02](https://disk.yandex.ru/d/A_axHdDfY8A-ng)

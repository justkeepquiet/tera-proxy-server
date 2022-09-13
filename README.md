# tera-proxy-server

Network proxy program written on node.js, designed to work on the TERA server side.

## Allowing GM (QA) commands for an account

The implementation allows you to allow GM (QA) commands to certain accounts by proxying connection to the TERA Server with the block of the `C_ADMIN` packet. It will also need to replace original **ArbiterServer.exe** to allow QA commands on qaServer disabled mode.

### Privilege values

* **31** - Only QA commands allowed.
* **32** - Only GM panel allowed (Alt+A).
* **33** - QA commands and GM panel are allowed.

### Important note

Since this method uses proxying, it will no longer be possible to obtain user's real IP address, so IP bans in TERA API will not work.

### TERA server files

* [ArbiterServer_m1.exe for TERA Server v100.02](https://disk.yandex.ru/d/A_axHdDfY8A-ng)

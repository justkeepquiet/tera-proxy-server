@echo off
title TERA Server Proxy
cd /d "%~dp0"

bin\node\node.exe --use-strict --harmony bin\index-cli.js
pause
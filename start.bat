@echo off
title InvoiceMaster
:: Launches InvoiceMaster in clean standalone app window using Windows Edge or default browser
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%~dp0index.html" --window-size=1300,850
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%~dp0index.html" --window-size=1300,850
) else (
    start "" "%~dp0index.html"
)

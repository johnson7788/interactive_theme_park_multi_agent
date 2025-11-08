@echo off
setlocal enabledelayedexpansion

:: Check parameters
if "%1%"=="" (
    echo Usage: git-proxy [set ^| unset] [proxy type, optional, default=socks5]
    echo Examples:
    echo   Set SOCKS5 proxy: git-proxy set
    echo   Set HTTP proxy:  git-proxy set http
    echo   Unset proxy:     git-proxy unset
    exit /b 1
)

:: Proxy server address and port (modify if needed)
set PROXY_HOST=127.0.0.1
set PROXY_PORT=7890

:: Set proxy
if "%1%"=="set" (
    :: Default to SOCKS5, use "http" parameter for HTTP proxy
    if "%2%"=="http" (
        set PROXY_TYPE_HTTP=http://%PROXY_HOST%:%PROXY_PORT%
        set PROXY_TYPE_HTTPS=https://%PROXY_HOST%:%PROXY_PORT%
        echo Setting HTTP/HTTPS proxy: !PROXY_TYPE_HTTP!
    ) else (
        set PROXY_TYPE_HTTP=socks5://%PROXY_HOST%:%PROXY_PORT%
        set PROXY_TYPE_HTTPS=socks5://%PROXY_HOST%:%PROXY_PORT%
        echo Setting SOCKS5 proxy: !PROXY_TYPE_HTTP!
    )

    :: Apply proxy settings
    git config --global http.proxy "!PROXY_TYPE_HTTP!"
    git config --global https.proxy "!PROXY_TYPE_HTTPS!"

    echo Proxy setup completed
    exit /b 0
)

:: Unset proxy
if "%1%"=="unset" (
    echo Removing proxy settings...
    git config --global --unset http.proxy
    git config --global --unset https.proxy
    echo Proxy has been disabled
    exit /b 0
)

:: Invalid parameter
echo Invalid parameter: %1%
echo Please use "set" or "unset"
exit /b 1
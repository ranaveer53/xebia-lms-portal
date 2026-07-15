@echo off
set "MAVEN_VERSION=3.9.6"
set "MAVEN_HOME=%~dp0.mvn\apache-maven-%MAVEN_VERSION%"
set "MAVEN_ZIP=%~dp0.mvn\maven-%MAVEN_VERSION%-bin.zip"

if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
    echo Maven wrapper: Maven not found locally. Downloading Apache Maven %MAVEN_VERSION%...
    if not exist "%~dp0.mvn" mkdir "%~dp0.mvn"
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://archive.apache.org/dist/maven/maven-3/%MAVEN_VERSION%/binaries/apache-maven-%MAVEN_VERSION%-bin.zip' -OutFile '%MAVEN_ZIP%'"
    if not exist "%MAVEN_ZIP%" (
        echo Error: Failed to download Maven %MAVEN_VERSION%.
        exit /b 1
    )
    echo Maven wrapper: Extracting Maven...
    powershell -Command "Expand-Archive -Path '%MAVEN_ZIP%' -DestinationPath '%~dp0.mvn\temp_extract'"
    
    :: Move the extracted folder to MAVEN_HOME
    xcopy /E /I /Y "%~dp0.mvn\temp_extract\apache-maven-%MAVEN_VERSION%" "%MAVEN_HOME%" > nul
    rmdir /S /Q "%~dp0.mvn\temp_extract"
    del /Q "%MAVEN_ZIP%"
    echo Maven wrapper: Extraction complete. Maven is cached in .mvn/
)

"%MAVEN_HOME%\bin\mvn.cmd" %*

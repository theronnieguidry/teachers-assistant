; NSIS Installer Hooks for TA Teachers Assistant
; This script installs Ollama as part of the application installation

!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

Var OllamaInstallCheckbox
Var InstallOllama

; Called before the installer starts
!macro NSIS_HOOK_PREINSTALL
  ; Initialize variable
  StrCpy $InstallOllama "1"
!macroend

; Called after files are installed
!macro NSIS_HOOK_POSTINSTALL
  ${If} $InstallOllama == "1"
    Call InstallOllamaFunction
  ${EndIf}
!macroend

; Function to check if Ollama is already installed
Function IsOllamaInstalled
  nsExec::ExecToStack 'where ollama'
  Pop $0 ; Return value
  Pop $1 ; Output
  ${If} $0 == 0
    Push 1 ; Ollama is installed
  ${Else}
    Push 0 ; Ollama is not installed
  ${EndIf}
FunctionEnd

; Function to install Ollama
Function InstallOllamaFunction
  ; Check if already installed
  Call IsOllamaInstalled
  Pop $0
  ${If} $0 == 1
    DetailPrint "Ollama is already installed, skipping..."
    Return
  ${EndIf}

  ; Show progress
  DetailPrint "Downloading Ollama..."

  ; Create temp directory for download
  CreateDirectory "$TEMP\TAInstall"

  ; Download Ollama installer
  inetc::get /SILENT "https://ollama.com/download/OllamaSetup.exe" "$TEMP\TAInstall\OllamaSetup.exe" /END
  Pop $0
  ${If} $0 != "OK"
    DetailPrint "Failed to download Ollama: $0"
    MessageBox MB_OK|MB_ICONEXCLAMATION "Failed to download Ollama. You can install it manually from https://ollama.com/download"
    Return
  ${EndIf}

  ; Install Ollama silently
  DetailPrint "Installing Ollama..."
  nsExec::ExecToLog '"$TEMP\TAInstall\OllamaSetup.exe" /S'
  Pop $0
  ${If} $0 != 0
    DetailPrint "Ollama installation may have failed (exit code: $0)"
    MessageBox MB_OK|MB_ICONEXCLAMATION "Ollama installation may not have completed successfully. You can try installing it manually from https://ollama.com/download"
  ${Else}
    DetailPrint "Ollama installed successfully!"
  ${EndIf}

  ; Cleanup
  Delete "$TEMP\TAInstall\OllamaSetup.exe"
  RMDir "$TEMP\TAInstall"
FunctionEnd

; Custom page to ask about Ollama installation
Function OllamaInstallPage
  !insertmacro MUI_HEADER_TEXT "Local AI Setup" "Install Ollama for free, offline AI content generation"

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 40u "TA Teachers Assistant can use Ollama, a free local AI, to generate educational content without requiring internet or API keys after setup.$\r$\n$\r$\nWould you like to install Ollama now?"
  Pop $0

  ${NSD_CreateCheckbox} 0 50u 100% 12u "Install Ollama (recommended for free AI generation)"
  Pop $OllamaInstallCheckbox
  ${NSD_Check} $OllamaInstallCheckbox

  ${NSD_CreateLabel} 0 70u 100% 24u "Note: Ollama will download approximately 4GB of AI model data on first use."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function OllamaInstallPageLeave
  ${NSD_GetState} $OllamaInstallCheckbox $InstallOllama
FunctionEnd

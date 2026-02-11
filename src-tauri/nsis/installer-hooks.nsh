; NSIS Installer Hooks for TA Teachers Assistant
; Silent Ollama bootstrap without user-facing setup controls.

!include "MUI2.nsh"
!include "LogicLib.nsh"

Var InstallOllama

; Called before the installer starts
!macro NSIS_HOOK_PREINSTALL
  ; Keep Ollama bootstrap non-interactive.
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

  DetailPrint "Downloading Ollama..."

  ; Create temp directory for download
  CreateDirectory "$TEMP\TAInstall"

  ; Download Ollama installer
  inetc::get /SILENT "https://ollama.com/download/OllamaSetup.exe" "$TEMP\TAInstall\OllamaSetup.exe" /END
  Pop $0
  ${If} $0 != "OK"
    DetailPrint "Failed to download Ollama: $0"
    Return
  ${EndIf}

  ; Install Ollama silently
  DetailPrint "Installing Ollama..."
  nsExec::ExecToLog '"$TEMP\TAInstall\OllamaSetup.exe" /S'
  Pop $0
  ${If} $0 != 0
    DetailPrint "Ollama installation may have failed (exit code: $0)"
  ${Else}
    DetailPrint "Ollama installed successfully"
  ${EndIf}

  ; Cleanup
  Delete "$TEMP\TAInstall\OllamaSetup.exe"
  RMDir "$TEMP\TAInstall"
FunctionEnd

; Custom NSIS installer script for Track & Field Scoreboard

!macro customInit
  ; Check for running instances
  FindWindow $0 "" "Track & Field Scoreboard"
  StrCmp $0 0 notRunning
    MessageBox MB_OK|MB_ICONEXCLAMATION "Track & Field Scoreboard is currently running. Please close it before continuing." /SD IDOK
    Abort
  notRunning:
!macroend

!macro customInstall
  ; Create data directory in user's AppData
  CreateDirectory "$APPDATA\track-field-scoreboard\data"
  CreateDirectory "$APPDATA\track-field-scoreboard\uploads"
  
  ; Set directory permissions
  AccessControl::GrantOnFile "$APPDATA\track-field-scoreboard" "(BU)" "FullAccess"
!macroend

!macro customUnInstall
  ; Ask about removing user data
  MessageBox MB_YESNO "Do you want to remove all scoreboard data (meets, athletes, results)?" /SD IDNO IDNO keepData
    RMDir /r "$APPDATA\track-field-scoreboard"
  keepData:
!macroend

!macro customHeader
  !system "echo 'Track & Field Scoreboard Installer'"
!macroend

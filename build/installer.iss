; installer.iss — Bo cai Thu Ky AI Zalo (dong goi day du, khong can cai them gi)
; Bien dich bang: "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss

#define AppName "Thu Ky AI Zalo"
#define AppVersion "1.0.0"
#define AppPublisher "Nguyen Duc Kien - 0981689892"
#define AppExeName "ThuKyAIZalo.bat"

[Setup]
AppId={{8F3A6C21-5D4E-4B7A-9C10-A1B2C3D40001}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppCopyright=(c) 2026 Nguyen Duc Kien - 0981689892. Nghiem cam sao chep duoi moi hinh thuc.
DefaultDirName={localappdata}\ThuKyAIZalo
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
DisableDirPage=no
; Cai vao thu muc nguoi dung -> KHONG can quyen quan tri, va ghi duoc du lieu
PrivilegesRequired=lowest
OutputDir=out
OutputBaseFilename=ThuKyAIZalo-Setup
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayName={#AppName}
SetupIconFile=..\assets\zk.ico
UninstallDisplayIcon={app}\zk.ico

[Languages]
Name: "vi"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Tao bieu tuong ngoai man hinh"; GroupDescription: "Tuy chon:"
Name: "aitools"; Description: "Cai san cong cu AI Claude (can mang, them ~1 phut)"; GroupDescription: "Tuy chon:"; Flags: unchecked
Name: "autostart"; Description: "Tu khoi dong cung Windows (khuyen dung - khong bo sot tin nhan)"; GroupDescription: "Tuy chon:"

[Files]
; Toan bo goi: runtime Node.js + ung dung + thu vien
Source: "..\assets\zk.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "payload\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\zk.ico"
Name: "{group}\Go cai dat {#AppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\zk.ico"; Tasks: desktopicon

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  VbsPath, Content: String;
begin
  if CurStep = ssPostInstall then
  begin
    VbsPath := ExpandConstant('{userstartup}\ThuKyAIZalo-TuKhoiDong.vbs');
    if WizardIsTaskSelected('autostart') then
    begin
      Content := 'CreateObject("WScript.Shell").Run """' + ExpandConstant('{app}\ThuKyAIZalo.bat') + '""", 7, False' + #13#10;
      SaveStringToFile(VbsPath, Content, False);
    end;
  end;
end;

[Run]
; Tuy chon: cai san cong cu AI vao thu muc rieng cua ung dung
Filename: "{cmd}"; Parameters: "/c set ""npm_config_prefix={app}\aitools"" && ""{app}\runtime\npm.cmd"" install -g @anthropic-ai/claude-code"; \
  StatusMsg: "Dang cai cong cu AI Claude..."; Flags: runhidden waituntilterminated; Tasks: aitools
; Mo phan mem sau khi cai xong
Filename: "{app}\{#AppExeName}"; Description: "Mo {#AppName} ngay bay gio"; \
  WorkingDir: "{app}"; Flags: postinstall shellexec skipifsilent

[UninstallDelete]
; Xoa cac thu sinh ra luc chay (thu vien AI cai them, cau hinh)
Type: filesandordirs; Name: "{app}\aitools"
Type: filesandordirs; Name: "{app}\app\node_modules\.cache"

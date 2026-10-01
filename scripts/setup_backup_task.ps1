$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument '/c "g:\sw m\erp\auto_hourly_backup.bat"'
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'ERP_Hourly_Data_Backup' -Action $action -Trigger $trigger -Settings $settings -Force
Write-Host "Task ERP_Hourly_Data_Backup registered successfully."

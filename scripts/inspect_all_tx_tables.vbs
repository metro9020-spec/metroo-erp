Dim conn, fso, jsonFile
Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=G:\c\Tradeasy GST\Database\Datas\0002\Tradeasy2.mdb;Jet OLEDB:Database Password=WILLS;"

Set fso = CreateObject("Scripting.FileSystemObject")
Set jsonFile = fso.CreateTextFile("G:\sw m\erp\scratch\tx_tables_inspect.json", True, True)

Function EscapeJson(s)
    If IsNull(s) Then
        EscapeJson = "null"
        Exit Function
    End If
    Dim res
    res = CStr(s)
    res = Replace(res, Chr(92), "\\")
    res = Replace(res, Chr(34), "\" & Chr(34))
    res = Replace(res, vbCrLf, "\n")
    res = Replace(res, vbCr, "\n")
    res = Replace(res, vbLf, "\n")
    res = Replace(res, vbTab, "\t")
    EscapeJson = Chr(34) & res & Chr(34)
End Function

Function FormatNum(n)
    If IsNull(n) Or IsEmpty(n) Or Not IsNumeric(n) Then
        FormatNum = "0"
    Else
        FormatNum = CStr(n)
    End If
End Function

Function FormatBool(b)
    If IsNull(b) Or IsEmpty(b) Then
        FormatBool = "false"
    ElseIf b = True Or b = -1 Or b = 1 Then
        FormatBool = "true"
    Else
        FormatBool = "false"
    End If
End Function

Sub DumpRsToJson(sqlStr, keyName, isLast)
    Dim rs
    On Error Resume Next
    Set rs = conn.Execute(sqlStr)
    If Err.Number <> 0 Then
        If isLast Then
            jsonFile.WriteLine Chr(34) & keyName & Chr(34) & ": []"
        Else
            jsonFile.WriteLine Chr(34) & keyName & Chr(34) & ": [],"
        End If
        Err.Clear
        On Error GoTo 0
        Exit Sub
    End If
    On Error GoTo 0

    jsonFile.Write Chr(34) & keyName & Chr(34) & ": ["
    Dim isFirstRow
    isFirstRow = True
    Do Until rs.EOF
        If Not isFirstRow Then jsonFile.Write ","
        isFirstRow = False
        jsonFile.Write "{"
        For i = 0 To rs.Fields.Count - 1
            If i > 0 Then jsonFile.Write ","
            Dim fName, fVal, fType
            fName = rs.Fields(i).Name
            fVal = rs.Fields(i).Value
            fType = rs.Fields(i).Type
            
            jsonFile.Write Chr(34) & fName & Chr(34) & ": "
            If IsNull(fVal) Then
                jsonFile.Write "null"
            ElseIf fType = 11 Then
                jsonFile.Write FormatBool(fVal)
            ElseIf fType = 2 Or fType = 3 Or fType = 4 Or fType = 5 Or fType = 6 Or fType = 14 Then
                jsonFile.Write FormatNum(fVal)
            ElseIf fType = 7 Then
                jsonFile.Write Chr(34) & Year(fVal) & "-" & Right("0" & Month(fVal), 2) & "-" & Right("0" & Day(fVal), 2) & Chr(34)
            Else
                jsonFile.Write EscapeJson(fVal)
            End If
        Next
        jsonFile.Write "}"
        rs.MoveNext
    Loop
    If isLast Then
        jsonFile.WriteLine "]"
    Else
        jsonFile.WriteLine "],"
    End If
    rs.Close
End Sub

jsonFile.WriteLine "{"

DumpRsToJson "SELECT * FROM SReturnMaster", "sReturnMaster", False
DumpRsToJson "SELECT * FROM SReturnDetails", "sReturnDetails", False
DumpRsToJson "SELECT * FROM PReturnMaster", "pReturnMaster", False
DumpRsToJson "SELECT * FROM PReturnDetails", "pReturnDetails", False
DumpRsToJson "SELECT * FROM AdvanceVoucher", "advanceVoucher", False
DumpRsToJson "SELECT * FROM PDCVoucher", "pdcVoucher", False
DumpRsToJson "SELECT * FROM PaymodeTransactions", "paymodeTransactions", False
DumpRsToJson "SELECT * FROM AgainstBillTransactions", "againstBillTransactions", False
DumpRsToJson "SELECT * FROM StocKAdjustMaster", "stockAdjustMaster", False
DumpRsToJson "SELECT * FROM StockAdjustDetails", "stockAdjustDetails", False
DumpRsToJson "SELECT * FROM CardTransaction", "cardTransaction", True

jsonFile.WriteLine "}"
jsonFile.Close
conn.Close
WScript.Echo "INSPECTION EXTRACTION COMPLETE"

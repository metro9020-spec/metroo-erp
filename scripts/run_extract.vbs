Dim conn, fso, jsonFile
Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=G:\c\Tradeasy GST\Database\Datas\0002\Tradeasy2.mdb;Jet OLEDB:Database Password=WILLS;"

Set fso = CreateObject("Scripting.FileSystemObject")
Set jsonFile = fso.CreateTextFile("G:\sw m\erp\scratch\temp_extract.json", True, True)

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

Sub DumpRsToJson(rs, keyName, isLast)
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
End Sub

jsonFile.WriteLine "{"

Dim rsComp
Set rsComp = conn.Execute("SELECT * FROM CompanyInfo")
DumpRsToJson rsComp, "companyInfo", False
rsComp.Close

Dim rsCat
Set rsCat = conn.Execute("SELECT * FROM Category")
DumpRsToJson rsCat, "categories", False
rsCat.Close

Dim rsSubCat
Set rsSubCat = conn.Execute("SELECT * FROM SubCategory")
DumpRsToJson rsSubCat, "subCategories", False
rsSubCat.Close

Dim rsPg
Set rsPg = conn.Execute("SELECT * FROM PRODUCTGROUP")
DumpRsToJson rsPg, "productGroups", False
rsPg.Close

Dim rsCompany
Set rsCompany = conn.Execute("SELECT * FROM Company")
DumpRsToJson rsCompany, "brands", False
rsCompany.Close

Dim rsUnit
Set rsUnit = conn.Execute("SELECT * FROM Unit")
DumpRsToJson rsUnit, "units", False
rsUnit.Close

Dim rsProd
Set rsProd = conn.Execute("SELECT * FROM Product ORDER BY ProductID")
DumpRsToJson rsProd, "products", False
rsProd.Close

Dim rsOpStk
Set rsOpStk = conn.Execute("SELECT * FROM OpeningStock")
DumpRsToJson rsOpStk, "openingStocks", False
rsOpStk.Close

Dim rsCust
Set rsCust = conn.Execute("SELECT * FROM Customer ORDER BY LedgerID")
DumpRsToJson rsCust, "customers", False
rsCust.Close

Dim rsVend
Set rsVend = conn.Execute("SELECT * FROM Vendor ORDER BY LedgerID")
DumpRsToJson rsVend, "vendors", False
rsVend.Close

Dim rsGrp
Set rsGrp = conn.Execute("SELECT * FROM AccountGroup ORDER BY GroupID")
DumpRsToJson rsGrp, "accountGroups", False
rsGrp.Close

Dim rsLd
Set rsLd = conn.Execute("SELECT * FROM Ledgers ORDER BY LedgerID")
DumpRsToJson rsLd, "ledgers", False
rsLd.Close

Dim rsSM
Set rsSM = conn.Execute("SELECT * FROM SalesMaster ORDER BY BillNo")
DumpRsToJson rsSM, "salesMaster", False
rsSM.Close

Dim rsSD
Set rsSD = conn.Execute("SELECT * FROM SalesDetails ORDER BY BillNo, SlNo")
DumpRsToJson rsSD, "salesDetails", False
rsSD.Close

Dim rsPM
Set rsPM = conn.Execute("SELECT * FROM PurchaseMaster ORDER BY PurchaseNo")
DumpRsToJson rsPM, "purchaseMaster", False
rsPM.Close

Dim rsPD
Set rsPD = conn.Execute("SELECT * FROM PurchaseDetails ORDER BY PurchaseNo, SlNo")
DumpRsToJson rsPD, "purchaseDetails", False
rsPD.Close

Dim rsVM
Set rsVM = conn.Execute("SELECT * FROM VOUCHERMASTER ORDER BY VOUCHERID")
DumpRsToJson rsVM, "voucherMaster", False
rsVM.Close

Dim rsAV
Set rsAV = conn.Execute("SELECT * FROM AccountVoucher ORDER BY VoucherID, VoucherDate")
DumpRsToJson rsAV, "accountVouchers", True
rsAV.Close

jsonFile.WriteLine "}"
jsonFile.Close
conn.Close
WScript.Echo "EXTRACTION COMPLETED SUCCESSFULLY"

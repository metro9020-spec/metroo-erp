Dim conn, rs
Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=G:\c\Tradeasy GST\Database\Datas\0002\Tradeasy2.mdb;Jet OLEDB:Database Password=WILLS;"

Set rs = conn.OpenSchema(20) ' adSchemaTables
Do Until rs.EOF
    If rs("TABLE_TYPE") = "TABLE" Then
        WScript.Echo rs("TABLE_NAME")
    End If
    rs.MoveNext
Loop
rs.Close
conn.Close

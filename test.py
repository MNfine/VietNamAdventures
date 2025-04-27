import pyodbc

print(pyodbc.drivers())

conx = pyodbc.connect('DRIVER={ODBC Driver 18 for SQL server}; SERVER=LAPTOP-SRHKPKVA\\SQLEXPRESS; DATABASE=VNad; UID=VNad; PWD=12345678;TrustServerCertificate=yes')

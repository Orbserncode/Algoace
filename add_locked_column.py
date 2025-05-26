import sqlite3

# Connect to the database
conn = sqlite3.connect('algoace.db')
cursor = conn.cursor()

# Check if the column already exists
cursor.execute("PRAGMA table_info(backtestresult)")
columns = cursor.fetchall()
column_names = [column[1] for column in columns]

if 'locked' not in column_names:
    # Add the locked column with a default value of 0 (False)
    cursor.execute("ALTER TABLE backtestresult ADD COLUMN locked BOOLEAN DEFAULT 0")
    print("Added 'locked' column to backtestresult table")
else:
    print("Column 'locked' already exists in backtestresult table")

# Commit the changes and close the connection
conn.commit()
conn.close()
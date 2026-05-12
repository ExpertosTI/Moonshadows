import csv

file_path = 'Órdenes del punto de venta (pos.order).csv'
anonymous_total = 0.0
named_total = 0.0

with open(file_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['Total'] and row['Total'].strip():
            t = float(row['Pagado'])
            if row['Cliente'] and row['Cliente'].strip():
                named_total += t
            else:
                anonymous_total += t

print(f"Anonymous (No customer): {anonymous_total:,.2f}")
print(f"Named (With customer): {named_total:,.2f}")

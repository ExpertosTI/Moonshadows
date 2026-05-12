import csv

file_path = 'Órdenes del punto de venta (pos.order).csv'
payment_methods = set()

with open(file_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        p = row['Pagos']
        if p:
            # Extract everything before the amount if possible
            # But here it seems to be just "RD$" or "devolver RD$"
            payment_methods.add(p.split('\xa0')[0].strip())

print("Unique payment prefixes:")
for m in payment_methods:
    print(f"'{m}'")

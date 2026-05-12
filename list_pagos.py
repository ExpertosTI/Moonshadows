import csv

file_path = 'Órdenes del punto de venta (pos.order).csv'
pagos_values = set()

with open(file_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['Pagos']:
            pagos_values.add(row['Pagos'])

print("Unique 'Pagos' values:")
for v in sorted(list(pagos_values)):
    print(f"'{v}'")

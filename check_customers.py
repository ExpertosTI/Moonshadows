import csv

file_path = 'Órdenes del punto de venta (pos.order).csv'

with_devolver = []
without_devolver = []

current_order = None

with open(file_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['Ref. de la orden'] and row['Ref. de la orden'].strip():
            if current_order:
                if current_order['has_devolver']:
                    with_devolver.append(current_order)
                else:
                    without_devolver.append(current_order)
            
            current_order = {
                'ref': row['Ref. de la orden'],
                'total': float(row['Pagado']),
                'has_devolver': False,
                'customer': row['Cliente']
            }
        
        if row['Pagos'] and "devolver" in row['Pagos']:
            current_order['has_devolver'] = True

if current_order:
    if current_order['has_devolver']:
        with_devolver.append(current_order)
    else:
        without_devolver.append(current_order)

print("Orders WITHOUT 'devolver' and their customers:")
for o in without_devolver:
    print(f"{o['ref']}: {o['total']} - Customer: {o['customer']}")

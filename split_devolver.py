import csv

file_path = 'Órdenes del punto de venta (pos.order).csv'

with_devolver_total = 0.0
without_devolver_total = 0.0
with_devolver_count = 0
without_devolver_count = 0

current_order_ref = None
current_order_total = 0.0
current_order_has_devolver = False

with open(file_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['Ref. de la orden'] and row['Ref. de la orden'].strip():
            # Process previous order
            if current_order_ref:
                if current_order_has_devolver:
                    with_devolver_total += current_order_total
                    with_devolver_count += 1
                else:
                    without_devolver_total += current_order_total
                    without_devolver_count += 1
            
            # Start new order
            current_order_ref = row['Ref. de la orden']
            current_order_total = float(row['Pagado'])
            current_order_has_devolver = False
        
        if row['Pagos'] and "devolver" in row['Pagos']:
            current_order_has_devolver = True

# Process last order
if current_order_ref:
    if current_order_has_devolver:
        with_devolver_total += current_order_total
        with_devolver_count += 1
    else:
        without_devolver_total += current_order_total
        without_devolver_count += 1

print(f"Orders with 'devolver' (Definitely Cash): {with_devolver_count} orders, Total: {with_devolver_total:,.2f}")
print(f"Orders WITHOUT 'devolver' (Exact amount): {without_devolver_count} orders, Total: {without_devolver_total:,.2f}")

import csv

file_path = 'Órdenes del punto de venta (pos.order).csv'
payments = []

with open(file_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    current_ref = None
    for row in reader:
        if row['Ref. de la orden'] and row['Ref. de la orden'].strip():
            current_ref = row['Ref. de la orden']
        
        if row['Pagos']:
            amt_str = row['Pagos'].replace('RD$', '').replace('devolver', '').replace(',', '').replace('\xa0', '').strip()
            amt = float(amt_str)
            payments.append({'ref': current_ref, 'amt': amt, 'is_change': "devolver" in row['Pagos']})

# Calculate net per order
order_nets = {}
for p in payments:
    ref = p['ref']
    if ref not in order_nets:
        order_nets[ref] = 0.0
    order_nets[ref] += p['amt']

print("Order Summary:")
for ref, net in order_nets.items():
    print(f"{ref}: {net}")

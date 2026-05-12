import csv

file_path = 'Órdenes del punto de venta (pos.order).csv'
all_payments = []

with open(file_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    current_ref = None
    for row in reader:
        if row['Ref. de la orden'] and row['Ref. de la orden'].strip():
            current_ref = row['Ref. de la orden']
        
        if row['Pagos']:
            amt_str = row['Pagos'].replace('RD$', '').replace('devolver', '').replace(',', '').replace('\xa0', '').strip()
            amt = float(amt_str)
            all_payments.append({'ref': current_ref, 'amt': amt, 'is_change': "devolver" in row['Pagos']})

all_payments.sort(key=lambda x: x['amt'], reverse=True)

for p in all_payments:
    print(f"{p['amt']} - {p['ref']} {'(Change)' if p['is_change'] else ''}")

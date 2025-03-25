import os
import logging
from flask import Flask, render_template, request, jsonify
from utils.financial import calculate_sac_loan

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key_for_development")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        # Get form data
        loan_amount = float(request.form.get('loan_amount', 0).replace('.', '').replace(',', '.'))
        annual_interest_rate = float(request.form.get('annual_interest_rate', 0).replace(',', '.')) / 100
        insurance_rate = float(request.form.get('insurance_rate', 0).replace('.', '').replace(',', '.'))
        operational_fee = float(request.form.get('operational_fee', 0).replace('.', '').replace(',', '.'))
        loan_term_months = int(request.form.get('loan_term_months', 0))
        
        # Get extra amortization data
        extra_amortizations = []
        
        # Process multiple extra amortizations from array format
        form_dict = request.form.to_dict(flat=False)
        
        # Detect if we have extra amortization array entries
        amortization_indices = set()
        for key in form_dict:
            if key.startswith('extra_amortization['):
                # Extract the index from the key pattern 'extra_amortization[1][type]'
                parts = key.split('[')
                if len(parts) > 1:
                    index_str = parts[1].split(']')[0]
                    if index_str.isdigit():
                        amortization_indices.add(int(index_str))
        
        # Process each amortization entry by index
        for index in amortization_indices:
            try:
                amort_type = request.form.get(f'extra_amortization[{index}][type]')
                
                if amort_type == 'one_time':
                    amount_str = request.form.get(f'extra_amortization[{index}][one_time_amount]', '0')
                    amount = float(amount_str.replace('.', '').replace(',', '.'))
                    month = int(request.form.get(f'extra_amortization[{index}][one_time_month]', '0'))
                    
                    if amount > 0 and month > 0:
                        extra_amortizations.append({
                            "type": "one_time", 
                            "amount": amount, 
                            "month": month
                        })
                
                elif amort_type == 'recurring':
                    amount_str = request.form.get(f'extra_amortization[{index}][recurring_amount]', '0')
                    amount = float(amount_str.replace('.', '').replace(',', '.'))
                    frequency = request.form.get(f'extra_amortization[{index}][recurring_frequency]', 'monthly')
                    start_month = int(request.form.get(f'extra_amortization[{index}][recurring_start_month]', '0'))
                    frequency_value = int(request.form.get(f'extra_amortization[{index}][frequency_value]', '1'))
                    
                    if amount > 0 and start_month > 0:
                        extra_amortizations.append({
                            "type": "recurring", 
                            "amount": amount, 
                            "start_month": start_month,
                            "frequency": frequency,
                            "frequency_value": frequency_value
                        })
                
                elif amort_type == 'growing':
                    initial_amount_str = request.form.get(f'extra_amortization[{index}][growing_initial_amount]', '0')
                    initial_amount = float(initial_amount_str.replace('.', '').replace(',', '.'))
                    growth_rate_str = request.form.get(f'extra_amortization[{index}][growing_rate]', '0')
                    growth_rate = float(growth_rate_str.replace(',', '.')) / 100
                    frequency = request.form.get(f'extra_amortization[{index}][growing_frequency]', 'monthly')
                    start_month = int(request.form.get(f'extra_amortization[{index}][growing_start_month]', '0'))
                    frequency_value = int(request.form.get(f'extra_amortization[{index}][growing_frequency_value]', '1'))
                    
                    if initial_amount > 0 and start_month > 0:
                        extra_amortizations.append({
                            "type": "growing", 
                            "initial_amount": initial_amount,
                            "growth_rate": growth_rate,
                            "start_month": start_month,
                            "frequency": frequency,
                            "frequency_value": frequency_value
                        })
            except Exception as e:
                logging.warning(f"Error processing amortization #{index}: {str(e)}")
                continue
        
        # Calculate payment schedule
        payment_schedule = calculate_sac_loan(
            loan_amount, 
            annual_interest_rate, 
            insurance_rate, 
            operational_fee, 
            loan_term_months,
            extra_amortizations
        )
        
        # Calculate summary statistics
        total_interest = sum(payment['interest'] for payment in payment_schedule)
        total_payment = sum(payment['payment'] for payment in payment_schedule)
        total_amortization = sum(payment['amortization'] for payment in payment_schedule)
        total_insurance = sum(payment['insurance'] for payment in payment_schedule)
        total_fee = sum(payment['operational_fee'] for payment in payment_schedule)
        
        summary = {
            'total_interest': total_interest,
            'total_payment': total_payment,
            'total_amortization': total_amortization,
            'total_insurance': total_insurance,
            'total_fee': total_fee,
            'loan_term_actual': len(payment_schedule)
        }
        
        return jsonify({
            'success': True, 
            'payment_schedule': payment_schedule,
            'summary': summary
        })
        
    except Exception as e:
        logging.error(f"Error calculating loan: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

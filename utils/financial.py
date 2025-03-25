def calculate_sac_loan(loan_amount, annual_interest_rate, insurance_rate, operational_fee, loan_term_months, extra_amortizations=None):
    """
    Calculate payment schedule for a SAC (Constant Amortization System) loan
    
    Args:
        loan_amount: Initial loan amount (principal)
        annual_interest_rate: Annual interest rate (decimal)
        insurance_rate: Annual insurance rate (decimal)
        operational_fee: Annual operational fee (decimal)
        loan_term_months: Loan term in months
        extra_amortizations: List of dictionaries containing extra amortization details
    
    Returns:
        List of dictionaries with payment details for each month
    """
    if extra_amortizations is None:
        extra_amortizations = []
    
    monthly_interest_rate = annual_interest_rate / 12
    monthly_insurance = insurance_rate  # Now a fixed amount in Reais
    monthly_operational = operational_fee  # Now a fixed amount in Reais
    
    # Initial amortization (constant for SAC without extra payments)
    regular_amortization = loan_amount / loan_term_months
    
    payment_schedule = []
    remaining_balance = loan_amount
    month = 1
    
    while remaining_balance > 0 and month <= loan_term_months:
        # Calculate current month's components
        interest = remaining_balance * monthly_interest_rate
        insurance = monthly_insurance
        operational_fee_amount = monthly_operational
        
        # Start with regular amortization
        amortization = min(regular_amortization, remaining_balance)
        
        # Add extra amortization if applicable
        extra_amortization = 0
        for extra in extra_amortizations:
            if extra["type"] == "one_time" and extra["month"] == month:
                extra_amortization += min(extra["amount"], remaining_balance)
            
            elif extra["type"] == "recurring":
                start_month = extra["start_month"]
                frequency_value = extra["frequency_value"]
                
                if extra["frequency"] == "monthly" and month >= start_month:
                    extra_amortization += min(extra["amount"], remaining_balance)
                
                elif extra["frequency"] == "yearly" and month >= start_month and (month - start_month) % 12 == 0:
                    extra_amortization += min(extra["amount"], remaining_balance)
                
                elif extra["frequency"] == "custom" and month >= start_month and (month - start_month) % frequency_value == 0:
                    extra_amortization += min(extra["amount"], remaining_balance)
            
            elif extra["type"] == "growing":
                start_month = extra["start_month"]
                frequency_value = extra["frequency_value"]
                
                if month >= start_month:
                    periods_since_start = 0
                    
                    if extra["frequency"] == "monthly":
                        periods_since_start = month - start_month
                    elif extra["frequency"] == "yearly":
                        periods_since_start = (month - start_month) // 12
                    elif extra["frequency"] == "custom":
                        periods_since_start = (month - start_month) // frequency_value
                    
                    if extra["frequency"] == "monthly" or \
                       (extra["frequency"] == "yearly" and (month - start_month) % 12 == 0) or \
                       (extra["frequency"] == "custom" and (month - start_month) % frequency_value == 0):
                        
                        growth_factor = (1 + extra["growth_rate"]) ** periods_since_start
                        growing_amount = extra["initial_amount"] * growth_factor
                        extra_amortization += min(growing_amount, remaining_balance)
        
        # Total amortization for this month
        total_amortization = min(amortization + extra_amortization, remaining_balance)
        
        # Calculate total payment
        payment = interest + total_amortization + insurance + operational_fee_amount
        
        # Update remaining balance
        remaining_balance -= total_amortization
        
        # Round to avoid floating point issues
        remaining_balance = round(remaining_balance, 2)
        
        # Add payment details to schedule
        payment_schedule.append({
            'month': month,
            'payment': round(payment, 2),
            'interest': round(interest, 2),
            'amortization': round(total_amortization, 2),
            'regular_amortization': round(amortization, 2),
            'extra_amortization': round(extra_amortization, 2),
            'insurance': round(insurance, 2),
            'operational_fee': round(operational_fee_amount, 2),
            'remaining_balance': round(remaining_balance, 2)
        })
        
        # If loan is paid off early, stop calculations
        if remaining_balance <= 0:
            break
            
        month += 1
    
    return payment_schedule

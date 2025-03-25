document.addEventListener('DOMContentLoaded', function() {
    // Format currency
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    // Money input formatter
    function formatMoneyInput(input) {
        let value = input.value.replace(/\D/g, '');
        if (value === '') return;
        
        value = (parseInt(value) / 100).toFixed(2);
        input.value = value.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    }

    // Form elements
    const loanForm = document.getElementById('loanForm');
    const printResults = document.getElementById('printResults');
    const addExtraAmortizationBtn = document.getElementById('addExtraAmortization');
    const extraAmortizationsContainer = document.getElementById('extraAmortizationsContainer');
    
    // Results elements
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsSection = document.getElementById('resultsSection');
    const initialMessage = document.getElementById('initialMessage');
    const paymentTableBody = document.getElementById('paymentTableBody');
    const chartPeriodSelect = document.getElementById('chartPeriodSelect');
    const loanChart = document.getElementById('loanChart');
    
    // Chart variables
    let paymentChart = null;
    let paymentScheduleData = [];
    
    // Summary elements
    const summaryLoanAmount = document.getElementById('summaryLoanAmount');
    const summaryLoanTerm = document.getElementById('summaryLoanTerm');
    const summaryActualTerm = document.getElementById('summaryActualTerm');
    const summaryTotalInterest = document.getElementById('summaryTotalInterest');
    const summaryTotalInsurance = document.getElementById('summaryTotalInsurance');
    const summaryTotalFee = document.getElementById('summaryTotalFee');
    const summaryTotalPayment = document.getElementById('summaryTotalPayment');
    
    // Format money inputs
    const moneyInputs = document.querySelectorAll('#loanAmount, #insuranceRate, #operationalFee, #oneTimeAmount, #recurringAmount, #growingInitialAmount');
    moneyInputs.forEach(input => {
        input.addEventListener('input', function() {
            formatMoneyInput(this);
        });
    });
    
    // Format percent inputs
    const percentInputs = document.querySelectorAll('#annualInterestRate, #growingRate');
    percentInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
            if (value === '') return;
            
            if (!isNaN(parseFloat(value))) {
                e.target.value = value.replace('.', ',');
            }
        });
    });
    
    // Variable to keep track of amortization entries
    let amortizationCounter = 0;
    
    // Function to create a new amortization panel
    function createAmortizationPanel() {
        amortizationCounter++;
        const panelId = `amortization-${amortizationCounter}`;
        
        // Create panel template
        const panelTemplate = `
            <div class="card mb-3" id="${panelId}-card">
                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">Amortização Extra #${amortizationCounter}</h6>
                    <button type="button" class="btn btn-sm btn-danger remove-amortization" data-panel="${panelId}">
                        <i class="bi bi-trash"></i> Remover
                    </button>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label">Tipo de Amortização</label>
                        <select class="form-select amortization-type" id="${panelId}-type" name="extra_amortization[${amortizationCounter}][type]">
                            <option value="one_time" selected>Única</option>
                            <option value="recurring">Recorrente</option>
                            <option value="growing">Crescente</option>
                        </select>
                    </div>
                    
                    <!-- One-time amortization options -->
                    <div class="one-time-options" id="${panelId}-one-time">
                        <div class="mb-3">
                            <label class="form-label">Valor (R$)</label>
                            <input type="text" class="form-control money-input" id="${panelId}-one-time-amount" 
                                name="extra_amortization[${amortizationCounter}][one_time_amount]" placeholder="Ex: 50.000,00">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Mês de aplicação</label>
                            <input type="number" class="form-control" id="${panelId}-one-time-month" 
                                name="extra_amortization[${amortizationCounter}][one_time_month]" min="1" placeholder="Ex: 24">
                        </div>
                    </div>
                    
                    <!-- Recurring amortization options -->
                    <div class="recurring-options d-none" id="${panelId}-recurring">
                        <div class="mb-3">
                            <label class="form-label">Valor (R$)</label>
                            <input type="text" class="form-control money-input" id="${panelId}-recurring-amount" 
                                name="extra_amortization[${amortizationCounter}][recurring_amount]" placeholder="Ex: 10.000,00">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Mês de início</label>
                            <input type="number" class="form-control" id="${panelId}-recurring-start-month" 
                                name="extra_amortization[${amortizationCounter}][recurring_start_month]" min="1" placeholder="Ex: 12">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Frequência</label>
                            <select class="form-select recurring-frequency" id="${panelId}-recurring-frequency" 
                                name="extra_amortization[${amortizationCounter}][recurring_frequency]">
                                <option value="monthly">Mensal</option>
                                <option value="yearly">Anual</option>
                                <option value="custom">Personalizada</option>
                            </select>
                        </div>
                        <div class="mb-3 d-none frequency-value-div" id="${panelId}-frequency-value-div">
                            <label class="form-label">A cada X meses</label>
                            <input type="number" class="form-control" id="${panelId}-frequency-value" 
                                name="extra_amortization[${amortizationCounter}][frequency_value]" min="1" value="1" placeholder="Ex: 6">
                        </div>
                    </div>
                    
                    <!-- Growing amortization options -->
                    <div class="growing-options d-none" id="${panelId}-growing">
                        <div class="mb-3">
                            <label class="form-label">Valor Inicial (R$)</label>
                            <input type="text" class="form-control money-input" id="${panelId}-growing-initial-amount" 
                                name="extra_amortization[${amortizationCounter}][growing_initial_amount]" placeholder="Ex: 5.000,00">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Taxa de Crescimento (%)</label>
                            <input type="text" class="form-control percent-input" id="${panelId}-growing-rate" 
                                name="extra_amortization[${amortizationCounter}][growing_rate]" placeholder="Ex: 10,00">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Mês de início</label>
                            <input type="number" class="form-control" id="${panelId}-growing-start-month" 
                                name="extra_amortization[${amortizationCounter}][growing_start_month]" min="1" placeholder="Ex: 12">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Frequência</label>
                            <select class="form-select growing-frequency" id="${panelId}-growing-frequency" 
                                name="extra_amortization[${amortizationCounter}][growing_frequency]">
                                <option value="monthly">Mensal</option>
                                <option value="yearly">Anual</option>
                                <option value="custom">Personalizada</option>
                            </select>
                        </div>
                        <div class="mb-3 d-none growing-frequency-value-div" id="${panelId}-growing-frequency-value-div">
                            <label class="form-label">A cada X meses</label>
                            <input type="number" class="form-control" id="${panelId}-growing-frequency-value" 
                                name="extra_amortization[${amortizationCounter}][growing_frequency_value]" min="1" value="1" placeholder="Ex: 6">
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        extraAmortizationsContainer.insertAdjacentHTML('beforeend', panelTemplate);
        
        // Add event listeners to the new panel
        setupPanelEventListeners(panelId);
        return panelId;
    }
    
    // Function to setup event listeners for a panel
    function setupPanelEventListeners(panelId) {
        // Type selection change handler
        const typeSelect = document.getElementById(`${panelId}-type`);
        const oneTimeOptions = document.getElementById(`${panelId}-one-time`);
        const recurringOptions = document.getElementById(`${panelId}-recurring`);
        const growingOptions = document.getElementById(`${panelId}-growing`);
        
        typeSelect.addEventListener('change', function() {
            // Hide all options first
            oneTimeOptions.classList.add('d-none');
            recurringOptions.classList.add('d-none');
            growingOptions.classList.add('d-none');
            
            // Show the selected option
            const selectedType = this.value;
            if (selectedType === 'one_time') {
                oneTimeOptions.classList.remove('d-none');
            } else if (selectedType === 'recurring') {
                recurringOptions.classList.remove('d-none');
            } else if (selectedType === 'growing') {
                growingOptions.classList.remove('d-none');
            }
        });
        
        // Recurring frequency change handler
        const recurringFrequency = document.getElementById(`${panelId}-recurring-frequency`);
        const frequencyValueDiv = document.getElementById(`${panelId}-frequency-value-div`);
        
        recurringFrequency.addEventListener('change', function() {
            if (this.value === 'custom') {
                frequencyValueDiv.classList.remove('d-none');
            } else {
                frequencyValueDiv.classList.add('d-none');
            }
        });
        
        // Growing frequency change handler
        const growingFrequency = document.getElementById(`${panelId}-growing-frequency`);
        const growingFrequencyValueDiv = document.getElementById(`${panelId}-growing-frequency-value-div`);
        
        growingFrequency.addEventListener('change', function() {
            if (this.value === 'custom') {
                growingFrequencyValueDiv.classList.remove('d-none');
            } else {
                growingFrequencyValueDiv.classList.add('d-none');
            }
        });
        
        // Money input formatting
        const moneyInputs = document.querySelectorAll(`#${panelId}-card .money-input`);
        moneyInputs.forEach(input => {
            input.addEventListener('input', function() {
                formatMoneyInput(this);
            });
        });
        
        // Percent input formatting
        const percentInputs = document.querySelectorAll(`#${panelId}-card .percent-input`);
        percentInputs.forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
                if (value === '') return;
                
                if (!isNaN(parseFloat(value))) {
                    e.target.value = value.replace('.', ',');
                }
            });
        });
        
        // Remove button handler
        const removeButton = document.querySelector(`button[data-panel="${panelId}"]`);
        removeButton.addEventListener('click', function() {
            const panelToRemove = document.getElementById(`${panelId}-card`);
            panelToRemove.remove();
        });
    }
    
    // Add extra amortization button handler
    if (addExtraAmortizationBtn) {
        addExtraAmortizationBtn.addEventListener('click', function() {
            const emptyMessage = document.getElementById('noAmortizationsMessage');
            if (emptyMessage) {
                emptyMessage.remove();
            }
            createAmortizationPanel();
        });
    }
    
    // Initialize with empty message
    if (extraAmortizationsContainer && extraAmortizationsContainer.children.length === 0) {
        extraAmortizationsContainer.innerHTML = `
            <div id="noAmortizationsMessage" class="alert alert-secondary text-center">
                <i class="bi bi-info-circle me-2"></i>
                Clique no botão "Adicionar" acima para incluir amortizações extras ao seu financiamento.
            </div>
        `;
    }
    
    // Form submission
    if (loanForm) {
        loanForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loading indicator
            loadingIndicator.classList.remove('d-none');
            resultsSection.classList.add('d-none');
            initialMessage.classList.add('d-none');
            
            const formData = new FormData(loanForm);
            
            // Os dados das amortizações extras já estão na formData pelos inputs do formulário
            
            // Send request to server
            fetch('/calculate', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // Hide loading indicator
                loadingIndicator.classList.add('d-none');
                
                if (data.success) {
                    // Show results section
                    resultsSection.classList.remove('d-none');
                    
                    // Format loan amount value from the form
                    const loanAmount = parseFloat(formData.get('loan_amount').replace(/\./g, '').replace(',', '.'));
                    const loanTerm = parseInt(formData.get('loan_term_months'));
                    
                    // Update summary information
                    summaryLoanAmount.textContent = formatCurrency(loanAmount);
                    summaryLoanTerm.textContent = loanTerm;
                    summaryActualTerm.textContent = data.summary.loan_term_actual;
                    summaryTotalInterest.textContent = formatCurrency(data.summary.total_interest);
                    summaryTotalInsurance.textContent = formatCurrency(data.summary.total_insurance);
                    summaryTotalFee.textContent = formatCurrency(data.summary.total_fee);
                    summaryTotalPayment.textContent = formatCurrency(data.summary.total_payment);
                    
                    // Generate payment table
                    paymentTableBody.innerHTML = '';
                    
                    // Store payment schedule data for chart
                    paymentScheduleData = data.payment_schedule;
                    
                    data.payment_schedule.forEach(payment => {
                        const row = document.createElement('tr');
                        
                        // Add amortization tooltip if there's extra amortization
                        let amortizationCell = `
                            <td>${formatCurrency(payment.amortization)}</td>
                        `;
                        
                        if (payment.extra_amortization > 0) {
                            amortizationCell = `
                                <td data-bs-toggle="tooltip" data-bs-placement="top" 
                                    title="Regular: ${formatCurrency(payment.regular_amortization)} + Extra: ${formatCurrency(payment.extra_amortization)}">
                                    ${formatCurrency(payment.amortization)}*
                                </td>
                            `;
                        }
                        
                        row.innerHTML = `
                            <td>${payment.month}</td>
                            <td>${formatCurrency(payment.payment)}</td>
                            <td>${formatCurrency(payment.interest)}</td>
                            ${amortizationCell}
                            <td>${formatCurrency(payment.insurance)}</td>
                            <td>${formatCurrency(payment.operational_fee)}</td>
                            <td>${formatCurrency(payment.remaining_balance)}</td>
                        `;
                        
                        paymentTableBody.appendChild(row);
                    });
                    
                    // Initialize tooltips
                    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
                    tooltips.forEach(tooltip => {
                        new bootstrap.Tooltip(tooltip);
                    });
                    
                    // Generate payment chart
                    generatePaymentChart(paymentScheduleData);
                } else {
                    alert('Erro ao calcular: ' + data.error);
                    initialMessage.classList.remove('d-none');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                loadingIndicator.classList.add('d-none');
                initialMessage.classList.remove('d-none');
                alert('Erro ao comunicar com o servidor: ' + error);
            });
        });
    }
    
    // Chart period selector handler
    if (chartPeriodSelect) {
        chartPeriodSelect.addEventListener('change', function() {
            if (paymentScheduleData.length > 0) {
                generatePaymentChart(paymentScheduleData);
            }
        });
    }
    
    // Function to generate payment chart
    function generatePaymentChart(payments) {
        if (!loanChart) return;
        
        // Get selected period
        const selectedPeriod = chartPeriodSelect ? chartPeriodSelect.value : 'all';
        
        // Filter data based on selected period
        let filteredPayments = [...payments];
        if (selectedPeriod !== 'all') {
            const months = parseInt(selectedPeriod);
            filteredPayments = payments.filter(payment => payment.month <= months);
        }
        
        // Prepare data for the chart
        const labels = filteredPayments.map(payment => `Mês ${payment.month}`);
        
        // Corrigindo a representação da prestação e do juros
        const paymentData = filteredPayments.map(payment => {
            // Prestação total (sem amortizações extras)
            return payment.interest + payment.regular_amortization + payment.insurance + payment.operational_fee;
        });
        const interestData = filteredPayments.map(payment => payment.interest);
        const regularAmortizationData = filteredPayments.map(payment => payment.regular_amortization);
        
        // Destroy previous chart if it exists
        if (paymentChart) {
            paymentChart.destroy();
        }
        
        // Create new chart
        paymentChart = new Chart(loanChart, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Prestação (sem extras)',
                        data: paymentData,
                        borderColor: '#6f42c1',
                        backgroundColor: 'rgba(111, 66, 193, 0.1)',
                        fill: false,
                        tension: 0.1,
                        borderWidth: 2
                    },
                    {
                        label: 'Juros',
                        data: interestData,
                        borderColor: '#fd7e14',
                        backgroundColor: 'rgba(253, 126, 20, 0.1)',
                        fill: false,
                        tension: 0.1,
                        borderWidth: 2
                    },
                    {
                        label: 'Amortização Principal',
                        data: regularAmortizationData,
                        borderColor: '#20c997',
                        backgroundColor: 'rgba(32, 201, 151, 0.1)',
                        fill: false,
                        tension: 0.1,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                return context.dataset.label + ': ' + formatCurrency(value);
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Evolução do Financiamento'
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 90,
                            minRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 20
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Print button handler
    if (printResults) {
        printResults.addEventListener('click', function() {
            window.print();
        });
    }
});
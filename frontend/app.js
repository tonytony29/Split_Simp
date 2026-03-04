document.addEventListener('DOMContentLoaded', () => {
    
    // --- State ---
    let expenses = [
        { id: 'e1', description: 'Dinner', amount: 120.50, date: '2026-03-01', payer: 'Alice', splitAmong: ['u1', 'u2', 'u3'] },
        { id: 'e2', description: 'Taxi', amount: 35.00, date: '2026-03-02', payer: 'You', splitAmong: ['u1', 'u2'] }
    ];
    const groupMembers = [
        { id: 'u1', name: 'You', avatar: 'Y' },
        { id: 'u2', name: 'Alice', avatar: 'A' },
        { id: 'u3', name: 'Bob', avatar: 'B' }
    ];
    let currentEditingId = null; // Track if we are editing an existing expense

    // --- DOM Elements ---
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    const expenseModal = document.getElementById('expenseModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const saveExpenseBtn = document.getElementById('saveExpenseBtn');
    const deleteExpenseBtn = document.getElementById('deleteExpenseBtn');
    const modalTitle = document.getElementById('modalTitle');
    
    const amountInput = document.getElementById('amount');
    const descInput = document.getElementById('description');
    const dateInput = document.getElementById('date');
    const payerSelect = document.getElementById('payer');
    const splitMemberList = document.getElementById('splitMemberList');
    const expenseListContainer = document.getElementById('expenseList');

    // --- Core Functions ---

    function renderExpenses() {
        expenseListContainer.innerHTML = '';
        if (expenses.length === 0) {
            expenseListContainer.innerHTML = '<li class="empty-state">No expenses yet.</li>';
            return;
        }

        expenses.forEach(exp => {
            const li = document.createElement('li');
            li.className = 'expense-item';
            li.dataset.id = exp.id;
            li.innerHTML = `
                <div class="expense-details">
                    <h4>${exp.description}</h4>
                    <span class="expense-date">${exp.date} • Paid by ${exp.payer}</span>
                </div>
                <div class="expense-amount">$${exp.amount.toFixed(2)}</div>
            `;
            
            // Add click event for editing
            li.addEventListener('click', () => openEditModal(exp));
            
            expenseListContainer.appendChild(li);
        });
    }

    function renderSplitMembers() {
        splitMemberList.innerHTML = '';
        groupMembers.forEach(member => {
            const div = document.createElement('div');
            div.className = 'member-item selected'; 
            div.dataset.id = member.id;
            div.innerHTML = `
                <div class="member-info">
                    <div class="avatar">${member.avatar}</div>
                    <span>${member.name}</span>
                </div>
                <div class="checkbox"></div>
            `;
            div.addEventListener('click', () => {
                div.classList.toggle('selected');
            });
            splitMemberList.appendChild(div);
        });
    }

    function updateBalanceCard() {
        let myNetBalance = 0;
        const myId = 'u1';
        const myName = 'You';

        expenses.forEach(exp => {
            const totalAmount = exp.amount;
            const paidByMe = (exp.payer === myName) ? totalAmount : 0;
            const splitArray = exp.splitAmong || ['u1', 'u2', 'u3'];
            let myShare = 0;
            
            if (splitArray.includes(myId)) {
                myShare = totalAmount / splitArray.length;
            }
            myNetBalance += (paidByMe - myShare);
        });

        const balanceEl = document.querySelector('.balance');
        if (myNetBalance > 0.01) {
            balanceEl.textContent = `You are owed: $${myNetBalance.toFixed(2)}`;
            balanceEl.className = 'balance positive-balance';
        } else if (myNetBalance < -0.01) {
            balanceEl.textContent = `You owe: $${Math.abs(myNetBalance).toFixed(2)}`;
            balanceEl.className = 'balance negative-balance';
        } else {
            balanceEl.textContent = `Settled up`;
            balanceEl.className = 'balance neutral-balance';
        }
    }

    function resetForm() {
        currentEditingId = null;
        modalTitle.textContent = 'Add Expense';
        deleteExpenseBtn.classList.add('hidden');
        amountInput.value = '';
        descInput.value = '';
        dateInput.value = new Date().toISOString().split('T')[0];
        payerSelect.selectedIndex = 0;
        document.querySelectorAll('.member-item').forEach(el => el.classList.add('selected'));
    }

    function openEditModal(exp) {
        currentEditingId = exp.id;
        modalTitle.textContent = 'Edit Expense';
        deleteExpenseBtn.classList.remove('hidden');
        
        amountInput.value = exp.amount;
        descInput.value = exp.description;
        dateInput.value = exp.date;
        
        // Set payer dropdown
        for(let i = 0; i < payerSelect.options.length; i++) {
            if(payerSelect.options[i].text === exp.payer) {
                payerSelect.selectedIndex = i;
                break;
            }
        }
        
        // Set split members checkboxes
        document.querySelectorAll('.member-item').forEach(el => {
            if (exp.splitAmong && exp.splitAmong.includes(el.dataset.id)) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });

        expenseModal.classList.remove('hidden');
    }

    // --- Event Listeners ---

    addExpenseBtn.addEventListener('click', () => {
        resetForm();
        expenseModal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', () => {
        expenseModal.classList.add('hidden');
    });

    deleteExpenseBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this expense?')) {
            expenses = expenses.filter(e => e.id !== currentEditingId);
            renderExpenses();
            updateBalanceCard();
            expenseModal.classList.add('hidden');
        }
    });

    saveExpenseBtn.addEventListener('click', () => {
        const amount = parseFloat(amountInput.value);
        const desc = descInput.value.trim();
        const date = dateInput.value;
        const payerName = payerSelect.options[payerSelect.selectedIndex].text;
        
        if (!amount || !desc) {
            alert('Please fill in both amount and description.');
            return;
        }

        const selectedMembers = Array.from(document.querySelectorAll('.member-item.selected'))
                                     .map(el => el.dataset.id);

        if (selectedMembers.length === 0) {
            alert('Please select at least one person to split with.');
            return;
        }

        if (currentEditingId) {
            // Update existing expense
            const index = expenses.findIndex(e => e.id === currentEditingId);
            if (index !== -1) {
                expenses[index] = { ...expenses[index], description: desc, amount: amount, date: date, payer: payerName, splitAmong: selectedMembers };
            }
        } else {
            // Add new expense
            const newExpense = {
                id: 'e' + Date.now(),
                description: desc,
                amount: amount,
                date: date,
                payer: payerName,
                splitAmong: selectedMembers
            };
            expenses.unshift(newExpense);
        }

        renderExpenses();
        updateBalanceCard();
        expenseModal.classList.add('hidden');
    });

    // --- Initialize ---
    renderSplitMembers();
    renderExpenses();
    updateBalanceCard();
});
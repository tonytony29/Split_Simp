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

    // --- Core Functions for Split Blocks ---
    let blockCounter = 1;
    const MAX_BLOCKS = 8;
    const splitBlocksWrapper = document.getElementById('splitBlocksWrapper');
    const blockCountDisplay = document.getElementById('blockCount');
    const addBlockBtn = document.getElementById('addBlockBtn');

    // Function to render members inside a specific block based on its mode
    function renderMembersInBlock(blockElement) {
        const membersContainer = blockElement.querySelector('.block-members');
        const mode = blockElement.querySelector('.block-mode-select').value;
        membersContainer.innerHTML = ''; // Clear previous

        groupMembers.forEach(member => {
            const div = document.createElement('div');
            // By default, members in the first block are selected. New blocks are unselected.
            const isFirstBlock = blockElement.dataset.blockId === '1';
            div.className = `member-item ${isFirstBlock ? 'selected' : ''}`;
            div.dataset.id = member.id;

            // Generate different input based on mode
            let rightSideHTML = '';
            if (mode === 'shares') {
                rightSideHTML = `
                    <div class="member-input-wrapper">
                        <input type="number" class="member-val-input shares-input" value="1" min="1" step="1" ${isFirstBlock ? '' : 'disabled'}>
                        <div class="checkbox"></div>
                    </div>
                `;
            } else if (mode === 'amount') {
                rightSideHTML = `
                    <div class="member-input-wrapper">
                        <span class="currency-symbol" style="font-size: 1rem; margin-right: 0;">$</span>
                        <input type="number" class="member-val-input amount-input" placeholder="0.00" step="0.01" ${isFirstBlock ? '' : 'disabled'}>
                        <div class="checkbox"></div>
                    </div>
                `;
            }

            div.innerHTML = `
                <div class="member-info">
                    <div class="avatar">${member.avatar}</div>
                    <span>${member.name}</span>
                </div>
                ${rightSideHTML}
            `;

            // Toggle logic: enable/disable input when checking/unchecking
            div.addEventListener('click', (e) => {
                // Don't toggle if clicking directly on the input field
                if (e.target.tagName === 'INPUT') return;

                const isSelected = div.classList.toggle('selected');
                const inputField = div.querySelector('.member-val-input');
                if (inputField) {
                    inputField.disabled = !isSelected;
                    // Auto focus if it's an amount input
                    if (isSelected && mode === 'amount') {
                        inputField.focus();
                    }
                }
            });

            membersContainer.appendChild(div);
        });
    }

    // Function to initialize an existing block (attach event listeners)
    function initBlock(blockElement) {
        const modeSelect = blockElement.querySelector('.block-mode-select');
        const deleteBtn = blockElement.querySelector('.delete-block-btn');

        // Re-render members when mode changes (Shares <-> Amount)
        modeSelect.addEventListener('change', () => {
            renderMembersInBlock(blockElement);
        });

        // Delete block logic
        deleteBtn.addEventListener('click', () => {
            blockElement.remove();
            blockCounter--;
            updateBlockCountUI();
        });

        // Initial render for this block
        renderMembersInBlock(blockElement);
    }

    // Function to update the "1/8" counter and disable add button if max reached
    function updateBlockCountUI() {
        blockCountDisplay.textContent = `${blockCounter}/${MAX_BLOCKS}`;
        if (blockCounter >= MAX_BLOCKS) {
            addBlockBtn.disabled = true;
            addBlockBtn.style.opacity = '0.5';
            addBlockBtn.style.cursor = 'not-allowed';
        } else {
            addBlockBtn.disabled = false;
            addBlockBtn.style.opacity = '1';
            addBlockBtn.style.cursor = 'pointer';
        }
    }

    // Event Listener for Add Block button
    addBlockBtn.addEventListener('click', () => {
        if (blockCounter >= MAX_BLOCKS) return;
        
        blockCounter++;
        const newBlockId = Date.now().toString(); // Use timestamp as unique ID
        
        const newBlock = document.createElement('div');
        newBlock.className = 'split-block';
        newBlock.dataset.blockId = newBlockId;
        newBlock.innerHTML = `
            <div class="block-top">
                <input type="text" class="form-control block-name-input" placeholder="Item name (optional)">
                <select class="form-control block-mode-select">
                    <option value="shares">By Shares</option>
                    <option value="amount">By Amount</option>
                </select>
                <button type="button" class="icon-btn delete-block-btn">&times;</button>
            </div>
            <div class="block-members"></div>
        `;
        
        splitBlocksWrapper.appendChild(newBlock);
        initBlock(newBlock);
        updateBlockCountUI();
    });

    function renderSplitMembers() {
        const firstBlock = document.querySelector('.split-block[data-block-id="1"]');
        if (firstBlock) {
            initBlock(firstBlock);
            updateBlockCountUI();
        }
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
        document.getElementById('modalTitle').textContent = 'Add Expense';
        
        const deleteBtn = document.getElementById('deleteExpenseBtn');
        if (deleteBtn) deleteBtn.classList.add('hidden');
        
        // Reset Description and Date
        document.getElementById('description').value = '';
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        
        // Reset Payers Section
        document.querySelectorAll('#payersList .member-item').forEach(el => {
            el.classList.remove('selected');
            const input = el.querySelector('.payer-amount-input');
            if (input) {
                input.value = '';
                input.disabled = true;
            }
        });
        document.getElementById('payersSummary').textContent = 'Total Paid: $0.00 ▼';
        document.getElementById('payersList').classList.add('hidden');
        
        // Reset Blocks Section
        const allBlocks = document.querySelectorAll('.split-block');
        allBlocks.forEach((block, index) => {
            if (index === 0) {
                // Reset the first block to default
                const nameInput = block.querySelector('.block-name-input');
                if (nameInput) nameInput.value = '';
                
                const modeSelect = block.querySelector('.block-mode-select');
                if (modeSelect) {
                    modeSelect.value = 'shares';
                    // Trigger change event to re-render members
                    modeSelect.dispatchEvent(new Event('change')); 
                }
            } else {
                // Remove any extra blocks added previously
                block.remove();
            }
        });
        
        blockCounter = 1;
        if (typeof updateBlockCountUI === 'function') {
            updateBlockCountUI();
        }
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

    // --- Payers Logic ---
    const payersSummary = document.getElementById('payersSummary');
    const payersList = document.getElementById('payersList');

    // Toggle payers list visibility
    payersSummary.addEventListener('click', () => {
        payersList.classList.toggle('hidden');
    });

    function updateTotalPaid() {
        const payerItems = document.querySelectorAll('#payersList .member-item');
        let total = 0;
        let activePayers = []; // 用來收集有付款的人名

        payerItems.forEach(item => {
            const input = item.querySelector('.payer-amount-input');
            if (!input.disabled && input.value && parseFloat(input.value) > 0) {
                total += parseFloat(input.value);
                // 抓取該 input 對應的成員名字
                const memberName = item.querySelector('.member-info span').textContent;
                activePayers.push(memberName);
            }
        });

        const payersSummary = document.getElementById('payersSummary');
        
        // 判斷顯示邏輯
        if (activePayers.length === 1) {
            payersSummary.textContent = `${activePayers[0]} Paid: $${total.toFixed(2)} ▼`;
        } else {
            payersSummary.textContent = `Total Paid: $${total.toFixed(2)} ▼`;
        }
    }

    function renderPayers() {
        payersList.innerHTML = '';
        groupMembers.forEach(member => {
            const div = document.createElement('div');
            div.className = 'member-item'; // Default unselected
            div.dataset.id = member.id;
            
            div.innerHTML = `
                <div class="member-info">
                    <div class="avatar">${member.avatar}</div>
                    <span>${member.name}</span>
                </div>
                <div class="member-input-wrapper">
                    <span class="currency-symbol" style="font-size: 1rem; margin-right: 0;">$</span>
                    <input type="number" class="member-val-input payer-amount-input" placeholder="0.00" step="0.01" disabled>
                    <div class="checkbox"></div>
                </div>
            `;

            // Checkbox toggle logic
            div.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return;

                const isSelected = div.classList.toggle('selected');
                const inputField = div.querySelector('.payer-amount-input');
                
                if (isSelected) {
                    inputField.disabled = false;
                    inputField.focus();
                } else {
                    inputField.disabled = true;
                    inputField.value = ''; // Clear value to 0 when unselected
                    updateTotalPaid();
                }
            });

            // Update total on type
            const inputField = div.querySelector('.payer-amount-input');
            inputField.addEventListener('input', updateTotalPaid);

            payersList.appendChild(div);
        });
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
    renderPayers();
    renderExpenses();
    updateBalanceCard();
});
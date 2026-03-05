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
                        <span class="calculated-amount" style="font-size: 0.85rem; color: var(--text-secondary); min-width: 50px; text-align: right; margin-right: 8px;">$0.00</span>
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
                if (e.target.tagName === 'INPUT') return;

                const isSelected = div.classList.toggle('selected');
                const inputField = div.querySelector('.member-val-input');
                
                if (inputField) {
                    inputField.disabled = !isSelected;
                    
                    if (!isSelected) {
                        // Reset when unchecked
                        inputField.value = '';
                        
                        // Explicitly unmark manual status so it can become a sponge again if re-checked
                        if (inputField.classList.contains('amount-input')) {
                            inputField.dataset.manual = 'false';
                        }
                    } else {
                        // When re-checked, restore default behavior based on mode
                        const currentMode = blockElement.querySelector('.block-mode-select').value;
                        if (currentMode === 'shares' && inputField.value === '') {
                            // Restore default share weight
                            inputField.value = '1';
                        } else if (currentMode === 'amount') {
                            inputField.focus();
                        }
                    }
                }
                
                distributeBlockAmount(blockElement);
                syncGlobalTotal('blocks');
            });

            const inputField = div.querySelector('.member-val-input');
            if (inputField) {
                inputField.addEventListener('input', (e) => {
                    // Mark as manually edited if user explicitly types an amount
                    if (inputField.classList.contains('amount-input')) {
                        inputField.dataset.manual = 'true';
                    }
                    
                    distributeBlockAmount(blockElement);
                    syncGlobalTotal('blocks');
                });
            }

            membersContainer.appendChild(div);
        });
    }

    // Function to initialize an existing block (attach event listeners)
    function initBlock(blockElement) {
        const modeSelect = blockElement.querySelector('.block-mode-select');
        const deleteBtn = blockElement.querySelector('.delete-block-btn');
        const blockAmountInput = blockElement.querySelector('.block-amount-input');

        // Handle mode change
        modeSelect.addEventListener('change', () => {
            // 1. Keep the current block total before doing anything
            const currentBlockTotal = blockAmountInput ? blockAmountInput.value : 0;
            
            // 2. Re-render the members (which resets their inputs)
            renderMembersInBlock(blockElement);
            
            // 3. If switching to 'amount', immediately distribute the total to the empty inputs
            if (modeSelect.value === 'amount') {
                if (blockAmountInput) blockAmountInput.value = currentBlockTotal;
                distributeBlockAmount(blockElement);
            }
            
            // 4. Now it's safe to calculate the grand total without getting 0
            calculateGrandTotal(); 
        });

        // Handle block amount input changes
        if (blockAmountInput) {
            blockAmountInput.addEventListener('input', () => {
                distributeBlockAmount(blockElement); // Update members inside
                syncGlobalTotal('blocks');           // Push total up to payers
            });
        }

        // Handle block deletion
        deleteBtn.addEventListener('click', () => {
            blockElement.remove();
            blockCounter--;
            updateBlockCountUI();
            calculateGrandTotal(); // Recalculate after deleting a block
        });

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
        const newBlockId = Date.now().toString(); 
        
        const newBlock = document.createElement('div');
        newBlock.className = 'split-block';
        newBlock.dataset.blockId = newBlockId;
        
        // Added the block-amount-input field
        newBlock.innerHTML = `
            <div class="block-top">
                <input type="text" class="form-control block-name-input" placeholder="Item name">
                <input type="number" class="form-control block-amount-input" placeholder="Total $" style="width: 80px;">
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
    let globalTotalAmount = 1000; // For testing, will be dynamically updated by Blocks later
    let payersState = [];

    // Toggle payers list visibility
    payersSummary.addEventListener('click', () => {
        payersList.classList.toggle('hidden');
    });

    function renderPayers() {
        payersList.innerHTML = '';
        if (payersState.length === 0) initPayersState();

        groupMembers.forEach(member => {
            const div = document.createElement('div');
            div.className = 'member-item';
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

            // 1. Handle Checkbox / Row Click
            div.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return;

                const state = payersState.find(p => p.id === member.id);
                state.isChecked = !state.isChecked;

                if (!state.isChecked) {
                    state.amount = 0;
                    state.isManual = false;
                    state.editTime = null;
                } else {
                    state.isManual = false; // Join as auto-calculated initially
                    state.editTime = Date.now();
                }

                recalculatePayers('payers');
                updatePayersUI();
                syncGlobalTotal('payers');
            });

            // 2. Handle Amount Input
            const inputField = div.querySelector('.payer-amount-input');
            inputField.addEventListener('input', (e) => {
                const state = payersState.find(p => p.id === member.id);
                let val = parseFloat(e.target.value);
                
                if (isNaN(val) || val < 0) val = 0;
                
                state.amount = val;
                state.isManual = true; 
                state.editTime = Date.now();

                recalculatePayers('payers');
                updatePayersUI();
                syncGlobalTotal('payers');
            });

            payersList.appendChild(div);
        });
    }

    function initPayersState() {
        payersState = groupMembers.map(member => ({
            id: member.id,
            amount: 0,
            isManual: false,
            editTime: null,
            isChecked: false // Unchecked by default
        }));
    }

    function recalculatePayers(source = 'system') {
        let checkedPayers = payersState.filter(p => p.isChecked);
        if (checkedPayers.length === 0) return;

        let manualPayers = checkedPayers.filter(p => p.isManual);
        let manualSum = manualPayers.reduce((sum, p) => sum + p.amount, 0);

        if (source === 'payers') {
            // When user is explicitly typing, the total should grow to accommodate inputs
            if (manualSum > globalTotalAmount) globalTotalAmount = manualSum;
            // If everyone is manually typed, the total is exactly their sum
            if (manualPayers.length === checkedPayers.length) globalTotalAmount = manualSum;
        } else {
            // When syncing from blocks, strict fail-safe applies to fit the fixed globalTotalAmount
            if (manualPayers.length === checkedPayers.length && checkedPayers.length > 1 && globalTotalAmount !== manualSum) {
                let oldestPayer = manualPayers.reduce((prev, curr) => 
                    (prev.editTime < curr.editTime) ? prev : curr
                );
                oldestPayer.isManual = false;
                manualPayers = checkedPayers.filter(p => p.isManual);
                manualSum = manualPayers.reduce((sum, p) => sum + p.amount, 0);
            }
        }

        let autoPayers = checkedPayers.filter(p => !p.isManual);
        if (autoPayers.length > 0) {
            let remaining = Math.max(0, globalTotalAmount - manualSum);
            let autoAmount = remaining / autoPayers.length;
            autoPayers.forEach(p => {
                p.amount = autoAmount;
            });
        }
    }

    function calculateGrandTotal() {
        let newTotal = 0;
        const blocks = document.querySelectorAll('.split-block');
        
        blocks.forEach(block => {
            const mode = block.querySelector('.block-mode-select').value;
            
            if (mode === 'shares') {
                const blockAmtInput = block.querySelector('.block-amount-input');
                const blockTotal = parseFloat(blockAmtInput ? blockAmtInput.value : 0) || 0;
                newTotal += blockTotal;

                // Calculate total shares for active members
                const activeMembers = Array.from(block.querySelectorAll('.member-item.selected'));
                let totalShares = 0;
                activeMembers.forEach(item => {
                    const shareInput = item.querySelector('.shares-input');
                    if (shareInput) {
                        totalShares += parseFloat(shareInput.value) || 0;
                    }
                });

                // Update UI for active members
                activeMembers.forEach(item => {
                    const shareInput = item.querySelector('.shares-input');
                    const calcSpan = item.querySelector('.calculated-amount');
                    if (calcSpan && totalShares > 0 && shareInput) {
                        const shares = parseFloat(shareInput.value) || 0;
                        const memberAmt = blockTotal * (shares / totalShares);
                        calcSpan.textContent = `$${memberAmt.toFixed(2)}`;
                    } else if (calcSpan) {
                        calcSpan.textContent = `$0.00`;
                    }
                });

                // Reset UI for inactive members
                const inactiveMembers = Array.from(block.querySelectorAll('.member-item:not(.selected)'));
                inactiveMembers.forEach(item => {
                    const calcSpan = item.querySelector('.calculated-amount');
                    if (calcSpan) calcSpan.textContent = `$0.00`;
                });
            } else if (mode === 'amount') {
                // For 'By Amount', sum up the individual member inputs
                const memberInputs = block.querySelectorAll('.amount-input');
                memberInputs.forEach(input => {
                    if (!input.disabled) {
                        newTotal += (parseFloat(input.value) || 0);
                    }
                });
            }
        });

        // 1. Update the global total amount
        globalTotalAmount = newTotal;
        
        // 2. Trigger recalculation and update the Payers UI
        recalculatePayers();
        updatePayersUI();
        syncGlobalTotal('payers');
    }

    function updatePayersUI() {
        const payerItems = document.querySelectorAll('#payersList .member-item');
        let total = 0;
        let activePayers = [];

        payerItems.forEach(item => {
            const id = item.dataset.id;
            const state = payersState.find(p => p.id === id);
            const input = item.querySelector('.payer-amount-input');
            const memberName = item.querySelector('.member-info span').textContent;

            if (state.isChecked) {
                item.classList.add('selected');
                input.disabled = false;
                
                // Only overwrite the input value if it's auto-calculated
                // (Prevents cursor jumping while user is typing manually)
                if (!state.isManual) {
                    input.value = state.amount > 0 ? state.amount.toFixed(2) : '';
                }
                
                if (state.amount > 0) {
                    total += state.amount;
                    activePayers.push(memberName);
                }
            } else {
                item.classList.remove('selected');
                input.disabled = true;
                input.value = '';
            }
        });

        // Update Summary Text
        const payersSummary = document.getElementById('payersSummary');
        if (activePayers.length === 1) {
            payersSummary.textContent = `${activePayers[0]} Paid: $${total.toFixed(2)} ▼`;
        } else {
            payersSummary.textContent = `Total Paid: $${total.toFixed(2)} ▼`;
        }
    }

    function syncGlobalTotal(source) {
        if (source === 'blocks') {
            // Blocks triggered the change -> Update total and sync Payers
            let newTotal = 0;
            const blocks = document.querySelectorAll('.split-block');
            
            blocks.forEach(block => {
                const mode = block.querySelector('.block-mode-select').value;
                if (mode === 'shares') {
                    const blockAmtInput = block.querySelector('.block-amount-input');
                    newTotal += (parseFloat(blockAmtInput?.value) || 0);
                } else if (mode === 'amount') {
                    const memberInputs = block.querySelectorAll('.amount-input');
                    memberInputs.forEach(input => {
                        if (!input.disabled) newTotal += (parseFloat(input.value) || 0);
                    });
                }
            });

            globalTotalAmount = newTotal;
            recalculatePayers();
            updatePayersUI();
            syncGlobalTotal('payers');

        } else if (source === 'payers') {
            let newTotal = payersState.reduce((sum, p) => sum + (p.amount || 0), 0);
            globalTotalAmount = newTotal;
            
            const blocks = document.querySelectorAll('.split-block');
            if (blocks.length === 1) {
                const blockAmtInput = blocks[0].querySelector('.block-amount-input');
                if (blockAmtInput) {
                    blockAmtInput.value = globalTotalAmount.toFixed(2);
                    // Force the internal distribution to update members
                    distributeBlockAmount(blocks[0]); 
                }
            }
        }
    }

    function distributeBlockAmount(blockElement) {
        const mode = blockElement.querySelector('.block-mode-select').value;
        const blockAmtInput = blockElement.querySelector('.block-amount-input');
        const blockTotal = parseFloat(blockAmtInput ? blockAmtInput.value : 0) || 0;
        const activeMembers = Array.from(blockElement.querySelectorAll('.member-item.selected'));

        if (mode === 'shares') {
            let totalShares = 0;
            activeMembers.forEach(item => {
                const shareInput = item.querySelector('.shares-input');
                if (shareInput) totalShares += parseFloat(shareInput.value) || 0;
            });

            activeMembers.forEach(item => {
                const shareInput = item.querySelector('.shares-input');
                const calcSpan = item.querySelector('.calculated-amount');
                if (calcSpan && totalShares > 0 && shareInput) {
                    const shares = parseFloat(shareInput.value) || 0;
                    const memberAmt = blockTotal * (shares / totalShares);
                    calcSpan.textContent = `$${memberAmt.toFixed(2)}`;
                }
            });
        } else if (mode === 'amount') {
            let manualSum = 0;
            let autoMembers = [];

            activeMembers.forEach(item => {
                const input = item.querySelector('.amount-input');
                if (input && input.dataset.manual === 'true') {
                    manualSum += parseFloat(input.value) || 0;
                } else if (input) {
                    autoMembers.push(input);
                }
            });

            if (autoMembers.length > 0) {
                const remaining = Math.max(0, blockTotal - manualSum);
                const autoAmt = remaining / autoMembers.length;
                autoMembers.forEach(input => {
                    input.value = autoAmt > 0 ? autoAmt.toFixed(2) : '';
                });
            }
        }
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
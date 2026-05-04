// ── PASSWORD STRENGTH ─────────────────────────────────────────────────
        function checkPasswordStrength(val) {
            const bar   = document.getElementById('pwStrengthFill');
            const label = document.getElementById('pwStrengthLabel');
            const wrap  = document.getElementById('pwStrength');
 
            if (!val) { wrap.style.display = 'none'; return; }
            wrap.style.display = 'block';
 
            let score = 0;
            if (val.length >= 8)               score++;
            if (/[A-Z]/.test(val))             score++;
            if (/[0-9]/.test(val))             score++;
            if (/[^A-Za-z0-9]/.test(val))      score++;
 
            const levels = [
                { w: '25%', color: '#e74a3b', text: 'Weak' },
                { w: '50%', color: '#f6c23e', text: 'Fair' },
                { w: '75%', color: '#36b9cc', text: 'Good' },
                { w: '100%',color: '#1cc88a', text: 'Strong' }
            ];
            const level = levels[score - 1] || levels[0];
            bar.style.width      = level.w;
            bar.style.background = level.color;
            label.textContent    = level.text;
            label.style.color    = level.color;
        }
 
        // ── STEP NAVIGATION ───────────────────────────────────────────────────
        function setStep(n) {
            ['step1','step2','step3'].forEach((id, i) => {
                document.getElementById(id).style.display = i + 1 === n ? 'block' : 'none';
            });
            ['dot1','dot2','dot3'].forEach((id, i) => {
                const dot = document.getElementById(id);
                dot.className = 'step-dot' + (i + 1 < n ? ' done' : i + 1 === n ? ' active' : '');
            });
            const labels = ['Account details', 'Personal info', 'Done!'];
            document.getElementById('stepLabel').textContent = labels[n - 1];
            if (n === 3) document.getElementById('signinLink').style.display = 'none';
        }
 
        function goStep2() {
            let valid = true;
 
            const name  = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const pw    = document.getElementById('regPassword').value;
            const conf  = document.getElementById('regConfirm').value;
 
            // Name
            if (!name) {
                showErr('name', true); valid = false;
            } else { showErr('name', false); }
 
            // Email
            if (!email || !email.includes('@')) {
                showErr('email', true); valid = false;
            } else { showErr('email', false); }
 
            // Password
            if (pw.length < 8) {
                showErr('password', true); valid = false;
            } else { showErr('password', false); }
 
            // Confirm
            if (pw !== conf || !conf) {
                showErr('confirm', true); valid = false;
            } else { showErr('confirm', false); }
 
            if (valid) setStep(2);
        }
 
        function goStep1() { setStep(1); }
 
        function submitRegister() {
            const terms = document.getElementById('agreeTerms').checked;
            if (!terms) {
                document.getElementById('err-terms').style.display = 'block';
                return;
            }
            document.getElementById('err-terms').style.display = 'none';
 
            const name = document.getElementById('regName').value.trim();
            document.getElementById('successName').textContent = name;
 
            setStep(3);
            // TODO: wire to backend — POST /api/auth/register
        }
 
        function showErr(field, show) {
            const errEl   = document.getElementById('err-' + field);
            const inputEl = document.getElementById('reg' + field.charAt(0).toUpperCase() + field.slice(1));
            if (errEl)   errEl.style.display   = show ? 'block' : 'none';
            if (inputEl) inputEl.className = 'field-input' + (show ? ' error' : '');
        }
 
        // Clear error on input
        ['regName','regEmail','regPassword','regConfirm'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', function() {
                this.classList.remove('error');
                const field = id.replace('reg','').toLowerCase();
                const errEl = document.getElementById('err-' + field);
                if (errEl) errEl.style.display = 'none';
            });
        });
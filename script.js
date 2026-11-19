// ==========================================
// VARIÁVEIS GLOBAIS E ESTADO DO SISTEMA
// ==========================================
let TICKET_PRICE = Number(localStorage.getItem('rifa_ticket_price')) || 10;
let RESERVATION_MAX_HOURS = Number(localStorage.getItem('rifa_reservation_hours')) || 6;
let GLOBAL_OFFICIAL_PIX = localStorage.getItem('rifa_official_pix') || 'protetores.caes@gmail.com';
let PAYMENT_API_TOKEN = localStorage.getItem('rifa_api_token') || '';
let PAYMENT_API_ENDPOINT = localStorage.getItem('rifa_api_endpoint') || 'https://api.mercadopago.com/v1/payments';

let tabVisibilities = JSON.parse(localStorage.getItem('rifa_tabs_visibilities')) || {
    board: true,
    campaigns: true,
    financial: true,
    members: true,
    draw: true
};

let rafflesList = JSON.parse(localStorage.getItem('rifa_simultaneous_list')) || [
    { id: 1, name: "Rifa Solidária Principal - Cão Trancoso", prize: "Pix de R$ 500,00", goal: 1000, pix: GLOBAL_OFFICIAL_PIX, expenses: [], tickets: createInitialTickets() },
    { id: 2, name: "Rifa Extra - Pet Amigo Bob", prize: "Cesta Especial + Pix R$ 300", goal: 800, pix: GLOBAL_OFFICIAL_PIX, expenses: [], tickets: createInitialTickets() }
];

let activeRaffleId = Number(localStorage.getItem('active_raffle_id')) || 1;
let memberWaitlist = JSON.parse(localStorage.getItem('rifa_member_waitlist')) || [];
let approvedMembers = JSON.parse(localStorage.getItem('rifa_approved_members')) || [];
let registeredAdmins = JSON.parse(localStorage.getItem('rifa_registered_admins')) || [
    { id: 1, name: "Voluntário Padrão", pin: "1234" }
];

let dogsMediaList = JSON.parse(localStorage.getItem('rifa_dogs_media_list')) || [
    { id: 1, name: "Trancoso", type: "image", url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800" }
];

let selectedNumbers = [];
let userRole = 'client'; // 'client', 'admin_minor', ou 'super_admin'
let currentAdminName = 'Modo Comprador';
let lastWinnerInfo = null;

function formatTicketNumber(num) {
    return String(num).padStart(num >= 100 ? 3 : 2, '0');
}

function createInitialTickets() {
    let list = [];
    for (let i = 1; i <= 100; i++) {
        list.push({ 
            number: i, 
            status: 'available', 
            buyerName: '', 
            buyerPhone: '', 
            sellerName: 'Voluntário', 
            reservedAt: null, 
            ticketPrice: TICKET_PRICE 
        });
    }
    return list;
}

function getActiveRaffle() {
    return rafflesList.find(r => r.id === activeRaffleId) || rafflesList[0];
}

function checkExpiredReservations() {
    const currentTime = Date.now();
    const limitMs = RESERVATION_MAX_HOURS * 60 * 60 * 1000;
    let changed = false;

    rafflesList.forEach(raf => {
        if (!raf.expenses) raf.expenses = [];
        if (!raf.tickets) raf.tickets = createInitialTickets();
        raf.tickets.forEach(t => {
            if (t.status === 'reserved' && t.reservedAt) {
                if (currentTime - t.reservedAt > limitMs) {
                    t.status = 'available';
                    t.buyerName = '';
                    t.buyerPhone = '';
                    t.reservedAt = null;
                    changed = true;
                }
            }
        });
    });
    if (changed) saveAppData();
}
setInterval(checkExpiredReservations, 60000);

function saveAppData() {
    localStorage.setItem('rifa_simultaneous_list', JSON.stringify(rafflesList));
    localStorage.setItem('active_raffle_id', activeRaffleId);
    localStorage.setItem('rifa_member_waitlist', JSON.stringify(memberWaitlist));
    localStorage.setItem('rifa_approved_members', JSON.stringify(approvedMembers));
    localStorage.setItem('rifa_registered_admins', JSON.stringify(registeredAdmins));
    localStorage.setItem('rifa_dogs_media_list', JSON.stringify(dogsMediaList));
    localStorage.setItem('rifa_ticket_price', TICKET_PRICE);
    localStorage.setItem('rifa_reservation_hours', RESERVATION_MAX_HOURS);
    localStorage.setItem('rifa_official_pix', GLOBAL_OFFICIAL_PIX);
    localStorage.setItem('rifa_api_token', PAYMENT_API_TOKEN);
    localStorage.setItem('rifa_api_endpoint', PAYMENT_API_ENDPOINT);
    localStorage.setItem('rifa_tabs_visibilities', JSON.stringify(tabVisibilities));

    renderGrid();
    renderFinancialTable();
    renderCampaignsUI();
    renderDogsMediaUI();
    renderMembersUI();
    renderAdminsUI();
    populateExpenseSelect();
    populateDrawSelect();
    applyTabsVisibility();
}

function applyConfigToUI() {
    checkExpiredReservations();
    const raf = getActiveRaffle();

    const titleElem = document.getElementById('raffle-title-text');
    const prizeElem = document.getElementById('raffle-prize-text');
    const priceElem = document.getElementById('raffle-price-text');
    const pixElem = document.getElementById('pix-key-display');
    const activeBadge = document.getElementById('active-raffle-badge');
    const publicLinkInput = document.getElementById('app-public-link-input');
    const dogPhotoImg = document.getElementById('dog-photo-img');

    if (titleElem) titleElem.innerText = raf.name;
    if (prizeElem) prizeElem.innerText = raf.prize;
    if (priceElem) priceElem.innerText = 'R$ ' + TICKET_PRICE.toFixed(2) + ' por bilhete';
    if (pixElem) pixElem.innerText = GLOBAL_OFFICIAL_PIX;
    if (activeBadge) activeBadge.innerText = `Rifa Ativa: ${raf.name}`;
    if (publicLinkInput) publicLinkInput.value = window.location.href;

    if (dogPhotoImg && dogsMediaList.length > 0) {
        dogPhotoImg.src = dogsMediaList[0].url;
    }

    const setPriceInp = document.getElementById('setting-ticket-price');
    const setHoursInp = document.getElementById('setting-reservation-hours');
    const setPixInp = document.getElementById('setting-official-pix');
    const setApiTokenInp = document.getElementById('setting-api-token');
    const setApiEndpointInp = document.getElementById('setting-api-endpoint');

    if (setPriceInp) setPriceInp.value = TICKET_PRICE;
    if (setHoursInp) setHoursInp.value = RESERVATION_MAX_HOURS;
    if (setPixInp) setPixInp.value = GLOBAL_OFFICIAL_PIX;
    if (setApiTokenInp) setApiTokenInp.value = PAYMENT_API_TOKEN;
    if (setApiEndpointInp) setApiEndpointInp.value = PAYMENT_API_ENDPOINT;

    renderGrid();
    renderCampaignsUI();
    renderDogsMediaUI();
    renderFinancialTable();
    renderMembersUI();
    renderAdminsUI();
    populateExpenseSelect();
    populateDrawSelect();
    applyTabsVisibility();
}

function togglePaymentFields() {
    const select = document.getElementById('payment-method-select');
    if (!select) return;
    const method = select.value;
    const cpfInput = document.getElementById('buyer-cpf');
    if (cpfInput) {
        if (method === 'pix_automatico' || method === 'debito_conta' || method === 'cartao_credito') {
            cpfInput.setAttribute('required', 'true');
        } else {
            cpfInput.removeAttribute('required');
        }
    }
}

// ==========================================
// COMPRA E REGRAS DE SEGURANÇA DE PAGAMENTO
// ==========================================
async function confirmPurchase() {
    const nameElem = document.getElementById('buyer-name');
    const phoneElem = document.getElementById('buyer-phone');
    const cpfElem = document.getElementById('buyer-cpf');
    const methodElem = document.getElementById('payment-method-select');
    const wantsMemberElem = document.getElementById('buyer-wants-member');
    const statusElem = document.getElementById('buyer-status');

    const name = nameElem && nameElem.value.trim() ? nameElem.value.trim() : '';
    const phone = phoneElem ? phoneElem.value.trim() : '';
    const cpf = cpfElem ? cpfElem.value.trim() : '';
    const method = methodElem ? methodElem.value : 'pix_automatico';
    const wantsMember = wantsMemberElem ? wantsMemberElem.checked : false;

    let requestedStatus = statusElem ? statusElem.value : 'reserved';
    if (requestedStatus === 'paid' && userRole !== 'super_admin') {
        alert("🔒 AVISO DE SEGURANÇA: O status 'PAGO' só pode ser confirmado definitivamente pelo ADM Maior. O bilhete será marcado como RESERVADO.");
        requestedStatus = 'reserved';
    }

    if (!name || !phone) return alert("Por favor, preencha o Nome e WhatsApp.");

    const phoneExistsInWaitlist = memberWaitlist.some(m => m.phone === phone);
    const phoneExistsInApproved = approvedMembers.some(m => m.phone === phone);
    if (wantsMember && (phoneExistsInWaitlist || phoneExistsInApproved)) {
        return alert("Erro: Este número de telefone já está cadastrado como membro ou na lista de espera.");
    }

    const totalAmount = selectedNumbers.length * TICKET_PRICE;
    const raf = getActiveRaffle();

    if (userRole === 'client' && (method === 'pix_automatico' || method === 'debito_conta')) {
        if (!cpf) return alert("Preencha o CPF para gerar a cobrança via API do banco.");

        const submitBtn = document.getElementById('btn-submit-checkout');
        if (submitBtn) {
            submitBtn.innerText = "Conectando ao Banco...";
            submitBtn.disabled = true;
        }

        try {
            const paymentResult = await processRealBankApiPayment({
                name,
                phone,
                cpf,
                amount: totalAmount,
                numbers: selectedNumbers,
                method,
                raffleName: raf.name
            });

            selectedNumbers.forEach(num => {
                const t = raf.tickets.find(item => item.number === num);
                if (t) {
                    t.buyerName = name;
                    t.buyerPhone = phone;
                    t.status = 'reserved';
                    t.reservedAt = Date.now();
                    t.ticketPrice = TICKET_PRICE;
                }
            });

            if (wantsMember && phone) {
                memberWaitlist.push({ id: Date.now(), name, phone, raffleName: raf.name, instagram: '', facebook: '', other: '' });
            }
            saveAppData();

            const formStep = document.getElementById('checkout-form-step');
            const payStep = document.getElementById('checkout-payment-step');
            const copiaColaInp = document.getElementById('pix-copia-cola-input');
            const qrImg = document.getElementById('pix-qrcode-img');

            if (formStep) formStep.classList.add('hidden');
            if (payStep) payStep.classList.remove('hidden');
            if (copiaColaInp) copiaColaInp.value = paymentResult.pixCopiaCola;
            if (qrImg) qrImg.src = paymentResult.qrCodeUrl;

        } catch (error) {
            alert("Erro ao comunicar com a API do banco: " + error.message);
        } finally {
            if (submitBtn) {
                submitBtn.innerText = "Confirmar Reserva";
                submitBtn.disabled = false;
            }
        }
        return;
    }

    selectedNumbers.forEach(num => {
        const t = raf.tickets.find(item => item.number === num);
        if (t) {
            t.buyerName = name;
            t.buyerPhone = phone;
            t.status = requestedStatus;
            t.reservedAt = requestedStatus === 'reserved' ? Date.now() : null;
            if (!t.ticketPrice) t.ticketPrice = TICKET_PRICE;
        }
    });

    if (wantsMember && phone) {
        memberWaitlist.push({ id: Date.now(), name, phone, raffleName: raf.name, instagram: '', facebook: '', other: '' });
    }

    saveAppData();
    closeModal();
    clearSelection();
    alert("Operação realizada com sucesso!");

    if (userRole !== 'client') {
        switchTab('financial');
    }
}

async function processRealBankApiPayment(payload) {
    if (PAYMENT_API_TOKEN && PAYMENT_API_ENDPOINT) {
        try {
            const response = await fetch(PAYMENT_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${PAYMENT_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transaction_amount: payload.amount,
                    description: `Rifa: ${payload.raffleName} (Bilhetes: ${payload.numbers.join(', ')})`,
                    payment_method_id: payload.method === 'debito_conta' ? "bank_transfer" : "pix",
                    payer: {
                        first_name: payload.name,
                        phone: { number: payload.phone },
                        identification: { type: "CPF", number: payload.cpf }
                    }
                })
            });

            if (!response.ok) throw new Error(`Falha HTTP: ${response.status}`);
            const data = await response.json();

            return {
                pixCopiaCola: data.point_of_interaction?.transaction_data?.qr_code || "Código de pagamento gerado",
                qrCodeUrl: data.point_of_interaction?.transaction_data?.qr_code_base64 ? `data:image/png;base64,${data.point_of_interaction.transaction_data.qr_code_base64}` : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(GLOBAL_OFFICIAL_PIX)}`
            };
        } catch (err) {
            console.warn("Modo Sandbox Fallback:", err.message);
        }
    }

    const dummyCode = `00020126580014BR.GOV.BCB.PIX0136${GLOBAL_OFFICIAL_PIX}5204000053039865405${payload.amount.toFixed(2)}5802BR5925PROTETORES DOS CAES6009SAO PAULO62070503***6304E2CA`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(dummyCode)}`;

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                pixCopiaCola: dummyCode,
                qrCodeUrl: qrCodeUrl
            });
        }, 500);
    });
}

function copyPixCopiaCola() {
    const input = document.getElementById('pix-copia-cola-input');
    if (input) {
        input.select();
        navigator.clipboard.writeText(input.value);
        alert('Código de pagamento copiado!');
    }
}

function closeModal() {
    const modalBuy = document.getElementById('modal-buy');
    if (modalBuy) {
        modalBuy.classList.add('hidden');
        modalBuy.classList.remove('flex');
    }
    const formStep = document.getElementById('checkout-form-step');
    const payStep = document.getElementById('checkout-payment-step');
    if (formStep) formStep.classList.remove('hidden');
    if (payStep) payStep.classList.add('hidden');
}

function applyTabsVisibility() {
    Object.keys(tabVisibilities).forEach(tab => {
        const btn = document.getElementById(`tab-btn-${tab}`);
        if (btn) {
            btn.classList.toggle('hidden', !tabVisibilities[tab]);
        }
    });
}

function saveGlobalParams() {
    if (userRole !== 'super_admin') return alert("Exclusivo do ADM Maior.");

    const priceEl = document.getElementById('setting-ticket-price');
    const hoursEl = document.getElementById('setting-reservation-hours');
    const pixEl = document.getElementById('setting-official-pix');
    const tokenEl = document.getElementById('setting-api-token');
    const endpointEl = document.getElementById('setting-api-endpoint');

    if (!priceEl || !hoursEl || !pixEl) return;

    const p = parseFloat(priceEl.value);
    const h = parseInt(hoursEl.value);
    const pix = pixEl.value.trim();

    if (isNaN(p) || p <= 0) return alert("Digite um valor válido.");
    if (isNaN(h) || h <= 0) return alert("Digite horas válidas.");
    if (!pix) return alert("A Chave Pix não pode ficar vazia.");

    const authPin = prompt("🚨 ATENÇÃO:\nA alteração dos valores das rifas exige a autorização do ADM Maior.\nDigite a senha (9999):");
    if (authPin !== '9999') {
        alert("❌ Operação Cancelada! PIN incorreto.");
        applyConfigToUI();
        return;
    }

    TICKET_PRICE = p;
    RESERVATION_MAX_HOURS = h;
    GLOBAL_OFFICIAL_PIX = pix;
    if (tokenEl) PAYMENT_API_TOKEN = tokenEl.value.trim();
    if (endpointEl) PAYMENT_API_ENDPOINT = endpointEl.value.trim();

    saveAppData();
    alert("✅ Parâmetros salvos com sucesso!");
    switchTab('board');
}

function saveTabsVisibility() {
    if (userRole !== 'super_admin') return alert("Exclusivo do ADM Maior.");

    const tBoard = document.getElementById('toggle-tab-board');
    const tCamp = document.getElementById('toggle-tab-campaigns');
    const tFin = document.getElementById('toggle-tab-financial');
    const tMem = document.getElementById('toggle-tab-members');
    const tDraw = document.getElementById('toggle-tab-draw');

    if (tBoard) tabVisibilities.board = tBoard.checked;
    if (tCamp) tabVisibilities.campaigns = tCamp.checked;
    if (tFin) tabVisibilities.financial = tFin.checked;
    if (tMem) tabVisibilities.members = tMem.checked;
    if (tDraw) tabVisibilities.draw = tDraw.checked;

    saveAppData();
    alert("Visibilidade atualizada!");
}

function resetAppToFactory() {
    if (userRole !== 'super_admin') return alert("Exclusivo do ADM Maior.");
    const authPin = prompt("🚨 ATENÇÃO CRÍTICA:\nDigite a senha do ADM Maior (9999) para autorizar o reset:");
    if (authPin === '9999') {
        localStorage.clear();
        location.reload();
    } else {
        alert("Operação cancelada.");
    }
}

function generateRandomPin() {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    const pinInput = document.getElementById('new-admin-pin');
    if (pinInput) pinInput.value = randomPin;
}

function registerAdminMinor() {
    if (userRole !== 'super_admin') return alert("Apenas o ADM Maior pode cadastrar administradores menores.");
    const nameElem = document.getElementById('new-admin-name');
    const pinElem = document.getElementById('new-admin-pin');
    const name = nameElem ? nameElem.value.trim() : '';
    const pin = pinElem ? pinElem.value.trim() : '';

    if (!name || !pin) return alert("Preencha o nome e gere uma senha.");

    registeredAdmins.push({ id: Date.now(), name, pin });
    saveAppData();

    if (nameElem) nameElem.value = '';
    if (pinElem) pinElem.value = '';
    alert("Administrador Menor cadastrado!");
}

function renderAdminsUI() {
    const container = document.getElementById('admins-list-container');
    if (!container) return;
    container.innerHTML = registeredAdmins.length === 0 ? '<p class="text-slate-400 italic">Nenhum administrador menor cadastrado.</p>' : '';

    registeredAdmins.forEach(adm => {
        container.innerHTML += `
            <div class="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-white">
                <div>
                    <strong class="text-amber-400">🛡️ ${adm.name}</strong> 
                    <span class="text-slate-400 font-mono ml-2">(PIN: ••••)</span>
                </div>
                ${userRole === 'super_admin' ? `
                <div class="flex items-center gap-2">
                    <button onclick="viewAdminPin(${adm.id})" class="text-amber-400 font-bold text-xs bg-slate-900 border border-amber-500/30 hover:bg-slate-800 px-2.5 py-1 rounded cursor-pointer">👁️ Ver PIN</button>
                    <button onclick="removeAdminMinor(${adm.id})" class="text-red-400 font-bold text-xs hover:bg-slate-800 px-2 py-1 rounded cursor-pointer">Remover</button>
                </div>
                ` : ''}
            </div>
        `;
    });
}

function viewAdminPin(id) {
    if (userRole !== 'super_admin') return alert("Acesso negado.");
    const adm = registeredAdmins.find(a => a.id === id);
    if (adm) alert(`🔑 PIN para ${adm.name}: ${adm.pin}`);
}

function removeAdminMinor(id) {
    if (userRole !== 'super_admin') return;
    registeredAdmins = registeredAdmins.filter(a => a.id !== id);
    saveAppData();
}

function populateExpenseSelect() {
    const select = document.getElementById('expense-raffle-select');
    if (!select) return;
    select.innerHTML = '';
    rafflesList.forEach(raf => {
        const opt = document.createElement('option');
        opt.value = raf.id;
        opt.innerText = raf.name;
        select.appendChild(opt);
    });
}

function addAnimalExpense() {
    if (userRole === 'client') return alert("Apenas administradores podem registrar custos.");
    const select = document.getElementById('expense-raffle-select');
    const raffleId = select ? Number(select.value) : activeRaffleId;
    const descElem = document.getElementById('expense-desc');
    const valElem = document.getElementById('expense-val');

    const desc = descElem ? descElem.value.trim() : '';
    const val = valElem ? parseFloat(valElem.value) : NaN;

    if (!desc || isNaN(val) || val <= 0) return alert("Preencha a descrição do gasto e um valor válido.");

    const raf = rafflesList.find(r => r.id === raffleId);
    if (!raf) return alert("Campanha não encontrada.");

    if (!raf.expenses) raf.expenses = [];
    raf.expenses.push({ id: Date.now(), desc, val });

    saveAppData();
    if (descElem) descElem.value = '';
    if (valElem) valElem.value = '';
    alert("Gasto registrado com sucesso!");
}

function removeAnimalExpense(raffleId, expenseId) {
    if (userRole === 'client') return;
    const raf = rafflesList.find(r => r.id === raffleId);
    if (raf && raf.expenses) {
        raf.expenses = raf.expenses.filter(e => e.id !== expenseId);
        saveAppData();
    }
}

function addDogMedia() {
    if (userRole === 'client') return alert("Apenas administradores podem publicar mídias.");
    const nameElem = document.getElementById('media-dog-name');
    const fileInput = document.getElementById('media-file-input');
    const name = nameElem ? nameElem.value.trim() : '';
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;

    if (!name || !file) return alert("Preencha o nome do cão e selecione um arquivo.");

    const reader = new FileReader();
    reader.onload = function (e) {
        const fileData = e.target.result;
        const isVideo = file.type.startsWith('video');

        dogsMediaList.push({ id: Date.now(), name, type: isVideo ? 'video' : 'image', url: fileData });
        saveAppData();

        if (nameElem) nameElem.value = '';
        if (fileInput) fileInput.value = '';
        alert("Mídia publicada!");
    };
    reader.readAsDataURL(file);
}

function renderDogsMediaUI() {
    const container = document.getElementById('dogs-media-container');
    if (!container) return;
    container.innerHTML = '';

    dogsMediaList.forEach(m => {
        const card = document.createElement('div');
        card.className = "rounded-3xl overflow-hidden border bg-white shadow-sm flex flex-col justify-between";

        let mediaHtml = m.type === 'video' ?
            `<video src="${m.url}" controls class="w-full h-48 object-cover bg-slate-950" muted preload="metadata"></video>` :
            `<img src="${m.url}" class="w-full h-48 object-cover bg-slate-100">`;

        card.innerHTML = `
            <div>
                ${mediaHtml}
                <div class="p-3">
                    <span class="font-black text-slate-900 text-sm">🐶 ${m.name}</span>
                    <span class="text-[10px] ml-2 px-2 py-0.5 rounded bg-slate-100 font-bold">${m.type === 'video' ? '📹 Vídeo' : '📷 Foto'}</span>
                </div>
            </div>
            ${userRole !== 'client' ? `<div class="p-3 pt-0"><button onclick="removeMedia(${m.id})" class="text-red-500 font-bold text-xs hover:bg-red-50 p-1 rounded cursor-pointer">🗑️ Excluir Mídia</button></div>` : ''}
        `;
        container.appendChild(card);
    });
}

function removeMedia(id) {
    dogsMediaList = dogsMediaList.filter(m => m.id !== id);
    saveAppData();
}

function renderCampaignsUI() {
    const container = document.getElementById('campaigns-list-container');
    if (!container) return;
    container.innerHTML = '';

    rafflesList.forEach(raf => {
        const isSelected = raf.id === activeRaffleId;
        
        let totalVal = 0;
        if (raf.tickets) {
            raf.tickets.forEach(t => {
                if (t.status === 'paid') totalVal += (t.ticketPrice || TICKET_PRICE);
            });
        }

        const card = document.createElement('div');
        card.className = `p-4 rounded-3xl border ${isSelected ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400' : 'border-slate-200 bg-white'} flex flex-col justify-between gap-3`;
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between">
                    <span class="font-black text-slate-900 text-sm">${raf.name}</span>
                    ${isSelected ? '<span class="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black">Em Exibição</span>' : ''}
                </div>
                <p class="text-xs text-slate-600 mt-1">Prêmio: <strong>${raf.prize}</strong></p>
                <p class="text-xs text-emerald-600 font-bold mt-1">Arrecadado: R$ ${totalVal.toFixed(2)}</p>
            </div>
            <div class="flex items-center justify-end">
                ${!isSelected ? `<button onclick="switchActiveRaffle(${raf.id})" class="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer">Visualizar e Apoiar</button>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

function switchActiveRaffle(id) {
    activeRaffleId = id;
    applyConfigToUI();
    switchTab('board');
}

function createNewRaffle() {
    if (userRole !== 'super_admin') return alert("Apenas o ADM Maior pode criar rifas.");
    const nameElem = document.getElementById('new-raffle-name');
    const prizeElem = document.getElementById('new-raffle-prize');
    const name = nameElem ? nameElem.value.trim() : '';
    const prize = prizeElem ? prizeElem.value.trim() : '';

    if (!name || !prize) return alert("Preencha o nome e o prêmio.");

    rafflesList.push({ id: Date.now(), name, prize, goal: 1000, pix: GLOBAL_OFFICIAL_PIX, expenses: [], tickets: createInitialTickets() });
    saveAppData();
    if (nameElem) nameElem.value = '';
    if (prizeElem) prizeElem.value = '';
    alert("Nova rifa simultânea criada!");
}

function renderGrid() {
    const grid = document.getElementById('numbers-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const raf = getActiveRaffle();
    if (!raf.tickets) raf.tickets = createInitialTickets();

    raf.tickets.forEach(t => {
        const btn = document.createElement('button');
        const formattedNum = formatTicketNumber(t.number);
        btn.innerText = formattedNum;

        const isSelected = selectedNumbers.includes(t.number);
        let bgClass = 'bg-emerald-500 hover:bg-emerald-600 text-white font-bold';
        if (t.status === 'reserved') bgClass = 'bg-amber-400 text-slate-950 font-bold';
        if (t.status === 'paid') bgClass = 'bg-blue-600 text-white font-bold';
        if (isSelected) bgClass = 'bg-amber-500 text-slate-950 ring-4 ring-slate-900 font-extrabold scale-105';

        btn.className = "aspect-square rounded-xl flex items-center justify-center text-xs shadow-xs transition hover:scale-105 cursor-pointer " + bgClass;
        btn.onclick = () => handleNumberClick(t.number);
        grid.appendChild(btn);
    });
    updateSelectionBar();
}

function handleNumberClick(num) {
    const raf = getActiveRaffle();
    const t = raf.tickets.find(item => item.number === num);
    if (!t) return;

    if (userRole !== 'client') {
        selectedNumbers = [num];
        openMultiBuyModal(t);
        return;
    }

    if (t.status !== 'available') {
        alert(`O número #${formatTicketNumber(num)} já está ${t.status === 'paid' ? 'PAGO' : 'RESERVADO'}.`);
        return;
    }

    const idx = selectedNumbers.indexOf(num);
    if (idx > -1) selectedNumbers.splice(idx, 1);
    else selectedNumbers.push(num);
    selectedNumbers.sort((a, b) => a - b);
    renderGrid();
}

function updateSelectionBar() {
    const bar = document.getElementById('selection-bar');
    const count = document.getElementById('selected-count');
    const textList = document.getElementById('selected-list-text');
    if (!bar) return;

    if (selectedNumbers.length > 0 && userRole === 'client') {
        bar.classList.remove('hidden');
        if (count) count.innerText = selectedNumbers.length;
        if (textList) textList.innerText = selectedNumbers.map(n => '#' + formatTicketNumber(n)).join(', ');
    } else {
        bar.classList.add('hidden');
    }
}

function clearSelection() {
    selectedNumbers = [];
    renderGrid();
}

function openMultiBuyModal(editTicket = null) {
    if (selectedNumbers.length === 0 && !editTicket) return;

    const numTitle = document.getElementById('modal-num-title');
    const releaseBtn = document.getElementById('btn-release-num');
    const adminStatusControls = document.getElementById('admin-status-controls');
    const buyerNameInput = document.getElementById('buyer-name');
    const buyerPhoneInput = document.getElementById('buyer-phone');

    if (editTicket) {
        selectedNumbers = [editTicket.number];
        if (numTitle) numTitle.innerText = `Número: #${formatTicketNumber(editTicket.number)} (Edição ADM)`;
        if (buyerNameInput) buyerNameInput.value = editTicket.buyerName || '';
        if (buyerPhoneInput) buyerPhoneInput.value = editTicket.buyerPhone || '';
        if (releaseBtn) releaseBtn.classList.remove('hidden');

        if (adminStatusControls) {
            adminStatusControls.classList.toggle('hidden', userRole !== 'super_admin');
        }
    } else {
        const formattedList = selectedNumbers.map(n => '#' + formatTicketNumber(n)).join(', ');
        if (numTitle) numTitle.innerText = `Número(s): ${formattedList} (R$ ${(selectedNumbers.length * TICKET_PRICE).toFixed(2)})`;
        if (buyerNameInput) buyerNameInput.value = '';
        if (buyerPhoneInput) buyerPhoneInput.value = '';
        if (releaseBtn) releaseBtn.classList.add('hidden');
        if (adminStatusControls) adminStatusControls.classList.add('hidden');
    }

    const modalBuy = document.getElementById('modal-buy');
    if (modalBuy) {
        modalBuy.classList.remove('hidden');
        modalBuy.classList.add('flex');
    }
}

function setModalStatus(status) {
    if (status === 'paid' && userRole !== 'super_admin') {
        return alert("🔒 AVISO DE SEGURANÇA: Somente o ADM Maior tem permissão para confirmar o pagamento!");
    }
    const buyerStatusElem = document.getElementById('buyer-status');
    if (buyerStatusElem) buyerStatusElem.value = status;
    alert(`Status alterado para: ${status === 'paid' ? '🔵 Pago' : '🟡 Reservado'}`);
}

function releaseSelectedNumber() {
    if (userRole === 'client') return alert("Sem permissão.");
    const raf = getActiveRaffle();
    selectedNumbers.forEach(num => {
        const t = raf.tickets.find(item => item.number === num);
        if (t) { t.status = 'available'; t.buyerName = ''; t.buyerPhone = ''; t.reservedAt = null; }
    });
    saveAppData();
    closeModal();
    clearSelection();
    alert("Número liberado!");
}

function renderMembersUI() {
    const waitlistContainer = document.getElementById('waitlist-container');
    const waitlistCount = document.getElementById('waitlist-count');
    const approvedContainer = document.getElementById('approved-members-container');
    const approvedCount = document.getElementById('approved-members-count');

    if (!waitlistContainer || !approvedContainer) return;

    if (waitlistCount) waitlistCount.innerText = memberWaitlist.length;
    waitlistContainer.innerHTML = memberWaitlist.length === 0 ? '<p class="text-slate-400 italic">Nenhum membro na lista de espera.</p>' : '';
    memberWaitlist.forEach(m => {
        waitlistContainer.innerHTML += `
            <div class="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-200">
                <div>
                    <strong>👤 ${m.name}</strong> <span class="text-slate-500 font-mono">(${m.phone})</span>
                    <p class="text-[10px] text-slate-400">Origem: ${m.raffleName}</p>
                </div>
                <div class="flex gap-1">
                    <button onclick="approveMember(${m.id})" class="bg-emerald-600 text-white px-2 py-1 rounded text-[11px] cursor-pointer font-bold">Aprovar</button>
                    <button onclick="rejectMember(${m.id})" class="bg-red-600 text-white px-2 py-1 rounded text-[11px] cursor-pointer">Recusar</button>
                </div>
            </div>
        `;
    });

    if (approvedCount) approvedCount.innerText = approvedMembers.length;
    approvedContainer.innerHTML = approvedMembers.length === 0 ? '<p class="text-slate-400 italic">Nenhum membro oficial aprovado ainda.</p>' : '';
    approvedMembers.forEach(m => {
        let socialsHtml = '';
        if (m.instagram || m.facebook || m.other) {
            socialsHtml = `<div class="text-[10px] text-slate-600 mt-1 flex gap-2 flex-wrap font-mono">`;
            if (m.instagram) socialsHtml += `<span>📸 IG: ${m.instagram}</span>`;
            if (m.facebook) socialsHtml += `<span>👥 FB: ${m.facebook}</span>`;
            if (m.other) socialsHtml += `<span>🌐 Outro: ${m.other}</span>`;
            socialsHtml += `</div>`;
        } else {
            socialsHtml = `<p class="text-[10px] text-amber-600 italic">Redes sociais não cadastradas.</p>`;
        }

        approvedContainer.innerHTML += `
            <div class="bg-white p-3 rounded-xl border border-emerald-200 space-y-2">
                <div class="flex items-center justify-between">
                    <div>
                        <strong>✅ ${m.name}</strong> <span class="text-slate-500 font-mono">(${m.phone})</span>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="openSocialsModalForMember(${m.id})" class="bg-amber-500 text-slate-950 px-2 py-1 rounded text-[10px] font-bold cursor-pointer">Redes Sociais</button>
                        <button onclick="removeApprovedMember(${m.id})" class="text-red-500 text-[11px] font-bold hover:bg-red-50 px-2 py-1 rounded cursor-pointer">Remover</button>
                    </div>
                </div>
                ${socialsHtml}
            </div>
        `;
    });
}

function approveMember(id) {
    const member = memberWaitlist.find(m => m.id === id);
    if (!member) return;
    memberWaitlist = memberWaitlist.filter(m => m.id !== id);
    approvedMembers.push(member);
    saveAppData();
    alert("Membro aprovado!");
    openSocialsModalForMember(member.id);
}

function openSocialsModalForMember(id) {
    const member = approvedMembers.find(m => m.id === id);
    if (!member) return;
    const mId = document.getElementById('social-member-id');
    const mIg = document.getElementById('social-instagram');
    const mFb = document.getElementById('social-facebook');
    const mOt = document.getElementById('social-other');

    if (mId) mId.value = member.id;
    if (mIg) mIg.value = member.instagram || '';
    if (mFb) mFb.value = member.facebook || '';
    if (mOt) mOt.value = member.other || '';

    const modal = document.getElementById('modal-socials');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeSocialsModal() {
    const modal = document.getElementById('modal-socials');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function saveMemberSocials() {
    const mId = document.getElementById('social-member-id');
    if (!mId) return;

    const id = Number(mId.value);
    const instagram = document.getElementById('social-instagram') ? document.getElementById('social-instagram').value.trim() : '';
    const facebook = document.getElementById('social-facebook') ? document.getElementById('social-facebook').value.trim() : '';
    const other = document.getElementById('social-other') ? document.getElementById('social-other').value.trim() : '';

    const member = approvedMembers.find(m => m.id === id);
    if (member) {
        member.instagram = instagram;
        member.facebook = facebook;
        member.other = other;
        saveAppData();
        closeSocialsModal();
        alert("Redes sociais salvas!");
    }
}

function rejectMember(id) {
    memberWaitlist = memberWaitlist.filter(m => m.id !== id);
    saveAppData();
}

function removeApprovedMember(id) {
    approvedMembers = approvedMembers.filter(m => m.id !== id);
    saveAppData();
}

function copyAppLink() {
    const input = document.getElementById('app-public-link-input');
    if (input) {
        input.select();
        navigator.clipboard.writeText(input.value);
        alert('Link copiado!');
    }
}

function populateDrawSelect() {
    const select = document.getElementById('draw-raffle-select');
    if (!select) return;
    select.innerHTML = '<option value="all">🌟 Sorteio Conjunto (Todas as Rifas)</option>';
    rafflesList.forEach(raf => {
        const opt = document.createElement('option');
        opt.value = raf.id;
        opt.innerText = `Rifa: ${raf.name}`;
        select.appendChild(opt);
    });
}

function runDraw() {
    if (userRole !== 'super_admin') return alert("Exclusivo ADM Maior.");
    const select = document.getElementById('draw-raffle-select');
    const jointModeElem = document.getElementById('draw-joint-mode');
    const isJoint = (jointModeElem && jointModeElem.checked) || (select && select.value === 'all');

    let eligible = [];
    let raffleTitle = "";
    let prizeTitle = "";

    if (isJoint) {
        raffleTitle = "Sorteio Conjunto";
        prizeTitle = "Prêmios Combinados";
        rafflesList.forEach(raf => {
            if (raf.tickets) {
                raf.tickets.filter(t => t.status === 'paid').forEach(t => {
                    eligible.push({ ...t, raffleName: raf.name });
                });
            }
        });
    } else {
        const raffleId = select ? Number(select.value) : activeRaffleId;
        const raf = rafflesList.find(r => r.id === raffleId);
        if (!raf) return alert("Selecione uma rifa válida.");
        raffleTitle = raf.name;
        prizeTitle = raf.prize;
        if (raf.tickets) {
            raf.tickets.filter(t => t.status === 'paid').forEach(t => {
                eligible.push({ ...t, raffleName: raf.name });
            });
        }
    }

    if (eligible.length === 0) return alert("Nenhum bilhete pago elegível para sorteio!");

    let count = 0;
    const display = document.getElementById('winner-display');
    const timer = setInterval(() => {
        const temp = eligible[Math.floor(Math.random() * eligible.length)];
        if (display) display.innerText = formatTicketNumber(temp.number);
        count++;
        if (count > 25) {
            clearInterval(timer);
            const winner = eligible[Math.floor(Math.random() * eligible.length)];
            if (display) display.innerText = '#' + formatTicketNumber(winner.number);
            if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });

            lastWinnerInfo = { winnerName: winner.buyerName, ticketNum: winner.number, raffleName: winner.raffleName || raffleTitle, prize: prizeTitle };

            const winnerInfoText = document.getElementById('winner-info-text');
            const drawResultBox = document.getElementById('draw-result-box');
            if (winnerInfoText) winnerInfoText.innerHTML = `🏆 <strong>Campanha:</strong> ${lastWinnerInfo.raffleName}<br>👑 <strong>Ganhador(a):</strong> ${winner.buyerName} (#${formatTicketNumber(winner.number)})<br>🎁 <strong>Prêmio:</strong> ${prizeTitle}`;
            if (drawResultBox) drawResultBox.classList.remove('hidden');
        }
    }, 80);
}

// ==========================================
// PAINEL FINANCEIRO & CENTRAL DE RELATÓRIOS
// ==========================================
function renderFinancialTable() {
    const body = document.getElementById('fin-table-body');
    const animalsContainer = document.getElementById('animals-financial-container');
    if (!body || !animalsContainer) return;

    body.innerHTML = '';
    animalsContainer.innerHTML = '';

    const activeRaf = getActiveRaffle();
    let totalRaisedVal = 0;
    if (activeRaf && activeRaf.tickets) {
        activeRaf.tickets.forEach(t => {
            if (t.status === 'paid') totalRaisedVal += (t.ticketPrice || TICKET_PRICE);
        });
    }

    const totalRaisedBadge = document.getElementById('total-raised-badge');
    if (totalRaisedBadge) totalRaisedBadge.innerText = 'R$ ' + totalRaisedVal.toFixed(2);

    rafflesList.forEach(raf => {
        let rafPaid = 0;
        let rafReserved = 0;

        if (raf.tickets) {
            raf.tickets.forEach(t => {
                const price = t.ticketPrice || TICKET_PRICE;
                if (t.status === 'paid') rafPaid += price;
                if (t.status === 'reserved') rafReserved += price;
            });
        }

        let totalExpenses = 0;
        if (raf.expenses) {
            raf.expenses.forEach(e => totalExpenses += e.val);
        }
        const netBalance = rafPaid - totalExpenses;

        let expensesHtml = '';
        if (raf.expenses && raf.expenses.length > 0) {
            raf.expenses.forEach(e => {
                expensesHtml += `
                    <div class="flex items-center justify-between bg-slate-50 p-2 rounded-lg border text-xs">
                        <span>🏷️ ${e.desc}</span>
                        <div class="flex items-center gap-2">
                            <strong class="text-red-600 font-mono">- R$ ${e.val.toFixed(2)}</strong>
                            ${userRole !== 'client' ? `<button onclick="removeAnimalExpense(${raf.id},${e.id})" class="text-red-500 font-bold hover:bg-red-100 px-1.5 py-0.5 rounded cursor-pointer">✕</button>` : ''}
                        </div>
                    </div>
                `;
            });
        } else {
            expensesHtml = '<p class="text-slate-400 italic text-xs">Nenhum gasto registrado.</p>';
        }

        animalsContainer.innerHTML += `
            <div class="border border-slate-200 rounded-3xl p-5 space-y-4 bg-white shadow-xs">
                <div class="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
                    <div>
                        <h4 class="font-black text-slate-900 text-sm">🐾 Campanha: ${raf.name}</h4>
                        <p class="text-xs text-slate-500">Prêmio: <strong>${raf.prize}</strong></p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-extrabold ${netBalance >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                        Saldo Líquido: R$ ${netBalance.toFixed(2)}
                    </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
                        <p class="text-[11px] font-bold text-emerald-800 uppercase">Arrecadado (Pago)</p>
                        <p class="text-lg font-black text-emerald-900">R$ ${rafPaid.toFixed(2)}</p>
                    </div>
                    <div class="bg-amber-50 border border-amber-200 p-3 rounded-2xl">
                        <p class="text-[11px] font-bold text-amber-800 uppercase">Reservado (Pendente)</p>
                        <p class="text-lg font-black text-amber-900">R$ ${rafReserved.toFixed(2)}</p>
                    </div>
                    <div class="bg-red-50 border border-red-200 p-3 rounded-2xl">
                        <p class="text-[11px] font-bold text-red-800 uppercase">Total de Gastos</p>
                        <p class="text-lg font-black text-red-900">R$ ${totalExpenses.toFixed(2)}</p>
                    </div>
                </div>

                <div class="space-y-2 pt-2">
                    <p class="font-bold text-xs text-slate-700 uppercase">📋 Histórico de Gastos:</p>
                    <div class="space-y-1.5 max-h-40 overflow-y-auto">
                        ${expensesHtml}
                    </div>
                </div>
            </div>
        `;
    });

    if (activeRaf && activeRaf.tickets) {
        activeRaf.tickets.filter(t => t.status !== 'available').forEach(t => {
            const val = t.ticketPrice || TICKET_PRICE;
            body.innerHTML += `
                <tr class="hover:bg-slate-50">
                    <td class="p-3 font-bold text-amber-600">#${formatTicketNumber(t.number)}</td>
                    <td class="p-3 font-bold text-slate-900">${t.buyerName || 'Sem nome'}</td>
                    <td class="p-3 text-slate-600 font-mono">${t.buyerPhone || 'Não informado'}</td>
                    <td class="p-3 font-mono font-bold text-slate-700">R$ ${val.toFixed(2)}</td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${t.status === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}">${t.status === 'paid' ? '🔵 Pago' : '🟡 Reservado'}</span></td>
                    <td class="p-3 text-right"><button onclick="handleNumberClick(${t.number})" class="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs cursor-pointer">Editar</button></td>
                </tr>
            `;
        });
    }
}

// CORREÇÃO CRÍTICA NA GERAÇÃO DE RELATÓRIOS
function dispatchFinancialReport() {
    if (userRole !== 'super_admin') return alert("Exclusivo do ADM Maior.");

    const scopeElem = document.getElementById('report-scope-select');
    const targetElem = document.getElementById('report-target-select');

    const scope = scopeElem ? scopeElem.value : 'all';
    const target = targetElem ? targetElem.value : 'screen';

    let reportText = `📋 *PRESTAÇÃO DE CONTAS OFICIAL - GRUPO PROTETORES DOS CÃES*\nData: ${new Date().toLocaleDateString('pt-BR')}\n-----------------------------------\n\n`;

    let rafflesToReport = scope === 'single' ? [getActiveRaffle()] : rafflesList;

    let grandTotalPaid = 0;
    let grandTotalExpenses = 0;

    rafflesToReport.forEach(raf => {
        let paidVal = 0;
        let reservedVal = 0;

        if (raf.tickets) {
            raf.tickets.forEach(t => {
                const price = t.ticketPrice || TICKET_PRICE;
                if (t.status === 'paid') paidVal += price;
                if (t.status === 'reserved') reservedVal += price;
            });
        }

        let expVal = 0;
        if (raf.expenses) raf.expenses.forEach(e => expVal += e.val);

        const net = paidVal - expVal;
        grandTotalPaid += paidVal;
        grandTotalExpenses += expVal;

        reportText += `🐾 *CAMPANHA: ${raf.name.toUpperCase()}*\n`;
        reportText += `• Prêmio: ${raf.prize}\n`;
        reportText += `• Total Arrecadado (Pago): R$ ${paidVal.toFixed(2)}\n`;
        reportText += `• Total Reservado (Pendente): R$ ${reservedVal.toFixed(2)}\n`;
        reportText += `• Custos/Gastos com o Cão: R$ ${expVal.toFixed(2)}\n`;
        reportText += `• *SALDO LÍQUIDO:* R$ ${net.toFixed(2)}\n\n`;
    });

    if (scope === 'all') {
        const grandNet = grandTotalPaid - grandTotalExpenses;
        reportText += `===================================\n`;
        reportText += `💰 *TOTAL CONSOLIDADO GERAL:*\n`;
        reportText += `• Arrecadação Total Pago: R$ ${grandTotalPaid.toFixed(2)}\n`;
        reportText += `• Despesas Totais Animais: R$ ${grandTotalExpenses.toFixed(2)}\n`;
        reportText += `• *SALDO GERAL RESTANTE:* R$ ${grandNet.toFixed(2)}\n`;
    }

    if (target === 'whatsapp') {
        const encoded = encodeURIComponent(reportText);
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    } else {
        const printWin = window.open('', '_blank');
        if (printWin) {
            printWin.document.write(`<pre style="font-family: monospace; white-space: pre-wrap; padding: 20px;">${reportText}</pre>`);
            printWin.document.close();
            printWin.print();
        } else {
            alert("O navegador bloqueou a abertura da janela. Desative o bloqueador de pop-ups.");
        }
    }
}

function filterNumbers() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const raf = getActiveRaffle();
    const buttons = document.querySelectorAll('#numbers-grid button');

    if (!raf.tickets) return;

    raf.tickets.forEach((t, idx) => {
        const btn = buttons[idx];
        if (!btn) return;

        const numStr = String(t.number);
        const formattedNumStr = formatTicketNumber(t.number);
        const nameStr = (t.buyerName || '').toLowerCase();

        const matches = numStr.includes(query) || formattedNumStr.includes(query) || nameStr.includes(query);

        if (matches || query === '') {
            btn.classList.remove('hidden-number');
        } else {
            btn.classList.add('hidden-number');
        }
    });
}

function switchTab(tab) {
    if (userRole === 'client' && (tab === 'financial' || tab === 'members' || tab === 'draw' || tab === 'settings')) {
        openAdminPinModal();
        return;
    }
    ['board', 'campaigns', 'financial', 'members', 'draw', 'settings'].forEach(t => {
        const viewElem = document.getElementById(`view-${t}`);
        const btnElem = document.getElementById(`tab-btn-${t}`);
        if (viewElem) viewElem.classList.toggle('hidden', t !== tab);
        if (btnElem) {
            if (t === tab) {
                btnElem.className = t === 'settings'
                    ? "px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-extrabold shadow cursor-pointer flex items-center gap-1.5 transition border border-amber-400"
                    : "px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold shadow cursor-pointer flex items-center gap-1.5 transition";
            } else {
                btnElem.className = t === 'settings'
                    ? "px-4 py-2 rounded-xl bg-slate-900 text-amber-400 hover:bg-slate-950 font-bold flex items-center gap-1.5 transition border border-amber-400/40"
                    : "px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold flex items-center gap-1.5 transition";
            }
        }
    });
}

function openAdminPinModal() {
    const pinInp = document.getElementById('admin-pin-input');
    if (pinInp) pinInp.value = '';
    const modalAdmin = document.getElementById('modal-admin-pin');
    if (modalAdmin) {
        modalAdmin.classList.remove('hidden');
        modalAdmin.classList.add('flex');
    }
}

function closeAdminPinModal() {
    const modalAdmin = document.getElementById('modal-admin-pin');
    if (modalAdmin) {
        modalAdmin.classList.add('hidden');
        modalAdmin.classList.remove('flex');
    }
}

function verifyAdminPin() {
    const pinInp = document.getElementById('admin-pin-input');
    const pin = pinInp ? pinInp.value.trim() : '';

    if (pin === '9999') {
        userRole = 'super_admin';
        currentAdminName = 'ADM Maior';
        closeAdminPinModal();
        updateAdminUIState();
        switchTab('settings');
    } else {
        const foundAdmin = registeredAdmins.find(a => a.pin === pin);
        if (foundAdmin) {
            userRole = 'admin_minor';
            currentAdminName = foundAdmin.name;
            closeAdminPinModal();
            updateAdminUIState();
            switchTab('financial');
        } else {
            alert("PIN Incorreto!");
        }
    }
    if (pinInp) pinInp.value = '';
}

function logoutAdmin() {
    userRole = 'client';
    currentAdminName = 'Modo Comprador';
    switchTab('board');
    updateAdminUIState();
}

function updateAdminUIState() {
    const adminRaisedBadge = document.getElementById('admin-raised-badge');
    const adminLoginBtn = document.getElementById('btn-admin-login');
    const adminLogoutBtn = document.getElementById('btn-admin-logout');
    const loggedAdminBadge = document.getElementById('logged-admin-user-badge');
    const superAdminRaffleCreator = document.getElementById('super-admin-raffle-creator');
    const superAdminMinorCreator = document.getElementById('super-admin-minor-creator');
    const superAdminReportBox = document.getElementById('super-admin-report-box');
    const adminMediaManager = document.getElementById('admin-media-manager');
    const dot = document.getElementById('mode-indicator-dot');
    const text = document.getElementById('mode-indicator-text');
    const tabDraw = document.getElementById('tab-btn-draw');
    const tabSettings = document.getElementById('tab-btn-settings');
    const currentAdminLabel = document.getElementById('current-admin-display-label');

    if (userRole === 'super_admin' || userRole === 'admin_minor') {
        if (adminRaisedBadge) adminRaisedBadge.classList.remove('hidden');
        if (adminLoginBtn) adminLoginBtn.classList.add('hidden');
        if (adminLogoutBtn) adminLogoutBtn.classList.remove('hidden');
        if (loggedAdminBadge) {
            loggedAdminBadge.innerText = `👤 Logado: ${currentAdminName}`;
            loggedAdminBadge.classList.remove('hidden');
        }
        if (adminMediaManager) adminMediaManager.classList.remove('hidden');
        if (dot) dot.className = "w-2 h-2 rounded-full bg-amber-400 animate-pulse";
        if (text) text.innerText = `Modo Administrador (${currentAdminName})`;
        if (currentAdminLabel) currentAdminLabel.innerText = `Logado como: ${currentAdminName}`;

        if (userRole === 'super_admin') {
            if (superAdminRaffleCreator) superAdminRaffleCreator.classList.remove('hidden');
            if (superAdminMinorCreator) superAdminMinorCreator.classList.remove('hidden');
            if (superAdminReportBox) superAdminReportBox.classList.remove('hidden');
            if (tabDraw) tabDraw.classList.remove('hidden');
            if (tabSettings) tabSettings.classList.remove('hidden');
        } else {
            if (superAdminRaffleCreator) superAdminRaffleCreator.classList.add('hidden');
            if (superAdminMinorCreator) superAdminMinorCreator.classList.add('hidden');
            if (superAdminReportBox) superAdminReportBox.classList.add('hidden');
            if (tabDraw) tabDraw.classList.add('hidden');
            if (tabSettings) tabSettings.classList.add('hidden');
        }
    } else {
        if (adminRaisedBadge) adminRaisedBadge.classList.add('hidden');
        if (adminLoginBtn) adminLoginBtn.classList.remove('hidden');
        if (adminLogoutBtn) adminLogoutBtn.classList.add('hidden');
        if (loggedAdminBadge) loggedAdminBadge.classList.add('hidden');
        if (superAdminRaffleCreator) superAdminRaffleCreator.classList.add('hidden');
        if (superAdminMinorCreator) superAdminMinorCreator.classList.add('hidden');
        if (superAdminReportBox) superAdminReportBox.classList.add('hidden');
        if (adminMediaManager) adminMediaManager.classList.add('hidden');
        if (tabSettings) tabSettings.classList.add('hidden');
        if (dot) dot.className = "w-2 h-2 rounded-full bg-emerald-400";
        if (text) text.innerText = "Modo Comprador (Visão Pública)";
    }
    applyConfigToUI();
}

function copyPixKey() {
    navigator.clipboard.writeText(GLOBAL_OFFICIAL_PIX);
    alert('Chave Pix copiada com sucesso!');
}

applyConfigToUI();
updateAdminUIState();
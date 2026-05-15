let currentQuestions = [];
let currentIdx = 0;
let userAnswers = {}; // Memory bank for student choices
let isSubmitted = false; // Tracks if the exam is in review mode

async function loadData() {
    try {
        const response = await fetch('assets/data/questions.json');
        if (!response.ok) throw new Error("JSON file not found!");
        const data = await response.json();
        currentQuestions = shuffleArray(data);
        loadQuestion(currentIdx);
    } catch (error) {
        const qText = document.getElementById('question-text');
        if (qText) qText.innerText = "Error: Check your JSON file syntax or use Live Server.";
        console.error(error);
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Saves choices to memory before moving to another question
function saveCurrentAnswer() {
    if (isSubmitted) return;
    const q = currentQuestions[currentIdx];

    if (q.type === "PG") {
        const selected = document.querySelector('input[name="ans"]:checked');
        userAnswers[currentIdx] = selected ? selected.value : null;
    }
    else if (q.type === "MCMA") {
        const selected = Array.from(document.querySelectorAll('#options-mcma input[type="checkbox"]:checked')).map(cb => cb.value);
        userAnswers[currentIdx] = selected;
    }
    else if (q.type === "Kategori") {
        let rowAnswers = [];
        q.items.forEach((item, i) => {
            const selected = document.querySelector(`input[name="row${i}"]:checked`);
            rowAnswers.push(selected ? selected.value : null);
        });
        userAnswers[currentIdx] = rowAnswers;
    }
}

function loadQuestion(index) {
    const q = currentQuestions[index];
    if (!q) return;

    resetUI();

    // 1. Update Header Labels
    document.getElementById('q-num').innerText = index + 1;
    document.getElementById('q-comp').innerText = q.comp || "-";
    document.getElementById('q-sub-comp').innerText = q.sub_comp || "-";
    document.getElementById('q-bentuk').innerText = q.bentuk || "-";
    document.getElementById('q-jenis').innerText = q.jenis || "-";
    document.getElementById('question-text').innerText = q.q;
    document.getElementById('reading-content').innerHTML = q.text || "";

    // 2. Handle Answer Key visibility
    const keyEl = document.getElementById('answer-key');
    if (keyEl) {
        keyEl.innerText = "Kunci: " + q.key;
        isSubmitted ? keyEl.classList.remove('hidden') : keyEl.classList.add('hidden');
    }

    // 3. Update All Navigation Buttons (Top & Bottom) Cleanly
    const allPrev = document.querySelectorAll('.btn-prev');
    const allNext = document.querySelectorAll('.btn-next');

    allPrev.forEach(btn => btn.disabled = (index === 0));

    allNext.forEach(btn => {
        const isLastQuestion = index === currentQuestions.length - 1;

        if (isLastQuestion) {
            btn.innerText = isSubmitted ? "Restart Test" : "Selesai";
            // Clean logic: Add green class if finishing, remove it if restarting (blue)
            if (!isSubmitted) {
                btn.classList.add('btn-finish-mode');
            } else {
                btn.classList.remove('btn-finish-mode');
            }
        } else {
            btn.innerText = "Next Question";
            btn.classList.remove('btn-finish-mode'); // Ensure it stays blue normally
        }
    });

    const disableAttr = isSubmitted ? "disabled" : "";

    // 4. Render UI Sections with Indentation & Highlighting
    if (q.type === "PG") {
        const ui = document.getElementById('ui-pg');
        ui.classList.remove('hidden');
        ui.innerHTML = q.options.map((opt, i) => {
            let highlight = (isSubmitted && q.correct?.includes(i)) ? "correct-highlight" : "";
            if (isSubmitted && userAnswers[index] == i && !q.correct?.includes(i)) highlight = "wrong-highlight";
            return `<label class="option ${highlight}"><input type="radio" name="ans" value="${i}" ${userAnswers[index] == i ? "checked" : ""} ${disableAttr}> <span>${opt}</span></label>`;
        }).join('');
    }
    else if (q.type === "MCMA") {
        document.getElementById('ui-mcma').classList.remove('hidden');
        const optionsDiv = document.getElementById('options-mcma');
        optionsDiv.innerHTML = q.options.map((opt, i) => {
            let highlight = (isSubmitted && q.correct?.includes(i)) ? "correct-highlight" : "";
            if (isSubmitted && userAnswers[index]?.includes(String(i)) && !q.correct?.includes(i)) highlight = "wrong-highlight";
            return `<label class="option ${highlight}"><input type="checkbox" value="${i}" ${userAnswers[index]?.includes(String(i)) ? "checked" : ""} ${disableAttr}> <span>${opt}</span></label>`;
        }).join('');
    }
    else if (q.type === "Kategori") {
        document.getElementById('ui-kategori').classList.remove('hidden');
        const cols = q.columns || ["Benar", "Salah"];
        document.querySelector('#ui-kategori thead tr').innerHTML = `<th>${q.rowLabel || "Pernyataan"}</th>` + cols.map(c => `<th>${c}</th>`).join('');
        document.getElementById('table-body').innerHTML = q.items.map((item, rowIdx) => {
            let rowHtml = `<td>${item}</td>`;
            cols.forEach((col, colIdx) => {
                let tdClass = (isSubmitted && q.correct?.[rowIdx] === colIdx) ? "correct-highlight" : "";
                if (isSubmitted && userAnswers[index]?.[rowIdx] == colIdx && q.correct?.[rowIdx] !== colIdx) tdClass = "wrong-highlight";
                rowHtml += `<td class="${tdClass}"><input type="radio" name="row${rowIdx}" value="${colIdx}" ${userAnswers[index]?.[rowIdx] == colIdx ? "checked" : ""} ${disableAttr}></td>`;
            });
            return `<tr>${rowHtml}</tr>`;
        }).join('');
    }

    // Automatically scroll to the top of the page when the question loads
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetUI() {
    document.querySelectorAll('.q-ui').forEach(el => el.classList.add('hidden'));
    const pg = document.getElementById('ui-pg');
    const mcma = document.getElementById('options-mcma');
    const table = document.getElementById('table-body');
    if (pg) pg.innerHTML = '';
    if (mcma) mcma.innerHTML = '';
    if (table) table.innerHTML = '';
}

function handleNextClick() {
    saveCurrentAnswer();
    const isLastQuestion = currentIdx === currentQuestions.length - 1;

    if (isLastQuestion && isSubmitted) {
        restartTest();
    } else if (isLastQuestion && !isSubmitted) {
        // Target all next buttons safely
        const allNext = document.querySelectorAll('.btn-next');

        allNext.forEach(btn => {
            btn.dataset.originalText = btn.innerText; // Backup the text
            btn.innerText = "Please Wait...";
            btn.disabled = true;
        });

        setTimeout(() => {
            allNext.forEach(btn => {
                btn.innerText = btn.dataset.originalText; // Restore the text
                btn.disabled = false;
            });
            const modal = document.getElementById('konfirmasi-modal');
            if (modal) modal.classList.remove('hidden');
        }, 1500);
    } else {
        currentIdx++;
        loadQuestion(currentIdx);
    }
}

function prevQuestion() {
    saveCurrentAnswer();
    if (currentIdx > 0) {
        currentIdx--;
        loadQuestion(currentIdx);
    }
}

function submitExam() {
    isSubmitted = true;
    currentIdx = 0;
    const btnReveal = document.querySelector('.btn-reveal');
    if (btnReveal) btnReveal.style.display = 'none';
    loadQuestion(currentIdx);
    window.scrollTo(0, 0);
}

// Opens the custom restart modal instead of using the browser's confirm()
function restartTest() {
    const modal = document.getElementById('restart-modal');
    if (modal) modal.classList.remove('hidden');
}

function toggleAnswer() {
    if (isSubmitted) document.getElementById('answer-key').classList.toggle('hidden');
}

// Safety wrapper: Prevents the app from crashing if the HTML is still loading
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. KONFIRMASI MODAL LISTENERS (Selesai Tes) ---
    const btnKembali = document.getElementById('btn-kembali-modal');
    const btnSelesai = document.getElementById('btn-selesai-modal');
    const konfirmasiModal = document.getElementById('konfirmasi-modal');

    if (btnKembali && konfirmasiModal) {
        btnKembali.addEventListener('click', () => {
            konfirmasiModal.classList.add('hidden');
        });
    }

    if (btnSelesai && konfirmasiModal) {
        btnSelesai.addEventListener('click', () => {
            konfirmasiModal.classList.add('hidden');
            submitExam(); // Triggers the review mode
        });
    }

    // --- 2. RESTART MODAL LISTENERS (Mulai Tes Baru) ---
    const btnBatalRestart = document.getElementById('btn-batal-restart');
    const btnYaRestart = document.getElementById('btn-ya-restart');
    const restartModal = document.getElementById('restart-modal');

    if (btnBatalRestart && restartModal) {
        btnBatalRestart.addEventListener('click', () => {
            restartModal.classList.add('hidden'); // Just hide, do nothing
        });
    }

    if (btnYaRestart && restartModal) {
        btnYaRestart.addEventListener('click', () => {
            restartModal.classList.add('hidden'); // Hide the modal

            // Execute the actual restart logic
            isSubmitted = false;
            userAnswers = {};
            currentIdx = 0;
            currentQuestions = shuffleArray(currentQuestions);

            const btnReveal = document.querySelector('.btn-reveal');
            if (btnReveal) btnReveal.style.display = 'inline-block';

            loadQuestion(currentIdx);
            window.scrollTo(0, 0);
        });
    }

    // --- 3. THE IGNITION SWITCH ---
    // This tells the app to fetch the JSON and replace the "Loading..." text!
    loadData();
});

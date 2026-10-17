/* =================================================================
   MISSÃO: INTERROMPA O CICLO — script.js
   Jogo educativo sobre Ascaridíase
   Fase 1: O Parque Contaminado
   Fase 2: Monte o Ciclo
   Fase 3: O Caminho do Parasita no Corpo (quiz sequencial)

   ESTRUTURA GERAL (pensada para facilitar novas fases):
   - GAME:          estado global do jogo (fase atual, pontos totais, etc.)
   - PhaseManager:  controla transição entre fases
   - Phase1..3:      lógica específica de cada fase, já implementadas
   - Cada fase expõe: score, errors, correctLeadText, correctExplanation,
     educationTitle, educationExplanation — usados pelos modais genéricos.
   ================================================================= */

/* ============================== */
/*  ESTADO GLOBAL DO JOGO         */
/* ============================== */
const GAME = {
  currentPhase: 1,
  totalScore: 0,       // pontuação acumulada entre fases
  phasesCompleted: [], // histórico de fases concluídas
};

// Última fase do jogo (usada para saber quando mostrar a tela final).
const LAST_PHASE = 3;

// Número de erros que, ao ser atingido numa fase, avança automaticamente
// para a fase seguinte (para o jogador não ficar preso).
const MAX_ERRORS = 10;

// Pontos descontados a cada erro.
const ERROR_PENALTY = 30;

// Fases que já possuem implementação jogável.
// Ao terminar de implementar uma nova fase, adicione o número aqui.
const IMPLEMENTED_PHASES = [1, 2, 3];

/* ============================== */
/*  ELEMENTOS DE TELA (DOM)       */
/* ============================== */
const screens = {
  intro: document.getElementById('screen-intro'),
  phase1: document.getElementById('screen-phase1'),
  phase2: document.getElementById('screen-phase2'),
  phase3: document.getElementById('screen-phase3'),
};

const hud = document.getElementById('hud');
const scoreEl = document.getElementById('score');
const errorsEl = document.getElementById('errors');
const timerEl = document.getElementById('timer');
const phaseNumberEl = document.getElementById('phase-number');

const toastEl = document.getElementById('feedback-toast');

const modalSoon = document.getElementById('modal-soon');
const modalTimeUp = document.getElementById('modal-timeup');
const modalGameComplete = document.getElementById('modal-game-complete');
const modalMaxErrors = document.getElementById('modal-max-errors');

// campos dinâmicos dos modais (reaproveitados por todas as fases)
const gameTotalScoreEl = document.getElementById('game-total-score');

/* ============================== */
/*  UTILITÁRIOS DE TELA           */
/* ============================== */
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function openModal(modalEl) {
  modalEl.classList.remove('hidden');
}
function closeModal(modalEl) {
  modalEl.classList.add('hidden');
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  void toastEl.offsetWidth; // reinicia a transição
  toastEl.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => toastEl.classList.add('hidden'), 250);
  }, 2400);
}

/* ============================== */
/*  MODAIS GENÉRICOS POR FASE     */
/*  (usam os campos textuais que  */
/*  cada objeto de fase fornece)  */
/* ============================== */
// Ao acertar, a fase termina e o jogo segue direto para a próxima
// (sem modais de acerto, explicação ou conclusão).
function showCorrectModal(phase) {
  completePhaseAndAdvance(phase);
}

function showGameCompleteModal() {
  gameTotalScoreEl.textContent = GAME.totalScore;
  openModal(modalGameComplete);
}

// Reinicia o jogo inteiro (chamado quando o tempo de uma fase esgota).
function restartGame() {
  closeModal(modalTimeUp);
  closeModal(modalGameComplete);

  GAME.currentPhase = 1;
  GAME.totalScore = 0;
  GAME.phasesCompleted = [];

  hud.classList.add('hidden');
  showScreen('intro');
}

// Soma a pontuação da fase ao total e segue para a próxima fase
// (ou para a tela final, se for a última). Usado tanto ao concluir
// a fase corretamente quanto ao atingir o limite de erros.
function completePhaseAndAdvance(phase) {
  GAME.totalScore += phase.score;
  if (!GAME.phasesCompleted.includes(GAME.currentPhase)) {
    GAME.phasesCompleted.push(GAME.currentPhase);
  }

  if (GAME.currentPhase >= LAST_PHASE) {
    showGameCompleteModal();
    return;
  }

  const next = GAME.currentPhase + 1;
  if (IMPLEMENTED_PHASES.includes(next)) {
    PhaseManager.start(next);
  } else {
    openModal(modalSoon);
  }
}

// Chamado quando uma fase atinge o número máximo de erros permitidos.
function handleMaxErrorsReached(phase) {
  if (phase.solved) return;
  phase.solved = true;
  clearInterval(phase.timerId);
  openModal(modalMaxErrors);
}

/* =================================================================
   PHASE MANAGER
   Responsável por iniciar/encerrar fases e trocar de uma para outra.
   Cada fase deve implementar: init().
   ================================================================= */
const PhaseManager = {
  phases: {},
  current: null,

  registerPhase(number, phaseObject) {
    this.phases[number] = phaseObject;
  },

  start(number) {
    GAME.currentPhase = number;
    phaseNumberEl.textContent = number;
    const phase = this.phases[number];
    if (!phase) {
      console.warn('Fase não implementada ainda:', number);
      return;
    }
    this.current = phase;
    phase.init();
  },
};

/* =================================================================
   FASE 1 — O PARQUE CONTAMINADO
   ================================================================= */
const Phase1 = {
  score: 100,
  errors: 0,
  timeLeft: 60,
  timerId: null,
  timeUpShown: false,
  solved: false,

  // textos usados pelos modais genéricos
  correctLeadText: 'Você encontrou a fonte de contaminação',
  correctExplanation: 'As fezes de uma pessoa infectada podem liberar ovos de Ascaris lumbricoides no ambiente. Esses ovos podem contaminar o solo, a água e os alimentos.',
  educationTitle: 'Como a infecção acontece',
  educationExplanation: 'A infecção acontece quando uma pessoa ingere ovos do parasita presentes em água, alimentos ou mãos contaminadas.',

  init() {
    this.score = 100;
    this.errors = 0;
    this.timeLeft = 60;
    this.timeUpShown = false;
    this.solved = false;

    scoreEl.textContent = this.score;
    errorsEl.textContent = this.errors;
    timerEl.textContent = this.timeLeft + 's';

    hud.classList.remove('hidden');
    showScreen('phase1');

    this.renderScene();
    this.startTimer();
  },

  startTimer() {
    clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      if (this.solved) {
        clearInterval(this.timerId);
        return;
      }
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        timerEl.textContent = '0s';
        clearInterval(this.timerId);
        if (!this.timeUpShown && !this.solved) {
          this.timeUpShown = true;
          openModal(modalTimeUp);
        }
        return;
      }
      timerEl.textContent = this.timeLeft + 's';
    }, 1000);
  },

  registerWrongClick(el) {
    if (this.solved) return;
    this.errors++;
    this.score = Math.max(0, this.score - ERROR_PENALTY);
    errorsEl.textContent = this.errors;
    scoreEl.textContent = this.score;

    if (this.errors >= MAX_ERRORS) {
      handleMaxErrorsReached(this);
      return;
    }

    el.classList.remove('clicked-wrong');
    void el.offsetWidth;
    el.classList.add('clicked-wrong');

    showToast('Não é esse! Observe novamente o parque e procure uma possível fonte de contaminação.');
  },

  registerCorrectClick(el) {
    if (this.solved) return;
    this.solved = true;
    clearInterval(this.timerId);

    el.classList.add('clicked-correct');

    setTimeout(() => showCorrectModal(this), 400);
  },

  renderScene() {
    const svg = document.getElementById('park-scene');
    svg.innerHTML = `
      <!-- FUNDO: céu visível até y=200 -->
      <image href="sprites/sky.png" x="0" y="0" width="900" height="210" preserveAspectRatio="none"/>

      <!-- GRAMA: começa abaixo do céu -->
      <image href="sprites/grass.png" x="0" y="200" width="900" height="360" preserveAspectRatio="none"/>

      <g data-id="path2">
        <image href="sprites/path2.png" x="280" y="164" width="650" height="400" preserveAspectRatio="xMidYMid meet"/>
      </g>

      <!-- CAIXA DE AREIA: menor, centralizada e na frente da grama -->
      <g data-id="path" class="clickable">
        <image href="sprites/path.png" x="8" y="323" width="325" height="143" preserveAspectRatio="xMidYMid meet"/>
      </g>

      <g data-id="puddle" class="clickable">
        <image href="sprites/puddle.png" xlink:href="sprites/puddle.png" x="90" y="422" width="210" height="150" preserveAspectRatio="xMidYMid meet"/>
      </g>

      <g data-id="tree1" class="clickable tree-sway">
        <image href="sprites/tree1.png" xlink:href="sprites/tree1.png" x="10" y="146" width="131" height="158" preserveAspectRatio="xMidYMid meet"/>
      </g>

      <g data-id="tree2" class="clickable tree-sway">
        <image href="sprites/tree2.png" xlink:href="sprites/tree2.png" x="757" y="140" width="136" height="170" preserveAspectRatio="xMidYMid meet"/>
      </g>

      <g data-id="tree3" class="clickable tree-sway">
        <image href="sprites/tree3.png" xlink:href="sprites/tree3.png" x="500" y="106" width="108" height="141" preserveAspectRatio="xMidYMid meet"/>
      </g>

      <g data-id="bench" class="clickable">
        <image href="sprites/bench.png" xlink:href="sprites/bench.png" x="394" y="249" width="170" height="100" preserveAspectRatio="xMidYMid meet"/>
      </g>

      <g data-id="trashcan" class="clickable">
        <image href="sprites/trashcan.png" xlink:href="sprites/trashcan.png" x="574" y="244" width="75" height="83" preserveAspectRatio="xMidYMid meet"/>
      </g>

      <g data-id="fountain" class="clickable">
        <image href="sprites/fountain.png" xlink:href="sprites/fountain.png" x="685" y="326" width="203" height="200" preserveAspectRatio="xMidYMid meet"/>
      </g>

      <g data-id="playground" class="clickable">
        <image href="sprites/playground.png" xlink:href="sprites/playground.png" x="133" y="152" width="224" height="177" preserveAspectRatio="xMidYMid meet"/>
      </g>

      <g data-id="ball" class="clickable">
        <image href="sprites/ball.png" xlink:href="sprites/ball.png" x="548" y="461" width="50" height="50" preserveAspectRatio="xMidYMid meet"/>
      </g>

      <g data-id="dog" class="clickable">
        <image href="sprites/dog.png" xlink:href="sprites/dog.png" x="445" y="393" width="84" height="84" preserveAspectRatio="xMidYMid meet"/>
      </g>

      <g data-id="fruits" class="clickable">
        <image href="sprites/fruits.png" xlink:href="sprites/fruits.png" x="663" y="226" width="71" height="61" preserveAspectRatio="xMidYMid meet"/>
      </g>

      <g data-id="person" class="clickable">
        <image href="sprites/person.png" xlink:href="sprites/person.png" x="616" y="378" width="88" height="118" preserveAspectRatio="xMidYMid meet"/>
      </g>

      <g data-id="feces" class="clickable">
        <image href="sprites/feces.png" xlink:href="sprites/feces.png" x="364" y="458" width="67" height="63" preserveAspectRatio="xMidYMid meet"/>
      </g>


    `;

    svg.querySelectorAll('.clickable').forEach(el => {
      el.addEventListener('click', () => this.handleClick(el));
    });
  },

  handleClick(el) {
    const id = el.getAttribute('data-id');
    if (id === 'feces') {
      this.registerCorrectClick(el);
    } else {
      this.registerWrongClick(el);
    }
  },
};

/* =================================================================
   FASE 2 — MONTE O CICLO
   O jogador clica, em ordem, nas etapas do ciclo de transmissão:
   Fezes → Solo → Água/Alimento contaminados → Boca → Intestino
   ================================================================= */

// ícones da Fase 2 — cada etapa do ciclo usa um sprite PNG (pasta sprites/)
const CYCLE_ICONS = {
  feces:     `<img src="sprites/icon_feces.png" class="card-icon" alt="Fezes">`,
  soil:      `<img src="sprites/icon_soil.png" class="card-icon" alt="Solo">`,
  food:      `<img src="sprites/icon_food.png" class="card-icon" alt="Água e alimento">`,
  mouth:     `<img src="sprites/icon_mouth.png" class="card-icon" alt="Boca">`,
  intestine: `<img src="sprites/icon_intestine.png" class="card-icon" alt="Intestino">`,
};

const Phase2 = {
  // ordem correta do ciclo
  sequence: [
    { id: 'feces',     label: 'Fezes',                          order: 0 },
    { id: 'soil',      label: 'Solo',                            order: 1 },
    { id: 'food',      label: 'Água / alimento contaminados',    order: 2 },
    { id: 'mouth',     label: 'Boca',                            order: 3 },
    { id: 'intestine', label: 'Intestino',                       order: 4 },
  ],

  score: 100,
  errors: 0,
  timeLeft: 60,
  timerId: null,
  timeUpShown: false,
  solved: false,
  nextExpected: 0,

  correctLeadText: 'Você organizou corretamente o ciclo',
  correctExplanation: 'Esse é o caminho que os ovos de Ascaris lumbricoides percorrem: saem nas fezes, contaminam o solo, chegam à água ou aos alimentos e, ao serem ingeridos, alcançam o intestino de uma nova pessoa.',
  educationTitle: 'Por que a ordem importa',
  educationExplanation: 'Cada etapa depende da anterior: sem saneamento básico e sem higiene, os ovos passam do ambiente para as mãos e os alimentos, reiniciando o ciclo em outra pessoa.',

  init() {
    this.score = 100;
    this.errors = 0;
    this.timeLeft = 60;
    this.timeUpShown = false;
    this.solved = false;
    this.nextExpected = 0;

    scoreEl.textContent = this.score;
    errorsEl.textContent = this.errors;
    timerEl.textContent = this.timeLeft + 's';

    hud.classList.remove('hidden');
    showScreen('phase2');

    this.renderTrack();
    this.renderCards();
    this.startTimer();
  },

  startTimer() {
    clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      if (this.solved) {
        clearInterval(this.timerId);
        return;
      }
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        timerEl.textContent = '0s';
        clearInterval(this.timerId);
        if (!this.timeUpShown && !this.solved) {
          this.timeUpShown = true;
          openModal(modalTimeUp);
        }
        return;
      }
      timerEl.textContent = this.timeLeft + 's';
    }, 1000);
  },

  renderTrack() {
    const track = document.getElementById('sequence-track2');
    let html = '';
    this.sequence.forEach((item, index) => {
      html += `
        <div class="seq-slot" id="p2-slot-${index}">
          <span class="slot-number">${index + 1}</span>
        </div>`;
      if (index < this.sequence.length - 1) {
        html += `<div class="seq-arrow"><img src="sprites/icon_arrow_dark.png" alt=""></div>`;
      }
    });
    track.innerHTML = html;
  },

  renderCards() {
    const container = document.getElementById('phase2-cards');
    const shuffled = [...this.sequence].sort(() => Math.random() - 0.5);

    container.innerHTML = shuffled.map(item => `
      <div class="cycle-card" data-id="${item.id}">
        ${CYCLE_ICONS[item.id]}
        <div class="card-label">${item.label}</div>
      </div>
    `).join('');

    container.querySelectorAll('.cycle-card').forEach(card => {
      card.addEventListener('click', () => this.handleCardClick(card));
    });
  },

  handleCardClick(cardEl) {
    if (this.solved) return;
    const id = cardEl.getAttribute('data-id');
    const item = this.sequence.find(i => i.id === id);

    if (item.order === this.nextExpected) {
      this.placeCard(cardEl, item);
    } else {
      this.registerWrongClick(cardEl);
    }
  },

  placeCard(cardEl, item) {
    const slot = document.getElementById(`p2-slot-${item.order}`);
    slot.innerHTML = `${CYCLE_ICONS[item.id]}<div class="slot-label">${item.label}</div>`;
    slot.classList.add('filled', 'just-filled');
    setTimeout(() => slot.classList.remove('just-filled'), 500);

    cardEl.classList.add('placed');

    this.nextExpected++;

    if (this.nextExpected === this.sequence.length) {
      this.solved = true;
      clearInterval(this.timerId);
      setTimeout(() => showCorrectModal(this), 500);
    }
  },

  registerWrongClick(cardEl) {
    if (this.solved) return;
    this.errors++;
    this.score = Math.max(0, this.score - ERROR_PENALTY);
    errorsEl.textContent = this.errors;
    scoreEl.textContent = this.score;

    if (this.errors >= MAX_ERRORS) {
      handleMaxErrorsReached(this);
      return;
    }

    cardEl.classList.remove('card-wrong');
    void cardEl.offsetWidth;
    cardEl.classList.add('card-wrong');

    showToast('Ainda não é essa etapa! Pense em qual passo vem primeiro no ciclo.');
  },
};

/* =================================================================
   FASE 3 — O CAMINHO DO PARASITA NO CORPO
   Puzzle: quiz sequencial de múltipla escolha.

   Depois de ingerido, o ovo eclode no intestino e a larva migra:
   Intestino → corrente sanguínea → pulmões → garganta
   (na garganta, a larva é engolida de novo e volta ao intestino,
   onde se transforma em verme adulto — fechando o ciclo)

   Em vez de clicar em pontos de um desenho (como na Fase 1) ou
   organizar cartas (como na Fase 2), aqui o jogador responde, em
   ordem, para onde a larva vai a cada etapa, escolhendo entre
   alternativas — um tipo de desafio diferente dos anteriores.
   ================================================================= */

// ícones da Fase 3 — cada opção usa um sprite PNG (pasta sprites/)
const BODY_STEP_ICONS = {
  intestine: 'sprites/icon_intestine.png',
  blood: 'sprites/icon_blood.png',
  lungs: 'sprites/icon_lungs.png',
  throat: 'sprites/icon_mouth.png',
  stomach: 'sprites/icon_stomach.png',
  liver: 'sprites/icon_liver.png',
  kidney: 'sprites/icon_kidney.png',
  brain: 'sprites/icon_brain.png',
};

// cada pergunta representa uma etapa do caminho, já na ordem certa
const BODY_QUIZ = [
  {
    id: 'intestine',
    label: 'Intestino',
    prompt: 'Onde a larva nasce primeiro?',
    options: ['intestine', 'stomach', 'throat'],
  },
  {
    id: 'blood',
    label: 'Corrente sanguínea',
    prompt: 'A larva atravessa a parede do intestino e cai em uma via de transporte pelo corpo. Qual caminho ela usa?',
    options: ['blood', 'brain', 'kidney'],
  },
  {
    id: 'lungs',
    label: 'Pulmões',
    prompt: 'Levada pelo sangue, a larva chega a um órgão. Qual é esse órgão?',
    options: ['lungs', 'liver', 'kidney'],
  },
  {
    id: 'throat',
    label: 'Garganta',
    prompt: 'Depois do pulmão, Por onde ela passa antes de descer outra vez?',
    options: ['throat', 'stomach', 'brain'],
  },
];

const BODY_OPTION_LABELS = {
  intestine: 'Intestino',
  stomach: 'Estômago',
  throat: 'Garganta',
  blood: 'Corrente sanguínea',
  brain: 'Sistema nervoso',
  kidney: 'Rins',
  lungs: 'Pulmões',
  liver: 'Fígado',
};

const Phase3 = {
  score: 100,
  errors: 0,
  timeLeft: 120,
  timerId: null,
  timeUpShown: false,
  solved: false,
  currentQuestion: 0,

  correctLeadText: 'Você seguiu corretamente o caminho do parasita',
  correctExplanation: 'A larva eclode no intestino, atravessa a parede intestinal e cai na corrente sanguínea, que a leva até os pulmões. De lá, ela sobe até a garganta e é engolida novamente, voltando ao intestino — onde se transforma em verme adulto.',
  educationTitle: 'Um ciclo que se fecha dentro do corpo',
  educationExplanation: 'Por isso a Ascaridíase pode causar tosse e desconforto respiratório antes mesmo de dar sintomas intestinais: a larva passa pelos pulmões antes de se fixar no intestino como verme adulto.',

  init() {
    this.score = 100;
    this.errors = 0;
    this.timeLeft = 120;
    this.timeUpShown = false;
    this.solved = false;
    this.currentQuestion = 0;

    scoreEl.textContent = this.score;
    errorsEl.textContent = this.errors;
    timerEl.textContent = this.timeLeft + 's';

    hud.classList.remove('hidden');
    showScreen('phase3');

    this.renderTrack();
    this.renderQuestion();
    this.startTimer();
  },

  startTimer() {
    clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      if (this.solved) {
        clearInterval(this.timerId);
        return;
      }
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        timerEl.textContent = '0s';
        clearInterval(this.timerId);
        if (!this.timeUpShown && !this.solved) {
          this.timeUpShown = true;
          openModal(modalTimeUp);
        }
        return;
      }
      timerEl.textContent = this.timeLeft + 's';
    }, 1000);
  },

  renderTrack() {
    const track = document.getElementById('sequence-track3');
    let html = '';
    BODY_QUIZ.forEach((item, index) => {
      html += `
        <div class="seq-slot" id="p3-slot-${index}">
          <span class="slot-number">${index + 1}</span>
        </div>`;
      if (index < BODY_QUIZ.length - 1) {
        html += `<div class="seq-arrow"><img src="sprites/icon_arrow_dark.png" alt=""></div>`;
      }
    });
    track.innerHTML = html;
  },

  renderQuestion() {
    const question = BODY_QUIZ[this.currentQuestion];
    document.getElementById('quiz-prompt').textContent = question.prompt;

    const optionsContainer = document.getElementById('quiz-options');
    const shuffled = [...question.options].sort(() => Math.random() - 0.5);

    optionsContainer.innerHTML = shuffled.map(optId => `
      <button type="button" class="quiz-option" data-id="${optId}">
        <span class="quiz-option-icon"><img src="${BODY_STEP_ICONS[optId]}" alt=""></span>
        <span>${BODY_OPTION_LABELS[optId]}</span>
      </button>
    `).join('');

    optionsContainer.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => this.handleAnswer(btn, question));
    });
  },

  handleAnswer(btnEl, question) {
    if (this.solved) return;
    const chosenId = btnEl.getAttribute('data-id');

    if (chosenId === question.id) {
      this.registerCorrectAnswer(btnEl, question);
    } else {
      this.registerWrongAnswer(btnEl);
    }
  },

  registerCorrectAnswer(btnEl, question) {
    document.querySelectorAll('#quiz-options .quiz-option').forEach(b => {
      b.disabled = true;
    });
    btnEl.classList.add('option-correct');

    const slot = document.getElementById(`p3-slot-${this.currentQuestion}`);
    slot.innerHTML = `<img class="slot-icon" src="${BODY_STEP_ICONS[question.id]}" alt=""><div class="slot-label">${question.label}</div>`;
    slot.classList.add('filled', 'just-filled');
    setTimeout(() => slot.classList.remove('just-filled'), 500);

    this.currentQuestion++;

    if (this.currentQuestion === BODY_QUIZ.length) {
      this.solved = true;
      clearInterval(this.timerId);
      setTimeout(() => showCorrectModal(this), 600);
    } else {
      setTimeout(() => this.renderQuestion(), 700);
    }
  },

  registerWrongAnswer(btnEl) {
    if (this.solved) return;
    this.errors++;
    this.score = Math.max(0, this.score - ERROR_PENALTY);
    errorsEl.textContent = this.errors;
    scoreEl.textContent = this.score;

    if (this.errors >= MAX_ERRORS) {
      handleMaxErrorsReached(this);
      return;
    }

    btnEl.classList.remove('option-wrong');
    void btnEl.offsetWidth;
    btnEl.classList.add('option-wrong');

    showToast('Não é por aí! Pense de novo no trajeto da larva pelo corpo.');
  },
};

PhaseManager.registerPhase(1, Phase1);
PhaseManager.registerPhase(2, Phase2);
PhaseManager.registerPhase(3, Phase3);

/* =================================================================
   EVENTOS DE NAVEGAÇÃO / MODAIS
   ================================================================= */
document.getElementById('btn-start').addEventListener('click', () => {
  PhaseManager.start(1);
});

document.getElementById('btn-continue-after-errors').addEventListener('click', () => {
  closeModal(modalMaxErrors);
  completePhaseAndAdvance(PhaseManager.current);
});

document.getElementById('btn-restart-game').addEventListener('click', () => {
  restartGame();
});

document.getElementById('btn-close-soon').addEventListener('click', () => {
  closeModal(modalSoon);
});

document.getElementById('btn-restart-timeup').addEventListener('click', () => {
  restartGame();
});

const cards = [...document.querySelectorAll('.card')];
const modeButtons = [...document.querySelectorAll('.mode-button')];
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const playAgainButton = document.getElementById('playAgainButton');
const timeValue = document.getElementById('timeValue');
const timeLabel = document.getElementById('timeLabel');
const timeHelp = document.getElementById('timeHelp');
const scoreValue = document.getElementById('scoreValue');
const errorsValue = document.getElementById('errorsValue');
const matchesValue = document.getElementById('matchesValue');
const bestScoreValue = document.getElementById('bestScoreValue');
const gameStatus = document.getElementById('gameStatus');
const resultModal = document.getElementById('resultModal');
const aboutModal = document.getElementById('aboutModal');

let mode = 'free';
let firstCard = null;
let secondCard = null;
let lockBoard = true;
let hasFlippedCard = false;
let gameStarted = false;
let timerId = null;
let elapsedSeconds = 0;
let remainingSeconds = 60;
let errors = 0;
let matches = 0;
let score = 0;

const bestScores = JSON.parse(localStorage.getItem('marioMemoryBestScores') || '{"free":0,"timed":0}');

function formatTime(seconds) {
  const min = String(Math.floor(seconds / 60)).padStart(2, '0');
  const sec = String(seconds % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

function updateHUD() {
  const shownTime = mode === 'timed' ? remainingSeconds : elapsedSeconds;
  timeValue.textContent = formatTime(shownTime);
  errorsValue.textContent = errors;
  matchesValue.textContent = matches;
  scoreValue.textContent = score.toLocaleString('pt-BR');
  bestScoreValue.textContent = (bestScores[mode] || 0).toLocaleString('pt-BR');
}

function calculateScore() {
  const accuracyPenalty = errors * 80;
  const timePenalty = elapsedSeconds * 6;
  const matchPoints = matches * 500;
  const timedBonus = mode === 'timed' ? remainingSeconds * 20 : 0;
  score = Math.max(0, matchPoints + timedBonus - accuracyPenalty - timePenalty);
  updateHUD();
}

function shuffleCards() {
  cards
    .map(card => ({ card, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .forEach(({ card }, index) => { card.style.order = index; });
}

function resetBoardState() {
  hasFlippedCard = false;
  lockBoard = false;
  firstCard = null;
  secondCard = null;
}

function resetGame(startImmediately = false) {
  clearInterval(timerId);
  timerId = null;
  elapsedSeconds = 0;
  remainingSeconds = 60;
  errors = 0;
  matches = 0;
  score = 0;
  gameStarted = false;
  lockBoard = true;
  hasFlippedCard = false;
  firstCard = null;
  secondCard = null;

  cards.forEach(card => {
    card.classList.remove('flip', 'matched', 'wrong');
    card.disabled = false;
    card.setAttribute('aria-label', 'Carta fechada');
  });
  shuffleCards();
  updateHUD();
  startButton.textContent = '▶ Iniciar jogo';
  gameStatus.textContent = 'Clique em “Iniciar jogo” para começar.';

  if (startImmediately) setTimeout(startGame, 250);
}

function startGame() {
  if (gameStarted) return;
  gameStarted = true;
  lockBoard = false;
  startButton.textContent = 'Jogo em andamento';
  gameStatus.textContent = mode === 'timed'
    ? 'Você tem 60 segundos. Boa sorte!'
    : 'O cronômetro começou. Encontre os 6 pares!';

  timerId = setInterval(() => {
    elapsedSeconds++;
    if (mode === 'timed') {
      remainingSeconds--;
      if (remainingSeconds <= 0) {
        remainingSeconds = 0;
        calculateScore();
        finishGame(false);
        return;
      }
    }
    calculateScore();
  }, 1000);
}

function flipCard() {
  if (!gameStarted || lockBoard || this === firstCard || this.classList.contains('matched')) return;
  this.classList.add('flip');
  this.setAttribute('aria-label', `Carta ${this.dataset.card}`);

  if (!hasFlippedCard) {
    hasFlippedCard = true;
    firstCard = this;
    return;
  }

  secondCard = this;
  lockBoard = true;
  checkForMatch();
}

function checkForMatch() {
  if (firstCard.dataset.card === secondCard.dataset.card) {
    firstCard.classList.add('matched');
    secondCard.classList.add('matched');
    firstCard.disabled = true;
    secondCard.disabled = true;
    matches++;
    calculateScore();
    resetBoardState();

    if (matches === 6) finishGame(true);
    return;
  }

  errors++;
  firstCard.classList.add('wrong');
  secondCard.classList.add('wrong');
  calculateScore();

  setTimeout(() => {
    firstCard.classList.remove('flip', 'wrong');
    secondCard.classList.remove('flip', 'wrong');
    firstCard.setAttribute('aria-label', 'Carta fechada');
    secondCard.setAttribute('aria-label', 'Carta fechada');
    resetBoardState();
  }, 850);
}

function finishGame(won) {
  clearInterval(timerId);
  timerId = null;
  gameStarted = false;
  lockBoard = true;
  calculateScore();

  if (won && score > (bestScores[mode] || 0)) {
    bestScores[mode] = score;
    localStorage.setItem('marioMemoryBestScores', JSON.stringify(bestScores));
    bestScoreValue.textContent = score.toLocaleString('pt-BR');
  }

  document.getElementById('resultIcon').textContent = won ? '🏆' : '⏱️';
  document.getElementById('resultTitle').textContent = won ? 'Você completou o jogo!' : 'O tempo acabou!';
  document.getElementById('resultMessage').textContent = won
    ? 'Quanto menos tempo e erros, maior a sua pontuação.'
    : `Você encontrou ${matches} de 6 pares. Tente novamente para melhorar sua pontuação.`;
  document.getElementById('resultScore').textContent = score.toLocaleString('pt-BR');
  document.getElementById('resultTime').textContent = formatTime(elapsedSeconds);
  document.getElementById('resultErrors').textContent = errors;
  gameStatus.textContent = won ? 'Partida concluída!' : 'Tempo esgotado.';
  resultModal.showModal();
}

cards.forEach(card => card.addEventListener('click', flipCard));
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', () => resetGame(true));
playAgainButton.addEventListener('click', () => {
  resultModal.close();
  resetGame(true);
});

modeButtons.forEach(button => {
  button.addEventListener('click', () => {
    mode = button.dataset.mode;
    modeButtons.forEach(btn => btn.classList.toggle('active', btn === button));
    timeLabel.textContent = mode === 'timed' ? 'TEMPO RESTANTE' : 'TEMPO';
    timeHelp.textContent = mode === 'timed' ? '60 segundos para concluir' : 'Tempo decorrido';
    resetGame(false);
  });
});

document.getElementById('aboutButton').addEventListener('click', () => aboutModal.showModal());
document.querySelectorAll('[data-close]').forEach(button => {
  button.addEventListener('click', () => document.getElementById(button.dataset.close).close());
});
[aboutModal, resultModal].forEach(modal => {
  modal.addEventListener('click', event => {
    if (event.target === modal) modal.close();
  });
});

const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const savedTheme = localStorage.getItem('marioMemoryTheme') || 'dark';
document.documentElement.dataset.theme = savedTheme;
themeIcon.textContent = savedTheme === 'dark' ? '☀' : '☾';

themeToggle.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem('marioMemoryTheme', nextTheme);
  themeIcon.textContent = nextTheme === 'dark' ? '☀' : '☾';
});

document.getElementById('year').textContent = new Date().getFullYear();
resetGame(false);
